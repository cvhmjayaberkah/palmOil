"use server";

import db from "@/lib/db";
import { TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface Transaction {
  id: string;
  transactionDate: Date;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  reference?: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  user?: {
    id: string;
    name: string;
  };
  transactionItems: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface CreateTransactionData {
  transactionDate: Date;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  reference?: string;
  userId?: string;
  transactionItems: {
    description: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }[];
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {
  id: string;
}

// Get all transactions with filters
export async function getTransactions(filters?: {
  type?: TransactionType;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}) {
  try {
    const whereClause: any = {};

    if (filters?.type) {
      whereClause.type = filters.type;
    }

    if (filters?.category) {
      whereClause.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.transactionDate = {};
      if (filters.startDate) {
        whereClause.transactionDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.transactionDate.lte = filters.endDate;
      }
    }

    if (filters?.userId) {
      whereClause.userId = filters.userId;
    }

    const transactions = await db.transactions.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        transactionItems: true,
      },
      orderBy: {
        transactionDate: "desc",
      },
    });

    return {
      success: true,
      data: transactions,
    };
  } catch (error) {
    console.error("Error getting transactions:", error);
    return {
      success: false,
      error: "Failed to fetch transactions",
      data: [],
    };
  }
}

// Get transaction by ID
export async function getTransactionById(id: string) {
  try {
    const transaction = await db.transactions.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        transactionItems: true,
      },
    });

    if (!transaction) {
      return {
        success: false,
        error: "Transaction not found",
        data: null,
      };
    }

    return {
      success: true,
      data: transaction,
    };
  } catch (error) {
    console.error("Error getting transaction by ID:", error);
    return {
      success: false,
      error: "Failed to fetch transaction",
      data: null,
    };
  }
}

// Create new transaction
export async function createTransaction(data: CreateTransactionData) {
  try {
    const transaction = await db.transactions.create({
      data: {
        transactionDate: data.transactionDate,
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        reference: data.reference,
        userId: data.userId,
        transactionItems: {
          create: data.transactionItems,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        transactionItems: true,
      },
    });

    // Revalidate related paths
    revalidatePath("/management/finance/expenses");
    revalidatePath("/purchasing/pengeluaran");

    return {
      success: true,
      data: transaction,
      message: "Transaction created successfully",
    };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return {
      success: false,
      error: "Failed to create transaction",
      data: null,
    };
  }
}

// Update transaction
export async function updateTransaction(data: UpdateTransactionData) {
  try {
    const { id, transactionItems, ...updateData } = data;

    // Update transaction and replace transaction items
    const transaction = await db.transactions.update({
      where: { id },
      data: {
        ...updateData,
        transactionItems: transactionItems
          ? {
              deleteMany: {},
              create: transactionItems,
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        transactionItems: true,
      },
    });

    // Revalidate related paths
    revalidatePath("/management/finance/expenses");
    revalidatePath("/purchasing/pengeluaran");

    return {
      success: true,
      data: transaction,
      message: "Transaction updated successfully",
    };
  } catch (error) {
    console.error("Error updating transaction:", error);
    return {
      success: false,
      error: "Failed to update transaction",
      data: null,
    };
  }
}

// Delete transaction
export async function deleteTransaction(id: string) {
  try {
    await db.transactions.delete({
      where: { id },
    });

    // Revalidate related paths
    revalidatePath("/management/finance/expenses");
    revalidatePath("/purchasing/pengeluaran");

    return {
      success: true,
      message: "Transaction deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return {
      success: false,
      error: "Failed to delete transaction",
    };
  }
}

// Get expense categories (for dropdowns)
export async function getExpenseCategories() {
  try {
    const categories = await db.transactions.findMany({
      where: {
        type: "EXPENSE",
      },
      select: {
        category: true,
      },
      distinct: ["category"],
      orderBy: {
        category: "asc",
      },
    });

    return {
      success: true,
      data: categories.map(cat => cat.category),
    };
  } catch (error) {
    console.error("Error getting expense categories:", error);
    return {
      success: false,
      error: "Failed to fetch expense categories",
      data: [],
    };
  }
}

// Get monthly expense summary
export async function getMonthlyExpenseSummary(year: number) {
  try {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const expenses = await db.transactions.findMany({
      where: {
        type: "EXPENSE",
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        transactionDate: true,
        amount: true,
        category: true,
      },
    });

    // Group by month
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: 0,
      categories: {} as Record<string, number>,
    }));

    expenses.forEach(expense => {
      const month = expense.transactionDate.getMonth();
      monthlyData[month].total += expense.amount;

      if (!monthlyData[month].categories[expense.category]) {
        monthlyData[month].categories[expense.category] = 0;
      }
      monthlyData[month].categories[expense.category] += expense.amount;
    });

    return {
      success: true,
      data: monthlyData,
    };
  } catch (error) {
    console.error("Error getting monthly expense summary:", error);
    return {
      success: false,
      error: "Failed to fetch monthly expense summary",
      data: [],
    };
  }
}

// Get expense statistics for current month
export async function getCurrentMonthExpenseStatistics() {
  try {
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const whereClause = {
      type: TransactionType.EXPENSE,
      transactionDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    const [total, count, categoryStats] = await Promise.all([
      db.transactions.aggregate({
        where: whereClause,
        _sum: {
          amount: true,
        },
      }),
      db.transactions.count({
        where: whereClause,
      }),
      db.transactions.groupBy({
        by: ["category"],
        where: whereClause,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalAmount: total._sum?.amount || 0,
        totalCount: count,
        averageAmount: count > 0 ? (total._sum?.amount || 0) / count : 0,
        categoryBreakdown: categoryStats.map(stat => ({
          category: stat.category,
          amount: stat._sum?.amount || 0,
          count: stat._count?.id || 0,
        })),
        monthName: startOfMonth.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      },
    };
  } catch (error) {
    console.error("Error getting current month expense statistics:", error);
    return {
      success: false,
      error: "Failed to fetch current month expense statistics",
      data: null,
    };
  }
}

// Get expense statistics
export async function getExpenseStatistics(filters?: {
  startDate?: Date;
  endDate?: Date;
  category?: string;
}) {
  try {
    const whereClause: any = { type: "EXPENSE" };

    if (filters?.startDate || filters?.endDate) {
      whereClause.transactionDate = {};
      if (filters.startDate) {
        whereClause.transactionDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.transactionDate.lte = filters.endDate;
      }
    }

    if (filters?.category) {
      whereClause.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }

    const [total, count, categoryStats] = await Promise.all([
      db.transactions.aggregate({
        where: whereClause,
        _sum: {
          amount: true,
        },
      }),
      db.transactions.count({
        where: whereClause,
      }),
      db.transactions.groupBy({
        by: ["category"],
        where: whereClause,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalAmount: total._sum.amount || 0,
        totalCount: count,
        averageAmount: count > 0 ? (total._sum.amount || 0) / count : 0,
        categoryBreakdown: categoryStats.map(stat => ({
          category: stat.category,
          amount: stat._sum.amount || 0,
          count: stat._count.id,
        })),
      },
    };
  } catch (error) {
    console.error("Error getting expense statistics:", error);
    return {
      success: false,
      error: "Failed to fetch expense statistics",
      data: null,
    };
  }
}

// Get expense statistics by specific month and year
export async function getExpenseStatisticsByMonth(year: number, month: number) {
  try {
    // Create month range (month is 1-indexed)
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const whereClause = {
      type: TransactionType.EXPENSE,
      transactionDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    const [total, count, categoryStats] = await Promise.all([
      db.transactions.aggregate({
        where: whereClause,
        _sum: {
          amount: true,
        },
      }),
      db.transactions.count({
        where: whereClause,
      }),
      db.transactions.groupBy({
        by: ["category"],
        where: whereClause,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalAmount: total._sum?.amount || 0,
        totalCount: count,
        averageAmount: count > 0 ? (total._sum?.amount || 0) / count : 0,
        categoryBreakdown: categoryStats.map(stat => ({
          category: stat.category,
          amount: stat._sum?.amount || 0,
          count: stat._count?.id || 0,
        })),
        monthName: startOfMonth.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
        startOfMonth,
        endOfMonth,
      },
    };
  } catch (error) {
    console.error("Error getting expense statistics by month:", error);
    return {
      success: false,
      error: "Failed to fetch expense statistics for the selected month",
      data: null,
    };
  }
}

// Get all-time expense statistics
export async function getAllTimeExpenseStatistics() {
  try {
    const whereClause = {
      type: TransactionType.EXPENSE,
    };

    const [total, count, categoryStats] = await Promise.all([
      db.transactions.aggregate({
        where: whereClause,
        _sum: {
          amount: true,
        },
      }),
      db.transactions.count({
        where: whereClause,
      }),
      db.transactions.groupBy({
        by: ["category"],
        where: whereClause,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalAmount: total._sum?.amount || 0,
        totalCount: count,
        averageAmount: count > 0 ? (total._sum?.amount || 0) / count : 0,
        categoryBreakdown: categoryStats.map(stat => ({
          category: stat.category,
          amount: stat._sum?.amount || 0,
          count: stat._count?.id || 0,
        })),
        monthName: "Semua Waktu",
      },
    };
  } catch (error) {
    console.error("Error getting all-time expense statistics:", error);
    return {
      success: false,
      error: "Failed to fetch all-time expense statistics",
      data: null,
    };
  }
}
