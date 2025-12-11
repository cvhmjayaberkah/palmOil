"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface CreateRevenueAnalyticsData {
  period: string;
  timeRange: "MONTH" | "QUARTER" | "YEAR";
  totalRevenue: number;
  monthlyTrends: MonthlyTrend[];
  productPerformance: ProductPerformance[];
  salesByRep: SalesByRep[];
  storePerformance: StorePerformance[];
  avgOrderValue: AvgOrderValue[];
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  growth: number;
  orders: number;
  customers: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  revenue: number;
  quantity: number;
  growth: number;
}

export interface SalesByRep {
  salesRepId: string;
  salesRepName: string;
  revenue: number;
  orders: number;
  customers: number;
  growth: number;
}

export interface StorePerformance {
  storeId: string;
  storeName: string;
  revenue: number;
  orders: number;
  growth: number;
}

export interface AvgOrderValue {
  period: string;
  averageValue: number;
  trend: number;
  value: number;
}

// Temporary stubs - TODO: Implement with actual data or remove
export async function getRevenueAnalytics() {
  try {
    return [];
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    throw new Error("Failed to fetch revenue analytics");
  }
}

export async function getRevenueAnalyticsById(id: string) {
  try {
    return null;
  } catch (error) {
    console.error("Error fetching revenue analytics by ID:", error);
    throw new Error("Failed to fetch revenue analytics");
  }
}

export async function createRevenueAnalytics(data: CreateRevenueAnalyticsData) {
  try {
    console.warn("createRevenueAnalytics is not implemented");
    return { success: false, error: "Not implemented" };
  } catch (error) {
    console.error("Error creating revenue analytics:", error);
    return { success: false, error: "Failed to create revenue analytics" };
  }
}

export async function updateRevenueAnalytics(
  id: string,
  data: Partial<CreateRevenueAnalyticsData>
) {
  try {
    console.warn("updateRevenueAnalytics is not implemented");
    return { success: false, error: "Not implemented" };
  } catch (error) {
    console.error("Error updating revenue analytics:", error);
    return { success: false, error: "Failed to update revenue analytics" };
  }
}

export async function deleteRevenueAnalytics(id: string) {
  try {
    console.warn("deleteRevenueAnalytics is not implemented");
    return { success: false, error: "Not implemented" };
  } catch (error) {
    console.error("Error deleting revenue analytics:", error);
    return { success: false, error: "Failed to delete revenue analytics" };
  }
}

// Form action wrappers
export async function createRevenueAnalyticsAction(formData: FormData) {
  console.warn("createRevenueAnalyticsAction is not implemented");
  return { success: false, error: "Not implemented" };
}

export async function updateRevenueAnalyticsAction(formData: FormData) {
  console.warn("updateRevenueAnalyticsAction is not implemented");
  return { success: false, error: "Not implemented" };
}

export async function deleteRevenueAnalyticsAction(formData: FormData) {
  console.warn("deleteRevenueAnalyticsAction is not implemented");
  return { success: false, error: "Not implemented" };
}

// Working functions that use actual database tables

/**
 * Calculate revenue over time from actual invoice data
 */
export async function getRevenueOverTime(
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month" | "quarter" | "year" = "month"
) {
  try {
    // Get paid invoices within the date range
    const invoices = await db.invoices.findMany({
      where: {
        status: "PAID",
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        invoiceDate: true,
        totalAmount: true,
      },
      orderBy: {
        invoiceDate: "asc",
      },
    });

    // Group by specified period
    const revenueByPeriod = new Map<string, number>();
    
    invoices.forEach(invoice => {
      let periodKey: string;
      const date = new Date(invoice.invoiceDate);
      
      switch (groupBy) {
        case "day":
          periodKey = date.toISOString().split("T")[0];
          break;
        case "week":
          const week = getWeekNumber(date);
          periodKey = `${date.getFullYear()}-W${week}`;
          break;
        case "month":
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "quarter":
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          break;
        case "year":
          periodKey = date.getFullYear().toString();
          break;
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
      
      const currentRevenue = revenueByPeriod.get(periodKey) || 0;
      revenueByPeriod.set(periodKey, currentRevenue + invoice.totalAmount);
    });

    // Convert to array format
    return Array.from(revenueByPeriod.entries()).map(([period, revenue]) => ({
      period,
      revenue,
    }));
  } catch (error) {
    console.error("Error calculating revenue over time:", error);
    throw new Error("Failed to calculate revenue over time");
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get top performing products by revenue
 */
export async function getTopProducts(limit: number = 10) {
  try {
    const products = await db.invoiceItems.groupBy({
      by: ["productId"],
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalPrice: "desc",
        },
      },
      take: limit,
    });

    // Get product details
    const productDetails = await Promise.all(
      products.map(async (item) => {
        if (!item.productId) {
          return {
            id: 'unknown',
            name: 'Unknown Product',
            unit: 'N/A',
            quantity: item._count.id || 0,
            totalSales: item._sum.totalPrice || 0,
          };
        }
        
        const product = await db.products.findUnique({
          where: { id: item.productId },
          select: {
            name: true,
            unit: true,
          },
        });
        
        return {
          productId: item.productId,
          productName: product?.name || "Unknown Product",
          revenue: item._sum.totalPrice || 0,
          quantity: item._count.id,
        };
      })
    );

    return productDetails;
  } catch (error) {
    console.error("Error getting top products:", error);
    throw new Error("Failed to get top products");
  }
}
