"use client";

import React from "react";

interface InputTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  errorMessage?: string;
  className?: string;
  name: string;
  height?: string;
}

const InputTextArea: React.FC<InputTextAreaProps> = ({
  value,
  onChange,
  errorMessage,
  className = "",
  name,
  height = "80px", // Default height ditingkatkan dari tidak ada menjadi 100px
  ...props
}) => {
  const hasError = errorMessage && errorMessage.length > 0;

  return (
    <div className="flex flex-col gap-2 w-full">
      <textarea
        id={name}
        value={value}
        onChange={onChange}
        name={name}
        style={height ? { height } : undefined}
        className={`
          dark:text-gray-300
          dark:bg-gray-900
          dark:border-gray-600
          w-full px-3 py-2 
          border rounded-lg 
          text-sm
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${hasError ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"}
          ${className}
        `}
        placeholder="Enter your text here..." // Add your placeholder if not already set
        {...props}
      />
      {hasError && (
        <span className="text-xs text-red-500 mt-1">{errorMessage}</span>
      )}
      <style jsx>{`
        textarea::placeholder {
          color: gray; // Default placeholder color
        }
        .dark textarea::placeholder {
          color: #a0aec0; // Placeholder color in dark mode
        }
      `}</style>
    </div>
  );
};

export default InputTextArea;
