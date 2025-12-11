"use server";

import db from "@/lib/db";
import { StockMovements, StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type StockMovementFormData = {
  type: StockMovementType;
  quantity: number;
  reference?: string;
  notes?: string;
  productId: string;
  userId: string;
  ordersId?: string;
  productionItemsId?: string;
  swapId?: string;
};

export type StockMovementWithRelations = StockMovements & {
  products: {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
  };
  users: {
    id: string;
    name: string;
    role: string;
  };
  orderId?: {
    id: string;
    orderNumber: string;
  } | null;
  productionLogItemId?: {
    id: string;
    productionLog: {
      id: string;
      productionDate: Date;
    };
  } | null;
  swap?: {
    id: string;
    code: string;
    swapDate: Date;
  } | null;
};

// Get all stock movements with pagination and filters
export async function getStockMovements(
  page: number = 1,
  limit: number = 10,
  filters?: {
    type?: StockMovementType;
    productId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<{
  data: StockMovementWithRelations[];
  total: number;
  pages: number;
}> {
  try {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters) {
      if (filters.type) where.type = filters.type;
      if (filters.productId) where.productId = filters.productId;
      if (filters.dateFrom || filters.dateTo) {
        where.movementDate = {};
        if (filters.dateFrom) where.movementDate.gte = filters.dateFrom;
        if (filters.dateTo) where.movementDate.lte = filters.dateTo;
      }
    }

    const [stockMovements, total] = await Promise.all([
      db.stockMovements.findMany({
        where,
        include: {
          products: {
            select: {
              id: true,
              name: true,
              unit: true,
              currentStock: true,
            },
          },
          users: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          orderId: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          productionLogItemId: {
            select: {
              id: true,
              productionLog: {
                select: {
                  id: true,
                  productionDate: true,
                },
              },
            },
          },
          swap: {
            select: {
              id: true,
              code: true,
              swapDate: true,
            },
          },
        },
        orderBy: {
          movementDate: "desc",
        },
        skip,
        take: limit,
      }),
      db.stockMovements.count({ where }),
    ]);

    return {
      data: stockMovements,
      total,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    throw new Error("Failed to fetch stock movements");
  }
}

// Get all stock movements (for dropdown/selection purposes)
export async function getAllStockMovements(): Promise<
  StockMovementWithRelations[]
> {
  try {
    const stockMovements = await db.stockMovements.findMany({
      include: {
        products: {
          select: {
            id: true,
            name: true,
            unit: true,
            currentStock: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        orderId: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        productionLogItemId: {
          select: {
            id: true,
            productionLog: {
              select: {
                id: true,
                productionDate: true,
              },
            },
          },
        },
        swap: {
          select: {
            id: true,
            code: true,
            swapDate: true,
          },
        },
      },
      orderBy: {
        movementDate: "desc",
      },
    });

    return stockMovements;
  } catch (error) {
    console.error("Error fetching all stock movements:", error);
    throw new Error("Failed to fetch stock movements");
  }
}

// Get stock movement by ID
export async function getStockMovementById(
  id: string
): Promise<StockMovementWithRelations | null> {
  try {
    const stockMovement = await db.stockMovements.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            unit: true,
            currentStock: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        orderId: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        productionLogItemId: {
          select: {
            id: true,
            productionLog: {
              select: {
                id: true,
                productionDate: true,
              },
            },
          },
        },
        swap: {
          select: {
            id: true,
            code: true,
            swapDate: true,
          },
        },
      },
    });

    return stockMovement;
  } catch (error) {
    console.error("Error fetching stock movement:", error);
    throw new Error("Failed to fetch stock movement");
  }
}

// Create new stock movement
export async function createStockMovement(data: StockMovementFormData) {
  try {
    // Get current product stock
    const product = await db.products.findUnique({
      where: { id: data.productId },
      select: { currentStock: true },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const previousStock = product.currentStock;
    let newStock = previousStock;

    // Calculate new stock based on movement type
    switch (data.type) {
      case "PRODUCTION_IN":
      case "RETURN_IN":
      case "ADJUSTMENT_IN":
      case "SWAP_IN":
        newStock = previousStock + data.quantity;
        break;
      case "SALES_OUT":
      case "ADJUSTMENT_OUT":
      case "SWAP_OUT":
        newStock = previousStock - data.quantity;
        if (newStock < 0) {
          return { success: false, error: "Insufficient stock" };
        }
        break;
      case "OPNAME_ADJUSTMENT":
        // For stock opname, quantity can be positive or negative
        newStock = previousStock + data.quantity;
        break;
    }

    // Create stock movement and update product stock in a transaction
    const result = await db.$transaction(async tx => {
      const stockMovement = await tx.stockMovements.create({
        data: {
          type: data.type,
          quantity: data.quantity,
          previousStock: previousStock,
          newStock: newStock,
          reference: data.reference,
          notes: data.notes,
          productId: data.productId,
          userId: data.userId,
          ordersId: data.ordersId,
          productionItemsId: data.productionItemsId,
          swapId: data.swapId,
        },
      });

      // Update product current stock
      await tx.products.update({
        where: { id: data.productId },
        data: { currentStock: newStock },
      });

      return stockMovement;
    });

    revalidatePath("/inventory/manajemen-stok");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating stock movement:", error);
    return { success: false, error: "Failed to create stock movement" };
  }
}

// Update stock movement (limited fields for adjustment movements only)
export async function updateStockMovement(
  id: string,
  data: Partial<StockMovementFormData>
) {
  try {
    // Get current stock movement
    const currentMovement = await db.stockMovements.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!currentMovement) {
      return { success: false, error: "Stock movement not found" };
    }

    // Only allow updates for manual adjustment movements
    if (!currentMovement.type.includes("ADJUSTMENT")) {
      return {
        success: false,
        error: "Only adjustment movements can be updated",
      };
    }

    const result = await db.$transaction(async tx => {
      // Revert the previous stock change
      const revertedStock = currentMovement.previousStock;

      // Calculate new stock with updated quantity
      let newStock = revertedStock;
      const newQuantity = data.quantity || currentMovement.quantity;

      switch (currentMovement.type) {
        case "ADJUSTMENT_IN":
          newStock = revertedStock + newQuantity;
          break;
        case "ADJUSTMENT_OUT":
          newStock = revertedStock - newQuantity;
          if (newStock < 0) {
            throw new Error("Insufficient stock");
          }
          break;
        case "OPNAME_ADJUSTMENT":
          newStock = revertedStock + newQuantity;
          break;
      }

      // Update stock movement
      const stockMovement = await tx.stockMovements.update({
        where: { id },
        data: {
          quantity: newQuantity,
          newStock: newStock,
          reference:
            data.reference !== undefined
              ? data.reference
              : currentMovement.reference,
          notes: data.notes !== undefined ? data.notes : currentMovement.notes,
        },
      });

      // Update product current stock
      await tx.products.update({
        where: { id: currentMovement.productId },
        data: { currentStock: newStock },
      });

      return stockMovement;
    });

    revalidatePath("/inventory/manajemen-stok");
    revalidatePath(`/inventory/manajemen-stok/edit/${id}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating stock movement:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update stock movement",
    };
  }
}

// Delete stock movement (only adjustment movements)
export async function deleteStockMovement(id: string) {
  try {
    const stockMovement = await db.stockMovements.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!stockMovement) {
      return { success: false, error: "Stock movement not found" };
    }

    // Only allow deletion of manual adjustment movements
    if (!stockMovement.type.includes("ADJUSTMENT")) {
      return {
        success: false,
        error: "Only adjustment movements can be deleted",
      };
    }

    const result = await db.$transaction(async tx => {
      // Revert the stock change
      await tx.products.update({
        where: { id: stockMovement.productId },
        data: { currentStock: stockMovement.previousStock },
      });

      // Delete the stock movement
      await tx.stockMovements.delete({
        where: { id },
      });
    });

    revalidatePath("/inventory/manajemen-stok");
    return { success: true };
  } catch (error) {
    console.error("Error deleting stock movement:", error);
    return { success: false, error: "Failed to delete stock movement" };
  }
}

// Get products for selection
export async function getProductsForSelection() {
  try {
    const products = await db.products.findMany({
      where: { isActive: true },
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
      orderBy: { name: "asc" },
    });

    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }
}

// Get users for selection
export async function getUsersForSelection() {
  try {
    const users = await db.users.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

// Get stock movement types for selection
export async function getStockMovementTypes(): Promise<
  Array<{
    value: StockMovementType;
    label: string;
    description: string;
    allowManualCreation: boolean;
  }>
> {
  return [
    {
      value: "PRODUCTION_IN",
      label: "Produksi Masuk",
      description: "Stok masuk dari hasil produksi",
      allowManualCreation: false,
    },
    {
      value: "SALES_OUT",
      label: "Penjualan Keluar",
      description: "Stok keluar karena penjualan",
      allowManualCreation: false,
    },
    {
      value: "RETURN_IN",
      label: "Retur Masuk",
      description: "Stok masuk dari retur penjualan",
      allowManualCreation: false,
    },
    {
      value: "ADJUSTMENT_IN",
      label: "Penyesuaian Masuk",
      description: "Penambahan stok manual",
      allowManualCreation: true,
    },
    {
      value: "ADJUSTMENT_OUT",
      label: "Penyesuaian Keluar",
      description: "Pengurangan stok manual",
      allowManualCreation: true,
    },
    {
      value: "OPNAME_ADJUSTMENT",
      label: "Penyesuaian Opname",
      description: "Penyesuaian dari hasil Stok Opname",
      allowManualCreation: true,
    },
    {
      value: "SWAP_IN",
      label: "Tukar Guling Masuk",
      description:
        "Stok masuk dari barang yang dikembalikan dalam tukar guling",
      allowManualCreation: false,
    },
    {
      value: "SWAP_OUT",
      label: "Tukar Guling Keluar",
      description: "Stok keluar untuk barang pengganti dalam tukar guling",
      allowManualCreation: false,
    },
  ];
}
