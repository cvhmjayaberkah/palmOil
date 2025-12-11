"use server";

import db from "@/lib/db";
import { Products } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Utility function to calculate selling price with tax and round to thousands
export async function calculateSellingPrice(
  basePrice: number,
  taxPercentage: number
): Promise<number | 0> {
  const priceWithTax = basePrice * (1 + taxPercentage / 100);
  // Round to nearest thousand (e.g., 1500 becomes 2000, 1200 becomes 1000)
  return Math.ceil(priceWithTax / 1000) * 1000;
}

// Get active tax from database
export async function getActiveTaxForProducts() {
  try {
    const activeTax = await (db as any).taxs.findFirst({
      where: { isActive: true },
    });
    return activeTax;
  } catch (error) {
    console.error("Error fetching active tax:", error);
    return null;
  }
}

export type ProductFormData = {
  code: string;
  name: string;
  description?: string;
  unit: string;
  price: number;
  cost: number;
  sellingPrice?: number;
  minStock: number;
  currentStock: number;
  isActive: boolean;
  categoryId: string;
  taxId?: string;
  bottlesPerCrate?: number | null;
  salaryPerBottle?: number;
};

export type ProductWithCategory = Products & {
  category: {
    id: string;
    name: string;
  };
};

// Get all products
export async function getProducts(): Promise<ProductWithCategory[]> {
  try {
    const products = await db.products.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        // TODO: Uncomment after Prisma client is regenerated
        // tax: {
        //   select: {
        //     id: true,
        //     nominal: true,
        //     isActive: true,
        //   },
        // },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }
}

// Get product by ID
export async function getProductById(id: string): Promise<Products | null> {
  try {
    const product = await db.products.findUnique({
      where: { id },
      include: {
        category: true,
        // TODO: Uncomment after Prisma client is regenerated
        // tax: true,
      },
    });

    return product;
  } catch (error) {
    console.error("Error fetching product:", error);
    throw new Error("Failed to fetch product");
  }
}

// Create new product
export async function createProduct(data: ProductFormData) {
  try {
    // Create basic product data first
    const productData: any = {
      code: data.code,
      name: data.name,
      description: data.description || null,
      unit: data.unit,
      price: data.price,
      cost: data.cost,
      minStock: data.minStock,
      currentStock: data.currentStock,
      isActive: data.isActive,
      categoryId: data.categoryId,
      bottlesPerCrate: data.bottlesPerCrate || undefined,
      salaryPerBottle: data.salaryPerBottle || 0,
    };

    // Add new fields if they exist in the schema
    if (data.sellingPrice !== undefined) {
      productData.sellingPrice = data.sellingPrice;
    }
    if (data.taxId) {
      productData.taxId = data.taxId;
    }

    const product = await db.products.create({
      data: productData,
    });

    revalidatePath("/inventory/produk");
    return { success: true, data: product };
  } catch (error) {
    console.error("Error creating product:", error);

    // Return a descriptive error message
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create product",
    };
  }
}

// Update product
export async function updateProduct(id: string, data: ProductFormData) {
  try {
    // Create basic product data first
    const productData: any = {
      code: data.code,
      name: data.name,
      description: data.description || null,
      unit: data.unit,
      price: data.price,
      cost: data.cost,
      minStock: data.minStock,
      currentStock: data.currentStock,
      isActive: data.isActive,
      categoryId: data.categoryId,
      bottlesPerCrate: data.bottlesPerCrate || undefined,
      salaryPerBottle: data.salaryPerBottle || 0,
    };

    // Add new fields if they exist in the schema
    if (data.sellingPrice !== undefined) {
      productData.sellingPrice = data.sellingPrice;
    }
    if (data.taxId) {
      productData.taxId = data.taxId;
    }

    const product = await db.products.update({
      where: { id },
      data: productData,
    });

    revalidatePath("/inventory/produk");
    revalidatePath(`/inventory/produk/edit/${id}`);
    return { success: true, data: product };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Failed to update product" };
  }
}

// Delete product
export async function deleteProduct(id: string) {
  try {
    // Check if product has related records
    const productWithRelations = await db.products.findUnique({
      where: { id },
      include: {
        invoiceItems: true,
        orderItems: true,
        stockMovements: true,
      },
    });

    if (
      productWithRelations &&
      (productWithRelations.invoiceItems.length > 0 ||
        productWithRelations.orderItems.length > 0 ||
        productWithRelations.stockMovements.length > 0)
    ) {
      return {
        success: false,
        error:
          "Cannot delete product with existing transactions. Please remove all related records first.",
      };
    }

    await db.products.delete({
      where: { id },
    });

    revalidatePath("/inventory/produk");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

// Toggle product active status
export async function toggleProductStatus(id: string) {
  try {
    const product = await db.products.findUnique({
      where: { id },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const updatedProduct = await db.products.update({
      where: { id },
      data: {
        isActive: !product.isActive,
      },
    });

    revalidatePath("/inventory/produk");
    return { success: true, data: updatedProduct };
  } catch (error) {
    console.error("Error toggling product status:", error);
    return { success: false, error: "Failed to toggle product status" };
  }
}
