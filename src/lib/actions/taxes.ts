"use server";

import db from "@/lib/db";
// import { Taxs } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type TaxFormData = {
  nominal: string;
  notes?: string;
  isActive?: boolean;
};

// Temporary type until Prisma client is regenerated
type Taxs = {
  id: string;
  nominal: string;
  notes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Get all taxes
export async function getTaxes(): Promise<Taxs[]> {
  try {
    const taxes = await (db as any).taxs.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return taxes;
  } catch (error) {
    console.error("Error fetching taxes:", error);
    throw new Error("Failed to fetch taxes");
  }
}

// Get tax by ID
export async function getTaxById(id: string): Promise<Taxs | null> {
  try {
    const tax = await (db as any).taxs.findUnique({
      where: { id },
    });

    return tax;
  } catch (error) {
    console.error("Error fetching tax:", error);
    throw new Error("Failed to fetch tax");
  }
}

// Create a new tax
export async function createTax(data: TaxFormData) {
  try {
    // Start transaction
    const result = await db.$transaction(async tx => {
      // If this tax is set to active, deactivate all other taxes
      if (data.isActive) {
        await (tx as any).taxs.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      // Create new tax
      const tax = await (tx as any).taxs.create({
        data: {
          nominal: data.nominal,
          notes: data.notes,
          isActive: data.isActive || false,
        },
      });

      return tax;
    });

    revalidatePath("/management/pajak");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating tax:", error);
    return { success: false, error: "Failed to create tax" };
  }
}

// Update a tax
export async function updateTax(id: string, data: TaxFormData) {
  try {
    // Start transaction
    const result = await db.$transaction(async tx => {
      // If this tax is set to active, deactivate all other taxes
      if (data.isActive) {
        await (tx as any).taxs.updateMany({
          where: {
            isActive: true,
            NOT: { id: id }, // Don't update the current tax
          },
          data: { isActive: false },
        });
      }

      // Update tax
      const tax = await (tx as any).taxs.update({
        where: { id },
        data: {
          nominal: data.nominal,
          notes: data.notes,
          isActive: data.isActive || false,
        },
      });

      return tax;
    });

    revalidatePath("/management/pajak");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating tax:", error);
    return { success: false, error: "Failed to update tax" };
  }
}

// Delete a tax
export async function deleteTax(id: string) {
  try {
    await (db as any).taxs.delete({
      where: { id },
    });

    revalidatePath("/management/pajak");
    return { success: true };
  } catch (error) {
    console.error("Error deleting tax:", error);
    return { success: false, error: "Failed to delete tax" };
  }
}

// Get active tax
export async function getActiveTax(): Promise<Taxs | null> {
  try {
    const activeTax = await (db as any).taxs.findFirst({
      where: { isActive: true },
    });

    return activeTax;
  } catch (error) {
    console.error("Error fetching active tax:", error);
    throw new Error("Failed to fetch active tax");
  }
}
