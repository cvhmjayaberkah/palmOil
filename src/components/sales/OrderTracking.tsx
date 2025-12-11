import { FC } from "react";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface OrderTrackingProps {
  status: string;
  orderDate: Date;
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  canceledAt?: Date | null;
  requiresConfirmation?: boolean;
  compact?: boolean;
}

const OrderTracking: FC<OrderTrackingProps> = ({
  status,
  orderDate,
  confirmedAt = null,
  completedAt = null,
  canceledAt = null,
  requiresConfirmation = false,
  compact = false,
}) => {
  const getSteps = () => {
    const baseSteps = [
      {
        id: "NEW",
        key: "NEW",
        name: "Order Dibuat",
        icon: Package,
        description: "Order telah dibuat dan dicatat dalam sistem",
        date: orderDate,
        isCompleted: true, // Always completed since order exists
      },
      {
        id: "PENDING_CONFIRMATION",
        key: "PENDING_CONFIRMATION",
        name: "Menunggu Konfirmasi",
        icon: Clock,
        description: requiresConfirmation
          ? "Order menunggu konfirmasi dari admin"
          : "Order dikonfirmasi otomatis",
        date: requiresConfirmation ? confirmedAt : orderDate,
        isCompleted:
          !requiresConfirmation ||
          confirmedAt !== null ||
          [
            "PROCESSING",
            "IN_PROCESS",
            "COMPLETED",
            "CANCELLED",
            "CANCELED",
          ].includes(status),
      },
      {
        id: "PROCESSING",
        key: "PROCESSING",
        name: "Dalam Proses",
        icon: ShoppingCart,
        description: "Order sedang diproses dan disiapkan",
        date: [
          "PROCESSING",
          "IN_PROCESS",
          "COMPLETED",
          "CANCELLED",
          "CANCELED",
        ].includes(status)
          ? confirmedAt || new Date() // Show confirmed date or current date for processing
          : null,
        isCompleted: [
          "PROCESSING",
          "IN_PROCESS",
          "COMPLETED",
          "CANCELLED",
          "CANCELED",
        ].includes(status),
      },
      {
        id: "COMPLETED",
        key: "COMPLETED",
        name: "Selesai",
        icon: CheckCircle,
        description: "Order telah selesai dan dikirim",
        date: completedAt,
        isCompleted: status === "COMPLETED",
      },
    ];

    return baseSteps;
  };

  const steps = getSteps();
  const isCanceled = ["CANCELED", "CANCELLED"].includes(status);

  // Map IN_PROCESS to PROCESSING for step finding
  const normalizedStatus = status === "IN_PROCESS" ? "PROCESSING" : status;
  const currentStepIndex = steps.findIndex(
    (step) => step.id === normalizedStatus
  );

  const getStepStatus = (step: any, index: number) => {
    if (isCanceled) {
      return step.isCompleted ? "completed" : "canceled";
    }

    // Check if this is the current active step
    const isCurrentStep =
      step.id === normalizedStatus ||
      (step.id === "PROCESSING" && status === "IN_PROCESS");

    if (isCurrentStep) {
      return "current";
    }

    if (step.isCompleted) {
      return "completed";
    }

    return "upcoming";
  };

  const getStepStyles = (stepStatus: string) => {
    switch (stepStatus) {
      case "completed":
        return {
          container: "text-green-600 dark:text-green-400",
          icon: "bg-green-600 text-white",
          line: "bg-green-600",
        };
      case "current":
        return {
          container: "text-blue-600 dark:text-blue-400",
          icon: "bg-blue-600 text-white shadow-lg shadow-blue-500/50 animate-pulse",
          line: "bg-gray-300 dark:bg-gray-600",
        };
      case "canceled":
        return {
          container: "text-red-600 dark:text-red-400",
          icon: "bg-red-600 text-white",
          line: "bg-red-300",
        };
      default:
        return {
          container: "text-gray-400 dark:text-gray-500",
          icon: "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400",
          line: "bg-gray-300 dark:bg-gray-600",
        };
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProgressText = () => {
    if (isCanceled) {
      return "Dibatalkan";
    }

    const completedSteps = steps.filter((step) => step.isCompleted).length;
    const totalSteps = steps.length;
    const percentage = Math.round((completedSteps / totalSteps) * 100);

    return `${percentage}% selesai`;
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          {steps.slice(0, currentStepIndex + 1).map((step, index) => {
            const stepStatus = getStepStatus(step, index);
            const styles = getStepStyles(stepStatus);
            const IconComponent = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full ${styles.icon}`}
                >
                  <IconComponent className="w-3 h-3" />
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${styles.line}`} />
                )}
              </div>
            );
          })}
        </div>
        {isCanceled && (
          <div className="flex items-center text-red-600 dark:text-red-400">
            <XCircle className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">Dibatal</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Status Tracking Order
          </h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {getProgressText()}
          </div>
        </div>
        {!isCanceled && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.round(
                  (steps.filter((step) => step.isCompleted).length /
                    steps.length) *
                    100
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      {isCanceled && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 rounded-lg">
          <div className="flex items-center text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <div>
              <span className="font-medium">Order ini telah dibatalkan</span>
              {canceledAt && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {formatDate(canceledAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step, index);
          const styles = getStepStyles(stepStatus);
          const IconComponent = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="relative">
              <div className="flex items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${styles.icon}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 h-16 mt-2 ${styles.line}`} />
                  )}
                </div>
                <div
                  className={`ml-4 min-h-10 ${styles.container} ${
                    stepStatus === "current"
                      ? "bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-3 -ml-2"
                      : ""
                  }`}
                >
                  <h4
                    className={`text-sm font-semibold ${
                      stepStatus === "current"
                        ? "text-blue-700 dark:text-blue-300"
                        : ""
                    }`}
                  >
                    {step.name}
                    {stepStatus === "current" && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Sedang Berlangsung
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {step.description}
                  </p>
                  {step.date && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(step.date)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTracking;
