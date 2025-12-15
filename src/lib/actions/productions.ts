// lib/actions/productionLog.ts
"use server";

import db from "@/lib/db";
import { generateCodeByTable } from "@/utils/getCode";
import { revalidatePath } from "next/cache";
import {
  Productions,
  ProductionItems,
  StockMovementType,
  TransactionType,
} from "@prisma/client";

export type ProductionLogItemFormData = {
  productId: string;
  quantity: number;
  notes?: string;
};

export type ProductionLogFormData = {
  code?: string; // Make code optional since it will be generated in server
  productionDate: Date;
  notes?: string;
  producedById: string;
  items: ProductionLogItemFormData[];
};

export type ProductionLogWithDetails = Productions & {
  producedBy: {
    id: string;
    name: string;
  };
  items: (ProductionItems & {
    product: {
      id: string;
      name: string;
      code: string;
      unit: string;
      bottlesPerCrate: number;
    };
  })[];
};

// Get all production logs
export async function getProductions(): Promise<ProductionLogWithDetails[]> {
  try {
    const productions = await db.productions.findMany({
      include: {
        producedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            productionLogId: true,
            productId: true,
            notes: true,
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                bottlesPerCrate: true,
              },
            },
          },
        },
      },
      orderBy: {
        code: "desc",
      },
    });

    return productions as ProductionLogWithDetails[];
  } catch (error) {
    console.error("Error fetching production logs:", error);
    throw new Error("Failed to fetch production logs");
  }
}

// Get production log by ID
export async function getProductionLogById(
  id: string
): Promise<ProductionLogWithDetails | null> {
  try {
    const productionLog = await db.productions.findUnique({
      where: { id },
      include: {
        producedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            productionLogId: true,
            productId: true,
            notes: true,
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                bottlesPerCrate: true,
              },
            },
          },
        },
      },
    });

    return productionLog as ProductionLogWithDetails | null;
  } catch (error) {
    console.error("Error fetching production log:", error);
    throw new Error("Failed to fetch production log");
  }
}

// Create new production log with robust code generation
export async function createProductionLog(data: ProductionLogFormData) {
  const maxRetries = 10;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await db.$transaction(async tx => {
        // Get current timestamp for more uniqueness
        const now = new Date();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, "0");
        const currentYear = now.getFullYear().toString();
        const baseCodePrefix = `PRD/${currentMonth}/${currentYear}/`;

        // Find highest existing code for this month with row locking
        const lastProduction = await tx.productions.findFirst({
          where: {
            code: {
              startsWith: baseCodePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });

        let nextIndex = 1;
        if (lastProduction) {
          const parts = lastProduction.code.split("/");
          if (parts.length === 4) {
            const lastIndexString = parts[3];
            const parsedIndex = parseInt(lastIndexString, 10);
            if (!isNaN(parsedIndex)) {
              nextIndex = parsedIndex + 1;
            }
          }
        }

        // Add small random factor to reduce collision probability
        const randomOffset = Math.floor(Math.random() * 3); // 0, 1, or 2
        nextIndex += randomOffset;

        // Check if this index is already taken and increment if needed
        let codeExists = true;
        while (codeExists) {
          const paddedIndex = String(nextIndex).padStart(4, "0");
          const candidateCode = `${baseCodePrefix}${paddedIndex}`;

          const existing = await tx.productions.findFirst({
            where: { code: candidateCode },
            select: { id: true },
          });

          if (!existing) {
            codeExists = false;
          } else {
            nextIndex++;
          }
        }

        const finalCode = `${baseCodePrefix}${String(nextIndex).padStart(
          4,
          "0"
        )}`;

        // Create production log with generated code
        const productionLog = await tx.productions.create({
          data: {
            code: finalCode,
            productionDate: data.productionDate,
            notes: data.notes || null,
            producedById: data.producedById,
            status: "COMPLETED",
          },
        });

        // Create production log items and update stock
        for (const item of data.items) {
          // Get current product stock and product details
          const product = await tx.products.findUnique({
            where: { id: item.productId },
            select: {
              currentStock: true,
              name: true,
              bottlesPerCrate: true,
            },
          });

          if (!product) {
            throw new Error(`Product with ID ${item.productId} not found`);
          }

          const previousStock = product.currentStock;
          const newStock = previousStock + item.quantity;

          // Create production log item
          const productionLogItem = await tx.productionItems.create({
            data: {
              quantity: item.quantity,
              productionLogId: productionLog.id,
              productId: item.productId,
              notes: item.notes || null,
            },
          });

          // Update product stock
          await tx.products.update({
            where: { id: item.productId },
            data: { currentStock: newStock },
          });

          // Create stock movement record
          await tx.stockMovements.create({
            data: {
              type: StockMovementType.PRODUCTION_IN,
              quantity: item.quantity,
              previousStock: previousStock,
              newStock: newStock,
              reference: `Productions Log #${productionLog.id}`,
              productId: item.productId,
              userId: data.producedById,
              productionItemsId: productionLogItem.id,
              notes: item.notes || null,
            },
          });
        }

        return productionLog;
      });

      revalidatePath("/inventory/produksi");
      revalidatePath("/inventory/produk");
      return { success: true, data: result };
    } catch (error) {
      // Check if it's a unique constraint error and retry
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint failed") &&
        error.message.includes("code") &&
        attempt < maxRetries
      ) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
        continue; // Retry with new code
      }

      // If it's the last attempt or a different error, throw it
      console.error("Error creating production log:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create production log",
      };
    }
  }

  // If all retries failed
  return {
    success: false,
    error:
      "Failed to create production log after multiple attempts. Please try again.",
  };
}

// Update production log
export async function updateProductionLog(
  id: string,
  data: ProductionLogFormData
) {
  try {
    const result = await db.$transaction(async tx => {
      // Get existing production log with items
      const existingLog = await tx.productions.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingLog) {
        throw new Error("Productions log not found");
      }

      // Reverse previous stock movements
      for (const existingItem of existingLog.items) {
        const product = await tx.products.findUnique({
          where: { id: existingItem.productId },
          select: { currentStock: true },
        });

        if (product) {
          await tx.products.update({
            where: { id: existingItem.productId },
            data: {
              currentStock: product.currentStock - existingItem.quantity,
            },
          });
        }

        // Delete old stock movements
        await tx.stockMovements.deleteMany({
          where: { productionItemsId: existingItem.id },
        });
      }

      // Delete existing items
      await tx.productionItems.deleteMany({
        where: { productionLogId: id },
      });

      // Update production log
      const updatedLog = await tx.productions.update({
        where: { id },
        data: {
          productionDate: data.productionDate,
          notes: data.notes || null,
          producedById: data.producedById,
        },
      });

      // Create new production log items and update stock
      for (const item of data.items) {
        const product = await tx.products.findUnique({
          where: { id: item.productId },
          select: {
            currentStock: true,
            name: true,
            bottlesPerCrate: true,
          },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        const previousStock = product.currentStock;
        const newStock = previousStock + item.quantity;

        const productionLogItem = await tx.productionItems.create({
          data: {
            quantity: item.quantity,
            productionLogId: updatedLog.id,
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
            type: StockMovementType.PRODUCTION_IN,
            quantity: item.quantity,
            previousStock: previousStock,
            newStock: newStock,
            reference: `Productions Log #${updatedLog.id}`,
            productId: item.productId,
            userId: data.producedById,
            productionItemsId: productionLogItem.id,
            notes: item.notes || null,
          },
        });
      }

      return updatedLog;
    });

    revalidatePath("/inventory/produksi");
    revalidatePath(`/inventory/produksi/edit/${id}`);
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating production log:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update production log",
    };
  }
}

// Delete production log
export async function deleteProductionLog(id: string) {
  try {
    const result = await db.$transaction(async tx => {
      // Get production log with items
      const productionLog = await tx.productions.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!productionLog) {
        throw new Error("Productions log not found");
      }

      // Delete related stock movements
      for (const item of productionLog.items) {
        const product = await tx.products.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });

        if (product) {
          await tx.products.update({
            where: { id: item.productId },
            data: { currentStock: product.currentStock - item.quantity },
          });
        }

        // Delete related stock movements
        await tx.stockMovements.deleteMany({
          where: { productionItemsId: item.id },
        });
      }

      // Delete production log (items will be cascade deleted)
      await tx.productions.delete({
        where: { id },
      });

      return productionLog;
    });

    revalidatePath("/inventory/produksi");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error deleting production log:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete production log",
    };
  }
}

// Get available products for production
export async function getAvailableProducts() {
  try {
    const products = await db.products.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        unit: true,
        currentStock: true,
        bottlesPerCrate: true,
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

// Get available users (producers)
export async function getAvailableUsers() {
  try {
    const users = await db.users.findMany({
      where: {
        isActive: true,
        role: { in: ["WAREHOUSE", "ADMIN", "OWNER"] },
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
