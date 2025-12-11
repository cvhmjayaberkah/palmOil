"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatRupiah } from "@/utils/formatRupiah";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueTrendData {
  month: string;
  revenue: number;
  growth: number;
}

interface TargetData {
  period: string;
  target: number;
  achieved: number;
  percentage: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
  targets?: TargetData[];
  viewType?: "gross" | "net";
}

export function RevenueTrendChart({
  data,
  targets = [],
  viewType = "gross",
}: RevenueTrendChartProps) {
  // Generate target revenue line based on average growth
  const avgGrowth =
    data.reduce((sum, item) => sum + item.growth, 0) / data.length;
  const baseRevenue = data[0]?.revenue || 0;

  // Use actual targets if provided, otherwise generate based on growth
  const targetData = data.map((item, index) => {
    const currentYear = new Date().getFullYear();

    // Convert month name to YYYY-MM format for matching
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthIndex = monthNames.findIndex(
      (name) => name.toLowerCase() === item.month.toLowerCase()
    );
    let periodFormat = "";
    if (monthIndex !== -1) {
      periodFormat = `${currentYear}-${(monthIndex + 1)
        .toString()
        .padStart(2, "0")}`;
    }

    // Find matching target
    const matchingTarget = targets.find((t) => t.period === periodFormat);
    if (matchingTarget) {
      return matchingTarget.target;
    }

    // Fallback to calculated target
    const targetGrowth = Math.max(avgGrowth * 1.1, 5);
    return baseRevenue * Math.pow(1 + targetGrowth / 100, index);
  });

  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: "Actual Revenue",
        data: data.map((item) => item.revenue),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: "Target Revenue",
        data: targetData,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointBackgroundColor: "#6366f1",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: {
            size: 12,
            weight: 500 as const,
          },
          color: "#374151",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || "";
            const value = formatRupiah(context.parsed.y);
            return `${label}: ${value}`;
          },
          afterLabel: function (context: any) {
            if (context.datasetIndex === 0) {
              const growth = data[context.dataIndex]?.growth || 0;
              return `Growth: ${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`;
            }
            return "";
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: "rgba(156, 163, 175, 0.2)",
        },
        ticks: {
          font: {
            size: 11,
            weight: 500 as const,
          },
          color: "#6b7280",
        },
      },
      y: {
        grid: {
          display: true,
          color: "rgba(156, 163, 175, 0.2)",
        },
        ticks: {
          font: {
            size: 11,
            weight: 500 as const,
          },
          color: "#6b7280",
          callback: function (value: any) {
            return formatRupiah(value);
          },
        },
      },
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        hoverBorderWidth: 3,
      },
    },
  };

  const handleExportData = () => {
    const csvContent = [
      ["Month", "Actual Revenue", "Target Revenue", "Growth %"].join(","),
      ...data.map((item, index) =>
        [
          item.month,
          item.revenue,
          targetData[index],
          item.growth.toFixed(2) + "%",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `revenue_trend_monthly_${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Calculate key metrics
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / data.length;
  const bestMonth = data.reduce((best, current) =>
    current.revenue > best.revenue ? current : best
  );

  // Calculate current month trend
  const getCurrentMonthTrend = () => {
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString("default", {
      month: "long",
    });
    const previousMonthName = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    ).toLocaleString("default", { month: "long" });

    // Find current and previous month data
    const currentMonthData = data.find(
      (item) => item.month.toLowerCase() === currentMonthName.toLowerCase()
    );
    const previousMonthData = data.find(
      (item) => item.month.toLowerCase() === previousMonthName.toLowerCase()
    );

    if (currentMonthData && previousMonthData) {
      return (
        ((currentMonthData.revenue - previousMonthData.revenue) /
          previousMonthData.revenue) *
        100
      );
    }

    // Fallback to current month's growth if available
    if (currentMonthData) {
      return currentMonthData.growth;
    }

    // Last fallback: compare last two available data points
    if (data.length > 1) {
      return (
        ((data[data.length - 1].revenue - data[data.length - 2].revenue) /
          data[data.length - 2].revenue) *
        100
      );
    }

    return 0;
  };

  const currentTrend = getCurrentMonthTrend();

  return (
    <div className="w-full">
      {/* Chart Header with Metrics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            Total Revenue
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatRupiah(totalRevenue)}
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            Average Revenue
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatRupiah(avgRevenue)}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            Best Month
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {bestMonth.month}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {formatRupiah(bestMonth.revenue)}
          </p>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            Current Month Trend
          </p>
          <p
            className={`text-xl font-bold ${
              currentTrend >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {currentTrend >= 0 ? "+" : ""}
            {currentTrend.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleString("default", { month: "long" })} vs
            Previous
          </p>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Revenue Trend Analysis - {viewType === "net" ? "Net Profit" : "Gross Revenue"}
        </h4>
        <button
          onClick={handleExportData}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 text-sm font-medium"
        >
          Export Data
        </button>
      </div>

      {/* Chart Container */}
      <div className="relative h-80 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <Line data={chartData} options={options} />
      </div>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl">
          <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
            Key Insights
          </h5>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>
              • {data.filter((d) => d.growth > 0).length} months with positive
              growth
            </li>
            <li>• Average growth rate: {avgGrowth.toFixed(1)}%</li>
            <li>• Peak revenue in {bestMonth.month}</li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl">
          <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
            Performance
          </h5>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>
              • {data.filter((d) => d.revenue > avgRevenue).length} months above
              average
            </li>
            <li>
              • Revenue range:{" "}
              {formatRupiah(Math.min(...data.map((d) => d.revenue)))} -{" "}
              {formatRupiah(Math.max(...data.map((d) => d.revenue)))}
            </li>
            <li>
              • Trend direction: {currentTrend >= 0 ? "Upward ↗" : "Downward ↘"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
