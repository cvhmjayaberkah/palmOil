// lib/actions/expenses.ts
"use server";

import db from "@/lib/db";
import {
  Expenses,
  ExpenseItems,
  InvoiceStatus,
  DiscountValueType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ExpenseItemFormData = {
  description: string;
  quantity: number;
  price: number;
  discount: number;
  discountType: DiscountValueType;
  totalPrice: number; // calculated as (quantity * price) - discount
};

export type ExpenseFormData = {
  code: string;
  expenseDate: Date;
  dueDate: Date | null;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  taxPercentage: number;
  discount: number;
  discountType: DiscountValueType;
  shippingCost: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  items: ExpenseItemFormData[];
};

export type ExpenseWithDetails = Expenses & {
  creator?: {
    id: string;
    name: string;
  } | null;
  updater?: {
    id: string;
    name: string;
  } | null;
  expenseItems: ExpenseItems[];
};

// Get all expenses
export async function getExpenses(): Promise<ExpenseWithDetails[]> {
  try {
    const expenses = await db.expenses.findMany({
      include: {
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
        expenseItems: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return expenses;
  } catch (error) {
    console.error("Error getting expenses:", error);
    return [];
  }
}

// Get expense by ID
export async function getExpenseById(
  id: string
): Promise<ExpenseWithDetails | null> {
  try {
    const expense = await db.expenses.findUnique({
      where: { id },
      include: {
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
        expenseItems: true,
      },
    });

    return expense;
  } catch (error) {
    console.error("Error getting expense by ID:", error);
    return null;
  }
}

// Create new expense
export async function createExpense(
  data: ExpenseFormData
): Promise<{ success: boolean; error?: string; data?: ExpenseWithDetails }> {
  try {
    // Validate that we have at least one item
    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: "Minimal harus ada satu item pengeluaran",
      };
    }

    // Validate all items have required fields
    for (const item of data.items) {
      if (!item.description?.trim()) {
        return { success: false, error: "Semua item harus memiliki deskripsi" };
      }
      if (item.quantity <= 0) {
        return { success: false, error: "Kuantitas harus lebih besar dari 0" };
      }
      if (item.price <= 0) {
        return { success: false, error: "Harga harus lebih besar dari 0" };
      }
    }

    // Create expense with items in a transaction
    const expense = await db.$transaction(async tx => {
      // Create the expense
      const createdExpense = await tx.expenses.create({
        data: {
          code: data.code,
          expenseDate: data.expenseDate,
          dueDate: data.dueDate,
          status: data.status,
          subtotal: data.subtotal,
          tax: data.tax,
          taxPercentage: data.taxPercentage,
          discount: data.discount,
          discountType: data.discountType,
          shippingCost: data.shippingCost,
          totalAmount: data.totalAmount,
          notes: data.notes,
          createdBy: data.createdBy,
        },
      });

      // Create expense items
      await tx.expenseItems.createMany({
        data: data.items.map(item => ({
          expenseId: createdExpense.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          discountType: item.discountType,
          totalPrice: item.totalPrice,
        })),
      });

      // Return the created expense with all relations
      return await tx.expenses.findUnique({
        where: { id: createdExpense.id },
        include: {
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
          expenseItems: true,
        },
      });
    });

    revalidatePath("/purchasing/pengeluaran");
    return { success: true, data: expense! };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: "Gagal membuat pengeluaran" };
  }
}

// Update expense
export async function updateExpense(
  id: string,
  data: ExpenseFormData
): Promise<{ success: boolean; error?: string; data?: ExpenseWithDetails }> {
  try {
    // Validate that we have at least one item
    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: "Minimal harus ada satu item pengeluaran",
      };
    }

    // Validate all items have required fields
    for (const item of data.items) {
      if (!item.description?.trim()) {
        return { success: false, error: "Semua item harus memiliki deskripsi" };
      }
      if (item.quantity <= 0) {
        return { success: false, error: "Kuantitas harus lebih besar dari 0" };
      }
      if (item.price <= 0) {
        return { success: false, error: "Harga harus lebih besar dari 0" };
      }
    }

    const expense = await db.$transaction(async tx => {
      // Update the expense
      const updatedExpense = await tx.expenses.update({
        where: { id },
        data: {
          code: data.code,
          expenseDate: data.expenseDate,
          dueDate: data.dueDate,
          status: data.status,
          subtotal: data.subtotal,
          tax: data.tax,
          taxPercentage: data.taxPercentage,
          discount: data.discount,
          discountType: data.discountType,
          shippingCost: data.shippingCost,
          totalAmount: data.totalAmount,
          notes: data.notes,
          updatedBy: data.createdBy, // Use createdBy as updatedBy for consistency
        },
      });

      // Delete existing expense items
      await tx.expenseItems.deleteMany({
        where: { expenseId: id },
      });

      // Create new expense items
      await tx.expenseItems.createMany({
        data: data.items.map(item => ({
          expenseId: id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          discountType: item.discountType,
          totalPrice: item.totalPrice,
        })),
      });

      // Return the updated expense with all relations
      return await tx.expenses.findUnique({
        where: { id },
        include: {
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
          expenseItems: true,
        },
      });
    });

    revalidatePath("/purchasing/pengeluaran");
    revalidatePath(`/purchasing/pengeluaran/edit/${id}`);
    return { success: true, data: expense! };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { success: false, error: "Gagal mengupdate pengeluaran" };
  }
}

// Delete expense
export async function deleteExpense(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.expenses.delete({
      where: { id },
    });

    revalidatePath("/purchasing/pengeluaran");
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: "Gagal menghapus pengeluaran" };
  }
}

// Get available users for expense creation
export async function getAvailableUsers() {
  try {
    const users = await db.users.findMany({
      where: {
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
    return [];
  }
}
