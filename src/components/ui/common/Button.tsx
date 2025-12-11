import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-sm",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700",
        danger:
          "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 shadow-sm",
        outline:
          "border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:text-gray-200",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:text-gray-200",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        small: "h-8 px-3 py-1 text-xs",
        medium: "h-10 px-4 py-2",
        large: "h-12 px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" | "link";
  size?: "small" | "medium" | "large";
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "medium",
  disabled,
  isLoading = false,
  className = "",
  onClick,
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={buttonVariants({ variant, size, className })}
      disabled={isDisabled}
      onClick={onClick}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
