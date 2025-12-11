"use server";

import db from "@/lib/db";
import {
  DeliveryStatus,
  StockMovementType,
  InvoiceStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateCodeByTable } from "@/utils/getCode";

export type DeliveryFormData = {
  invoiceId: string;
  helperId: string;
  deliveryDate: Date;
  status: DeliveryStatus;
  notes?: string;
  returnReason?: string;
  deliveryItems?: DeliveryItemData[];
};

export type DeliveryItemData = {
  invoiceItemId: string;
  quantityToDeliver: number;
};

export type DeliveryWithDetails = {
  id: string;
  code: string;
  invoiceId: string;
  helperId: string;
  deliveryDate: Date;
  status: DeliveryStatus;
  completedAt: Date | null;
  notes: string | null;
  returnReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deliveryItems?: {
    id: string;
    invoiceItemId: string | null;
    quantityToDeliver: number;
    quantityDelivered: number;
    quantityReturned: number;
    invoiceItem: {
      id: string;
      quantity: number;
      price: number;
      discount: number;
      discountType: string;
      totalPrice: number;
      products: {
        id: string;
        name: string;
        code: string | null;
        unit: string;
        price: number;
      };
    } | null;
  }[];
  invoice: {
    id: string;
    code: string;
    invoiceDate: Date;
    totalAmount: number;
    subtotal: number;
    tax: number;
    taxPercentage: number;
    discount: number;
    discountType: string;
    status: string;
    customer: {
      id: string;
      name: string;
      address: string;
      phone: string | null;
    } | null;
    invoiceItems: {
      id: string;
      quantity: number;
      price: number;
      discount: number;
      discountType: string;
      totalPrice: number;
      products: {
        id: string;
        name: string;
        code: string | null;
        unit: string;
        price: number;
      };
    }[];
  };
  helper: {
    id: string;
    name: string;
    email: string;
  };
};

// Helper function to restore stock when delivery is returned or cancelled
async function restoreStockFromDelivery(
  tx: any,
  deliveryId: string,
  invoiceId: string,
  userId: string,
  reason: string = "Delivery return/cancellation"
) {
  // Get invoice items to restore stock
  const invoice = await tx.invoices.findUnique({
    where: { id: invoiceId },
    include: {
      invoiceItems: {
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

  if (!invoice) {
    throw new Error("Invoice not found for stock restoration");
  }

  const stockMovements = [];

  for (const item of invoice.invoiceItems) {
    const product = item.products;
    const previousStock = product.currentStock;
    const newStock = previousStock + item.quantity; // Add back the quantity

    // Create stock movement record for return/cancellation
    const stockMovement = await tx.stockMovements.create({
      data: {
        type: StockMovementType.RETURN_IN, // Using RETURN_IN for stock restoration
        quantity: item.quantity,
        previousStock: previousStock,
        newStock: newStock,
        reference: `Delivery Return/Cancel: ${deliveryId}`,
        notes: reason,
        productId: product.id,
        userId: userId,
      },
    });

    stockMovements.push(stockMovement);

    // Update product stock
    await tx.products.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });
  }

  return stockMovements;
}

// Get invoices that are ready for delivery (status: SENT or PAID and no existing delivery or delivery with CANCELLED/RETURNED status)
export async function getAvailableInvoicesForDelivery() {
  try {
    const invoices = await db.invoices.findMany({
      where: {
        status: {
          in: [InvoiceStatus.SENT, InvoiceStatus.PAID],
        },
        AND: [
          {
            OR: [
              {
                deliveries: {
                  none: {}, // No existing delivery
                },
              },
              {
                AND: [
                  {
                    deliveries: {
                      some: {
                        status: {
                          in: ["CANCELLED", "RETURNED"],
                        },
                      },
                    },
                  },
                  {
                    allowRedelivery: true, // Admin has approved Pengiriman ulang
                  },
                ],
              },
            ],
          },
          {
            OR: [
              { useDeliveryNote: false }, // Invoice tanpa surat jalan bisa langsung dikirim
              {
                useDeliveryNote: true,
                delivery_notes: { isNot: null }, // Invoice dengan useDeliveryNote=true harus memiliki surat jalan
              },
            ],
          },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        invoiceItems: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                unit: true,
                price: true,
              },
            },
          },
        },
        deliveries: {
          select: {
            id: true,
            code: true,
            status: true,
            returnReason: true,
          },
        },
        payments: {
          select: {
            id: true,
            paymentCode: true,
            amount: true,
            paymentDate: true,
            method: true,
            status: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        invoiceDate: "asc",
      },
    });

    return invoices;
  } catch (error) {
    console.error("Error fetching available invoices for delivery:", error);
    throw new Error("Failed to fetch available invoices");
  }
}

export async function getDeliveries(): Promise<DeliveryWithDetails[]> {
  try {
    const deliveries = await db.deliveries.findMany({
      include: {
        invoice: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
              },
            },
            invoiceItems: {
              include: {
                products: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    unit: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
        helper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return deliveries;
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    throw new Error("Failed to fetch deliveries");
  }
}

// Create a new delivery
export async function createDelivery(data: DeliveryFormData) {
  try {
    const code = await generateCodeByTable("Deliveries");

    const delivery = await db.$transaction(async tx => {
      // Create the delivery
      const newDelivery = await tx.deliveries.create({
        data: {
          code,
          invoiceId: data.invoiceId,
          helperId: data.helperId,
          deliveryDate: data.deliveryDate,
          status: data.status,
          notes: data.notes,
        },
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
          helper: true,
        },
      });

      // Create delivery items if provided
      if (data.deliveryItems && data.deliveryItems.length > 0) {
        await tx.deliveryItems.createMany({
          data: data.deliveryItems.map(item => ({
            deliveryId: newDelivery.id,
            invoiceItemId: item.invoiceItemId,
            quantityToDeliver: item.quantityToDeliver,
            quantityDelivered: 0, // Initially 0, will be updated when delivered
            quantityReturned: 0,
            status: "PENDING",
          })),
        });
      }

      return newDelivery;
    });

    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    return { success: true, data: delivery };
  } catch (error: any) {
    console.error("Error creating delivery:", error);

    // Handle specific error cases
    if (error.code === "P2002") {
      // Unique constraint violation
      if (error.meta?.target?.includes("invoiceId")) {
        return {
          success: false,
          error:
            "Invoice ini sudah memiliki pengiriman. Silakan pilih invoice lain.",
        };
      }
      return {
        success: false,
        error: "Data sudah ada. Silakan periksa kembali.",
      };
    }

    return {
      success: false,
      error: "Gagal membuat pengiriman. Silakan coba lagi.",
    };
  }
}

// Update delivery status
export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  notes?: string,
  returnReason?: string,
  userId?: string
) {
  try {
    const result = await db.$transaction(async tx => {
      // Get current delivery to check status change
      const currentDelivery = await tx.deliveries.findUnique({
        where: { id: deliveryId },
        include: {
          invoice: {
            select: {
              id: true,
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
              invoiceItems: {
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
          },
        },
      });

      if (!currentDelivery) {
        throw new Error("Delivery not found");
      }

      const updateData: any = {
        status,
        notes,
        updatedAt: new Date(),
      };

      // Set completion date for delivered status
      if (status === "DELIVERED") {
        updateData.completedAt = new Date();
      }

      // Add return reason if provided
      if (returnReason) {
        updateData.returnReason = returnReason;
      }

      // Handle stock restoration for RETURNED or CANCELLED status
      let stockMovements = [];
      if (
        (status === "RETURNED" || status === "CANCELLED") &&
        currentDelivery.status !== "RETURNED" &&
        currentDelivery.status !== "CANCELLED"
      ) {
        // Only restore stock if status is changing TO returned/cancelled (not already in that state)
        // Also check if stock movement doesn't already exist
        const hasExistingMovement = await tx.stockMovements.findFirst({
          where: {
            reference: `Delivery Return/Cancel: ${deliveryId}`,
            type: StockMovementType.RETURN_IN,
          },
        });

        if (!hasExistingMovement) {
          const movementUserId = userId || "system";
          const movementReason = returnReason
            ? `Delivery ${status.toLowerCase()}: ${returnReason}`
            : `Delivery ${status.toLowerCase()}`;

          stockMovements = await restoreStockFromDelivery(
            tx,
            deliveryId,
            currentDelivery.invoiceId,
            movementUserId,
            movementReason
          );
        }
      }

      // Update invoice status based on delivery status
      let invoiceStatusUpdate: any = {};
      if (status === "DELIVERED") {
        // Check if invoice is already PAID to determine if it should be COMPLETED
        if (currentDelivery.invoice.paymentStatus === "PAID") {
          // If invoice is PAID and delivery is successful, mark as COMPLETED
          invoiceStatusUpdate = {
            status: InvoiceStatus.COMPLETED,
          };
        } else {
          // If invoice is not PAID yet, set to DELIVERED
          invoiceStatusUpdate = {
            status: InvoiceStatus.DELIVERED,
          };
        }
      } else if (status === "CANCELLED") {
        // When delivery is cancelled, update invoice status to CANCELLED
        invoiceStatusUpdate = {
          status: InvoiceStatus.RETURNED,
          allowRedelivery: false, // Reset Pengiriman ulang approval when cancelled
        };
      } else if (status === "RETURNED") {
        // When delivery is returned, update invoice status to RETURNED
        invoiceStatusUpdate = {
          status: InvoiceStatus.RETURNED,
          allowRedelivery: false, // Reset Pengiriman ulang approval when returned
        };
      }

      // CRITICAL: Always reset allowRedelivery to false when delivery fails (RETURNED or CANCELLED)
      // This ensures that even if there are multiple returns/cancellations, the flag is always reset
      if (status === "RETURNED" || status === "CANCELLED") {
        // Force allowRedelivery to false regardless of current state
        invoiceStatusUpdate.allowRedelivery = false;
      }

      // Update invoice if needed
      if (Object.keys(invoiceStatusUpdate).length > 0) {
        await tx.invoices.update({
          where: { id: currentDelivery.invoiceId },
          data: invoiceStatusUpdate,
        });
      }

      // Update delivery status
      const delivery = await tx.deliveries.update({
        where: { id: deliveryId },
        data: updateData,
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
          helper: true,
          deliveryItems: true, // Include delivery items
        },
      });

      // Update delivery items when status becomes DELIVERED
      if (status === "DELIVERED") {
        const deliveryItems = await tx.deliveryItems.findMany({
          where: { deliveryId: deliveryId },
        });

        for (const item of deliveryItems) {
          await tx.deliveryItems.update({
            where: { id: item.id },
            data: {
              quantityDelivered: item.quantityToDeliver,
              status: "DELIVERED",
              updatedAt: new Date(),
            },
          });
        }
      }

      return { delivery, stockMovements };
    });

    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    revalidatePath("/sales/orders");
    revalidatePath("/purchasing/purchase-orders");
    return {
      success: true,
      data: result.delivery,
      stockMovements: result.stockMovements,
    };
  } catch (error) {
    console.error("Error updating delivery status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update delivery status",
    };
  }
}

// Get delivery by ID
export async function getDeliveryById(
  id: string
): Promise<DeliveryWithDetails | null> {
  try {
    const delivery = await db.deliveries.findUnique({
      where: { id },
      include: {
        deliveryItems: {
          include: {
            invoiceItem: {
              include: {
                products: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    unit: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
        invoice: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
              },
            },
            invoiceItems: {
              include: {
                products: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    unit: true,
                    price: true,
                  },
                },
              },
            },
            payments: {
              select: {
                id: true,
                paymentCode: true,
                amount: true,
                paymentDate: true,
                method: true,
                reference: true,
                status: true,
                notes: true,
                rekeningPenerima: true,
                namaPenerima: true,
                rekeningPengirim: true,
                namaPengirim: true,
                nomorCek: true,
                namaBankPenerbit: true,
                tanggalCek: true,
                tanggalJatuhTempo: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        helper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return delivery;
  } catch (error) {
    console.error("Error fetching delivery:", error);
    throw new Error("Failed to fetch delivery");
  }
}

// Update delivery
export async function updateDelivery(
  id: string,
  data: {
    deliveryDate: Date;
    notes?: string;
  }
) {
  try {
    const delivery = await db.deliveries.update({
      where: { id },
      data: {
        deliveryDate: data.deliveryDate,
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
        helper: true,
      },
    });

    revalidatePath("/sales/pengiriman");
    revalidatePath(`/sales/pengiriman/edit/${id}`);
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    return { success: true, data: delivery };
  } catch (error) {
    console.error("Error updating delivery:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update delivery",
    };
  }
}

// Delete delivery
export async function deleteDelivery(id: string) {
  try {
    const result = await db.$transaction(async tx => {
      // Get delivery details first
      const deliveryToDelete = await tx.deliveries.findUnique({
        where: { id },
        include: {
          invoice: {
            select: {
              id: true,
              code: true,
              status: true,
            },
          },
        },
      });

      if (!deliveryToDelete) {
        throw new Error("Delivery not found");
      }

      // Check if there are other deliveries for the same invoice
      const otherDeliveries = await tx.deliveries.findMany({
        where: {
          invoiceId: deliveryToDelete.invoiceId,
          id: { not: id }, // Exclude the delivery being deleted
        },
      });

      // Initialize stockMovementsToDelete variable
      let stockMovementsToDelete: any[] = [];

      // If delivery status is RETURNED or CANCELLED, we need to handle stock restoration
      if (
        deliveryToDelete.status === "RETURNED" ||
        deliveryToDelete.status === "CANCELLED"
      ) {
        // Find and delete related stock movements
        stockMovementsToDelete = await tx.stockMovements.findMany({
          where: {
            reference: `Delivery Return/Cancel: ${id}`,
            type: StockMovementType.RETURN_IN,
          },
        });

        if (stockMovementsToDelete.length > 0) {
          // Delete stock movements
          await tx.stockMovements.deleteMany({
            where: {
              reference: `Delivery Return/Cancel: ${id}`,
              type: StockMovementType.RETURN_IN,
            },
          });

          // Restore stock to the state before the return/cancellation
          // We need to subtract the returned quantity back from current stock
          for (const movement of stockMovementsToDelete) {
            await tx.products.update({
              where: { id: movement.productId },
              data: {
                currentStock: movement.previousStock, // Restore to previous stock before the return
              },
            });
          }
        }
      }

      // Update invoice status only if there are no other deliveries for the same invoice
      if (otherDeliveries.length === 0) {
        await tx.invoices.update({
          where: { id: deliveryToDelete.invoiceId },
          data: {
            status: InvoiceStatus.SENT,
            allowRedelivery: false, // Reset redelivery approval
          },
        });
      }

      // Finally, delete the delivery
      await tx.deliveries.delete({
        where: { id },
      });

      return {
        deletedDelivery: deliveryToDelete,
        stockMovementsDeleted: stockMovementsToDelete.length,
        invoiceStatusUpdated: otherDeliveries.length === 0,
        otherDeliveriesCount: otherDeliveries.length,
      };
    });

    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");

    return {
      success: true,
      message: `Delivery ${result.deletedDelivery.code} deleted successfully`,
      details: {
        stockMovementsDeleted: result.stockMovementsDeleted,
        invoiceStatusUpdated: result.invoiceStatusUpdated,
        otherDeliveriesCount: result.otherDeliveriesCount,
      },
    };
  } catch (error) {
    console.error("Error deleting delivery:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete delivery",
    };
  }
}

// Admin function to approve Pengiriman ulang for an invoice
export async function approveRedelivery(
  invoiceId: string,
  userId: string = "system"
) {
  try {
    const result = await db.$transaction(async tx => {
      // Get invoice with items and deliveries for validation
      const invoice = await tx.invoices.findUnique({
        where: { id: invoiceId },
        include: {
          customer: {
            select: { name: true },
          },
          invoiceItems: {
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
          deliveries: {
            orderBy: { createdAt: "desc" },
            take: 1, // Get the latest delivery
          },
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Validate that the latest delivery is in a failed state before allowing Pengiriman ulang
      if (invoice.deliveries.length > 0) {
        const latestDelivery = invoice.deliveries[0];
        if (
          latestDelivery.status !== "RETURNED" &&
          latestDelivery.status !== "CANCELLED"
        ) {
          throw new Error(
            `Cannot approve Pengiriman ulang. Latest delivery status is ${latestDelivery.status}. Only RETURNED or CANCELLED deliveries can be re-approved.`
          );
        }
      }

      // Validate that Pengiriman ulang is not already approved
      if (invoice.allowRedelivery === true) {
        throw new Error(
          "Pengiriman ulang is already approved for this invoice"
        );
      }

      // Update invoice to allow Pengiriman ulang and reset status to SENT
      const updatedInvoice = await tx.invoices.update({
        where: { id: invoiceId },
        data: {
          allowRedelivery: true,
          status: InvoiceStatus.SENT, // Reset status back to SENT for Pengiriman ulang
        },
      });

      // Create stock movements for Pengiriman ulang (items going out again)
      const stockMovements = [];

      for (const item of invoice.invoiceItems) {
        const product = item.products;
        const previousStock = product.currentStock;
        const newStock = previousStock - item.quantity; // Subtract stock for Pengiriman ulang

        if (newStock < 0) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Available: ${previousStock}, Required: ${item.quantity}`
          );
        }

        // Create stock movement record for Pengiriman ulang
        const stockMovement = await tx.stockMovements.create({
          data: {
            type: StockMovementType.SALES_OUT,
            quantity: item.quantity,
            previousStock: previousStock,
            newStock: newStock,
            reference: `Pengiriman Ulang disetujui: ${invoice.code}`,
            notes: `Pengiriman Ulang Untuk Invoice ${invoice.code}`,
            productId: product.id,
            userId: userId,
          },
        });

        stockMovements.push(stockMovement);

        // Update product stock
        await tx.products.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });
      }

      return {
        invoice: updatedInvoice,
        customer: invoice.customer,
        stockMovements,
      };
    });

    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    return {
      success: true,
      message: `Pengiriman ulang disetujui untuk invoice ${result.invoice.code} `,
      stockMovements: result.stockMovements,
    };
  } catch (error: any) {
    console.error("Error approving Pengiriman ulang:", error);
    return {
      success: false,
      error: error.message || "Failed to approve Pengiriman ulang",
    };
  }
}

// Admin function to revoke Pengiriman ulang approval for an invoice
export async function revokeRedeliveryApproval(
  invoiceId: string,
  userId: string = "system"
) {
  try {
    const result = await db.$transaction(async tx => {
      // Ambil invoice dengan item untuk mengembalikan stok
      const invoice = await tx.invoices.findUnique({
        where: { id: invoiceId },
        include: {
          customer: {
            select: { name: true },
          },
          invoiceItems: {
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

      if (!invoice) {
        throw new Error("Invoice tidak ditemukan");
      }

      // Validasi bahwa pengiriman ulang sudah disetujui sebelumnya
      if (invoice.allowRedelivery !== true) {
        throw new Error(
          "Pengiriman ulang belum pernah disetujui untuk invoice ini"
        );
      }

      // Kembalikan stok dengan menambahkan kembali jumlah yang dikurangi saat persetujuan pengiriman ulang
      const stockMovements = [];

      for (const item of invoice.invoiceItems) {
        const product = item.products;
        const previousStock = product.currentStock;
        const newStock = previousStock + item.quantity; // Tambahkan kembali stok

        // Buat catatan pergerakan stok untuk pembatalan pengiriman ulang
        const stockMovement = await tx.stockMovements.create({
          data: {
            type: StockMovementType.RETURN_IN,
            quantity: item.quantity,
            previousStock: previousStock,
            newStock: newStock,
            reference: `Persetujuan pengiriman ulang dicabut: ${invoice.code}`,
            notes: `Stok dikembalikan karena pencabutan persetujuan pengiriman ulang untuk invoice ${invoice.code}`,
            productId: product.id,
            userId: userId,
          },
        });

        stockMovements.push(stockMovement);

        // Update stok produk
        await tx.products.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });
      }

      // Update invoice untuk mencabut persetujuan pengiriman ulang
      const updatedInvoice = await tx.invoices.update({
        where: { id: invoiceId },
        data: { allowRedelivery: false },
      });

      return {
        invoice: updatedInvoice,
        customer: invoice.customer,
        stockMovements,
      };
    });

    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    return {
      success: true,
      message: `Persetujuan pengiriman ulang dicabut untuk invoice ${result.invoice.code}`,
      stockMovements: result.stockMovements,
    };
  } catch (error: any) {
    console.error("Error mencabut persetujuan pengiriman ulang:", error);
    return {
      success: false,
      error: error.message || "Gagal mencabut persetujuan pengiriman ulang",
    };
  }
}

// Get invoices that have failed deliveries and need admin approval for Pengiriman ulang
export async function getInvoicesNeedingRedeliveryApproval() {
  try {
    const invoices = await db.invoices.findMany({
      where: {
        OR: [
          {
            // Invoice SENT dengan pengiriman yang gagal
            status: InvoiceStatus.SENT,
            deliveries: {
              some: {
                status: {
                  in: ["CANCELLED", "RETURNED"],
                },
              },
            },
            allowRedelivery: false, // Belum disetujui untuk pengiriman ulang
          },
          {
            // Invoice CANCELLED yang berpotensi dikirim ulang
            status: InvoiceStatus.CANCELLED,
            allowRedelivery: false, // Belum disetujui untuk pengiriman ulang
          },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        deliveries: {
          where: {
            status: {
              in: ["CANCELLED", "RETURNED"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Ambil pengiriman gagal terakhir
          include: {
            helper: {
              select: {
                name: true,
              },
            },
          },
        },
        invoiceItems: {
          include: {
            products: {
              select: {
                name: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return invoices;
  } catch (error) {
    console.error(
      "Error mengambil invoice yang memerlukan persetujuan pengiriman ulang:",
      error
    );
    throw new Error(
      "Gagal mengambil invoice yang memerlukan persetujuan pengiriman ulang"
    );
  }
}

// Debug function to check allowRedelivery status for an invoice
export async function checkAllowRedeliveryStatus(invoiceId: string) {
  try {
    const invoice = await db.invoices.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        code: true,
        status: true,
        allowRedelivery: true,
        deliveries: {
          select: {
            id: true,
            code: true,
            status: true,
            createdAt: true,
            returnReason: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return {
      success: true,
      data: invoice,
    };
  } catch (error) {
    console.error("Error checking allowRedelivery status:", error);
    return {
      success: false,
      error: "Failed to check allowRedelivery status",
    };
  }
}
