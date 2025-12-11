"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface CreditNoteFormData {
  deliveryId: string;
  invoiceId: string;
  customerId: string;
  returnDate: Date;
  notes?: string;
  userId: string; // Add userId parameter
  returnItems: {
    invoiceItemId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    discountType: string;
    taxRate?: number;
  }[];
}

// Generate credit note number
async function generateCreditNoteNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  // Get the latest credit note for this month
  const latestCreditNote = await db.credit_notes.findFirst({
    where: {
      creditNoteNo: {
        startsWith: `CN${year}${month}`,
      },
    },
    orderBy: {
      creditNoteNo: "desc",
    },
  });

  let sequence = 1;
  if (latestCreditNote && latestCreditNote.creditNoteNo) {
    const lastSequence = parseInt(latestCreditNote.creditNoteNo.slice(-4));
    sequence = lastSequence + 1;
  }

  return `CN${year}${month}${String(sequence).padStart(4, "0")}`;
}

// Create credit note and restore stock
export async function createCreditNote(data: CreditNoteFormData) {
  try {
    const result = await db.$transaction(async tx => {
      // Generate credit note number
      const creditNoteNo = await generateCreditNoteNumber();

      // Calculate totals (match frontend logic: total = qty × harga per unit)
      // Note: item.unitPrice adalah harga sebelum diskon dari database
      // Frontend menampilkan total tanpa mengurangi diskon lagi, jadi backend juga tidak perlu mengurangi diskon
      let subtotal = 0;
      let totalTax = 0;

      for (const item of data.returnItems) {
        const lineSubtotal = item.quantity * item.unitPrice;
        const lineTax = (lineSubtotal * (item.taxRate || 0)) / 100;

        subtotal += lineSubtotal;
        totalTax += lineTax;
      }

      const total = subtotal + totalTax;

      // Create credit note
      const creditNote = await tx.credit_notes.create({
        data: {
          id: creditNoteNo, // Use creditNoteNo as ID or generate a unique ID
          creditNoteNo,
          creditNoteDate: data.returnDate,
          customerId: data.customerId,
          invoiceId: data.invoiceId,
          subtotal,
          taxAmount: totalTax,
          total,
          status: "POSTED", // Directly post the credit note
          notes: data.notes,
          updatedAt: new Date(),
        },
      });

      // Create credit note items and restore stock
      const stockMovements = [];
      for (const item of data.returnItems) {
        // Create credit note line (match frontend logic: total = qty × harga per unit)
        // Frontend sudah menampilkan harga sebelum diskon, jadi tidak perlu kurangi diskon lagi
        const lineTotal = item.quantity * item.unitPrice;

        await tx.credit_note_lines.create({
          data: {
            id: `${creditNote.id}_${item.invoiceItemId}`,
            creditNoteId: creditNote.id,
            invoiceLineId: item.invoiceItemId,
            productId: item.productId,
            qty: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate || 0,
            lineTotal,
            updatedAt: new Date(),
          },
        });

        // Get current stock
        const product = await tx.products.findUnique({
          where: { id: item.productId },
          select: { currentStock: true, name: true },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const previousStock = product.currentStock;
        const newStock = previousStock + item.quantity; // Add back to stock

        // Create stock movement for return
        const stockMovement = await tx.stockMovements.create({
          data: {
            type: "RETURN_IN",
            quantity: item.quantity,
            previousStock,
            newStock,
            reference: `Credit Note Return: ${creditNoteNo}`,
            notes: `Pengembalian barang - ${product.name}`,
            productId: item.productId,
            userId: data.userId, // Use actual user ID from session
          },
        });

        stockMovements.push(stockMovement);

        // Update product stock
        await tx.products.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        // Update delivery items to reflect the returned quantity
        // Find delivery items that match this invoice item and product
        const deliveryItems = await tx.deliveryItems.findMany({
          where: {
            invoiceItem: {
              id: item.invoiceItemId,
              productId: item.productId,
            },
          },
        });

        for (const deliveryItem of deliveryItems) {
          const currentReturned = deliveryItem.quantityReturned;
          const currentDelivered = deliveryItem.quantityDelivered;

          // Add to returned quantity
          const newReturnedQuantity = currentReturned + item.quantity;

          // Subtract from delivered quantity (but don't go below 0)
          const newDeliveredQuantity = Math.max(
            0,
            currentDelivered - item.quantity
          );

          await tx.deliveryItems.update({
            where: { id: deliveryItem.id },
            data: {
              quantityReturned: newReturnedQuantity,
              quantityDelivered: newDeliveredQuantity,
              updatedAt: new Date(),
            },
          });
        }

        // Update invoice items to reduce quantity and totalPrice
        const invoiceItem = await tx.invoiceItems.findUnique({
          where: { id: item.invoiceItemId },
          select: {
            id: true,
            quantity: true,
            totalPrice: true,
            price: true,
            finalPrice: true, // Add finalPrice untuk perhitungan yang akurat
          },
        });

        if (invoiceItem) {
          const newQuantity = Math.max(0, invoiceItem.quantity - item.quantity);
          // Gunakan finalPrice (harga setelah diskon per unit) bukan price
          const returnedTotalPrice = item.quantity * invoiceItem.finalPrice;
          const newTotalPrice = Math.max(
            0,
            invoiceItem.totalPrice - returnedTotalPrice
          );

          await tx.invoiceItems.update({
            where: { id: item.invoiceItemId },
            data: {
              quantity: newQuantity,
              totalPrice: newTotalPrice,
              updatedAt: new Date(),
            },
          });
        }
      }

      // Update invoice totalAmount - reduce by credit note total
      const currentInvoice = await tx.invoices.findUnique({
        where: { id: data.invoiceId },
        select: {
          totalAmount: true,
          remainingAmount: true,
          subtotal: true,
          actualDiscount: true,
          shippingCost: true,
          discount: true, // Ambil discount untuk menghitung ulang actualDiscount
          discountType: true, // Ambil discountType untuk menghitung ulang actualDiscount
        },
      });

      if (!currentInvoice) {
        throw new Error("Invoice not found");
      }

      // Recalculate invoice totals using discount and discountType
      const newSubtotal = currentInvoice.subtotal - total; // Subtract credit note total from subtotal
      const discountValue = currentInvoice.discount || 0;
      const discountType = currentInvoice.discountType || "AMOUNT";

      // Hitung ulang actualDiscount berdasarkan subtotal baru
      let newActualDiscount = 0;
      if (discountType === "PERCENTAGE") {
        newActualDiscount = (newSubtotal * discountValue) / 100;
      } else {
        newActualDiscount = discountValue; // AMOUNT discount tetap sama
      }

      const newTotalAmount = Math.max(
        0,
        newSubtotal - newActualDiscount + currentInvoice.shippingCost
      );
      const newRemainingAmount = Math.max(
        0,
        newTotalAmount -
          (currentInvoice.totalAmount - currentInvoice.remainingAmount)
      );

      // Update invoice with recalculated totals
      await tx.invoices.update({
        where: { id: data.invoiceId },
        data: {
          subtotal: newSubtotal,
          actualDiscount: newActualDiscount, // Update actualDiscount dengan nilai yang baru
          totalAmount: newTotalAmount,
          remainingAmount: newRemainingAmount,
          updatedAt: new Date(),
        },
      });

      return {
        creditNote,
        stockMovements,
        originalInvoiceTotal: currentInvoice.totalAmount,
        newInvoiceTotal: newTotalAmount,
        creditNoteTotal: total,
      };
    });

    // Revalidate paths
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/invoice");
    revalidatePath("/inventory/produk");

    return {
      success: true,
      data: result.creditNote,
      stockMovements: result.stockMovements,
      invoiceUpdate: {
        originalTotal: result.originalInvoiceTotal,
        newTotal: result.newInvoiceTotal,
        creditNoteTotal: result.creditNoteTotal,
      },
      message: `Credit note ${
        result.creditNote.creditNoteNo
      } berhasil dibuat. Total invoice dikurangi dari ${new Intl.NumberFormat(
        "id-ID",
        { style: "currency", currency: "IDR" }
      ).format(result.originalInvoiceTotal)} menjadi ${new Intl.NumberFormat(
        "id-ID",
        { style: "currency", currency: "IDR" }
      ).format(result.newInvoiceTotal)}`,
    };
  } catch (error) {
    console.error("Error creating credit note:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create credit note",
    };
  }
}

// Delete credit note and reverse all changes
export async function deleteCreditNote(creditNoteId: string, userId: string) {
  try {
    const result = await db.$transaction(async tx => {
      // Get credit note with all details
      const creditNote = await tx.credit_notes.findUnique({
        where: { id: creditNoteId },
        include: {
          credit_note_lines: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  currentStock: true,
                },
              },
            },
          },
        },
      });

      if (!creditNote) {
        throw new Error("Credit note not found");
      }

      // Store original values for response
      const originalInvoiceTotal = await tx.invoices.findUnique({
        where: { id: creditNote.invoiceId },
        select: {
          totalAmount: true,
          remainingAmount: true,
          subtotal: true,
          actualDiscount: true,
          shippingCost: true,
          discount: true, // Ambil discount untuk menghitung ulang actualDiscount
          discountType: true, // Ambil discountType untuk menghitung ulang actualDiscount
        },
      });

      if (!originalInvoiceTotal) {
        throw new Error("Invoice not found");
      }

      const stockMovements = [];

      // Reverse stock movements for each credit note line
      for (const line of creditNote.credit_note_lines) {
        const product = line.products;
        if (!product) {
          throw new Error(`Product not found for credit note line ${line.id}`);
        }

        const previousStock = product.currentStock;
        const newStock = previousStock - line.qty; // Subtract the returned quantity

        if (newStock < 0) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Current stock: ${previousStock}, Required: ${line.qty}`
          );
        }

        // Create reverse stock movement
        const stockMovement = await tx.stockMovements.create({
          data: {
            type: "ADJUSTMENT_OUT", // Use ADJUSTMENT_OUT to reverse the RETURN_IN
            quantity: line.qty,
            previousStock,
            newStock,
            reference: `Credit Note Delete: ${creditNote.creditNoteNo}`,
            notes: `Pembatalan credit note - ${product.name}`,
            productId: product.id,
            userId: userId,
          },
        });

        stockMovements.push(stockMovement);

        // Update product stock (reduce by returned quantity)
        await tx.products.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        // Reverse delivery items changes
        // Find delivery items that were affected by this credit note
        const deliveryItems = await tx.deliveryItems.findMany({
          where: {
            invoiceItem: {
              id: line.invoiceLineId,
              productId: product.id,
            },
          },
        });

        for (const deliveryItem of deliveryItems) {
          const currentReturned = deliveryItem.quantityReturned;
          const currentDelivered = deliveryItem.quantityDelivered;

          // Reverse the returned quantity
          const newReturnedQuantity = Math.max(0, currentReturned - line.qty);

          // Add back to delivered quantity
          const newDeliveredQuantity = currentDelivered + line.qty;

          await tx.deliveryItems.update({
            where: { id: deliveryItem.id },
            data: {
              quantityReturned: newReturnedQuantity,
              quantityDelivered: newDeliveredQuantity,
              updatedAt: new Date(),
            },
          });
        }

        // Restore invoice items quantity and totalPrice
        const invoiceItem = await tx.invoiceItems.findUnique({
          where: { id: line.invoiceLineId },
          select: {
            id: true,
            quantity: true,
            totalPrice: true,
            price: true,
            finalPrice: true, // Add finalPrice untuk perhitungan yang akurat
          },
        });

        if (invoiceItem) {
          const restoredQuantity = invoiceItem.quantity + line.qty;
          // Gunakan finalPrice (harga setelah diskon per unit) bukan price
          const restoredTotalPrice = line.qty * invoiceItem.finalPrice;
          const newTotalPrice = invoiceItem.totalPrice + restoredTotalPrice;

          await tx.invoiceItems.update({
            where: { id: line.invoiceLineId },
            data: {
              quantity: restoredQuantity,
              totalPrice: newTotalPrice,
              updatedAt: new Date(),
            },
          });
        }
      }

      // Restore invoice total amount using discount and discountType (add back credit note total)
      const newSubtotal = originalInvoiceTotal.subtotal + creditNote.total;
      const discountValue = originalInvoiceTotal.discount || 0;
      const discountType = originalInvoiceTotal.discountType || "AMOUNT";

      // Hitung ulang actualDiscount berdasarkan subtotal yang dipulihkan
      let newActualDiscount = 0;
      if (discountType === "PERCENTAGE") {
        newActualDiscount = (newSubtotal * discountValue) / 100;
      } else {
        newActualDiscount = discountValue; // AMOUNT discount tetap sama
      }

      const newInvoiceTotalAmount =
        newSubtotal - newActualDiscount + originalInvoiceTotal.shippingCost;
      const newInvoiceRemainingAmount =
        newInvoiceTotalAmount -
        (originalInvoiceTotal.totalAmount -
          originalInvoiceTotal.remainingAmount);

      await tx.invoices.update({
        where: { id: creditNote.invoiceId },
        data: {
          subtotal: newSubtotal,
          actualDiscount: newActualDiscount, // Update actualDiscount dengan nilai yang baru
          totalAmount: newInvoiceTotalAmount,
          remainingAmount: newInvoiceRemainingAmount,
          updatedAt: new Date(),
        },
      });

      // Delete credit note lines first (foreign key constraint)
      await tx.credit_note_lines.deleteMany({
        where: { creditNoteId: creditNote.id },
      });

      // Delete the credit note
      await tx.credit_notes.delete({
        where: { id: creditNote.id },
      });

      return {
        creditNote,
        stockMovements,
        originalInvoiceTotal: originalInvoiceTotal.totalAmount,
        newInvoiceTotal: newInvoiceTotalAmount,
        creditNoteTotal: creditNote.total,
      };
    });

    // Revalidate paths
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/invoice");
    revalidatePath("/inventory/produk");

    return {
      success: true,
      data: result.creditNote,
      stockMovements: result.stockMovements,
      invoiceUpdate: {
        originalTotal: result.originalInvoiceTotal,
        newTotal: result.newInvoiceTotal,
        creditNoteTotal: result.creditNoteTotal,
      },
      message: `Credit note ${
        result.creditNote.creditNoteNo
      } berhasil dihapus. Total invoice dikembalikan dari ${new Intl.NumberFormat(
        "id-ID",
        { style: "currency", currency: "IDR" }
      ).format(result.originalInvoiceTotal)} menjadi ${new Intl.NumberFormat(
        "id-ID",
        { style: "currency", currency: "IDR" }
      ).format(result.newInvoiceTotal)}`,
    };
  } catch (error) {
    console.error("Error deleting credit note:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete credit note",
    };
  }
}

// Get credit notes for an invoice
export async function getCreditNotesByInvoice(invoiceId: string) {
  try {
    const creditNotes = await db.credit_notes.findMany({
      where: { invoiceId },
      include: {
        credit_note_lines: {
          include: {
            products: {
              select: {
                name: true,
                code: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: creditNotes,
    };
  } catch (error) {
    // Credit notes are optional feature - don't log as error
    return {
      success: false,
      error: "Credit notes feature not available",
      data: [], // Return empty array for optional feature
    };
  }
}
