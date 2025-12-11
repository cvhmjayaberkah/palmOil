// lib/actions/managementStocks.ts
"use server";

import db from "@/lib/db";
import {
  ManagementStocks,
  ManagementStockItems,
  StockMovementType,
  ManagementStockStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ManagementStockItemFormData = {
  productId: string;
  quantity: number;
  notes?: string;
  stockOpnameItemId?: string;
};

export type ManagementStockFormData = {
  code: string;
  managementDate: Date;
  status: ManagementStockStatus;
  notes?: string;
  producedById: string;
  selectedOpnameId?: string; // For OPNAME_ADJUSTMENT
  items: ManagementStockItemFormData[];
};

export type ManagementStockWithDetails = ManagementStocks & {
  producedBy: {
    id: string;
    name: string;
  };
  items: (ManagementStockItems & {
    product: {
      id: string;
      name: string;
      unit: string;
    };
  })[];
};

// Get all management stocks
export async function getManagementStocks(): Promise<
  ManagementStockWithDetails[]
> {
  try {
    const managementStocks = await db.managementStocks.findMany({
      include: {
        producedBy: {
          select: {
            id: true,
            name: true,
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
        managementDate: "desc",
      },
    });

    return managementStocks;
  } catch (error) {
    console.error("Error fetching management stocks:", error);
    throw new Error("Failed to fetch management stocks");
  }
}

// Get management stock by ID
export async function getManagementStockById(
  id: string
): Promise<ManagementStockWithDetails | null> {
  try {
    const managementStock = await db.managementStocks.findUnique({
      where: { id },
      include: {
        producedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                currentStock: true,
              },
            },
          },
        },
      },
    });

    return managementStock;
  } catch (error) {
    console.error("Error fetching management stock:", error);
    throw new Error("Failed to fetch management stock");
  }
}

// Create new management stock
export async function createManagementStock(data: ManagementStockFormData) {
  try {
    const result = await db.$transaction(async tx => {
      // Create management stock
      const managementStock = await tx.managementStocks.create({
        data: {
          code: data.code,
          managementDate: data.managementDate,
          status: data.status,
          notes: data.notes || null,
          stockOpnameId: data.selectedOpnameId || null,
          producedById: data.producedById,
        },
      });

      // Create management stock items and update stock
      for (const item of data.items) {
        // Get current product stock
        const product = await tx.products.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        const previousStock = product.currentStock;
        let newStock: number;
        let stockMovementType: StockMovementType;

        // Calculate new stock based on adjustment type
        if (data.status === "IN") {
          newStock = previousStock + item.quantity;
          stockMovementType = StockMovementType.ADJUSTMENT_IN;
        } else if (data.status === "OUT") {
          newStock = previousStock - item.quantity;
          stockMovementType = StockMovementType.ADJUSTMENT_OUT;

          // Check if sufficient stock for OUT adjustment
          if (newStock < 0) {
            throw new Error(
              `Insufficient stock for product. Current stock: ${previousStock}, Requested: ${item.quantity}`
            );
          }
        } else if (data.status === "OPNAME_ADJUSTMENT") {
          // For OPNAME_ADJUSTMENT, quantity can be positive (increase) or negative (decrease)
          newStock = previousStock + item.quantity;
          stockMovementType = StockMovementType.OPNAME_ADJUSTMENT;
        } else {
          throw new Error(`Invalid management stock status: ${data.status}`);
        }

        let managementStockItem = await tx.managementStockItems.create({
          data: {
            quantity: item.quantity,
            managementStockId: managementStock.id,
            productId: item.productId,
            notes: item.notes || null,
          },
        });

        // Create stock movement record
        await tx.stockMovements.create({
          data: {
            type: stockMovementType,
            quantity: item.quantity,
            previousStock: previousStock,
            newStock: newStock,
            reference: `Stock Management #${managementStock.id}`,
            stockOpnameItemId: item.stockOpnameItemId
              ? item.stockOpnameItemId
              : null,
            ManagementStockItemsId: item.stockOpnameItemId
              ? null
              : managementStockItem.id,
            productId: item.productId,
            userId: data.producedById,
            notes: item.notes || null,
          },
        });

        // Update product stock
        await tx.products.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });
      }

      // If this is an OPNAME_ADJUSTMENT, mark the selected stock opname as completed
      if (data.status === "OPNAME_ADJUSTMENT" && data.selectedOpnameId) {
        await tx.stockOpnames.update({
          where: { id: data.selectedOpnameId },
          data: { status: "COMPLETED" },
        });
      }

      return managementStock;
    });

    revalidatePath("/inventory/manajemen-stok");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating management stock:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create management stock",
    };
  }
}

// Update management stock
export async function updateManagementStock(
  id: string,
  data: ManagementStockFormData
) {
  try {
    const result = await db.$transaction(async tx => {
      // Get existing management stock with items
      const existingStock = await tx.managementStocks.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingStock) {
        throw new Error("Management stock not found");
      }

      // Reverse previous stock movements
      for (const existingItem of existingStock.items) {
        const product = await tx.products.findUnique({
          where: { id: existingItem.productId },
          select: { currentStock: true },
        });

        if (!product) continue;

        let revertedStock: number;

        // Reverse the stock change
        if (existingStock.status === "IN") {
          revertedStock = product.currentStock - existingItem.quantity;
        } else {
          revertedStock = product.currentStock + existingItem.quantity;
        }

        await tx.products.update({
          where: { id: existingItem.productId },
          data: { currentStock: revertedStock },
        });
      }

      // Delete existing items and stock movements
      await tx.stockMovements.deleteMany({
        where: {
          ManagementStockItemsId: {
            in: existingStock.items.map(item => item.id),
          },
        },
      });

      await tx.managementStockItems.deleteMany({
        where: { managementStockId: id },
      });

      // Update management stock
      const updatedStock = await tx.managementStocks.update({
        where: { id },
        data: {
          managementDate: data.managementDate,
          status: data.status,
          notes: data.notes || null,
          producedById: data.producedById,
        },
      });

      // Create new items and stock movements
      for (const item of data.items) {
        const product = await tx.products.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        const previousStock = product.currentStock;
        let newStock: number;
        let stockMovementType: StockMovementType;

        if (data.status === "IN") {
          newStock = previousStock + item.quantity;
          stockMovementType = StockMovementType.ADJUSTMENT_IN;
        } else {
          newStock = previousStock - item.quantity;
          stockMovementType = StockMovementType.ADJUSTMENT_OUT;

          if (newStock < 0) {
            throw new Error(
              `Insufficient stock for product. Current stock: ${previousStock}, Requested: ${item.quantity}`
            );
          }
        }

        const managementStockItem = await tx.managementStockItems.create({
          data: {
            quantity: item.quantity,
            managementStockId: updatedStock.id,
            productId: item.productId,
            notes: item.notes || null,
          },
        });

        await tx.products.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        await tx.stockMovements.create({
          data: {
            type: stockMovementType,
            quantity: item.quantity,
            previousStock: previousStock,
            newStock: newStock,
            reference: `Stock Management #${updatedStock.id}`,
            productId: item.productId,
            userId: data.producedById,
            ManagementStockItemsId: managementStockItem.id,
            notes: item.notes || null,
          },
        });
      }

      return updatedStock;
    });

    revalidatePath("/inventory/manajemen-stok");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating management stock:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update management stock",
    };
  }
}

// Delete management stock
export async function deleteManagementStock(id: string) {
  try {
    const result = await db.$transaction(async tx => {
      // Get existing management stock with items
      const existingStock = await tx.managementStocks.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingStock) {
        throw new Error("Management stock not found");
      }

      // Reverse stock movements
      for (const item of existingStock.items) {
        const product = await tx.products.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });

        if (!product) continue;

        let revertedStock: number;

        // Reverse the stock change
        if (existingStock.status === "IN") {
          revertedStock = product.currentStock - item.quantity;
        } else {
          revertedStock = product.currentStock + item.quantity;
        }

        await tx.products.update({
          where: { id: item.productId },
          data: { currentStock: Math.max(0, revertedStock) }, // Ensure stock doesn't go negative
        });
      }

      // Delete stock movements
      await tx.stockMovements.deleteMany({
        where: {
          ManagementStockItemsId: {
            in: existingStock.items.map(item => item.id),
          },
        },
      });

      // Delete management stock items
      await tx.managementStockItems.deleteMany({
        where: { managementStockId: id },
      });

      // Delete management stock
      await tx.managementStocks.delete({
        where: { id },
      });

      return { id };
    });

    revalidatePath("/inventory/manajemen-stok");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error deleting management stock:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete management stock",
    };
  }
}

// Get available products for stock management
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
        currentStock: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return products;
  } catch (error) {
    console.error("Error fetching available products:", error);
    throw new Error("Failed to fetch available products");
  }
}

// Get available users for stock management
export async function getAvailableUsers() {
  try {
    const users = await db.users.findMany({
      where: {
        isActive: true,
        role: {
          in: ["OWNER", "ADMIN", "WAREHOUSE"],
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
    console.error("Error fetching available users:", error);
    throw new Error("Failed to fetch available users");
  }
}
