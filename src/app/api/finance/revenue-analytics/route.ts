import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viewType = searchParams.get("viewType") || "gross"; // Default to gross

    const data = await generateRevenueData(
      "month",
      viewType as "gross" | "net"
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in revenue analytics API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch revenue analytics data",
      },
      { status: 500 }
    );
  }
}

async function generateRevenueData(
  timeRange: "month",
  viewType: "gross" | "net"
) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;
  let periods: { start: Date; end: Date; label: string }[] = [];

  // Hanya mendukung monthly - Current year: January to December
  const currentYear = now.getFullYear();
  startDate = new Date(currentYear, 0, 1); // January 1
  endDate = new Date(currentYear, 11, 31); // December 31

  for (let i = 0; i < 12; i++) {
    const periodStart = new Date(currentYear, i, 1);
    const periodEnd = new Date(currentYear, i + 1, 0, 23, 59, 59, 999); // Last day of current month at 23:59:59
    
    periods.push({
      start: periodStart,
      end: periodEnd,
      label: periodStart.toLocaleDateString("en-US", { month: "long" }),
    });
  }

  // Fetch monthly trends with real data
  const monthlyTrends = await Promise.all(
    periods.map(async (period, index) => {
      // Get gross revenue - include both PAID and COMPLETED invoices
      const grossRevenue = await db.invoices.aggregate({
        where: {
          invoiceDate: {
            gte: period.start,
            lte: period.end,
          },
          OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
        },
        _sum: {
          totalAmount: true,
        },
      });

      let finalRevenue = grossRevenue._sum.totalAmount || 0;

      // If net view, subtract expenses and COGS
      if (viewType === "net") {
        // Get total expenses for the period from transactions table
        const expenses = await db.transactions.aggregate({
          where: {
            transactionDate: {
              gte: period.start,
              lte: period.end,
            },
            type: "EXPENSE", // Only expense transactions
          },
          _sum: {
            amount: true,
          },
        });

        // Get COGS (cost of goods sold) for the period - include both PAID and COMPLETED invoices
        const invoiceItemsWithProducts = await db.invoiceItems.findMany({
          where: {
            invoices: {
              invoiceDate: {
                gte: period.start,
                lte: period.end,
              },
              OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
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
        finalRevenue = finalRevenue - (expenses._sum.amount || 0) - totalCOGS;
      }

      // Calculate growth compared to previous period
      let growth = 0;
      if (index > 0) {
        const prevPeriod = periods[index - 1];

        // Get previous period revenue using same logic - include both PAID and COMPLETED invoices
        const prevGrossRevenue = await db.invoices.aggregate({
          where: {
            invoiceDate: {
              gte: prevPeriod.start,
              lte: prevPeriod.end,
            },
            OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
          },
          _sum: {
            totalAmount: true,
          },
        });

        let prevFinalRevenue = prevGrossRevenue._sum.totalAmount || 0;

        if (viewType === "net") {
          // Get previous period expenses from transactions table
          const prevExpenses = await db.transactions.aggregate({
            where: {
              transactionDate: {
                gte: prevPeriod.start,
                lte: prevPeriod.end,
              },
              type: "EXPENSE", // Only expense transactions
            },
            _sum: {
              amount: true,
            },
          });

          // Get previous period COGS - include both PAID and COMPLETED invoices
          const prevInvoiceItemsWithProducts = await db.invoiceItems.findMany({
            where: {
              invoices: {
                invoiceDate: {
                  gte: prevPeriod.start,
                  lte: prevPeriod.end,
                },
                OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
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

          const prevTotalCOGS = prevInvoiceItemsWithProducts.reduce(
            (sum, item) => {
              const itemCOGS = (item.products?.cost || 0) * item.quantity;
              return sum + itemCOGS;
            },
            0
          );

          prevFinalRevenue =
            prevFinalRevenue - (prevExpenses._sum.amount || 0) - prevTotalCOGS;
        }

        if (prevFinalRevenue > 0) {
          growth = ((finalRevenue - prevFinalRevenue) / prevFinalRevenue) * 100;
        }
      }

      return {
        month: period.label,
        revenue: finalRevenue,
        growth: growth,
      };
    })
  );

  // Fetch product performance based on paid and completed invoices
  const productPerformance = await db.invoiceItems.groupBy({
    by: ["productId"],
    where: {
      invoices: {
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
        OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
      },
    },
    _sum: {
      quantity: true,
      totalPrice: true,
    },
    orderBy: {
      _sum: {
        totalPrice: "desc",
      },
    },
    take: 5,
  });

  const productPerformanceData = await Promise.all(
    productPerformance.map(async (item) => {
      if (!item.productId) return null; // Skip if productId is null

      const product = await db.products.findUnique({
        where: { id: item.productId },
        include: {
          category: {
            select: { name: true },
          },
        },
      });

      // Calculate growth for this product by comparing across sequential periods
      let growth = 0;

      // Get revenue data for this product across all periods
      const productPeriodData = await Promise.all(
        periods.map(async (period) => {
          const revenue = await db.invoiceItems.aggregate({
            where: {
              productId: item.productId!,
              invoices: {
                invoiceDate: {
                  gte: period.start,
                  lte: period.end,
                },
                OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
              },
            },
            _sum: {
              totalPrice: true,
            },
          });
          return revenue._sum?.totalPrice || 0;
        })
      );

      // Calculate growth by comparing last two periods with revenue
      const nonZeroPeriods = productPeriodData.filter((revenue) => revenue > 0);
      if (nonZeroPeriods.length >= 2) {
        const latestRevenue = nonZeroPeriods[nonZeroPeriods.length - 1];
        const previousRevenue = nonZeroPeriods[nonZeroPeriods.length - 2];

        if (previousRevenue > 0) {
          growth = ((latestRevenue - previousRevenue) / previousRevenue) * 100;
        }
      }

      // Calculate final revenue (gross or net)
      let finalProductRevenue = item._sum.totalPrice || 0;

      if (viewType === "net") {
        // Subtract COGS for this product
        const productCOGS = (product?.cost || 0) * (item._sum.quantity || 0);
        finalProductRevenue = finalProductRevenue - productCOGS;
      }

      return {
        id: item.productId,
        name: product?.name || "Unknown Product",
        revenue: finalProductRevenue,
        units: item._sum.quantity || 0,
        growth: growth,
        category: product?.category?.name || "Uncategorized",
      };
    })
  );

  // Filter out null results
  const filteredProductPerformanceData = productPerformanceData.filter(
    (item) => item !== null
  );

  // Fetch sales by representative based on paid and completed invoices through purchase orders
  const salesByRep = await db.invoices.findMany({
    where: {
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
      OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
    },
    include: {
      purchaseOrder: {
        include: {
          order: {
            select: {
              salesId: true,
            },
          },
        },
      },
    },
  });

  // Group by salesId manually
  const salesRevenue = new Map<
    string,
    { totalAmount: number; count: number }
  >();

  salesByRep.forEach((invoice) => {
    const salesId = invoice.purchaseOrder?.order?.salesId;
    if (salesId) {
      const existing = salesRevenue.get(salesId) || {
        totalAmount: 0,
        count: 0,
      };
      salesRevenue.set(salesId, {
        totalAmount: existing.totalAmount + invoice.totalAmount,
        count: existing.count + 1,
      });
    }
  });

  // Convert to array and sort by revenue
  const salesByRepArray = Array.from(salesRevenue.entries())
    .map(([salesId, data]) => ({
      salesId,
      totalAmount: data.totalAmount,
      count: data.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  const salesByRepData = await Promise.all(
    salesByRepArray.map(async (item) => {
      const user = await db.users.findUnique({
        where: { id: item.salesId },
      });

      // For conversion calculation, use all orders as baseline
      const totalOrders = await db.orders.count({
        where: {
          salesId: item.salesId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const completedOrders = item.count;
      const conversion =
        totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      return {
        id: item.salesId,
        name: user?.name || "Unknown Sales Rep",
        revenue: item.totalAmount,
        deals: completedOrders,
        conversion: conversion,
      };
    })
  );

  // Fetch store performance based on paid and completed invoices through customers
  const storePerformance = await db.invoices.findMany({
    where: {
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
      OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
    },
    include: {
      purchaseOrder: {
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Group by customerId manually
  const customerRevenue = new Map<
    string,
    { totalAmount: number; customer: any }
  >();

  storePerformance.forEach((invoice) => {
    const customer = invoice.purchaseOrder?.order?.customer;
    if (customer) {
      const existing = customerRevenue.get(customer.id) || {
        totalAmount: 0,
        customer,
      };
      customerRevenue.set(customer.id, {
        totalAmount: existing.totalAmount + invoice.totalAmount,
        customer,
      });
    }
  });

  // Convert to array and sort by revenue
  const storePerformanceArray = Array.from(customerRevenue.entries())
    .map(([customerId, data]) => ({
      customerId,
      totalAmount: data.totalAmount,
      customer: data.customer,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const storePerformanceData = await Promise.all(
    storePerformanceArray.map(async (item) => {
      const customer = item.customer;

      // Calculate growth for this customer/store by comparing across sequential periods
      let growth = 0;

      // Get revenue data for this customer across all periods
      const customerPeriodData = await Promise.all(
        periods.map(async (period) => {
          const revenue = await db.invoices.aggregate({
            where: {
              invoiceDate: {
                gte: period.start,
                lte: period.end,
              },
              OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
              purchaseOrder: {
                order: {
                  customerId: customer.id,
                },
              },
            },
            _sum: {
              totalAmount: true,
            },
          });
          return revenue._sum?.totalAmount || 0;
        })
      );

      // Calculate growth by comparing last two periods with revenue
      const nonZeroPeriods = customerPeriodData.filter(
        (revenue) => revenue > 0
      );
      if (nonZeroPeriods.length >= 2) {
        const latestRevenue = nonZeroPeriods[nonZeroPeriods.length - 1];
        const previousRevenue = nonZeroPeriods[nonZeroPeriods.length - 2];

        if (previousRevenue > 0) {
          growth = ((latestRevenue - previousRevenue) / previousRevenue) * 100;
        }
      }

      // Calculate final revenue (gross or net) for this customer
      let finalCustomerRevenue = item.totalAmount;

      if (viewType === "net") {
        // Get all invoice items for this customer to calculate COGS
        const customerInvoiceItems = await db.invoiceItems.findMany({
          where: {
            invoices: {
              invoiceDate: {
                gte: startDate,
                lte: endDate,
              },
              paymentStatus: "PAID",
              purchaseOrder: {
                order: {
                  customerId: customer.id,
                },
              },
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

        const customerCOGS = customerInvoiceItems.reduce((sum, item) => {
          const itemCOGS = (item.products?.cost || 0) * item.quantity;
          return sum + itemCOGS;
        }, 0);

        finalCustomerRevenue = finalCustomerRevenue - customerCOGS;
      }

      return {
        id: customer.id,
        name: customer.name || "Unknown Customer",
        location: customer.city || "Unknown Location",
        revenue: finalCustomerRevenue,
        growth: growth,
      };
    })
  );

  // Calculate average order value from paid and completed invoices
  const currentPeriodInvoices = await db.invoices.aggregate({
    where: {
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
      OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
    },
    _avg: {
      totalAmount: true,
    },
    _count: {
      id: true,
    },
  });

  const previousPeriodInvoices = await db.invoices.aggregate({
    where: {
      invoiceDate: {
        gte:
          timeRange === "month"
            ? new Date(startDate.getFullYear(), startDate.getMonth() - 6, 1)
            : timeRange === "quarter"
            ? new Date(startDate.getFullYear() - 1, startDate.getMonth(), 1)
            : new Date(startDate.getFullYear() - 6, 0, 1),
        lt: startDate,
      },
      OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
    },
    _avg: {
      totalAmount: true,
    },
  });

  const currentAOV = currentPeriodInvoices._avg.totalAmount || 0;
  const previousAOV = previousPeriodInvoices._avg.totalAmount || 0;
  const aovTrend =
    previousAOV > 0 ? ((currentAOV - previousAOV) / previousAOV) * 100 : 0;

  // Generate AOV breakdown by periods using paid and completed invoices
  const aovBreakdown = await Promise.all(
    periods.slice(-4).map(async (period) => {
      const invoices = await db.invoices.aggregate({
        where: {
          invoiceDate: {
            gte: period.start,
            lte: period.end,
          },
          OR: [{ paymentStatus: "PAID" }, { status: "COMPLETED" }],
        },
        _avg: {
          totalAmount: true,
        },
      });

      return {
        period: period.label,
        value: invoices._avg.totalAmount || 0,
      };
    })
  );

  // Calculate summary data - include both PAID and COMPLETED invoices
  const grossTotalRevenue = await db.invoices.aggregate({
    where: {
      invoiceDate: {
        gte: startDate,
        lte: endDate,
      },
      OR: [
        { paymentStatus: "PAID" },
        { status: "COMPLETED" }
      ],
    },
    _sum: {
      totalAmount: true,
    },
  });

  let finalTotalRevenue = grossTotalRevenue._sum.totalAmount || 0;

  // If net view, subtract total expenses and COGS for the entire period
  if (viewType === "net") {
    // Get total expenses for the entire year from transactions table
    const totalExpenses = await db.transactions.aggregate({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        type: "EXPENSE", // Only expense transactions
      },
      _sum: {
        amount: true,
      },
    });

    // Get total COGS for the entire year - include both PAID and COMPLETED invoices
    const allInvoiceItemsWithProducts = await db.invoiceItems.findMany({
      where: {
        invoices: {
          invoiceDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { paymentStatus: "PAID" },
            { status: "COMPLETED" }
          ],
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

    const totalYearCOGS = allInvoiceItemsWithProducts.reduce((sum, item) => {
      const itemCOGS = (item.products?.cost || 0) * item.quantity;
      return sum + itemCOGS;
    }, 0);

    finalTotalRevenue =
      finalTotalRevenue - (totalExpenses._sum.amount || 0) - totalYearCOGS;
  }

  const summary = {
    totalRevenue: finalTotalRevenue,
    growth:
      monthlyTrends.length > 1
        ? monthlyTrends[monthlyTrends.length - 1].growth
        : 0,
    bestMonth: monthlyTrends.reduce((best, current) =>
      current.revenue > best.revenue ? current : best
    ).month,
    topProduct: productPerformanceData[0]?.name || "No data",
    topSalesRep: salesByRepData[0]?.name || "No data",
  };

  return {
    monthlyTrends,
    productPerformance: productPerformanceData,
    salesByRep: salesByRepData,
    storePerformance: storePerformanceData,
    avgOrderValue: {
      current: currentAOV,
      previous: previousAOV,
      trend: aovTrend,
      breakdown: aovBreakdown,
    },
    summary,
  };
}
