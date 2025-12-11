// lib/actions/invoices.ts
"use server";

import db from "@/lib/db";
import {
  Invoices,
  InvoiceItems,
  InvoiceStatus,
  InvoiceType,
  PurchaseOrderStatus,
  DiscountValueType,
  StockMovementType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export type InvoiceItemFormData = {
  productId: string; // No longer optional - required field
  quantity: number;
  price: number;
  discount: number;
  discountType: DiscountValueType;
  totalPrice: number; // calculated as (quantity * price) - discount
  finalPrice?: number; // harga setelah diskon per item
};

export type InvoiceFormData = {
  code: string;
  invoiceDate: Date;
  dueDate: Date | null;
  status: InvoiceStatus;
  type: InvoiceType; // Will only support PRODUCT now
  subtotal: number;
  tax: number;
  taxPercentage: number;
  taxAmount: number; // Nominal pajak yang disimpan
  discount: number;
  discountType: DiscountValueType;
  actualDiscount?: number; // nilai diskon yang sesungguhnya
  shippingCost: number;
  totalAmount: number;
  notes?: string;
  customerId?: string | null;
  purchaseOrderId?: string;
  createdBy: string;
  useDeliveryNote: boolean;
  items: InvoiceItemFormData[];
};

export type InvoiceWithDetails = Invoices & {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string;
  } | null;
  purchaseOrder?: {
    id: string;
    code: string;
    status: string;
  } | null;
  creator?: {
    id: string;
    name: string;
  } | null;
  updater?: {
    id: string;
    name: string;
  } | null;
  deliveries?: {
    id: string;
    code: string;
    status: string;
    returnReason: string | null;
    completedAt: Date | null;
    deliveryDate: Date;
    notes: string | null;
    helper: {
      name: string;
    };
  }[];
  payments?: {
    id: string;
    paymentCode: string;
    amount: number;
    paymentDate: Date;
    method: string;
    reference: string | null;
    status: string;
    notes: string | null;
  }[];
  invoiceItems: (InvoiceItems & {
    products: {
      id: string;
      name: string;
      unit: string;
      price: number;
    }; // No longer nullable - always required
  })[];
};

// Get all invoices
export async function getInvoices(): Promise<InvoiceWithDetails[]> {
  try {
    const invoices = await db.invoices.findMany({
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
        purchaseOrder: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
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
                sellingPrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return invoices;
  } catch (error) {
    console.error("Error getting invoices:", error);
    return [];
  }
}

// Get invoice by ID
export async function getInvoiceById(
  id: string
): Promise<InvoiceWithDetails | null> {
  try {
    const invoice = await db.invoices.findUnique({
      where: { id },
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
        purchaseOrder: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveries: {
          select: {
            id: true,
            code: true,
            status: true,
            returnReason: true,
            completedAt: true,
            deliveryDate: true,
            notes: true,
            helper: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
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
          },
          orderBy: {
            createdAt: "desc",
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
                sellingPrice: true,
              },
            },
          },
        },
      },
    });

    return invoice;
  } catch (error) {
    console.error("Error getting invoice by ID:", error);
    throw new Error("Failed to fetch invoice");
  }
}

// Get available customers for invoice creation
export async function getAvailableCustomers() {
  try {
    const customers = await db.customers.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return customers;
  } catch (error) {
    console.error("Error getting available customers:", error);
    throw new Error("Failed to fetch customers");
  }
}

// Get available purchase orders for invoice creation (only PO with status PROCESSING and stock confirmed)
export async function getAvailablePurchaseOrders() {
  try {
    const purchaseOrders = await db.purchaseOrders.findMany({
      where: {
        // PO should not already have an invoice
        invoices: {
          is: null, // Mencari PO yang tidak memiliki invoice
        },
        // PO status should be PROCESSING
        status: PurchaseOrderStatus.PENDING,
        // Stock confirmation field removed - stock validation now done at PO creation
      },
      include: {
        // creator: {
        //   select: {
        //     id: true,
        //     name: true,
        //   },
        // },
        items: {
          include: {
            product: {
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
        order: {
          include: {
            customer: {
              select: {
                name: true,
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
    console.error("Error getting available purchase orders:", error);
    throw new Error("Failed to fetch purchase orders");
  }
}

// Get available purchase orders for editing (includes currently used PO)
export async function getAvailablePurchaseOrdersForEdit(
  currentInvoiceId?: string
) {
  try {
    const purchaseOrders = await db.purchaseOrders.findMany({
      where: {
        OR: [
          // PO should not already have an invoice
          {
            invoices: {
              is: null,
            },
          },
          // OR PO is used by current invoice being edited
          ...(currentInvoiceId
            ? [
                {
                  invoices: {
                    id: currentInvoiceId,
                  },
                },
              ]
            : []),
        ],
        // PO status should be PROCESSING
        status: PurchaseOrderStatus.PROCESSING,
      },
      include: {
        items: {
          include: {
            product: {
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
        order: {
          include: {
            customer: {
              select: {
                name: true,
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
    console.error("Error getting available purchase orders for edit:", error);
    throw new Error("Failed to fetch purchase orders");
  }
}

// Get available products for invoice items
export async function getAvailableProducts() {
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
        bottlesPerCrate: true, // Add bottlesPerCrate from database
      },
      orderBy: {
        name: "asc",
      },
    });

    return products;
  } catch (error) {
    console.error("Error getting available products:", error);
    throw new Error("Failed to fetch products");
  }
}

// Get available users (for created by field)
export async function getAvailableUsers() {
  try {
    const users = await db.users.findMany({
      where: {
        isActive: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
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
    throw new Error("Failed to fetch users");
  }
}

// Get product stock information
export async function getProductStock(productId: string) {
  try {
    const product = await db.products.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        code: true,
        currentStock: true,
        minStock: true,
        unit: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    return {
      success: true,
      data: {
        ...product,
        isLowStock: product.currentStock <= product.minStock,
        stockStatus:
          product.currentStock <= product.minStock
            ? "low"
            : product.currentStock <= product.minStock * 2
            ? "medium"
            : "high",
      },
    };
  } catch (error) {
    console.error("Error getting product stock:", error);
    throw new Error("Failed to get product stock");
  }
}

// Helper function to validate stock availability
export async function validateStockAvailability(items: InvoiceItemFormData[]) {
  const stockValidation = await Promise.all(
    items.map(async item => {
      const product = await db.products.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, currentStock: true, code: true },
      });

      if (!product) {
        return {
          productId: item.productId,
          valid: false,
          error: `Product not found`,
        };
      }

      if (product.currentStock < item.quantity) {
        return {
          productId: item.productId,
          productName: product.name,
          productCode: product.code,
          valid: false,
          error: `Insufficient stock. Available: ${product.currentStock}, Required: ${item.quantity}`,
          currentStock: product.currentStock,
          requiredQuantity: item.quantity,
        };
      }

      return {
        productId: item.productId,
        productName: product.name,
        productCode: product.code,
        valid: true,
        currentStock: product.currentStock,
        requiredQuantity: item.quantity,
      };
    })
  );

  const invalidItems = stockValidation.filter(item => !item.valid);

  return {
    isValid: invalidItems.length === 0,
    invalidItems,
    validationResults: stockValidation,
  };
}

// Helper function to validate stock availability for update invoice
export async function validateStockAvailabilityForUpdate(
  invoiceId: string,
  newItems: InvoiceItemFormData[]
) {
  // Get current invoice items to calculate current stock usage
  const currentInvoice = await db.invoices.findUnique({
    where: { id: invoiceId },
    include: {
      invoiceItems: {
        include: {
          products: {
            select: {
              id: true,
              name: true,
              code: true,
              currentStock: true,
            },
          },
        },
      },
    },
  });

  if (!currentInvoice) {
    throw new Error("Invoice not found");
  }

  const stockValidation = await Promise.all(
    newItems.map(async newItem => {
      const product = await db.products.findUnique({
        where: { id: newItem.productId },
        select: { id: true, name: true, currentStock: true, code: true },
      });

      if (!product) {
        return {
          productId: newItem.productId,
          valid: false,
          error: `Product not found`,
        };
      }

      // Find current usage of this product in this invoice
      const currentItem = currentInvoice.invoiceItems.find(
        item => item.productId === newItem.productId
      );
      const currentUsage = currentItem ? currentItem.quantity : 0;

      // Calculate available stock (current stock + what will be returned from current invoice)
      const availableStock = product.currentStock + currentUsage;

      if (availableStock < newItem.quantity) {
        return {
          productId: newItem.productId,
          productName: product.name,
          productCode: product.code,
          valid: false,
          error: `Insufficient stock. Available: ${availableStock}, Required: ${newItem.quantity}`,
          availableStock: availableStock,
          requiredQuantity: newItem.quantity,
        };
      }

      return {
        productId: newItem.productId,
        productName: product.name,
        productCode: product.code,
        valid: true,
        availableStock: availableStock,
        requiredQuantity: newItem.quantity,
      };
    })
  );

  const invalidItems = stockValidation.filter(item => !item.valid);

  return {
    isValid: invalidItems.length === 0,
    invalidItems,
    validationResults: stockValidation,
  };
}

// Helper function to create stock movements for invoice items
async function createStockMovements(
  tx: any,
  invoiceId: string,
  items: InvoiceItemFormData[],
  userId: string,
  isUpdate: boolean = false
) {
  const stockMovements = [];

  for (const item of items) {
    // Get current product stock
    const product = await tx.products.findUnique({
      where: { id: item.productId },
      select: { currentStock: true },
    });

    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }

    const previousStock = product.currentStock;
    const newStock = previousStock - item.quantity;

    // Create stock movement record
    const stockMovement = await tx.stockMovements.create({
      data: {
        type: StockMovementType.SALES_OUT,
        quantity: item.quantity,
        previousStock: previousStock,
        newStock: newStock,
        reference: `Invoice: ${invoiceId}`,
        notes: isUpdate
          ? `Pengurangan stok untuk update invoice`
          : `Pengurangan stok untuk pembuatan invoice`,
        productId: item.productId,
        userId: userId,
      },
    });

    stockMovements.push(stockMovement);

    // Update product stock
    await tx.products.update({
      where: { id: item.productId },
      data: { currentStock: newStock },
    });
  }

  return stockMovements;
}

// Helper function to reverse stock movements when deleting invoice
async function reverseStockMovements(
  tx: any,
  invoiceId: string,
  userId: string
) {
  // Find all stock movements related to this invoice
  const invoiceStockMovements = await tx.stockMovements.findMany({
    where: {
      reference: `Invoice: ${invoiceId}`,
      type: StockMovementType.SALES_OUT,
    },
    include: {
      products: {
        select: {
          id: true,
          currentStock: true,
        },
      },
    },
  });

  // Restore stock to products without creating new stock movements
  for (const movement of invoiceStockMovements) {
    const product = movement.products;
    const restoredStock = product.currentStock + movement.quantity; // Add back the quantity

    // Update product stock only
    await tx.products.update({
      where: { id: product.id },
      data: { currentStock: restoredStock },
    });
  }

  // Delete original stock movements
  await tx.stockMovements.deleteMany({
    where: {
      reference: `Invoice: ${invoiceId}`,
      type: StockMovementType.SALES_OUT,
    },
  });

  return { restored: true, movementsDeleted: invoiceStockMovements.length };
}

// Helper function to restore stock for invoice cancellation (without deleting original movements)
async function restoreStockForCancellation(
  tx: any,
  invoiceId: string,
  userId: string
) {
  // Find all stock movements related to this invoice
  const invoiceStockMovements = await tx.stockMovements.findMany({
    where: {
      reference: `Invoice: ${invoiceId}`,
      type: StockMovementType.SALES_OUT,
    },
    include: {
      products: {
        select: {
          id: true,
          currentStock: true,
        },
      },
    },
  });

  const restorationMovements = [];

  for (const movement of invoiceStockMovements) {
    const product = movement.products;
    const previousStock = product.currentStock;
    const newStock = previousStock + movement.quantity; // Add back the quantity

    // Create new stock movement for cancellation (don't delete original)
    const restorationMovement = await tx.stockMovements.create({
      data: {
        type: StockMovementType.RETURN_IN,
        quantity: movement.quantity,
        previousStock: previousStock,
        newStock: newStock,
        reference: `Pembatalan Invoice: ${invoiceId}`,
        notes: `Pemulihan stok karena pembatalan invoice`,
        productId: product.id,
        userId: userId,
      },
    });

    restorationMovements.push(restorationMovement);

    // Update product stock
    await tx.products.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });
  }

  return restorationMovements;
}

// Helper function to update existing stock movements when invoice is updated
async function updateStockMovements(
  tx: any,
  invoiceId: string,
  oldItems: any[],
  newItems: InvoiceItemFormData[],
  userId: string
) {
  // Get existing stock movements for this invoice
  const existingStockMovements = await tx.stockMovements.findMany({
    where: {
      reference: `Invoice: ${invoiceId}`,
      type: StockMovementType.SALES_OUT,
    },
  });

  // Create a map of existing movements by productId
  const existingMovementsMap = new Map();
  existingStockMovements.forEach((movement: any) => {
    existingMovementsMap.set(movement.productId, movement);
  });

  // Create a map of new items by productId
  const newItemsMap = new Map();
  newItems.forEach((item: InvoiceItemFormData) => {
    newItemsMap.set(item.productId, item);
  });

  const updatedMovements = [];

  // Process each product that was in the old invoice
  for (const [productId, existingMovement] of existingMovementsMap) {
    const newItem = newItemsMap.get(productId);

    // Get current product stock
    const product = await tx.products.findUnique({
      where: { id: productId },
      select: { currentStock: true },
    });

    if (!product) continue;

    if (newItem) {
      // Product exists in both old and new - update the movement
      const stockDifference = newItem.quantity - existingMovement.quantity;
      const newStock = product.currentStock - stockDifference;

      // Update existing stock movement
      const updatedMovement = await tx.stockMovements.update({
        where: { id: existingMovement.id },
        data: {
          quantity: newItem.quantity,
          previousStock: product.currentStock,
          newStock: newStock,
          notes: `Update stok untuk perubahan invoice`,
          updatedAt: new Date(),
        },
      });

      // Update product stock
      await tx.products.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      updatedMovements.push(updatedMovement);
      newItemsMap.delete(productId); // Remove from new items map as it's processed
    } else {
      // Product was removed from invoice - restore its stock and delete movement
      const restoredStock = product.currentStock + existingMovement.quantity;

      await tx.products.update({
        where: { id: productId },
        data: { currentStock: restoredStock },
      });

      await tx.stockMovements.delete({
        where: { id: existingMovement.id },
      });
    }
  }

  // Process remaining new items (products that weren't in the old invoice)
  for (const [productId, newItem] of newItemsMap) {
    const product = await tx.products.findUnique({
      where: { id: productId },
      select: { currentStock: true },
    });

    if (!product) continue;

    const previousStock = product.currentStock;
    const newStock = previousStock - newItem.quantity;

    // Create new stock movement for new product
    const newMovement = await tx.stockMovements.create({
      data: {
        type: StockMovementType.SALES_OUT,
        quantity: newItem.quantity,
        previousStock: previousStock,
        newStock: newStock,
        reference: `Invoice: ${invoiceId}`,
        notes: `Pengurangan stok untuk produk baru dalam update invoice`,
        productId: productId,
        userId: userId,
      },
    });

    // Update product stock
    await tx.products.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    updatedMovements.push(newMovement);
  }

  return updatedMovements;
}

// Helper function to calculate actual discount for invoice
function calculateInvoiceActualDiscount(
  subtotal: number,
  discount: number,
  discountType: DiscountValueType
): number {
  if (discountType === DiscountValueType.PERCENTAGE) {
    return Math.round((subtotal * discount) / 100);
  } else {
    // AMOUNT discount
    return Math.round(discount);
  }
}

// Helper function to process invoice items - tidak perlu lagi hitung finalPrice di backend
function processInvoiceItems(
  items: InvoiceItemFormData[]
): InvoiceItemFormData[] {
  // Return items as is, karena finalPrice sudah dihitung di frontend
  return items;
}

// Create new invoice
export async function createInvoice(data: InvoiceFormData) {
  try {
    // First, validate stock availability
    const stockValidation = await validateStockAvailability(data.items);

    if (!stockValidation.isValid) {
      const errorMessages = stockValidation.invalidItems
        .map(item => item.error)
        .join(", ");
      throw new Error(`Stock validation failed: ${errorMessages}`);
    }

    // Process items - finalPrice sudah dikirim dari frontend
    const processedItems = processInvoiceItems(data.items);

    // actualDiscount sudah dikirim dari frontend, tidak perlu hitung lagi
    const actualDiscount = data.actualDiscount || 0;

    const remainingAmount = data.totalAmount - 0; // paidAmount starts at 0

    const result = await db.$transaction(async tx => {
      // Create invoice
      const invoice = await tx.invoices.create({
        data: {
          code: data.code,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          status: data.status,
          type: data.type,
          subtotal: data.subtotal,
          tax: data.tax, //ini ga guna
          taxPercentage: data.taxPercentage,
          taxAmount: data.taxAmount, // ini ga guna
          discount: data.discount,
          discountType: data.discountType,
          actualDiscount: actualDiscount, // Add new field
          shippingCost: data.shippingCost,
          totalAmount: data.totalAmount,
          paidAmount: 0,
          remainingAmount: remainingAmount,
          notes: data.notes,
          customerId: data.customerId || null,
          purchaseOrderId: data.purchaseOrderId,
          createdBy: data.createdBy,
          useDeliveryNote: data.useDeliveryNote,
        },
      });

      // Create invoice items - include finalPrice
      const invoiceItems = await Promise.all(
        processedItems.map(item =>
          tx.invoiceItems.create({
            data: {
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
              discountType: item.discountType,
              totalPrice: item.totalPrice,
              finalPrice: item.finalPrice || 0, // Add new field
              invoiceId: invoice.id,
              productId: item.productId, // No longer nullable
            },
          })
        )
      );

      // Create stock movements and update product stocks
      const stockMovements = await createStockMovements(
        tx,
        invoice.id,
        data.items,
        data.createdBy,
        false // isUpdate = false for new invoice
      );

      // Update Purchase Order status to PROCESSING if PO is selected
      if (data.purchaseOrderId) {
        await tx.purchaseOrders.update({
          where: { id: data.purchaseOrderId },
          data: {
            status: PurchaseOrderStatus.PROCESSING,
          },
        });
      }

      return { invoice, invoiceItems, stockMovements };
    });

    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw new Error("Failed to create invoice");
  }
}

// Update invoice
export async function updateInvoice(
  id: string,
  data: InvoiceFormData,
  updatedBy: string
) {
  try {
    // First, validate stock availability for the new items (considering current stock will be returned)
    const stockValidation = await validateStockAvailabilityForUpdate(
      id,
      data.items
    );

    if (!stockValidation.isValid) {
      const errorMessages = stockValidation.invalidItems
        .map((item: any) => item.error)
        .join(", ");
      throw new Error(`Stock validation failed: ${errorMessages}`);
    }

    // Process items - finalPrice sudah dikirim dari frontend
    const processedItems = processInvoiceItems(data.items);

    // actualDiscount sudah dikirim dari frontend, tidak perlu hitung lagi
    const actualDiscount = data.actualDiscount || 0;

    const result = await db.$transaction(async tx => {
      // Get current invoice to preserve paidAmount and fetch existing items for stock reversal
      const currentInvoice = await tx.invoices.findUnique({
        where: { id },
        include: {
          invoiceItems: {
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!currentInvoice) {
        throw new Error("Invoice not found");
      }

      const remainingAmount = data.totalAmount - currentInvoice.paidAmount;

      // Update stock movements if invoice items changed
      const stockMovements = await updateStockMovements(
        tx,
        id,
        currentInvoice.invoiceItems,
        data.items,
        updatedBy
      );

      // Handle Purchase Order status changes
      if (currentInvoice.purchaseOrderId !== data.purchaseOrderId) {
        // If Purchase Order changed, reset old PO status if it exists
        if (currentInvoice.purchaseOrderId) {
          await tx.purchaseOrders.update({
            where: { id: currentInvoice.purchaseOrderId },
            data: {
              status: PurchaseOrderStatus.PENDING, // Reset to PENDING when invoice is unlinked
            },
          });
        }

        // If new Purchase Order is selected, set it to PROCESSING
        if (data.purchaseOrderId) {
          await tx.purchaseOrders.update({
            where: { id: data.purchaseOrderId },
            data: {
              status: PurchaseOrderStatus.PROCESSING,
            },
          });
        }
      }

      // Update invoice
      const invoice = await tx.invoices.update({
        where: { id },
        data: {
          code: data.code,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          status: data.status,
          type: data.type,
          subtotal: data.subtotal,
          tax: data.tax,
          taxPercentage: data.taxPercentage,
          taxAmount: data.taxAmount, // Nominal pajak yang disimpan
          discount: data.discount,
          discountType: data.discountType,
          actualDiscount: actualDiscount, // Add new field
          shippingCost: data.shippingCost,
          totalAmount: data.totalAmount,
          remainingAmount: remainingAmount,
          notes: data.notes,
          customerId: data.customerId || null,
          purchaseOrderId: data.purchaseOrderId,
          updatedBy: updatedBy,
          useDeliveryNote: data.useDeliveryNote,
        },
      });

      // Delete existing invoice items
      await tx.invoiceItems.deleteMany({
        where: { invoiceId: id },
      });

      // Create new invoice items - include finalPrice
      const invoiceItems = await Promise.all(
        processedItems.map((item, index) => {
          return tx.invoiceItems.create({
            data: {
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
              discountType: item.discountType,
              totalPrice: item.totalPrice,
              finalPrice: item.finalPrice || 0, // Add new field
              invoiceId: invoice.id,
              productId: item.productId, // No longer nullable
            },
          });
        })
      );

      return { invoice, invoiceItems, stockMovements };
    });

    revalidatePath("/sales/invoice");
    revalidatePath(`/sales/invoice/edit/${id}`);
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw new Error("Failed to update invoice");
  }
}

// Delete invoice
export async function deleteInvoice(id: string, deletedBy: string = "system") {
  try {
    await db.$transaction(async tx => {
      // Get invoice details including Purchase Order ID
      const invoiceToDelete = await tx.invoices.findUnique({
        where: { id },
        select: {
          id: true,
          purchaseOrderId: true,
        },
      });

      if (!invoiceToDelete) {
        throw new Error("Invoice not found");
      }

      // Check if there are any payments for this invoice
      const existingPayments = await tx.payments.findMany({
        where: { invoiceId: id },
      });

      if (existingPayments.length > 0) {
        throw new Error(
          "Cannot delete invoice. Payment data already exists for this invoice."
        );
      }

      // Check if there are any deliveries for this invoice
      const existingDeliveries = await tx.deliveries.findMany({
        where: { invoiceId: id },
      });

      if (existingDeliveries.length > 0) {
        throw new Error(
          "Cannot delete invoice. Delivery data already exists for this invoice."
        );
      }

      // Reverse stock movements before deleting invoice
      await reverseStockMovements(tx, id, deletedBy);

      // Reset Purchase Order status to PENDING if it was linked to this invoice
      if (invoiceToDelete.purchaseOrderId) {
        await tx.purchaseOrders.update({
          where: { id: invoiceToDelete.purchaseOrderId },
          data: {
            status: PurchaseOrderStatus.PENDING,
          },
        });
      }

      // Delete invoice items first (cascade should handle this, but explicit is better)
      await tx.invoiceItems.deleteMany({
        where: { invoiceId: id },
      });

      // Delete invoice
      await tx.invoices.delete({
        where: { id },
      });
    });

    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    if (
      error.message &&
      (error.message.includes("Payment data already exists") ||
        error.message.includes("Delivery data already exists"))
    ) {
      throw error; // Re-throw the custom error
    }
    throw new Error("Failed to delete invoice");
  }
}

// Get purchase order details for invoice creation
export async function getPurchaseOrderForInvoice(purchaseOrderId: string) {
  try {
    const purchaseOrder = await db.purchaseOrders.findUnique({
      where: { id: purchaseOrderId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        order: {
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
          },
        },
        items: {
          include: {
            product: {
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
    });

    return purchaseOrder;
  } catch (error) {
    console.error("Error getting purchase order for invoice:", error);
    throw new Error("Failed to fetch purchase order details");
  }
}

// Update invoice status to SENT when printed (only if current status is DRAFT)
export async function markInvoiceAsSent(invoiceId: string) {
  try {
    // First, check the current status of the invoice
    const currentInvoice = await db.invoices.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    if (!currentInvoice) {
      return {
        success: false,
        error: "Invoice not found",
      };
    }

    // Only update status to SENT if current status is DRAFT
    if (currentInvoice.status !== InvoiceStatus.DRAFT) {
      return {
        success: true,
        invoice: currentInvoice,
        message: "Invoice printed successfully, status unchanged",
      };
    }

    // Update status to SENT only if current status is DRAFT
    const invoice = await db.invoices.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.SENT,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
    });

    revalidatePath("/sales/invoice");
    revalidatePath(`/sales/invoice/edit/${invoiceId}`);
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/inventory/produk");

    return {
      success: true,
      invoice,
      message: "Invoice printed and status updated to SENT",
    };
  } catch (error) {
    console.error("Error updating invoice status to SENT:", error);
    return {
      success: false,
      error: "Failed to update invoice status",
    };
  }
}

// ==================== INVOICE CANCELLATION FUNCTIONS ====================

// Get invoices that can be canceled
export async function getCancelableInvoices() {
  try {
    const invoices = await db.invoices.findMany({
      where: {
        isCanceled: false,
        status: {
          not: "COMPLETED", // Only exclude COMPLETED status
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentDate: true,
          },
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            deliveryDate: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the latest delivery only
        },
      },
      orderBy: {
        invoiceDate: "asc",
      },
    });

    // Filter out invoices that have active deliveries (PENDING or IN_TRANSIT)
    const cancelableInvoices = invoices.filter(invoice => {
      const latestDelivery = invoice.deliveries[0]; // Get the latest delivery

      // If no delivery exists, invoice can be canceled
      if (!latestDelivery) {
        return true;
      }

      // If latest delivery is PENDING or IN_TRANSIT, invoice cannot be canceled
      if (
        latestDelivery.status === "PENDING" ||
        latestDelivery.status === "IN_TRANSIT"
      ) {
        return false;
      }

      // For other delivery statuses (DELIVERED, RETURNED, CANCELLED), invoice can be canceled
      return true;
    });

    return cancelableInvoices.reverse();
  } catch (error) {
    console.error("Error fetching cancelable invoices:", error);
    throw new Error("Gagal mengambil data invoice yang dapat dibatalkan");
  }
}

// Get canceled invoices history
export async function getCanceledInvoices() {
  try {
    const invoices = await db.invoices.findMany({
      where: {
        isCanceled: true,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        canceler: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        canceledAt: "desc",
      },
    });

    return invoices;
  } catch (error) {
    console.error("Error fetching canceled invoices:", error);
    throw new Error("Gagal mengambil data riwayat pembatalan invoice");
  }
}

// Get invoice by ID for cancellation
export async function getInvoiceForCancellation(id: string) {
  try {
    const invoice = await db.invoices.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentDate: true,
            method: true,
          },
        },
        invoiceItems: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            deliveryDate: true,
            code: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return invoice;
  } catch (error) {
    console.error("Error fetching invoice for cancellation:", error);
    throw new Error("Gagal mengambil data invoice");
  }
}

// Cancel invoice
export async function cancelInvoice(
  invoiceId: string,
  cancelReason: string,
  canceledBy: string
) {
  try {
    const result = await db.$transaction(async tx => {
      // Get invoice details
      const invoice = await tx.invoices.findUnique({
        where: { id: invoiceId },
        include: {
          payments: true,
          deliveries: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1, // Get the latest delivery only
          },
          purchaseOrder: {
            include: {
              order: true, // Include the related order
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Invoice tidak ditemukan");
      }

      // Validate cancellation rules
      if (invoice.isCanceled) {
        throw new Error("Invoice sudah dibatalkan sebelumnya");
      }

      if (invoice.status === "COMPLETED") {
        throw new Error("Invoice yang sudah selesai tidak dapat dibatalkan");
      }

      // Check if invoice has active delivery (PENDING or IN_TRANSIT)
      const latestDelivery = invoice.deliveries[0];
      if (
        latestDelivery &&
        (latestDelivery.status === "PENDING" ||
          latestDelivery.status === "IN_TRANSIT")
      ) {
        throw new Error(
          `Invoice tidak dapat dibatalkan karena sedang dalam proses pengiriman (Status: ${latestDelivery.status})`
        );
      }

      // Cancel all related payments
      if (invoice.payments.length > 0) {
        await tx.payments.updateMany({
          where: {
            invoiceId: invoiceId,
            status: {
              in: ["PENDING", "CLEARED"],
            },
          },
          data: {
            status: "CANCELED",
          },
        });
      }

      // Restore stock for canceled invoice (without deleting original stock movements)
      const stockRestorations = await restoreStockForCancellation(
        tx,
        invoiceId,
        canceledBy
      );

      // Update invoice status to CANCELLED
      const updatedInvoice = await tx.invoices.update({
        where: { id: invoiceId },
        data: {
          isCanceled: true,
          canceledAt: new Date(),
          cancelReason: cancelReason,
          canceledBy: canceledBy,
          status: "CANCELLED",
          paymentStatus: "UNPAID",
        },
      });

      // Cancel related purchase order if exists
      if (invoice.purchaseOrderId && invoice.purchaseOrder) {
        await tx.purchaseOrders.update({
          where: { id: invoice.purchaseOrderId },
          data: {
            status: "CANCELLED",
          },
        });

        // Cancel the related order if exists
        if (invoice.purchaseOrder.order) {
          await tx.orders.update({
            where: { id: invoice.purchaseOrder.order.id },
            data: {
              status: "CANCELLED",
              canceledAt: new Date(),
            },
          });
        }
      }

      return {
        updatedInvoice,
        stockRestorations,
      };
    });

    revalidatePath("/sales/invoice-cancellation");
    revalidatePath("/sales/invoice");
    revalidatePath("/purchasing/daftar-po");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/sales/surat-jalan");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/inventory/produk");
    revalidatePath("/purchasing/pembayaran");
    revalidatePath("/sales/orders");

    return {
      success: true,
      data: result.updatedInvoice,
      stockRestorations: result.stockRestorations,
      message: `Invoice ${result.updatedInvoice.code} berhasil dibatalkan. Stok produk telah dikembalikan.`,
    };
  } catch (error) {
    console.error("Error canceling invoice:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membatalkan invoice",
    };
  }
}
