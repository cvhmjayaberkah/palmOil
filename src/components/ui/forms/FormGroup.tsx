import React from "react";
import Input from "../common/Input";
import Select from "../data/Select";

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

// Label component for consistent styling
export const Label: React.FC<LabelProps> = ({
  htmlFor,
  children,
  className = "",
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
    >
      {children}
    </label>
  );
};

// Error message component for consistent styling
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  className = "",
}) => {
  if (!message) return null;

  return (
    <span className={`text-xs text-red-500 dark:text-red-400 ${className}`}>
      {message}
    </span>
  );
};

// Form Group component for consistent input layout
const FormGroup: React.FC<FormGroupProps> = ({ children, className = "" }) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>{children}</div>
  );
};

// Enhanced Form Group with built-in structure
interface FormFieldProps {
  label: string;
  htmlFor?: string;
  errorMessage?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  errorMessage,
  required = false,
  children,
  className = "",
}) => {
  return (
    <FormGroup className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-red-500 dark:text-red-400 ml-1">*</span>
        )}
      </Label>
      {children}
      <ErrorMessage message={errorMessage} />
    </FormGroup>
  );
};

export default FormGroup;
