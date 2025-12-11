import React from "react";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  headerActions,
  className = "",
  padding = "md",
  hover = false,
}) => {
  // Padding classes
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4 md:p-6",
    lg: "p-6 md:p-8",
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 
        rounded-lg 
        shadow-sm 
        border border-gray-200 dark:border-gray-700 
        transition-all duration-200
        ${
          hover
            ? "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
            : ""
        }
        ${className}
      `}
    >
      {/* Header */}
      {(title || headerActions) && (
        <div
          className={`
          flex items-center justify-between 
          ${padding !== "none" ? "px-4 py-3 md:px-6 md:py-4" : "p-4"}
          border-b border-gray-200 dark:border-gray-700
        `}
        >
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {headerActions && (
            <div className="flex items-center space-x-2">{headerActions}</div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
};

export default Card;
