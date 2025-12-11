"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/common/Card";
import {
  TrendingUp,
  ArrowLeft,
  DollarSign,
  TrendingDown,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  BarChart3,
  Wallet,
  CreditCard,
  Building,
  Users,
  Package,
  Eye,
  Filter,
} from "lucide-react";
import { formatRupiah } from "@/utils/formatRupiah";

interface CashFlowData {
  summary: {
    currentBalance: number;
    previousBalance: number;
    netCashFlow: number;
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    cashFlowTrend: number;
  };
  monthly: Array<{
    month: string;
    cashIn: number;
    cashOut: number;
    netFlow: number;
    balance: number;
  }>;
  categories: {
    inflows: Array<{
      category: string;
      amount: number;
      percentage: number;
      trend: number;
      icon: string;
    }>;
    outflows: Array<{
      category: string;
      amount: number;
      percentage: number;
      trend: number;
      icon: string;
    }>;
  };
  forecast: Array<{
    period: string;
    projected: number;
    conservative: number;
    optimistic: number;
  }>;
  analysis: {
    liquidityRatio: number;
    burnRate: number;
    runwayMonths: number;
    seasonality: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  };
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    type: "INFLOW" | "OUTFLOW";
    status: string;
  }>;
}

export default function CashFlowDashboard() {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"month" | "quarter" | "year">(
    "month"
  );
  const [activeView, setActiveView] = useState<
    "overview" | "analysis" | "forecast" | "transactions"
  >("overview");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/finance/cash-flow?timeRange=${timeRange}`
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setData(result.data);
          }
        } else {
          // Fallback to comprehensive dummy data
          setData({
            summary: {
              currentBalance: 850000000,
              previousBalance: 720000000,
              netCashFlow: 130000000,
              operatingCashFlow: 180000000,
              investingCashFlow: -25000000,
              financingCashFlow: -25000000,
              cashFlowTrend: 18.1,
            },
            monthly: [
              {
                month: "Jan",
                cashIn: 650000000,
                cashOut: 580000000,
                netFlow: 70000000,
                balance: 720000000,
              },
              {
                month: "Feb",
                cashIn: 680000000,
                cashOut: 620000000,
                netFlow: 60000000,
                balance: 780000000,
              },
              {
                month: "Mar",
                cashIn: 720000000,
                cashOut: 650000000,
                netFlow: 70000000,
                balance: 850000000,
              },
              {
                month: "Apr",
                cashIn: 750000000,
                cashOut: 680000000,
                netFlow: 70000000,
                balance: 920000000,
              },
              {
                month: "May",
                cashIn: 780000000,
                cashOut: 710000000,
                netFlow: 70000000,
                balance: 990000000,
              },
              {
                month: "Jun",
                cashIn: 820000000,
                cashOut: 740000000,
                netFlow: 80000000,
                balance: 1070000000,
              },
            ],
            categories: {
              inflows: [
                {
                  category: "Sales Revenue",
                  amount: 680000000,
                  percentage: 68,
                  trend: 12.5,
                  icon: "DollarSign",
                },
                {
                  category: "Account Receivables",
                  amount: 180000000,
                  percentage: 18,
                  trend: 8.2,
                  icon: "CreditCard",
                },
                {
                  category: "Investment Returns",
                  amount: 80000000,
                  percentage: 8,
                  trend: 15.3,
                  icon: "TrendingUp",
                },
                {
                  category: "Other Income",
                  amount: 60000000,
                  percentage: 6,
                  trend: 5.1,
                  icon: "Wallet",
                },
              ],
              outflows: [
                {
                  category: "Operating Expenses",
                  amount: 420000000,
                  percentage: 42,
                  trend: -2.3,
                  icon: "Building",
                },
                {
                  category: "Inventory Purchases",
                  amount: 280000000,
                  percentage: 28,
                  trend: 4.2,
                  icon: "Package",
                },
                {
                  category: "Payroll & Benefits",
                  amount: 150000000,
                  percentage: 15,
                  trend: 3.1,
                  icon: "Users",
                },
                {
                  category: "Loan Payments",
                  amount: 80000000,
                  percentage: 8,
                  trend: -1.5,
                  icon: "CreditCard",
                },
                {
                  category: "Other Expenses",
                  amount: 70000000,
                  percentage: 7,
                  trend: 2.8,
                  icon: "Activity",
                },
              ],
            },
            forecast: [
              {
                period: "Next Month",
                projected: 85000000,
                conservative: 70000000,
                optimistic: 100000000,
              },
              {
                period: "Q2 2025",
                projected: 250000000,
                conservative: 200000000,
                optimistic: 300000000,
              },
              {
                period: "Q3 2025",
                projected: 280000000,
                conservative: 230000000,
                optimistic: 330000000,
              },
              {
                period: "Q4 2025",
                projected: 320000000,
                conservative: 270000000,
                optimistic: 370000000,
              },
            ],
            analysis: {
              liquidityRatio: 2.8,
              burnRate: 15000000,
              runwayMonths: 56,
              seasonality: "Q4 Strong",
              riskLevel: "LOW",
            },
            transactions: [
              {
                id: "1",
                date: "2025-07-27",
                description: "Customer Payment - PT ABC",
                category: "Sales Revenue",
                amount: 45000000,
                type: "INFLOW",
                status: "Completed",
              },
              {
                id: "2",
                date: "2025-07-27",
                description: "Inventory Purchase - Oil Supplies",
                category: "Inventory",
                amount: -25000000,
                type: "OUTFLOW",
                status: "Completed",
              },
              {
                id: "3",
                date: "2025-07-26",
                description: "Payroll Processing",
                category: "Payroll",
                amount: -18000000,
                type: "OUTFLOW",
                status: "Completed",
              },
              {
                id: "4",
                date: "2025-07-26",
                description: "Investment Dividend",
                category: "Investment",
                amount: 12000000,
                type: "INFLOW",
                status: "Completed",
              },
              {
                id: "5",
                date: "2025-07-25",
                description: "Office Rent Payment",
                category: "Operating",
                amount: -8000000,
                type: "OUTFLOW",
                status: "Completed",
              },
            ],
          });
        }
      } catch (error) {
        console.error("Error loading cash flow data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  const handleExportData = () => {
    if (!data) return;

    const csvContent = [
      ["Date", "Cash In", "Cash Out", "Net Flow", "Balance"].join(","),
      ...data.monthly.map((item) =>
        [
          item.month,
          item.cashIn,
          item.cashOut,
          item.netFlow,
          item.balance,
        ].join(",")
      ),
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `cash_flow_${timeRange}_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ElementType } = {
      DollarSign,
      CreditCard,
      TrendingUp,
      Wallet,
      Building,
      Package,
      Users,
      Activity,
    };
    return icons[iconName] || DollarSign;
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 dark:from-cyan-800 dark:via-blue-800 dark:to-indigo-900"></div>

        <div className="relative px-6 py-12 -mx-4 -mt-6 mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Link href="/management/finance" className="mr-6">
                  <button className="p-3 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-all duration-200">
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                </Link>
                <div className="flex items-center">
                  <div className="p-4 bg-white/10 backdrop-blur-sm rounded-3xl mr-6">
                    <Wallet className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      Cash Flow Management
                    </h1>
                    <p className="text-xl text-white/80">
                      Real-time cash flow monitoring and forecasting
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2">
                  <div className="flex space-x-2">
                    {(["month", "quarter", "year"] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                          timeRange === range
                            ? "bg-white text-cyan-600 shadow-lg"
                            : "text-white hover:bg-white/20"
                        }`}
                      >
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExportData}
                  className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-2xl hover:bg-white/20 transition-all duration-200 flex items-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12 space-y-8">
        {/* Cash Flow Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Balance */}
          <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Wallet className="h-8 w-8 text-emerald-600" />
              <div className="flex items-center text-emerald-600">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">
                  {(
                    ((data.summary.currentBalance -
                      data.summary.previousBalance) /
                      data.summary.previousBalance) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatRupiah(data.summary.currentBalance)}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Current Cash Balance
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Previous: {formatRupiah(data.summary.previousBalance)}
            </p>
          </Card>

          {/* Net Cash Flow */}
          <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="flex items-center text-blue-600">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">
                  {data.summary.cashFlowTrend.toFixed(1)}%
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatRupiah(data.summary.netCashFlow)}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Net Cash Flow
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This period
            </p>
          </Card>

          {/* Operating Cash Flow */}
          <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Building className="h-8 w-8 text-purple-600" />
              <div className="flex items-center text-purple-600">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">Strong</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatRupiah(data.summary.operatingCashFlow)}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Operating Cash Flow
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Core business operations
            </p>
          </Card>

          {/* Liquidity Ratio */}
          <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Target className="h-8 w-8 text-orange-600" />
              <div className="flex items-center text-orange-600">
                <span className="text-sm font-medium">
                  {data.analysis.riskLevel}
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.analysis.liquidityRatio.toFixed(1)}x
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Liquidity Ratio
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.analysis.runwayMonths} months runway
            </p>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Card className="p-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
          <div className="flex space-x-2 overflow-x-auto">
            {[
              { key: "overview", label: "Cash Flow Overview", icon: Eye },
              { key: "analysis", label: "Category Analysis", icon: BarChart3 },
              {
                key: "forecast",
                label: "Forecast & Projections",
                icon: TrendingUp,
              },
              {
                key: "transactions",
                label: "Recent Transactions",
                icon: Activity,
              },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key as any)}
                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                  activeView === key
                    ? "bg-cyan-600 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* Content Based on Active View */}
        {activeView === "overview" && (
          <div className="space-y-6">
            {/* Monthly Cash Flow Chart */}
            <Card className="p-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Monthly Cash Flow Trend
              </h3>

              {/* Chart Header Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Avg Monthly Inflow
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {formatRupiah(
                      data.monthly.reduce((sum, m) => sum + m.cashIn, 0) /
                        data.monthly.length
                    )}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Avg Monthly Outflow
                  </p>
                  <p className="text-xl font-bold text-red-600">
                    {formatRupiah(
                      data.monthly.reduce((sum, m) => sum + m.cashOut, 0) /
                        data.monthly.length
                    )}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Avg Net Flow
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatRupiah(
                      data.monthly.reduce((sum, m) => sum + m.netFlow, 0) /
                        data.monthly.length
                    )}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                    Growth Rate
                  </p>
                  <p className="text-xl font-bold text-purple-600">
                    +{data.summary.cashFlowTrend.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Monthly Data Grid */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">
                        Month
                      </th>
                      <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                        Cash In
                      </th>
                      <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                        Cash Out
                      </th>
                      <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                        Net Flow
                      </th>
                      <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly.map((month) => (
                      <tr
                        key={month.month}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">
                          {month.month}
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-green-600">
                          {formatRupiah(month.cashIn)}
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-red-600">
                          {formatRupiah(month.cashOut)}
                        </td>
                        <td className="py-4 px-6 text-right font-semibold">
                          <span
                            className={
                              month.netFlow >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatRupiah(month.netFlow)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-gray-900 dark:text-white">
                          {formatRupiah(month.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeView === "analysis" && (
          <div className="space-y-6">
            {/* Cash Inflows Analysis */}
            <Card className="p-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Cash Inflows by Category
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.categories.inflows.map((category, index) => {
                  const IconComponent = getIconComponent(category.icon);
                  return (
                    <div
                      key={index}
                      className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <IconComponent className="h-8 w-8 text-green-600 mr-3" />
                          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            {category.category}
                          </h4>
                        </div>
                        <div className="flex items-center">
                          <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-green-600">
                            {category.trend.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {formatRupiah(category.amount)}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {category.percentage}% of total inflows
                        </span>
                      </div>

                      <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Cash Outflows Analysis */}
            <Card className="p-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Cash Outflows by Category
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.categories.outflows.map((category, index) => {
                  const IconComponent = getIconComponent(category.icon);
                  return (
                    <div
                      key={index}
                      className="p-6 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <IconComponent className="h-6 w-6 text-red-600 mr-2" />
                          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                            {category.category}
                          </h4>
                        </div>
                        <div className="flex items-center">
                          {category.trend >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-red-600 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-green-600 mr-1" />
                          )}
                          <span
                            className={`text-sm font-medium ${
                              category.trend >= 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {Math.abs(category.trend).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {formatRupiah(category.amount)}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {category.percentage}% of outflows
                        </span>
                      </div>

                      <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {activeView === "forecast" && (
          <Card className="p-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Cash Flow Forecast & Projections
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Projected Cash Flow
                </h4>
                {data.forecast.map((forecast, index) => (
                  <div
                    key={index}
                    className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {forecast.period}
                      </h5>
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Conservative
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatRupiah(forecast.conservative)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Projected
                        </span>
                        <span className="font-bold text-indigo-600">
                          {formatRupiah(forecast.projected)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Optimistic
                        </span>
                        <span className="font-semibold text-green-600">
                          {formatRupiah(forecast.optimistic)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: `${
                              (forecast.projected / forecast.optimistic) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(
                          (forecast.projected / forecast.optimistic) *
                          100
                        ).toFixed(0)}
                        % of optimistic scenario
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    Financial Health Indicators
                  </h4>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">
                        Burn Rate
                      </span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatRupiah(data.analysis.burnRate)}/month
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">
                        Runway
                      </span>
                      <span className="text-xl font-bold text-cyan-600">
                        {data.analysis.runwayMonths} months
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">
                        Seasonality
                      </span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {data.analysis.seasonality}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">
                        Risk Level
                      </span>
                      <span
                        className={`text-sm font-bold px-3 py-1 rounded-full ${
                          data.analysis.riskLevel === "LOW"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                            : data.analysis.riskLevel === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                        }`}
                      >
                        {data.analysis.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    Recommendations
                  </h4>

                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li>
                      • Maintain current cash position for optimal liquidity
                    </li>
                    <li>• Consider investment opportunities in Q3-Q4</li>
                    <li>• Monitor seasonal patterns for better forecasting</li>
                    <li>• Diversify revenue streams to reduce risk</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeView === "transactions" && (
          <Card className="p-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Recent Cash Flow Transactions
              </h3>
              <button className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors duration-200">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Date
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Description
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Category
                    </th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Amount
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-4 px-6 text-gray-900 dark:text-white">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {transaction.description}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                          {transaction.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold">
                        <span
                          className={
                            transaction.type === "INFLOW"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {transaction.type === "INFLOW" ? "+" : ""}
                          {formatRupiah(transaction.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
