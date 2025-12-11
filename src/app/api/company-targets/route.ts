import { NextRequest, NextResponse } from "next/server";
import { createCompanyTarget } from "@/lib/actions/sales-targets";
import { TargetType } from "@prisma/client";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { targetType, targetPeriod, targetAmount, isActive } = body;

    // Validate required fields
    if (!targetType || !targetPeriod || !targetAmount) {
      return NextResponse.json(
        {
          success: false,
          error: "Target type, period, and amount are required",
        },
        { status: 400 }
      );
    }


    // Create company target using the server action
    const result = await createCompanyTarget({
      targetType: targetType as TargetType,
      targetPeriod,
      targetAmount: parseFloat(targetAmount),
      isActive: isActive !== undefined ? isActive : true,
    });


    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("💥 Error in POST /api/company-targets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create company target",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType") as TargetType | null;
    const viewType = searchParams.get("viewType") || "gross"; // Default to gross

    const where = {
      isActive: true,
      ...(targetType && { targetType }),
    };

    const targets = await db.companyTargets.findMany({
      where,
      orderBy: {
        targetPeriod: "asc",
      },
    });

    // Calculate achieved amounts from actual sales data
    const transformedTargets = await Promise.all(
      targets.map(async (target) => {
        let achievedAmount = 0;

        try {
          // Parse target period to get date range
          let startDate: Date;
          let endDate: Date;

          if (target.targetType === "MONTHLY") {
            // Format: YYYY-MM
            const [year, month] = target.targetPeriod.split("-").map(Number);
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0); // Last day of month
          } else if (target.targetType === "QUARTERLY") {
            // Format: YYYY-Q1, YYYY-Q2, etc.
            const [year, quarterStr] = target.targetPeriod.split("-");
            const quarter = parseInt(quarterStr.replace("Q", ""));
            const startMonth = (quarter - 1) * 3;
            startDate = new Date(parseInt(year), startMonth, 1);
            endDate = new Date(parseInt(year), startMonth + 3, 0); // Last day of quarter
          } else if (target.targetType === "YEARLY") {
            // Format: YYYY
            const year = parseInt(target.targetPeriod);
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
          } else {
            startDate = new Date();
            endDate = new Date();
          }

          // Calculate achieved amount from paid invoices in the period
          const paidInvoices = await db.invoices.findMany({
            where: {
              paymentStatus: "PAID", // Use paymentStatus instead of status
              invoiceDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            select: {
              totalAmount: true,
            },
          });

          let grossRevenue = paidInvoices.reduce(
            (sum, invoice) => sum + invoice.totalAmount,
            0
          );

          achievedAmount = grossRevenue;

          // If net view, subtract expenses and COGS for the period
          if (viewType === "net") {
            // Get total expenses for the period
            const expenses = await db.expenses.aggregate({
              where: {
                expenseDate: {
                  gte: startDate,
                  lte: endDate,
                },
                status: "PAID", // Only count paid expenses
              },
              _sum: {
                totalAmount: true,
              },
            });

            // Get COGS (cost of goods sold) for the period
            const invoiceItemsWithProducts = await db.invoiceItems.findMany({
              where: {
                invoices: {
                  invoiceDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                  paymentStatus: "PAID",
                },
              },
              include: {
                products: {
                  select: {
                    cost: true,
                  },
                },
              },
            });

            const totalCOGS = invoiceItemsWithProducts.reduce((sum, item) => {
              const itemCOGS = (item.products?.cost || 0) * item.quantity;
              return sum + itemCOGS;
            }, 0);

            // Calculate net profit = gross revenue - expenses - COGS
            achievedAmount = grossRevenue - (expenses._sum.totalAmount || 0) - totalCOGS;
          }

          // Update the target's achieved amount in the database
          await db.companyTargets.update({
            where: { id: target.id },
            data: { achievedAmount },
          });
        } catch (error) {
          console.error(
            `Error calculating achieved amount for target ${target.id}:`,
            error
          );
          achievedAmount = target.achievedAmount; // Fallback to stored value
        }

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

    return NextResponse.json({
      success: true,
      data: transformedTargets,
    });
  } catch (error) {
    console.error("Error fetching company targets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch company targets",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, targetAmount } = body;

    // Validate required fields
    if (!id || !targetAmount) {
      return NextResponse.json(
        {
          success: false,
          error: "Target ID and amount are required",
        },
        { status: 400 }
      );
    }

    // Update the target
    const updatedTarget = await db.companyTargets.update({
      where: { id },
      data: {
        targetAmount: parseFloat(targetAmount),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTarget,
    });
  } catch (error) {
    console.error("Error updating company target:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update company target",
      },
      { status: 500 }
    );
  }
}
