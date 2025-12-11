// lib/actions/payments.ts
"use server";

import db from "@/lib/db";
import { generateCodeByTable } from "@/utils/getCode";
import {
  Payments,
  PaymentStatus,
  PaidStatus,
  InvoiceStatus,
  OrderStatus,
  PurchaseOrderStatus,
  PaymentMethod,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export type PaymentFormData = {
  paymentCode: string;
  paymentDate: Date;
  amount: number;
  method: PaymentMethod;
  notes?: string;
  proofUrl?: string;
  invoiceId: string;
  userId: string;
  status?: string; // Add status field

  // Transfer Bank fields
  rekeningPenerima?: string;
  namaPenerima?: string;
  rekeningPengirim?: string;
  namaPengirim?: string;

  // Cek fields
  nomorCek?: string;
  namaBankPenerbit?: string;
  tanggalCek?: Date;
  tanggalJatuhTempo?: Date;
};

export type PaymentWithDetails = Payments & {
  invoice: {
    id: string;
    code: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: PaymentStatus;
    customer: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
  user: {
    id: string;
    name: string;
    role: string;
  };
};

export type InvoiceOption = {
  id: string;
  code: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  customer: {
    id: string;
    name: string;
    code: string;
  } | null;
};

// Get all payments
export async function getPayments(): Promise<PaymentWithDetails[]> {
  try {
    const payments = await db.payments.findMany({
      include: {
        invoice: {
          select: {
            id: true,
            code: true,
            totalAmount: true,
            paidAmount: true,
            remainingAmount: true,
            paymentStatus: true,
            customer: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return payments.reverse();
  } catch (error) {
    console.error("Error fetching payments:", error);
    throw new Error("Gagal mengambil data pembayaran");
  }
}

// Get payment by ID
export async function getPaymentById(
  id: string
): Promise<PaymentWithDetails | null> {
  try {
    const payment = await db.payments.findUnique({
      where: { id },
      include: {
        invoice: {
          select: {
            id: true,
            code: true,
            totalAmount: true,
            paidAmount: true,
            remainingAmount: true,
            paymentStatus: true,
            customer: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return payment;
  } catch (error) {
    console.error("Error fetching payment:", error);
    throw new Error("Gagal mengambil data pembayaran");
  }
}

// Get available invoices for payment (unpaid or partially paid)
export async function getAvailableInvoices(): Promise<InvoiceOption[]> {
  try {
    const invoices = await db.invoices.findMany({
      where: {
        type: {
          equals: "PRODUCT",
        },
        paymentStatus: {
          in: ["UNPAID"],
        },
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        invoiceDate: "asc",
      },
    });

    return invoices.reverse();
  } catch (error) {
    console.error("Error fetching available invoices:", error);
    throw new Error("Gagal mengambil data invoice yang tersedia");
  }
}

// Get available users for payment
export async function getAvailableUsers() {
  try {
    const users = await db.users.findMany({
      where: {
        isActive: true,
        role: { in: ["ADMIN", "OWNER"] },
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return users;
  } catch (error) {
    console.error("Error fetching available users:", error);
    throw new Error("Gagal mengambil data pengguna yang tersedia");
  }
}

// Create new payment
export async function createPayment(data: PaymentFormData) {
  try {
    const result = await db.$transaction(async tx => {
      // Get invoice details with purchase order and order information
      const invoice = await tx.invoices.findUnique({
        where: { id: data.invoiceId },
        select: {
          totalAmount: true,
          paidAmount: true,
          remainingAmount: true,
          paymentStatus: true,
          status: true,
          purchaseOrderId: true,
          purchaseOrder: {
            select: {
              id: true,
              status: true,
              orderId: true,
              order: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Invoice tidak ditemukan");
      }

      // Check if invoice is completed - prevent payment creation if completed
      if (invoice.status === "COMPLETED") {
        throw new Error(
          "Tidak dapat membuat pembayaran - invoice sudah selesai"
        );
      }

      // Validate payment amount
      if (data.amount <= 0) {
        throw new Error("Jumlah pembayaran harus lebih besar dari 0");
      }

      if (data.amount > invoice.remainingAmount) {
        throw new Error("Jumlah pembayaran tidak boleh melebihi sisa tagihan");
      }

      // Update invoice payment status and amounts
      const newPaidAmount = invoice.paidAmount + data.amount;
      const newRemainingAmount = invoice.totalAmount - newPaidAmount;

      let newPaymentStatus: PaymentStatus;
      let paymentStatus: PaidStatus; // Determine status based on payment amount

      // Use status from form data if provided, otherwise calculate automatically
      if (data.status) {
        paymentStatus = data.status as PaidStatus;
      } else {
        // Auto-calculate status based on payment amount
        if (newRemainingAmount <= 0) {
          newPaymentStatus = "PAID";
          paymentStatus = "CLEARED" as PaidStatus;
        } else {
          newPaymentStatus = "UNPAID";
          paymentStatus = "PENDING" as PaidStatus;
        }
      }

      // Set invoice payment status based on payment status
      if (paymentStatus === "CLEARED") {
        newPaymentStatus = newRemainingAmount <= 0 ? "PAID" : "UNPAID";
      } else {
        newPaymentStatus =
          newPaidAmount >= invoice.totalAmount ? "PAID" : "UNPAID";
      }

      // Create payment with potentially updated status
      const payment = await tx.payments.create({
        data: {
          paymentCode: data.paymentCode,
          paymentDate: data.paymentDate,
          amount: data.amount,
          method: data.method,
          notes: data.notes || null,
          proofUrl: data.proofUrl || null,
          status: paymentStatus,
          invoiceId: data.invoiceId,
          userId: data.userId,

          // Transfer Bank fields
          rekeningPenerima: data.rekeningPenerima || null,
          namaPenerima: data.namaPenerima || null,
          rekeningPengirim: data.rekeningPengirim || null,
          namaPengirim: data.namaPengirim || null,

          // Cek fields
          nomorCek: data.nomorCek || null,
          namaBankPenerbit: data.namaBankPenerbit || null,
          tanggalCek: data.tanggalCek || null,
          tanggalJatuhTempo: data.tanggalJatuhTempo || null,
        },
      });

      await tx.invoices.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          paymentStatus: newPaymentStatus,
        },
      });

      // Update invoice status to PAID or COMPLETED when payment makes invoice fully paid
      if (paymentStatus === "CLEARED" || newPaymentStatus === "PAID") {
        // Check if invoice was already DELIVERED before payment was completed
        const invoiceStatusToSet =
          invoice.status === InvoiceStatus.DELIVERED
            ? InvoiceStatus.COMPLETED
            : InvoiceStatus.PAID;

        await tx.invoices.update({
          where: { id: data.invoiceId },
          data: {
            status: invoiceStatusToSet,
          },
        });

        // Update Order and PO status to COMPLETED when payment makes invoice fully paid
        // If there's a related order, update its status to COMPLETED
        if (invoice.purchaseOrder?.order?.id) {
          await tx.orders.update({
            where: { id: invoice.purchaseOrder.order.id },
            data: {
              status: OrderStatus.COMPLETED,
              completedAt: new Date(),
            },
          });
        }

        // If there's a related purchase order, update its status to COMPLETED
        if (invoice.purchaseOrderId) {
          await tx.purchaseOrders.update({
            where: { id: invoice.purchaseOrderId },
            data: {
              status: PurchaseOrderStatus.COMPLETED,
            },
          });
        }
      }

      return payment;
    });

    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    revalidatePath("/sales/orders");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membuat pembayaran",
    };
  }
}

// Update payment
export async function updatePayment(id: string, data: PaymentFormData) {
  try {
    const result = await db.$transaction(async tx => {
      // Get existing payment
      const existingPayment = await tx.payments.findUnique({
        where: { id },
        include: {
          invoice: {
            select: {
              totalAmount: true,
              paidAmount: true,
              remainingAmount: true,
              paymentStatus: true,
              status: true,
              purchaseOrderId: true,
              purchaseOrder: {
                select: {
                  id: true,
                  status: true,
                  orderId: true,
                  order: {
                    select: {
                      id: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!existingPayment) {
        throw new Error("Pembayaran tidak ditemukan");
      }

      // If invoice has changed, validate the new invoice
      let targetInvoice = existingPayment.invoice;
      if (data.invoiceId !== existingPayment.invoiceId) {
        const newInvoice = await tx.invoices.findUnique({
          where: { id: data.invoiceId },
          select: {
            totalAmount: true,
            paidAmount: true,
            remainingAmount: true,
            paymentStatus: true,
            status: true,
            purchaseOrderId: true,
            purchaseOrder: {
              select: {
                id: true,
                status: true,
                orderId: true,
                order: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
            },
          },
        });

        if (!newInvoice) {
          throw new Error("Invoice baru tidak ditemukan");
        }
        targetInvoice = newInvoice;
      }

      // Check if invoice is completed - prevent update if completed
      if (targetInvoice.status === "COMPLETED") {
        throw new Error(
          "Tidak dapat memperbarui pembayaran - invoice sudah selesai"
        );
      }

      // Also check original invoice if invoice is being changed
      if (
        data.invoiceId !== existingPayment.invoiceId &&
        existingPayment.invoice.status === "COMPLETED"
      ) {
        throw new Error(
          "Tidak dapat memperbarui pembayaran - invoice asli sudah selesai"
        );
      }

      // Validate payment amount
      if (data.amount <= 0) {
        throw new Error("Jumlah pembayaran harus lebih besar dari 0");
      }

      // STRICT VALIDATION: Payment amount must match exactly with invoice total amount
      if (data.amount !== targetInvoice.totalAmount) {
        throw new Error(
          "Jumlah pembayaran harus sama persis dengan total invoice"
        );
      }

      // Calculate the payment status based on invoice totals
      // Since payment amount must match invoice total, set to PAID
      let basePaidAmount = targetInvoice.paidAmount;
      if (data.invoiceId === existingPayment.invoiceId) {
        basePaidAmount -= existingPayment.amount; // Subtract old payment
      }

      const newPaidAmount = basePaidAmount + data.amount;
      const newRemainingAmount = targetInvoice.totalAmount - newPaidAmount;

      // Since amount must match total, always set to PAID when processed
      let newPaymentStatus: PaymentStatus = "PAID";
      let paymentStatus: PaidStatus = "CLEARED";

      // Update payment
      const updatedPayment = await tx.payments.update({
        where: { id },
        data: {
          paymentCode: data.paymentCode,
          paymentDate: data.paymentDate,
          amount: data.amount,
          method: data.method,
          notes: data.notes || null,
          proofUrl: data.proofUrl || null,
          status: paymentStatus, // Use the potentially auto-updated status
          invoiceId: data.invoiceId,
          userId: data.userId,

          // Transfer Bank fields
          rekeningPenerima: data.rekeningPenerima || null,
          namaPenerima: data.namaPenerima || null,
          rekeningPengirim: data.rekeningPengirim || null,
          namaPengirim: data.namaPengirim || null,

          // Cek fields
          nomorCek: data.nomorCek || null,
          namaBankPenerbit: data.namaBankPenerbit || null,
          tanggalCek: data.tanggalCek || null,
          tanggalJatuhTempo: data.tanggalJatuhTempo || null,
        },
      });

      // Revert old invoice if invoice changed
      if (data.invoiceId !== existingPayment.invoiceId) {
        const oldPaidAmount =
          existingPayment.invoice.paidAmount - existingPayment.amount;
        const oldRemainingAmount =
          existingPayment.invoice.totalAmount - oldPaidAmount;

        let oldPaymentStatus: PaymentStatus;
        if (oldRemainingAmount <= 0) {
          oldPaymentStatus = "PAID";
        } else {
          oldPaymentStatus = "UNPAID";
        }

        await tx.invoices.update({
          where: { id: existingPayment.invoiceId },
          data: {
            paidAmount: oldPaidAmount,
            remainingAmount: oldRemainingAmount,
            paymentStatus: oldPaymentStatus,
          },
        });
      }

      await tx.invoices.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          paymentStatus: newPaymentStatus,
        },
      });

      // Update invoice status to PAID or COMPLETED when payment makes invoice fully paid
      if (paymentStatus === "CLEARED" || newPaymentStatus === "PAID") {
        // Check if invoice was already DELIVERED before payment was completed
        const invoiceStatusToSet =
          targetInvoice.status === InvoiceStatus.DELIVERED
            ? InvoiceStatus.COMPLETED
            : InvoiceStatus.PAID;

        await tx.invoices.update({
          where: { id: data.invoiceId },
          data: {
            status: invoiceStatusToSet,
          },
        });

        // Update Order and PO status to COMPLETED when payment makes invoice fully paid
        // If there's a related order, update its status to COMPLETED
        if (targetInvoice.purchaseOrder?.order?.id) {
          await tx.orders.update({
            where: { id: targetInvoice.purchaseOrder.order.id },
            data: {
              status: OrderStatus.COMPLETED,
              completedAt: new Date(),
            },
          });
        }

        // If there's a related purchase order, update its status to COMPLETED
        if (targetInvoice.purchaseOrderId) {
          await tx.purchaseOrders.update({
            where: { id: targetInvoice.purchaseOrderId },
            data: {
              status: PurchaseOrderStatus.COMPLETED,
            },
          });
        }
      }

      return updatedPayment;
    });

    revalidatePath("/purchasing/pembayaran");
    revalidatePath(`/purchasing/pembayaran/edit/${id}`);
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    revalidatePath("/sales/orders");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memperbarui pembayaran",
    };
  }
}

// Delete payment
export async function deletePayment(id: string) {
  try {
    const result = await db.$transaction(async tx => {
      // Get payment details
      const payment = await tx.payments.findUnique({
        where: { id },
        include: {
          invoice: {
            select: {
              totalAmount: true,
              paidAmount: true,
              remainingAmount: true,
              paymentStatus: true,
              status: true,
            },
          },
        },
      });

      if (!payment) {
        throw new Error("Pembayaran tidak ditemukan");
      }

      // Check if invoice is completed - prevent deletion if completed
      if (payment.invoice.status === "COMPLETED") {
        throw new Error(
          "Tidak dapat menghapus pembayaran - invoice sudah selesai"
        );
      }

      // Delete payment
      await tx.payments.delete({
        where: { id },
      });

      // Update invoice payment status
      const newPaidAmount = payment.invoice.paidAmount - payment.amount;
      const newRemainingAmount = payment.invoice.totalAmount - newPaidAmount;

      let newPaymentStatus: PaymentStatus;
      if (newRemainingAmount <= 0) {
        newPaymentStatus = "PAID";
      } else {
        newPaymentStatus = "UNPAID";
      }

      await tx.invoices.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          paymentStatus: newPaymentStatus,
        },
      });

      return payment;
    });

    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error deleting payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menghapus pembayaran",
    };
  }
}

// Get unique payment methods from existing data
export async function getPaymentMethods(): Promise<string[]> {
  try {
    const payments = await db.payments.findMany({
      select: {
        method: true,
      },
      distinct: ["method"],
    });

    // Define default methods yang akan selalu ada
    const defaultMethods = ["CASH", "TRANSFER_BANK", "CEK"];

    // Filter dan normalize methods dari database
    const dbMethods = payments
      .map(p => p.method)
      .filter(Boolean)
      .map(method => method.trim()) // Hapus whitespace
      .filter(method => method.length > 0); // Pastikan tidak kosong

    // Buat Set untuk normalisasi case insensitive comparison
    const defaultMethodsNormalized = new Set(
      defaultMethods.map(m => m.toUpperCase())
    );

    // Filter dbMethods yang tidak sama dengan default methods (case insensitive)
    const uniqueDbMethods = dbMethods.filter(
      method => !defaultMethodsNormalized.has(method.toUpperCase())
    );

    // Gabungkan: default methods + unique db methods
    const allMethods = [...defaultMethods, ...uniqueDbMethods];

    return allMethods;
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    // Return default methods if query fails
    return ["CASH", "TRANSFER_BANK", "CEK"];
  }
}

// Create payment from delivery module with auto-generated code and date
export async function createPaymentFromDelivery(data: {
  amount: number;
  method: PaymentMethod;
  notes?: string;
  invoiceId: string;
  userId: string;
  // Transfer Bank fields
  rekeningPenerima?: string;
  namaPenerima?: string;
  rekeningPengirim?: string;
  namaPengirim?: string;
  // Cek fields
  nomorCek?: string;
  namaBankPenerbit?: string;
  tanggalCek?: string;
  tanggalJatuhTempo?: string;
}) {
  try {
    // Generate payment code
    const lastPayment = await db.payments.findFirst({
      orderBy: { createdAt: "desc" },
      select: { paymentCode: true },
    });

    let newPaymentCode: string;
    newPaymentCode = await generateCodeByTable("Payments");

    // Validate invoice exists
    const invoice = await db.invoices.findUnique({
      where: { id: data.invoiceId },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        paymentStatus: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: "Invoice tidak ditemukan",
      };
    }

    // Validate payment amount
    if (data.amount <= 0) {
      return {
        success: false,
        error: "Jumlah pembayaran harus lebih dari 0",
      };
    }

    if (data.amount > invoice.remainingAmount) {
      return {
        success: false,
        error: `Jumlah pembayaran tidak boleh melebihi sisa tagihan (${invoice.remainingAmount})`,
      };
    }

    // Validate method-specific fields
    if (data.method === "TRANSFER_BANK") {
      if (
        !data.rekeningPenerima ||
        !data.namaPenerima ||
        !data.rekeningPengirim ||
        !data.namaPengirim
      ) {
        return {
          success: false,
          error: "Semua field Transfer Bank harus diisi",
        };
      }
    }

    if (data.method === "CHECK") {
      if (
        !data.nomorCek ||
        !data.namaBankPenerbit ||
        !data.tanggalCek ||
        !data.tanggalJatuhTempo
      ) {
        return {
          success: false,
          error: "Semua field Cek harus diisi",
        };
      }
    }

    const result = await db.$transaction(async tx => {
      // Create payment with PENDING status (waiting for admin confirmation)
      const payment = await tx.payments.create({
        data: {
          paymentCode: newPaymentCode,
          paymentDate: new Date(), // Auto-generated current date
          amount: data.amount,
          method: data.method,
          notes: data.notes,
          status: PaidStatus.PENDING, // Always PENDING for delivery module payments
          invoiceId: data.invoiceId,
          userId: data.userId,
          // Transfer Bank fields
          rekeningPenerima: data.rekeningPenerima || null,
          namaPenerima: data.namaPenerima || null,
          rekeningPengirim: data.rekeningPengirim || null,
          namaPengirim: data.namaPengirim || null,
          // Cek fields
          nomorCek: data.nomorCek || null,
          namaBankPenerbit: data.namaBankPenerbit || null,
          tanggalCek: data.tanggalCek ? new Date(data.tanggalCek) : null,
          tanggalJatuhTempo: data.tanggalJatuhTempo
            ? new Date(data.tanggalJatuhTempo)
            : null,
        },
        include: {
          invoice: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return payment;
    });

    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating payment from delivery:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membuat pembayaran",
    };
  }
}
