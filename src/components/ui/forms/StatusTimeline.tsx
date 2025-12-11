import React from "react";

interface StatusTimelineProps {
  steps: string[];
  currentStep: number;
  status?: "in-progress" | "completed" | "failed";
  className?: string;
}

const StatusTimeline: React.FC<StatusTimelineProps> = ({
  steps,
  currentStep,
  status = "in-progress",
  className = "",
}) => {
  const getStepStatus = (stepIndex: number) => {
    if (status === "failed" && stepIndex > currentStep) {
      return "failed";
    }
    if (stepIndex < currentStep) {
      return "completed";
    }
    if (stepIndex === currentStep) {
      return status === "completed" ? "completed" : "active";
    }
    return "pending";
  };

  const getStepColors = (stepStatus: string) => {
    switch (stepStatus) {
      case "completed":
        return {
          bg: "bg-green-100 dark:bg-green-900/20",
          border: "border-green-500 dark:border-green-400",
          text: "text-green-700 dark:text-green-300",
          icon: "text-green-600 dark:text-green-400",
        };
      case "active":
        return {
          bg: "bg-blue-100 dark:bg-blue-900/20",
          border: "border-blue-500 dark:border-blue-400",
          text: "text-blue-700 dark:text-blue-300",
          icon: "text-blue-600 dark:text-blue-400",
        };
      case "failed":
        return {
          bg: "bg-red-100 dark:bg-red-900/20",
          border: "border-red-500 dark:border-red-400",
          text: "text-red-700 dark:text-red-300",
          icon: "text-red-600 dark:text-red-400",
        };
      default: // pending
        return {
          bg: "bg-gray-100 dark:bg-gray-800",
          border: "border-gray-300 dark:border-gray-600",
          text: "text-gray-500 dark:text-gray-400",
          icon: "text-gray-400 dark:text-gray-500",
        };
    }
  };

  const renderStepIcon = (stepIndex: number, stepStatus: string) => {
    const colors = getStepColors(stepStatus);

    if (stepStatus === "completed") {
      return (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border-2`}
        >
          <svg
            className={`w-5 h-5 ${colors.icon}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }

    if (stepStatus === "active") {
      return (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border-2 relative`}
        >
          <div
            className={`w-3 h-3 rounded-full ${colors.icon.replace(
              "text-",
              "bg-"
            )} animate-pulse`}
          />
        </div>
      );
    }

    if (stepStatus === "failed") {
      return (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border-2`}
        >
          <svg
            className={`w-5 h-5 ${colors.icon}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }

    // Pending state
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.border} border-2`}
      >
        <div
          className={`w-3 h-3 rounded-full ${colors.icon.replace(
            "text-",
            "bg-"
          )}`}
        />
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop Timeline */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(index);
            const colors = getStepColors(stepStatus);
            const isLast = index === steps.length - 1;

            return (
              <div key={index} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  {renderStepIcon(index, stepStatus)}
                  <div
                    className={`mt-2 text-sm font-medium text-center ${colors.text}`}
                  >
                    {step}
                  </div>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-4 bg-gray-300 dark:bg-gray-600 relative">
                    <div
                      className={`h-full transition-all duration-500 ${
                        index < currentStep
                          ? "bg-green-500 dark:bg-green-400"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Timeline */}
      <div className="md:hidden space-y-4">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(index);
          const colors = getStepColors(stepStatus);
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex items-start">
              <div className="flex flex-col items-center">
                {renderStepIcon(index, stepStatus)}
                {!isLast && (
                  <div
                    className={`w-0.5 h-8 mt-2 ${
                      index < currentStep
                        ? "bg-green-500 dark:bg-green-400"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                )}
              </div>
              <div className={`ml-4 pb-4 ${colors.text}`}>
                <div className="text-sm font-medium">{step}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusTimeline;
