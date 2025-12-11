"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { formatRupiah } from "@/utils/formatRupiah";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

interface ProductAnalyticsProps {
  timeRange?: "month" | "quarter" | "year";
}

const ProductAnalytics: React.FC<ProductAnalyticsProps> = ({
  timeRange = "month",
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(timeRange);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/products/analytics?timeRange=${selectedRange}`
        );
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching product analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse"
          >
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#F97316",
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive insights into your product inventory
          </p>
        </div>
        <div className="flex gap-2">
          {["month", "quarter", "year"].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Products</p>
              <p className="text-2xl font-bold">{data.summary.totalProducts}</p>
              <p className="text-blue-100 text-xs">
                {data.summary.activeProducts} active
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Value</p>
              <p className="text-2xl font-bold">
                {formatRupiah(data.summary.totalValue)}
              </p>
              <p className="text-green-100 text-xs">Inventory worth</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Low Stock</p>
              <p className="text-2xl font-bold">
                {data.summary.lowStockProducts}
              </p>
              <p className="text-orange-100 text-xs">Need attention</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Avg Price</p>
              <p className="text-2xl font-bold">
                {formatRupiah(data.summary.avgPrice)}
              </p>
              <p className="text-purple-100 text-xs">Per product</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performing Products */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Performing Products
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topPerformingProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip
                formatter={(value: any, name: string) => [
                  name === "revenue" ? formatRupiah(value) : value,
                  name === "revenue"
                    ? "Revenue"
                    : name === "sales"
                    ? "Sales"
                    : "Stock",
                ]}
              />
              <Bar dataKey="sales" fill="#3B82F6" name="sales" />
              <Bar dataKey="stock" fill="#10B981" name="stock" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Analytics and Stock Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Performance
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryAnalytics}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="totalValue"
                  nameKey="category"
                  label={({ category, percentage }: any) =>
                    `${category}: ${((percentage || 0) * 100).toFixed(1)}%`
                  }
                >
                  {data.categoryAnalytics.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatRupiah(value), "Value"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stock Level Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Stock Level Distribution
          </h3>
          <div className="space-y-4">
            {data.stockAnalysis.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.level}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.count} products
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Monthly Trends
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value: any, name: string) => [
                  name === "totalValue"
                    ? formatRupiah(value)
                    : name === "avgPrice"
                    ? formatRupiah(value)
                    : value,
                  name === "totalValue"
                    ? "Total Value"
                    : name === "avgPrice"
                    ? "Avg Price"
                    : "New Products",
                ]}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalValue"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="newProducts"
                stroke="#10B981"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Low Stock Alerts */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Low Stock Alerts
        </h3>
        <div className="space-y-3">
          {data.lowStockAlerts.map((alert: any) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.urgency === "critical"
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : alert.urgency === "high"
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                  : "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {alert.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {alert.category} • Stock: {alert.currentStock} / Min:{" "}
                    {alert.minStock}
                  </p>
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    alert.urgency === "critical"
                      ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                      : alert.urgency === "high"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                  }`}
                >
                  {alert.urgency.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ProductAnalytics;
