"use server";

import db from "@/lib/db";
import { SalesTargets, TargetType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type SalesTargetFormData = {
  userId: string;
  targetType: TargetType;
  targetPeriod: string; // Format: YYYY-MM for monthly, YYYY-Q1 for quarterly, YYYY for yearly
  targetAmount: number;
  isActive: boolean;
};

export type CompanyTargetFormData = {
  targetType: TargetType;
  targetPeriod: string;
  targetAmount: number;
  isActive: boolean;
};

export type SalesTargetWithUser = SalesTargets & {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

// Get all sales targets
export async function getSalesTargets(): Promise<SalesTargetWithUser[]> {
  try {
    const targets = await db.salesTargets.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return targets;
  } catch (error) {
    console.error("Error fetching sales targets:", error);
    throw new Error("Failed to fetch sales targets");
  }
}

// Get sales target by ID
export async function getSalesTargetById(
  id: string
): Promise<SalesTargets | null> {
  try {
    const target = await db.salesTargets.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    return target;
  } catch (error) {
    console.error("Error fetching sales target:", error);
    throw new Error("Failed to fetch sales target");
  }
}

// Get sales target for specific user and period
export async function getUserSalesTarget(
  userId: string,
  targetPeriod: string
): Promise<SalesTargets | null> {
  try {
    const target = await db.salesTargets.findFirst({
      where: {
        userId,
        targetPeriod,
        isActive: true,
      },
    });

    return target;
  } catch (error) {
    console.error("Error fetching user sales target:", error);
    return null;
  }
}

// Get current month target for user
export async function getCurrentMonthTarget(
  userId: string
): Promise<SalesTargets | null> {
  try {
    const currentDate = new Date();
    const targetPeriod = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}`;

    return await getUserSalesTarget(userId, targetPeriod);
  } catch (error) {
    console.error("Error fetching current month target:", error);
    return null;
  }
}

// Create new sales target
export async function createSalesTarget(data: SalesTargetFormData) {
  try {
    // First, check if the user exists
    const userExists = await db.users.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, email: true },
    });

    if (!userExists) {
      return {
        success: false,
        error:
          "User tidak ditemukan. Silakan login ulang atau hubungi administrator.",
      };
    }

    // Check if target already exists for this user and period
    const existingTarget = await db.salesTargets.findFirst({
      where: {
        userId: data.userId,
        targetPeriod: data.targetPeriod,
      },
    });

    if (existingTarget) {
      return {
        success: false,
        error:
          "Target untuk periode ini sudah ada. Silakan edit target yang sudah ada.",
      };
    }

    const target = await db.salesTargets.create({
      data: {
        userId: data.userId,
        targetType: data.targetType,
        targetPeriod: data.targetPeriod,
        targetAmount: data.targetAmount,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/sales-target");
    revalidatePath("/management/finance/revenue-analytics");
    return { success: true, data: target };
  } catch (error) {
    console.error("Error creating sales target:", error);

    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Foreign key constraint")) {
        return {
          success: false,
          error:
            "User tidak valid. Silakan login ulang atau hubungi administrator.",
        };
      }
    }

    return {
      success: false,
      error: `Failed to create sales target: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

// Create new company target (uses CompanyTargets table)
export async function createCompanyTarget(data: CompanyTargetFormData) {
  try {
    // Check if company target already exists for this period
    const existingTarget = await db.companyTargets.findFirst({
      where: {
        targetPeriod: data.targetPeriod,
        targetType: data.targetType,
      },
    });

    if (existingTarget) {
      // Update existing target instead of creating new one
      const updatedTarget = await db.companyTargets.update({
        where: { id: existingTarget.id },
        data: {
          targetAmount: data.targetAmount,
          isActive: data.isActive,
          updatedAt: new Date(),
        },
      });

      revalidatePath("/management/sales-target");
      revalidatePath("/management/finance/revenue-analytics");
      return {
        success: true,
        data: updatedTarget,
        message: `Updated existing ${data.targetType.toLowerCase()} target for period "${
          data.targetPeriod
        }"`,
        action: "updated",
      };
    }

    // Create new target if none exists
    const target = await db.companyTargets.create({
      data: {
        targetType: data.targetType,
        targetPeriod: data.targetPeriod,
        targetAmount: data.targetAmount,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/sales-target");
    revalidatePath("/management/finance/revenue-analytics");
    return {
      success: true,
      data: target,
      message: `Created new ${data.targetType.toLowerCase()} target for period "${
        data.targetPeriod
      }"`,
      action: "created",
    };
  } catch (error) {
    console.error("Error creating/updating company target:", error);
    return {
      success: false,
      error: `Failed to create/update company target: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

// Update sales target
export async function updateSalesTarget(id: string, data: SalesTargetFormData) {
  try {
    // Check if another target exists for the same user and period (excluding current target)
    const existingTarget = await db.salesTargets.findFirst({
      where: {
        userId: data.userId,
        targetPeriod: data.targetPeriod,
        id: { not: id },
      },
    });

    if (existingTarget) {
      return {
        success: false,
        error: "Target untuk periode ini sudah ada untuk user tersebut.",
      };
    }

    const target = await db.salesTargets.update({
      where: { id },
      data: {
        userId: data.userId,
        targetType: data.targetType,
        targetPeriod: data.targetPeriod,
        targetAmount: data.targetAmount,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/sales-target");
    revalidatePath(`/management/sales-target/edit/${id}`);
    return { success: true, data: target };
  } catch (error) {
    console.error("Error updating sales target:", error);
    return { success: false, error: "Failed to update sales target" };
  }
}

// Delete sales target
export async function deleteSalesTarget(id: string) {
  try {
    await db.salesTargets.delete({
      where: { id },
    });

    revalidatePath("/management/sales-target");
    return { success: true };
  } catch (error) {
    console.error("Error deleting sales target:", error);
    return { success: false, error: "Failed to delete sales target" };
  }
}

// Toggle sales target active status
export async function toggleSalesTargetStatus(id: string) {
  try {
    const target = await db.salesTargets.findUnique({
      where: { id },
    });

    if (!target) {
      return { success: false, error: "Sales target not found" };
    }

    const updatedTarget = await db.salesTargets.update({
      where: { id },
      data: {
        isActive: !target.isActive,
      },
    });

    revalidatePath("/management/sales-target");
    return { success: true, data: updatedTarget };
  } catch (error) {
    console.error("Error toggling sales target status:", error);
    return { success: false, error: "Failed to toggle sales target status" };
  }
}

// Update achieved amount (called when orders are created/updated)
export async function updateAchievedAmount(
  userId: string,
  targetPeriod: string,
  newAmount: number
) {
  try {
    const target = await db.salesTargets.findFirst({
      where: {
        userId,
        targetPeriod,
        isActive: true,
      },
    });

    if (!target) {
      return {
        success: false,
        error: "No active target found for this period",
      };
    }

    const updatedTarget = await db.salesTargets.update({
      where: { id: target.id },
      data: {
        achievedAmount: newAmount,
      },
    });

    return { success: true, data: updatedTarget };
  } catch (error) {
    console.error("Error updating achieved amount:", error);
    return { success: false, error: "Failed to update achieved amount" };
  }
}

// Generate target period string
export async function generateTargetPeriod(
  targetType: TargetType,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  switch (targetType) {
    case "MONTHLY":
      return `${year}-${String(month).padStart(2, "0")}`;
    case "QUARTERLY":
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    case "YEARLY":
      return `${year}`;
    default:
      return `${year}-${String(month).padStart(2, "0")}`;
  }
}

// Get all sales users for dropdown
export async function getSalesUsers() {
  try {
    const users = await db.users.findMany({
      where: {
        role: "SALES",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return users;
  } catch (error) {
    console.error("Error fetching sales users:", error);
    throw new Error("Failed to fetch sales users");
  }
}

// Get targets for chart display
export async function getTargetsForChart(
  userId?: string,
  targetType: TargetType = "MONTHLY",
  userRole?: string
) {
  try {
    // If user is OWNER or ADMIN, show company-wide aggregated targets
    if (userRole === "OWNER" || userRole === "ADMIN") {
      return await getCompanyTargetsForChart(targetType);
    }

    // For individual users (like SALES), show their personal targets
    const where = userId ? { userId } : {};

    const targets = await db.salesTargets.findMany({
      where: {
        ...where,
        targetType,
        isActive: true,
      },
      orderBy: {
        targetPeriod: "asc",
      },
    });

    // Calculate achieved amounts from actual invoice data
    const targetsWithAchieved = await Promise.all(
      targets.map(async (target) => {
        const achievedAmount = await calculateAchievedAmount(
          target.userId,
          target.targetPeriod,
          target.targetType
        );

        return {
          id: target.id,
          period: target.targetPeriod,
          target: target.targetAmount,
          achieved: achievedAmount,
          percentage:
            target.targetAmount > 0
              ? (achievedAmount / target.targetAmount) * 100
              : 0,
        };
      })
    );

    return targetsWithAchieved;
  } catch (error) {
    console.error("Error fetching targets for chart:", error);
    throw new Error("Failed to fetch chart data");
  }
}

// Get company targets from the CompanyTargets table
export async function getCompanyTargets(targetType: TargetType = "MONTHLY") {
  try {
    const targets = await db.companyTargets.findMany({
      where: {
        targetType,
        isActive: true,
      },
      orderBy: {
        targetPeriod: "asc",
      },
    });

    // Calculate achieved amounts from actual invoice data (all company revenue)
    const targetsWithAchieved = await Promise.all(
      targets.map(async (target) => {
        const achievedAmount = await calculateCompanyWideRevenue(
          target.targetPeriod,
          target.targetType
        );

        return {
          id: target.id,
          period: target.targetPeriod,
          target: target.targetAmount,
          achieved: achievedAmount,
          percentage:
            target.targetAmount > 0
              ? (achievedAmount / target.targetAmount) * 100
              : 0,
        };
      })
    );

    return targetsWithAchieved;
  } catch (error) {
    console.error("Error fetching company targets:", error);
    throw new Error("Failed to fetch company targets");
  }
}

// Calculate company-wide revenue for a specific period
async function calculateCompanyWideRevenue(
  targetPeriod: string,
  targetType: TargetType
): Promise<number> {
  try {
    // Get date range based on target type and period
    const { startDate, endDate } = getDateRangeFromPeriod(
      targetPeriod,
      targetType
    );

    const result = await db.invoices.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
        status: "PAID", // Only count paid invoices
      },
    });

    return result._sum.totalAmount || 0;
  } catch (error) {
    console.error("Error calculating company-wide revenue:", error);
    return 0;
  }
}

// Helper function to get date range from period string
function getDateRangeFromPeriod(
  targetPeriod: string,
  targetType: TargetType
): { startDate: Date; endDate: Date } {
  if (targetType === "MONTHLY") {
    // Format: YYYY-MM
    const [year, month] = targetPeriod.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  } else if (targetType === "QUARTERLY") {
    // Format: YYYY-Q1
    const [year, quarter] = targetPeriod.split("-");
    const quarterNum = parseInt(quarter.replace("Q", ""));
    const startMonth = (quarterNum - 1) * 3;
    const startDate = new Date(parseInt(year), startMonth, 1);
    const endDate = new Date(
      parseInt(year),
      startMonth + 3,
      0,
      23,
      59,
      59,
      999
    );
    return { startDate, endDate };
  } else if (targetType === "YEARLY") {
    // Format: YYYY
    const year = parseInt(targetPeriod);
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Fallback to current month
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return { startDate, endDate };
}

// Get company-wide targets aggregated from all sales reps
async function getCompanyTargetsForChart(targetType: TargetType = "MONTHLY") {
  try {
    // Get all targets from users with SALES role only
    const allTargets = await db.salesTargets.findMany({
      where: {
        targetType,
        isActive: true,
        user: {
          role: "SALES", // Only include sales reps in company calculations
        },
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
      orderBy: {
        targetPeriod: "asc",
      },
    });

    // Group by period and sum up targets and achievements
    const periodGroups = allTargets.reduce((acc, target) => {
      if (!acc[target.targetPeriod]) {
        acc[target.targetPeriod] = {
          totalTarget: 0,
          userIds: new Set(),
        };
      }
      acc[target.targetPeriod].totalTarget += target.targetAmount;
      acc[target.targetPeriod].userIds.add(target.userId);
      return acc;
    }, {} as Record<string, { totalTarget: number; userIds: Set<string> }>);

    // Calculate achievements for each period
    const companyTargets = await Promise.all(
      Object.entries(periodGroups).map(async ([period, data]) => {
        // Calculate total achieved amount from all sales reps for this period
        const totalAchieved = await calculateCompanyAchievedAmount(
          period,
          targetType,
          Array.from(data.userIds)
        );

        return {
          id: `company-${period}`, // Unique ID for company targets
          period: period,
          target: data.totalTarget,
          achieved: totalAchieved,
          percentage:
            data.totalTarget > 0 ? (totalAchieved / data.totalTarget) * 100 : 0,
        };
      })
    );

    // Sort by period
    return companyTargets.sort((a, b) => a.period.localeCompare(b.period));
  } catch (error) {
    console.error("Error fetching company targets for chart:", error);
    throw new Error("Failed to fetch company chart data");
  }
}

// Calculate achieved amount from all sales reps for a specific period (based on quantity)
async function calculateCompanyAchievedAmount(
  targetPeriod: string,
  targetType: TargetType,
  userIds: string[]
): Promise<number> {
  try {
    let startDate: Date;
    let endDate: Date;

    // Parse the target period and create date range
    if (targetType === "MONTHLY") {
      const [year, month] = targetPeriod.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else if (targetType === "QUARTERLY") {
      const [year, quarterStr] = targetPeriod.split("-");
      const quarter = parseInt(quarterStr.replace("Q", ""));
      const startMonth = (quarter - 1) * 3;
      startDate = new Date(parseInt(year), startMonth, 1);
      endDate = new Date(parseInt(year), startMonth + 3, 0);
    } else if (targetType === "YEARLY") {
      const year = parseInt(targetPeriod);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    } else {
      return 0;
    }

    // Calculate total achieved quantity from all sales reps
    const result = await db.orderItems.aggregate({
      where: {
        orders: {
          salesId: {
            in: userIds, // Include all sales rep user IDs
          },
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["COMPLETED"], // Only count completed orders
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum?.quantity || 0;
  } catch (error) {
    console.error("Error calculating company achieved quantity:", error);
    return 0;
  }
}

// Calculate achieved amount from actual order quantity data (krat/pieces)
async function calculateAchievedAmount(
  userId: string,
  targetPeriod: string,
  targetType: TargetType
): Promise<number> {
  try {
    let startDate: Date;
    let endDate: Date;

    // Parse the target period and create date range
    if (targetType === "MONTHLY") {
      // targetPeriod format: "2025-01"
      const [year, month] = targetPeriod.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // Last day of the month
    } else if (targetType === "QUARTERLY") {
      // targetPeriod format: "2025-Q1"
      const [year, quarterStr] = targetPeriod.split("-");
      const quarter = parseInt(quarterStr.replace("Q", ""));
      const startMonth = (quarter - 1) * 3;
      startDate = new Date(parseInt(year), startMonth, 1);
      endDate = new Date(parseInt(year), startMonth + 3, 0); // Last day of the quarter
    } else if (targetType === "YEARLY") {
      // targetPeriod format: "2025"
      const year = parseInt(targetPeriod);
      startDate = new Date(year, 0, 1); // Jan 1
      endDate = new Date(year, 11, 31); // Dec 31
    } else {
      return 0;
    }

    // Calculate achieved quantity from order items by this sales rep
    const result = await db.orderItems.aggregate({
      where: {
        orders: {
          salesId: userId,
          orderDate: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["COMPLETED"], // Only count completed orders
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum?.quantity || 0;
  } catch (error) {
    console.error("Error calculating achieved quantity:", error);
    return 0;
  }
}
