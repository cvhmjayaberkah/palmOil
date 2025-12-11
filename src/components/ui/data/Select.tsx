"use client";
import React, { useState, useRef, useEffect } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  errorMessage?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "— Pilih Opsi —",
  errorMessage,
  className = "",
  searchable = false,
  searchPlaceholder = "Cari opsi...",
}) => {
  const hasError = !!errorMessage;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(
    null
  );

  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const newSelectedOption =
      options.find((option) => option.value === value) || null;
    setSelectedOption(newSelectedOption);
  }, [value, options]);

  const handleOptionClick = (option: SelectOption) => {
    setSelectedOption(option);
    if (onChange) {
      onChange(option.value);
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
    }
  };

  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      selectRef.current &&
      !selectRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`} ref={selectRef}>
      <div
        className={`relative rounded-lg border ${
          hasError ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          readOnly={!searchable || !isOpen}
          value={
            isOpen && searchable ? searchTerm : selectedOption?.label || ""
          }
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={toggleDropdown}
          placeholder={selectedOption?.label || placeholder}
          // 👇 PERUBAHAN 1: Kursor kondisional (hand vs text)
          className={`w-full p-1.5 pr-10 text-left rounded-lg focus:outline-none dark:text-gray-300 ${
            isOpen && searchable ? "cursor-text" : "cursor-pointer"
          } ${
            hasError ? "bg-red-50 dark:bg-red-900" : "bg-white dark:bg-gray-900"
          }`}
        />

        <svg
          className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          } ${hasError ? "text-red-500" : "text-gray-400 dark:text-gray-300"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>

        {isOpen && (
          <div
            className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${
              hasError
                ? "bg-red-50 dark:bg-red-900 border-red-500"
                : "bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-600"
            }`}
            style={{ zIndex: 9999 }}
          >
            <ul className="max-h-60 overflow-y-auto focus:outline-none p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    onClick={() => handleOptionClick(option)}
                    // 👇 PERUBAHAN 2: Menghapus `text-sm` agar style kembali seperti semula
                    className={`dark:text-gray-300 p-2 cursor-pointer transition duration-200 ease-in-out rounded-md 
                    ${
                      selectedOption?.value === option.value
                        ? "bg-blue-500 text-white font-semibold"
                        : "hover:bg-blue-100 hover:text-black dark:hover:bg-blue-700 dark:hover:text-white"
                    }`}
                  >
                    {option.label}
                  </li>
                ))
              ) : (
                <li className="p-2 text-gray-500 dark:text-gray-400 text-center text-sm">
                  Tidak ada opsi ditemukan
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {hasError && (
        <span className="text-xs text-red-500 dark:text-red-400">
          {errorMessage}
        </span>
      )}
    </div>
  );
};

export default Select;
