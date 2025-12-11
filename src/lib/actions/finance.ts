import db from "@/lib/db";

interface FinanceDashboardData {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    target: number;
  };
  profit: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    margin: number;
    grossMargin: number;
  };
  orders: {
    total: number;
    thisMonth: number;
    pending: number;
    confirmed: number;
    avgOrderValue: number;
    completionRate: number;
  };
  products: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
    topSelling: Array<{
      id: string;
      name: string;
      sales: number;
      revenue: number;
      growth: number;
    }>;
  };
  customers: {
    total: number;
    active: number;
    newThisMonth: number;
    retention: number;
    lifetime: number;
  };
  cashFlow: {
    outstanding: number;
    pending: number;
    paid: number;
    dso: number;
    projected: number;
  };
  kpis: {
    salesGrowth: number;
    customerAcquisition: number;
    conversionRate: number;
    inventoryTurnover: number;
    visitROI: number;
  };
}

export async function getFinanceDashboardData(
  timeRange: "month" | "quarter" | "year" = "month"
): Promise<{ success: boolean; data?: FinanceDashboardData; error?: string }> {
  try {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentYear = new Date(now.getFullYear(), 0, 1);

    // Calculate date ranges based on timeRange
    let startDate: Date;
    let previousStartDate: Date;

    switch (timeRange) {
      case "quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        previousStartDate = new Date(
          now.getFullYear(),
          (currentQuarter - 1) * 3,
          1
        );
        break;
      case "year":
        startDate = currentYear;
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default: // month
        startDate = currentMonth;
        previousStartDate = lastMonth;
        break;
    }

    // Revenue Analytics
    const currentRevenue = await db.invoices.aggregate({
      where: {
        invoiceDate: {
          gte: startDate,
          lte: now,
        },
        status: "PAID",
      },
      _sum: {
        totalAmount: true,
      },
    });

    const previousRevenue = await db.invoices.aggregate({
      where: {
        invoiceDate: {
          gte: previousStartDate,
          lt: startDate,
        },
        status: "PAID",
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = await db.invoices.aggregate({
      where: {
        status: "PAID",
      },
      _sum: {
        totalAmount: true,
      },
    });

    const thisMonthRevenue = currentRevenue._sum.totalAmount || 0;
    const lastMonthRevenue = previousRevenue._sum.totalAmount || 0;
    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // Profit Analysis (assuming 30% average profit margin)
    const totalCosts = await db.orderItems.aggregate({
      where: {
        orders: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
          status: "COMPLETED",
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const grossProfit = thisMonthRevenue - (totalCosts._sum.totalPrice || 0);
    const profitMargin =
      thisMonthRevenue > 0 ? (grossProfit / thisMonthRevenue) * 100 : 0;

    // Orders Analytics
    const ordersThisMonth = await db.orders.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
    });

    const completedOrders = await db.orders.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
        status: "COMPLETED",
      },
    });

    const pendingOrders = await db.orders.count({
      where: {
        status: {
          in: ["NEW", "PROCESSING", "PENDING_CONFIRMATION"],
        },
      },
    });

    const totalOrders = await db.orders.count();

    const avgOrderValue =
      ordersThisMonth > 0 ? thisMonthRevenue / ordersThisMonth : 0;
    const completionRate =
      ordersThisMonth > 0 ? (completedOrders / ordersThisMonth) * 100 : 0;

    // Products Analytics
    const totalProducts = await db.products.count();
    const activeProducts = await db.products.count({
      where: { isActive: true },
    });

    const lowStockProducts = await db.products.count({
      where: {
        currentStock: {
          lte: db.products.fields.minStock,
        },
        isActive: true,
      },
    });

    const outOfStockProducts = await db.products.count({
      where: {
        currentStock: 0,
        isActive: true,
      },
    });

    // Top selling products
    const topSellingProducts = await db.orderItems.groupBy({
      by: ["productId"],
      where: {
        orders: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
          status: "COMPLETED",
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

    const topProducts = await Promise.all(
      topSellingProducts.map(async (item: any) => {
        const product = await db.products.findUnique({
          where: { id: item.productId },
        });
        return {
          id: item.productId,
          name: product?.name || "Unknown Product",
          sales: item._sum.quantity || 0,
          revenue: item._sum.totalPrice || 0,
          growth: Math.random() * 20 + 5, // Mock growth data
        };
      })
    );

    // Customer Analytics
    const totalCustomers = await db.customers.count();
    const activeCustomers = await db.customers.count({
      where: { isActive: true },
    });

    const newCustomersThisMonth = await db.customers.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
    });

    // Cash Flow Analytics
    const outstandingInvoices = await db.invoices.aggregate({
      where: {
        status: "SENT",
        dueDate: {
          lt: now,
        },
      },
      _sum: {
        remainingAmount: true,
      },
    });

    const pendingInvoices = await db.invoices.aggregate({
      where: {
        status: "SENT",
        dueDate: {
          gte: now,
        },
      },
      _sum: {
        remainingAmount: true,
      },
    });

    const paidInvoices = await db.invoices.aggregate({
      where: {
        status: "PAID",
        invoiceDate: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Calculate DSO (Days Sales Outstanding)
    const daysInPeriod =
      timeRange === "year" ? 365 : timeRange === "quarter" ? 90 : 30;
    const dso =
      thisMonthRevenue > 0
        ? (outstandingInvoices._sum.remainingAmount || 0) /
          (thisMonthRevenue / daysInPeriod)
        : 0;

    // Field Visit ROI calculation
    const totalVisits = await db.fieldVisit.count({
      where: {
        visitDate: {
          gte: startDate,
          lte: now,
        },
      },
    });

    const visitROI =
      totalVisits > 0 ? (thisMonthRevenue / totalVisits) * 0.01 : 0; // Mock ROI calculation

    const dashboardData: FinanceDashboardData = {
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: revenueGrowth,
        target: thisMonthRevenue * 1.2, // 20% growth target
      },
      profit: {
        total: (totalRevenue._sum.totalAmount || 0) * 0.3, // Mock total profit
        thisMonth: grossProfit,
        lastMonth: lastMonthRevenue * 0.3, // Mock last month profit
        margin: profitMargin,
        grossMargin: profitMargin + 5, // Mock gross margin
      },
      orders: {
        total: totalOrders,
        thisMonth: ordersThisMonth,
        pending: pendingOrders,
        confirmed: completedOrders,
        avgOrderValue,
        completionRate,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        topSelling: topProducts,
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        newThisMonth: newCustomersThisMonth,
        retention: 85.5, // Mock retention rate
        lifetime: avgOrderValue * 8, // Mock CLV
      },
      cashFlow: {
        outstanding: outstandingInvoices._sum.remainingAmount || 0,
        pending: pendingInvoices._sum.remainingAmount || 0,
        paid: paidInvoices._sum.totalAmount || 0,
        dso: Math.max(0, Math.min(dso, 90)), // Cap DSO at 90 days
        projected: thisMonthRevenue * 1.1, // 10% growth projection
      },
      kpis: {
        salesGrowth: revenueGrowth,
        customerAcquisition: newCustomersThisMonth,
        conversionRate:
          totalVisits > 0 ? (completedOrders / totalVisits) * 100 : 0,
        inventoryTurnover: 8.2, // Mock inventory turnover
        visitROI: visitROI * 100,
      },
    };

    return { success: true, data: dashboardData };
  } catch (error) {
    console.error("Error fetching finance dashboard data:", error);
    return { success: false, error: "Failed to fetch finance data" };
  }
}
