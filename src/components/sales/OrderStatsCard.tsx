import { FC } from "react";
import {
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Users,
} from "lucide-react";

interface OrderStats {
  total: number;
  totalAmount: number;
  pending: number;
  completed: number;
  new: number;
  inProcess: number;
  canceled: number;
  averageOrderValue?: number;
  completionRate?: number;
}

interface OrderStatsCardProps {
  stats: OrderStats;
  loading?: boolean;
  period?: string;
}

const OrderStatsCard: FC<OrderStatsCardProps> = ({
  stats,
  loading = false,
  period = "30 hari terakhir",
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateCompletionRate = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  const calculateAverageOrderValue = () => {
    if (stats.total === 0) return 0;
    return stats.totalAmount / stats.total;
  };

  const completionRate = stats.completionRate || calculateCompletionRate();
  const averageOrderValue =
    stats.averageOrderValue || calculateAverageOrderValue();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 animate-pulse"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Orders",
      value: stats.total.toString(),
      icon: Package,
      color: "blue",
      description: `${period}`,
    },
    {
      title: "Total Nilai",
      value: formatCurrency(stats.totalAmount),
      icon: DollarSign,
      color: "green",
      description: `Rata-rata: ${formatCurrency(averageOrderValue)}`,
    },
    {
      title: "Menunggu Proses",
      value: stats.pending.toString(),
      icon: Clock,
      color: "yellow",
      description: `${stats.inProcess} sedang diproses`,
    },
    {
      title: "Tingkat Penyelesaian",
      value: `${completionRate}%`,
      icon:
        completionRate >= 80
          ? TrendingUp
          : completionRate >= 60
          ? AlertCircle
          : TrendingDown,
      color:
        completionRate >= 80
          ? "green"
          : completionRate >= 60
          ? "yellow"
          : "red",
      description: `${stats.completed} dari ${stats.total} orders`,
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        icon: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900",
      },
      green: {
        icon: "text-green-600 dark:text-green-400",
        bg: "bg-green-100 dark:bg-green-900",
      },
      yellow: {
        icon: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-100 dark:bg-yellow-900",
      },
      red: {
        icon: "text-red-600 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-900",
      },
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const colors = getColorClasses(card.color);
          const IconComponent = card.icon;

          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 hover:shadow-lg dark:hover:shadow-gray-600 transition-shadow"
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${colors.bg}`}>
                  <IconComponent className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Breakdown Status Order
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Baru", value: stats.new, color: "bg-blue-500" },
            {
              label: "Konfirmasi",
              value: stats.pending,
              color: "bg-yellow-500",
            },
            { label: "Proses", value: stats.inProcess, color: "bg-orange-500" },
            { label: "Selesai", value: stats.completed, color: "bg-green-500" },
            { label: "Dibatal", value: stats.canceled, color: "bg-red-500" },
          ].map((status, index) => {
            const percentage =
              stats.total > 0 ? (status.value / stats.total) * 100 : 0;

            return (
              <div key={index} className="text-center">
                <div className="relative mb-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <div
                      className={`w-12 h-12 rounded-full ${status.color} flex items-center justify-center text-white font-bold`}
                    >
                      {status.value}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {status.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderStatsCard;
