import React from "react";
import Input from "./Input";

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className = "",
  disabled = false,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch(value);
    }
  };

  const handleSearchClick = () => {
    onSearch(value);
  };

  return (
    <div className={`relative w-full max-w-md ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2 
            border rounded-lg 
            text-sm
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              disabled
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            }
            hover:border-gray-400 dark:hover:border-gray-500
          `}
        />

        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Search Button */}
        {value && (
          <button
            onClick={handleSearchClick}
            disabled={disabled}
            className={`
              absolute inset-y-0 right-0 pr-3 flex items-center
              transition-all duration-200
              ${
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : "hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
              }
            `}
          >
            <svg
              className="w-4 h-4 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
