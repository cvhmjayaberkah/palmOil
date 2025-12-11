import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange =
      (searchParams.get("timeRange") as "month" | "quarter" | "year") ||
      "month";

    // Sample product analytics data
    const sampleData = {
      summary: {
        totalProducts: 45,
        activeProducts: 38,
        lowStockProducts: 7,
        totalValue: 890000000, // Total inventory value
        avgPrice: 125000,
        topCategory: "Engine Oil",
      },

      // Product performance data
      topPerformingProducts: [
        {
          id: "1",
          name: "Premium Engine Oil 5W-30",
          category: "Engine Oil",
          sales: 1250,
          revenue: 156250000,
          stock: 450,
          minStock: 100,
          trend: 12.5,
        },
        {
          id: "2",
          name: "Hydraulic Oil ISO 46",
          category: "Hydraulic",
          sales: 980,
          revenue: 122500000,
          stock: 320,
          minStock: 80,
          trend: 8.3,
        },
        {
          id: "3",
          name: "Gear Oil SAE 90",
          category: "Gear Oil",
          sales: 750,
          revenue: 93750000,
          stock: 200,
          minStock: 50,
          trend: -2.1,
        },
        {
          id: "4",
          name: "Transmission Fluid ATF",
          category: "Transmission",
          sales: 650,
          revenue: 81250000,
          stock: 180,
          minStock: 40,
          trend: 15.7,
        },
        {
          id: "5",
          name: "Industrial Lubricant",
          category: "Industrial",
          sales: 520,
          revenue: 65000000,
          stock: 150,
          minStock: 30,
          trend: 5.2,
        },
      ],

      // Category performance
      categoryAnalytics: [
        {
          category: "Engine Oil",
          productCount: 12,
          totalValue: 325000000,
          avgPrice: 145000,
          totalStock: 1250,
          lowStockCount: 2,
        },
        {
          category: "Hydraulic",
          productCount: 8,
          totalValue: 198000000,
          avgPrice: 135000,
          totalStock: 890,
          lowStockCount: 1,
        },
        {
          category: "Industrial",
          productCount: 10,
          totalValue: 187000000,
          avgPrice: 125000,
          totalStock: 760,
          lowStockCount: 2,
        },
        {
          category: "Transmission",
          productCount: 6,
          totalValue: 142000000,
          avgPrice: 155000,
          totalStock: 520,
          lowStockCount: 1,
        },
        {
          category: "Gear Oil",
          productCount: 5,
          totalValue: 98000000,
          avgPrice: 115000,
          totalStock: 380,
          lowStockCount: 1,
        },
        {
          category: "Others",
          productCount: 4,
          totalValue: 65000000,
          avgPrice: 108000,
          totalStock: 290,
          lowStockCount: 0,
        },
      ],

      // Stock level analysis
      stockAnalysis: [
        { level: "High Stock", count: 18, percentage: 40.0, color: "#10B981" },
        {
          level: "Normal Stock",
          count: 20,
          percentage: 44.4,
          color: "#3B82F6",
        },
        { level: "Low Stock", count: 5, percentage: 11.1, color: "#F59E0B" },
        { level: "Out of Stock", count: 2, percentage: 4.4, color: "#EF4444" },
      ],

      // Price distribution
      priceDistribution: [
        { range: "< 50k", count: 8, percentage: 17.8 },
        { range: "50k - 100k", count: 12, percentage: 26.7 },
        { range: "100k - 150k", count: 15, percentage: 33.3 },
        { range: "150k - 200k", count: 7, percentage: 15.6 },
        { range: "> 200k", count: 3, percentage: 6.7 },
      ],

      // Monthly trends (for charts)
      monthlyTrends: [
        {
          month: "Jan",
          newProducts: 3,
          totalValue: 780000000,
          avgPrice: 118000,
        },
        {
          month: "Feb",
          newProducts: 2,
          totalValue: 795000000,
          avgPrice: 120000,
        },
        {
          month: "Mar",
          newProducts: 4,
          totalValue: 820000000,
          avgPrice: 122000,
        },
        {
          month: "Apr",
          newProducts: 1,
          totalValue: 835000000,
          avgPrice: 123000,
        },
        {
          month: "May",
          newProducts: 3,
          totalValue: 860000000,
          avgPrice: 124000,
        },
        {
          month: "Jun",
          newProducts: 2,
          totalValue: 890000000,
          avgPrice: 125000,
        },
      ],

      // Low stock alerts
      lowStockAlerts: [
        {
          id: "7",
          name: "Brake Fluid DOT 4",
          currentStock: 15,
          minStock: 50,
          category: "Brake Fluid",
          urgency: "high",
        },
        {
          id: "8",
          name: "Coolant Concentrate",
          currentStock: 25,
          minStock: 40,
          category: "Coolant",
          urgency: "medium",
        },
        {
          id: "9",
          name: "Diesel Engine Oil 15W-40",
          currentStock: 35,
          minStock: 60,
          category: "Diesel Oil",
          urgency: "medium",
        },
        {
          id: "10",
          name: "Marine Oil SAE 30",
          currentStock: 8,
          minStock: 30,
          category: "Marine",
          urgency: "critical",
        },
        {
          id: "11",
          name: "Compressor Oil ISO 100",
          currentStock: 18,
          minStock: 35,
          category: "Compressor",
          urgency: "high",
        },
      ],
    };

    return NextResponse.json({
      success: true,
      data: sampleData,
    });
  } catch (error) {
    console.error("Product analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
