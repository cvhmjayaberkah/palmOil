// lib/actions/purchaseOrders.ts
"use server";

import db from "@/lib/db";
import {
  PurchaseOrders,
  PurchaseOrderItems,
  PurchaseOrderStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export type PurchaseOrderItemFormData = {
  productId: string;
  quantity: number;
  price: number; // Harga per unit saat PO dibuat
  discount: number; // Potongan per item
  discountType: "AMOUNT" | "PERCENTAGE"; // Tipe diskon per item
  totalPrice: number; // Total harga untuk item ini
};

export type PurchaseOrderFormData = {
  code: string;
  poDate: Date;
  // dateline: Date;
  notes?: string;
  creatorId: string;
  orderId: string; // Optional untuk PO yang tidak berasal dari Order
  totalAmount: number; // Total nilai PO
  orderLevelDiscount: number; // Potongan keseluruhan
  orderLevelDiscountType: "AMOUNT" | "PERCENTAGE"; // Tipe diskon keseluruhan
  paymentMethod?: Date | null; // Net Pembayaran sebagai date
  totalDiscount: number; // Total semua potongan
  totalTax: number; // Total pajak
  taxPercentage: number | null; // Persentase pajak
  taxAmount: number; // Nominal pajak yang akan disimpan
  shippingCost: number; // Biaya pengiriman
  totalPayment: number; // Total pembayaran akhir
  paymentDeadline?: Date | null; // Tenggat pembayaran
  items: PurchaseOrderItemFormData[];
};

export type PurchaseOrderWithDetails = PurchaseOrders & {
  creator: {
    id: string;
    name: string;
  };
  order?: {
    id: string;
    orderNumber: string;
    customer: {
      id: string;
      name: string;
    };
  } | null;
  items: (PurchaseOrderItems & {
    product: {
      id: string;
      name: string;
      unit: string;
    };
  })[];
};

// Get all purchase orders
export async function getPurchaseOrders(): Promise<PurchaseOrderWithDetails[]> {
  try {
    const purchaseOrders = await db.purchaseOrders.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return purchaseOrders;
  } catch (error) {
    console.error("Error getting purchase orders:", error);
    throw new Error("Failed to fetch purchase orders");
  }
}

// Get purchase order by ID
export async function getPurchaseOrderById(
  id: string
): Promise<PurchaseOrderWithDetails | null> {
  try {
    const purchaseOrder = await db.purchaseOrders.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            orderItems: {
              include: {
                products: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    return purchaseOrder;
  } catch (error) {
    console.error("Error getting purchase order by ID:", error);
    throw new Error("Failed to fetch purchase order");
  }
}
// Get available orders (that don't have PO yet, or are linked to the current PO being edited)
export async function getAvailableOrders(currentPoId?: string) {
  try {
    const orders = await db.orders.findMany({
      where: {
        status: {
          in: ["NEW", "PROCESSING", "PENDING_CONFIRMATION", "IN_PROCESS"],
        },
        OR: [
          {
            purchaseOrders: {
              none: {}, // Orders yang belum punya PO
            },
          },
          {
            purchaseOrders: {
              some: {
                id: currentPoId,
              },
            },
          },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            discount: true,
            discountType: true, // ✅ Add discountType field
            totalPrice: true,
            orderId: true,
            productId: true,
            createdAt: true,
            updatedAt: true,
            products: {
              select: {
                id: true,
                name: true,
                unit: true,
                price: true,
                sellingPrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        orderDate: "desc",
      },
    });

    return orders;
  } catch (error) {
    console.error("Error getting available orders:", error);
    throw new Error("Failed to fetch available orders");
  }
}

// Get available users (ADMIN, OWNER, WAREHOUSE)
export async function getAvailableUsers() {
  try {
    const users = await db.users.findMany({
      where: {
        role: {
          in: ["ADMIN", "OWNER", "WAREHOUSE"],
        },
        isActive: true,
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
    console.error("Error getting available users:", error);
    throw new Error("Failed to fetch available users");
  }
}

// Get products with stock information
export async function getProductsWithStock() {
  try {
    const products = await db.products.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        unit: true,
        price: true,
        sellingPrice: true,
        currentStock: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return products;
  } catch (error) {
    console.error("Error getting products with stock:", error);
    throw new Error("Failed to fetch products with stock");
  }
}

// Get product stock by ID
export async function getProductStock(productId: string) {
  try {
    const product = await db.products.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        currentStock: true,
        unit: true,
      },
    });

    return product;
  } catch (error) {
    console.error("Error getting product stock:", error);
    throw new Error("Failed to fetch product stock");
  }
}

// Create purchase order
export async function createPurchaseOrder(
  data: PurchaseOrderFormData
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Validasi tanggal
    // if (data.dateline < data.poDate) {
    //   return {
    //     success: false,
    //     error: "Tanggal deadline tidak boleh lebih awal dari tanggal PO",
    //   };
    // }

    // Validasi taxPercentage
    if (data.taxPercentage === null || data.taxPercentage === undefined) {
      return {
        success: false,
        error: "Pajak wajib dipilih",
      };
    }

    // Validasi stok untuk semua item
    for (const item of data.items) {
      const product = await db.products.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, currentStock: true },
      });

      if (!product) {
        return {
          success: false,
          error: `Produk dengan ID ${item.productId} tidak ditemukan`,
        };
      }

      if (product.currentStock < item.quantity) {
        return {
          success: false,
          error: `Stok ${product.name} tidak mencukupi. Stok tersedia: ${product.currentStock}, diminta: ${item.quantity}`,
        };
      }
    }

    // Create purchase order with items
    const result = await db.$transaction(async tx => {
      // Create the main purchase order
      const purchaseOrder = await tx.purchaseOrders.create({
        data: {
          code: data.code,
          poDate: data.poDate,
          notes: data.notes,
          creatorId: data.creatorId,
          orderId: data.orderId,
          totalAmount: data.totalAmount,
          orderLevelDiscount: data.orderLevelDiscount,
          orderLevelDiscountType: data.orderLevelDiscountType,
          paymentMethod:
            data.paymentMethod?.toISOString().split("T")[0] || null,
          totalDiscount: data.totalDiscount,
          totalTax: data.totalTax,
          taxPercentage: data.taxPercentage || 0,
          taxAmount: data.taxAmount || 0,
          shippingCost: data.shippingCost,
          totalPayment: data.totalPayment,
          paymentDeadline: data.paymentDeadline,
          status: "PENDING",
        },
      });

      // Update order status to PROCESSING
      await tx.orders.update({
        where: { id: data.orderId },
        data: { status: "PROCESSING" },
      });

      // Create purchase order items
      const items = await tx.purchaseOrderItems.createMany({
        data: data.items.map(item => ({
          purchaseOrderId: purchaseOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          discountType: item.discountType,
          totalPrice: item.totalPrice,
        })),
      });

      return { purchaseOrder, items };
    });

    revalidatePath("/purchasing/daftar-po");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return {
      success: false,
      error: "Gagal membuat purchase order. Silakan coba lagi.",
    };
  }
}

// Update purchase order
export async function updatePurchaseOrder(
  id: string,
  data: PurchaseOrderFormData
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Validasi tanggal
    // if (data.dateline < data.poDate) {
    //   return {
    //     success: false,
    //     error: "Tanggal deadline tidak boleh lebih awal dari tanggal PO",
    //   };
    // }

    // Validasi taxPercentage
    if (data.taxPercentage === null || data.taxPercentage === undefined) {
      return {
        success: false,
        error: "Pajak wajib dipilih",
      };
    }

    // Validasi stok untuk semua item
    for (const item of data.items) {
      const product = await db.products.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, currentStock: true },
      });

      if (!product) {
        return {
          success: false,
          error: `Produk dengan ID ${item.productId} tidak ditemukan`,
        };
      }

      if (product.currentStock < item.quantity) {
        return {
          success: false,
          error: `Stok ${product.name} tidak mencukupi. Stok tersedia: ${product.currentStock}, diminta: ${item.quantity}`,
        };
      }
    }

    const result = await db.$transaction(async tx => {
      // Update the main purchase order
      const purchaseOrder = await tx.purchaseOrders.update({
        where: { id },
        data: {
          code: data.code,
          poDate: data.poDate,
          notes: data.notes,
          creatorId: data.creatorId,
          orderId: data.orderId,
          totalAmount: data.totalAmount,
          orderLevelDiscount: data.orderLevelDiscount,
          orderLevelDiscountType: data.orderLevelDiscountType,
          paymentMethod:
            data.paymentMethod?.toISOString().split("T")[0] || null,
          totalDiscount: data.totalDiscount,
          totalTax: data.totalTax,
          taxPercentage: data.taxPercentage || 0,
          taxAmount: data.taxAmount || 0,
          shippingCost: data.shippingCost,
          totalPayment: data.totalPayment,
          paymentDeadline: data.paymentDeadline,
        },
      });

      // Update order status to PROCESSING
      await tx.orders.update({
        where: { id: data.orderId },
        data: { status: "PROCESSING" },
      });

      // Delete existing items
      await tx.purchaseOrderItems.deleteMany({
        where: { purchaseOrderId: id },
      });

      // Create new items
      const items = await tx.purchaseOrderItems.createMany({
        data: data.items.map(item => ({
          purchaseOrderId: id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          discountType: item.discountType,
          totalPrice: item.totalPrice,
        })),
      });

      return { purchaseOrder, items };
    });

    revalidatePath("/purchasing/daftar-po");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return {
      success: false,
      error: "Gagal mengupdate purchase order. Silakan coba lagi.",
    };
  }
}

// Delete purchase order
export async function deletePurchaseOrder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$transaction(async tx => {
      // Check if there's an existing invoice for this purchase order (double-check)
      const [existingInvoice, poWithInvoice] = await Promise.all([
        tx.invoices.findFirst({
          where: {
            AND: [{ purchaseOrderId: id }, { purchaseOrderId: { not: null } }],
          },
          select: { id: true, code: true, purchaseOrderId: true },
        }),
        tx.purchaseOrders.findUnique({
          where: { id },
          include: { invoices: true },
        }),
      ]);


      const hasInvoice = existingInvoice || poWithInvoice?.invoices;

      if (hasInvoice) {
        const invoiceCode =
          existingInvoice?.code || poWithInvoice?.invoices?.code || "Unknown";
        const errorMessage = `Tidak dapat menghapus Purchase Order karena sudah dibuatkan Invoice ${invoiceCode}. Hapus Invoice terlebih dahulu jika diperlukan.`;
        throw new Error(errorMessage);
      }


      // Delete items first (cascade should handle this, but being explicit)
      await tx.purchaseOrderItems.deleteMany({
        where: { purchaseOrderId: id },
      });

      // Delete the purchase order
      await tx.purchaseOrders.delete({
        where: { id },
      });

    });

    revalidatePath("/purchasing/daftar-po");
    return { success: true };
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menghapus purchase order. Silakan coba lagi.",
    };
  }
}

// Check if a Purchase Order can be deleted (no associated invoice)
export async function canDeletePurchaseOrder(
  id: string
): Promise<{ canDelete: boolean; reason?: string }> {
  try {
    // Check both the direct relationship and the foreign key
    const [existingInvoice, poWithInvoice] = await Promise.all([
      db.invoices.findFirst({
        where: {
          AND: [{ purchaseOrderId: id }, { purchaseOrderId: { not: null } }],
        },
        select: { id: true, code: true, purchaseOrderId: true },
      }),
      db.purchaseOrders.findUnique({
        where: { id },
        include: { invoices: true },
      }),
    ]);

    const hasInvoice = existingInvoice || poWithInvoice?.invoices;

    if (hasInvoice) {
      const invoiceCode =
        existingInvoice?.code || poWithInvoice?.invoices?.code || "Unknown";
      const reason = `Purchase Order sudah dibuatkan Invoice ${invoiceCode}`;
      return {
        canDelete: false,
        reason,
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error("Error checking if purchase order can be deleted:", error);
    return {
      canDelete: false,
      reason: "Terjadi kesalahan saat memeriksa status Purchase Order",
    };
  }
}

// Debug function to test the relationship and data
export async function debugPurchaseOrderInvoiceRelation(id: string) {
  try {

    // First, let's see if the PO exists
    const po = await db.purchaseOrders.findUnique({
      where: { id },
      select: { id: true, code: true, status: true },
    });

    // Then check for invoices with this purchaseOrderId
    const invoicesByPOId = await db.invoices.findMany({
      where: { purchaseOrderId: id },
      select: { id: true, code: true, purchaseOrderId: true },
    });

    // Also check the PO with its invoice relationship
    const poWithInvoice = await db.purchaseOrders.findUnique({
      where: { id },
      include: { invoices: true },
    });

    // Also check how many invoices total have purchaseOrderId
    const allInvoicesWithPO = await db.invoices.findMany({
      where: {
        purchaseOrderId: { not: null },
      },
      select: { id: true, code: true, purchaseOrderId: true },
    });

    // Return summary
    return {
      purchaseOrder: po,
      invoices: invoicesByPOId,
      allInvoicesWithPO: allInvoicesWithPO,
      hasInvoice: invoicesByPOId.length > 0,
      canDelete: invoicesByPOId.length === 0,
    };
  } catch (error) {
    console.error("[DEBUG] Error in debug function:", error);
    return null;
  }
}

// Update purchase order status
export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.purchaseOrders.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/purchasing/daftar-po");
    return { success: true };
  } catch (error) {
    console.error("Error updating purchase order status:", error);
    return {
      success: false,
      error: "Gagal mengupdate status purchase order. Silakan coba lagi.",
    };
  }
}
