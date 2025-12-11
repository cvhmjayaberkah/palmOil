import React from "react";
import Link from "next/link";

interface TrendData {
  direction: "up" | "down";
  value: string;
}

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }> | string;
  linkTo?: string;
  trend?: TrendData;
  className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  linkTo,
  trend,
  className = "",
}) => {
  const renderIcon = () => {
    if (typeof icon === "string") {
      return <span className="text-2xl">{icon}</span>;
    } else {
      const IconComponent = icon;
      return <IconComponent className="w-6 h-6" />;
    }
  };

  const renderTrend = () => {
    if (!trend) return null;

    const isUp = trend.direction === "up";
    const trendColor = isUp
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

    return (
      <div className={`flex items-center space-x-1 ${trendColor}`}>
        <svg
          className={`w-4 h-4 ${isUp ? "rotate-0" : "rotate-180"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium">{trend.value}</span>
      </div>
    );
  };

  const content = (
    <div
      className={`
        bg-white dark:bg-gray-800 
        rounded-lg 
        shadow-sm 
        border border-gray-200 dark:border-gray-700 
        p-4 md:p-6 
        transition-all duration-200
        ${
          linkTo
            ? "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
            : ""
        }
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-blue-600 dark:text-blue-400">
                {renderIcon()}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {title}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
            </div>
          </div>
        </div>

        {/* Trend indicator */}
        {trend && <div className="flex-shrink-0 ml-4">{renderTrend()}</div>}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export default DashboardCard;
