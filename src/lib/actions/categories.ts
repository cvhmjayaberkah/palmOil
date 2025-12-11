"use server";

import db from "@/lib/db";
import { Categories } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CategoryFormData = {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
};

export type CategoryWithProducts = Categories & {
  _count: {
    products: number;
  };
};

// Get all categories
export async function getCategories(): Promise<CategoryWithProducts[]> {
  try {
    const categories = await db.categories.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        code: "desc",
      },
    });

    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
  }
}

export async function getActiveCategories(): Promise<CategoryWithProducts[]> {
  try {
    const categories = await db.categories.findMany({
      where: {
        isActive: true, // [PERUBAHAN]: Hanya ambil kategori yang isActive: true
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        code: "desc",
      },
    });

    return categories;
  } catch (error) {
    console.error("Error fetching active categories:", error);
    throw new Error("Failed to fetch active categories");
  }
}

// Get category by ID
export async function getCategoryById(id: string): Promise<Categories | null> {
  try {
    const category = await db.categories.findUnique({
      where: { id },
    });

    return category;
  } catch (error) {
    console.error("Error fetching category:", error);
    throw new Error("Failed to fetch category");
  }
}

// Create new category
export async function createCategory(data: CategoryFormData) {
  try {
    const category = await db.categories.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/kategori");
    return { success: true, data: category };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

// Update category
export async function updateCategory(id: string, data: CategoryFormData) {
  try {
    const category = await db.categories.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/kategori");
    revalidatePath(`/management/kategori/edit/${id}`);
    return { success: true, data: category };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, error: "Failed to update category" };
  }
}

// Delete category
export async function deleteCategory(id: string) {
  try {
    // Check if category has products
    const categoryWithProducts = await db.categories.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (
      categoryWithProducts?._count.products &&
      categoryWithProducts._count.products > 0
    ) {
      return {
        success: false,
        error:
          "Cannot delete category with existing products. Please remove all products first.",
      };
    }

    await db.categories.delete({
      where: { id },
    });

    revalidatePath("/management/kategori");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "Failed to delete category" };
  }
}

// Toggle category active status
export async function toggleCategoryStatus(id: string) {
  try {
    const category = await db.categories.findUnique({
      where: { id },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    const updatedCategory = await db.categories.update({
      where: { id },
      data: {
        isActive: !category.isActive,
      },
    });

    revalidatePath("/management/kategori");
    return { success: true, data: updatedCategory };
  } catch (error) {
    console.error("Error toggling category status:", error);
    return { success: false, error: "Failed to toggle category status" };
  }
}
