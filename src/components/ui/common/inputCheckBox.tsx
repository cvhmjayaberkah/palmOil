"use client";
import React from "react";

interface InputCheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  errorMessage?: string;
}

const InputCheckbox: React.FC<InputCheckboxProps> = ({
  checked,
  onChange,
  label,
  errorMessage,
}) => {
  const hasError = errorMessage && errorMessage.length > 0;

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`${hasError ? "border-red-500" : ""}`}
      />
      <label
        className={`dark:text-gray-400 text-sm ${
          hasError ? "text-red-500" : ""
        }`}
      >
        {label}
      </label>
      {hasError && <span className="text-xs text-red-500">{errorMessage}</span>}
    </div>
  );
};

export default InputCheckbox;
