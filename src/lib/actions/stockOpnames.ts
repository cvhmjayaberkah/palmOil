"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OpnameStatus } from "@prisma/client";

// Types
export interface StockOpnameWithDetails {
  id: string;
  code: string;
  opnameDate: Date;
  status: OpnameStatus;
  notes: string | null;
  conductedById: string;
  conductedBy: {
    id: string;
    name: string;
    email: string;
  };
  stockOpnameItems: {
    id: string;
    systemStock: number;
    physicalStock: number;
    notes: string | null;
    difference: number;
    productId: string;
    product: {
      id: string;
      name: string;
      unit: string;
      currentStock: number;
    };
  }[];
}

export interface CreateStockOpnameData {
  code: string;
  opnameDate: Date;
  notes?: string;
  conductedById: string;
  items: {
    productId: string;
    systemStock: number;
    physicalStock: number;
    notes?: string;
  }[];
}

export interface UpdateStockOpnameData {
  opnameDate?: Date;
  notes?: string;
  status?: OpnameStatus;
  items?: {
    id?: string;
    productId: string;
    systemStock: number;
    physicalStock: number;
    notes?: string;
  }[];
}

// Get all stock opnames
export async function getStockOpnames(): Promise<StockOpnameWithDetails[]> {
  try {
    const stockOpnames = await db.stockOpnames.findMany({
      include: {
        conductedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stockOpnameItems: {
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
      orderBy: {
        opnameDate: "desc",
      },
    });

    return stockOpnames;
  } catch (error) {
    console.error("Error fetching stock opnames:", error);
    throw new Error("Failed to fetch stock opnames");
  }
}

// Get stock opname by ID
export async function getStockOpnameById(
  id: string
): Promise<StockOpnameWithDetails | null> {
  try {
    const stockOpname = await db.stockOpnames.findUnique({
      where: { id },
      include: {
        conductedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stockOpnameItems: {
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

    return stockOpname;
  } catch (error) {
    console.error("Error fetching stock opname by ID:", error);
    throw new Error("Failed to fetch stock opname");
  }
}

// Create new stock opname
export async function createStockOpname(data: CreateStockOpnameData) {
  try {
    const result = await db.$transaction(async tx => {
      // Calculate differences and determine status

      const itemsWithDifference = data.items.map(item => ({
        ...item,
        difference: item.physicalStock - item.systemStock,
      }));

      // Check if there are any differences
      const hasDifferences = itemsWithDifference.some(
        item => item.difference !== 0
      );
      const autoStatus = hasDifferences ? "RECONCILED" : "COMPLETED";

      // Create main stock opname record
      const stockOpname = await tx.stockOpnames.create({
        data: {
          code: data.code,
          opnameDate: data.opnameDate,
          notes: data.notes,
          conductedById: data.conductedById,
          status: autoStatus,
        },
      });

      // Create stock opname items
      const stockOpnameItems = await Promise.all(
        itemsWithDifference.map(item =>
          tx.stockOpnameItems.create({
            data: {
              opnameId: stockOpname.id,
              productId: item.productId,
              systemStock: item.systemStock,
              physicalStock: item.physicalStock,
              notes: item.notes,
              difference: item.difference,
            },
          })
        )
      );

      return { stockOpname, stockOpnameItems };
    });

    revalidatePath("/inventory/stok-opname");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating stock opname:", error);
    return { success: false, error: "Failed to create stock opname" };
  }
}

// Update stock opname
export async function updateStockOpname(
  id: string,
  data: UpdateStockOpnameData
) {
  try {
    const result = await db.$transaction(async tx => {
      // Update main stock opname record
      const stockOpname = await tx.stockOpnames.update({
        where: { id },
        data: {
          ...(data.opnameDate && { opnameDate: data.opnameDate }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.status && { status: data.status }),
        },
      });

      // Update stock opname items if provided
      if (data.items) {
        // Calculate differences and determine status
        const itemsWithDifference = data.items.map(item => ({
          ...item,
          difference: item.physicalStock - item.systemStock,
        }));

        // Check if there are any differences
        const hasDifferences = itemsWithDifference.some(
          item => item.difference !== 0
        );
        const autoStatus = hasDifferences ? "RECONCILED" : "COMPLETED";

        // Update status: use auto status if no status provided or if current status is IN_PROGRESS
        if (!data.status || data.status === "IN_PROGRESS") {
          await tx.stockOpnames.update({
            where: { id },
            data: { status: autoStatus },
          });
        }

        // Delete existing items
        await tx.stockOpnameItems.deleteMany({
          where: { opnameId: id },
        });

        // Create new items
        const stockOpnameItems = await Promise.all(
          itemsWithDifference.map(item =>
            tx.stockOpnameItems.create({
              data: {
                opnameId: id,
                productId: item.productId,
                systemStock: item.systemStock,
                physicalStock: item.physicalStock,
                notes: item.notes,
                difference: item.difference,
              },
            })
          )
        );

        return { stockOpname, stockOpnameItems };
      }

      return { stockOpname };
    });

    // revalidatePath("/inventory/stok-opname");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating stock opname:", error);
    return { success: false, error: "Failed to update stock opname" };
  }
}

// Delete stock opname
export async function deleteStockOpname(id: string) {
  try {
    await db.stockOpnames.delete({
      where: { id },
    });
    revalidatePath("/inventory/stok-opname");
    return { success: true };
  } catch (error) {
    console.error("Error deleting stock opname:", error);
    return { success: false, error: "Failed to delete stock opname" };
  }
}

// Complete stock opname (change status to COMPLETED)
export async function completeStockOpname(id: string) {
  try {
    const stockOpname = await db.stockOpnames.update({
      where: { id },
      data: {
        status: "COMPLETED",
      },
    });

    revalidatePath("/inventory/stok-opname");
    revalidatePath(`/inventory/stok-opname/edit/${id}`);
    return { success: true, data: stockOpname };
  } catch (error) {
    console.error("Error completing stock opname:", error);
    return { success: false, error: "Failed to complete stock opname" };
  }
}

// Reconcile stock opname (change status to RECONCILED for items with differences)
export async function reconcileStockOpname(id: string) {
  try {
    const stockOpname = await db.stockOpnames.update({
      where: { id },
      data: {
        status: "RECONCILED",
      },
    });

    revalidatePath("/inventory/stok-opname");
    revalidatePath(`/inventory/stok-opname/edit/${id}`);
    return { success: true, data: stockOpname };
  } catch (error) {
    console.error("Error reconciling stock opname:", error);
    return { success: false, error: "Failed to reconcile stock opname" };
  }
}

// Get products for stock opname (with current stock)
export async function getProductsForOpname() {
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
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return products;
  } catch (error) {
    console.error("Error fetching products for opname:", error);
    throw new Error("Failed to fetch products");
  }
}

// Get reconciled stock opnames for OPNAME_ADJUSTMENT dropdown
export async function getReconciledStockOpnames() {
  try {
    const reconciledOpnames = await db.stockOpnames.findMany({
      where: {
        status: "RECONCILED",
      },
      include: {
        conductedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stockOpnameItems: {
          where: {
            difference: {
              not: 0, // Only items with differences
            },
          },
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
      orderBy: {
        opnameDate: "desc",
      },
    });

    return reconciledOpnames;
  } catch (error) {
    console.error("Error fetching reconciled stock opnames:", error);
    throw new Error("Failed to fetch reconciled stock opnames");
  }
}

// Mark stock opname as completed (used when applying OPNAME_ADJUSTMENT)
export async function markStockOpnameAsCompleted(opnameId: string) {
  try {
    const result = await db.stockOpnames.update({
      where: { id: opnameId },
      data: {
        status: "COMPLETED",
      },
    });

    revalidatePath("/inventory/stok-opname");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error marking stock opname as completed:", error);
    return { success: false, error: "Failed to update stock opname status" };
  }
}
