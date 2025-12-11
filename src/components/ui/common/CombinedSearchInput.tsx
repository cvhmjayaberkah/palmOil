"use client";
import React, { useState } from "react";
import { FaSearch } from "react-icons/fa";

interface CombinedSearchInputProps {
  columns: { header: string; accessor: string }[];
  value: string;
  onChange: (query: string, column: string) => void; // This will be triggered for actual searching
  onSearch?: (query: string, column: string) => void; // Optional for real-time searching
  placeholder?: string;
  filterColumnAccessor?: (accessor: string) => boolean; // Custom filter function for columns
}

const CombinedSearchInput: React.FC<CombinedSearchInputProps> = ({
  columns,
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  filterColumnAccessor, // Accept filter function
}) => {
  // Filter columns based on the provided filter function
  const searchableColumns = columns.filter(col =>
    filterColumnAccessor ? filterColumnAccessor(col.accessor) : true
  );

  // Adding the "All" option to searchable columns
  const extendedColumns = [
    { header: "Semua", accessor: "all" },
    ...searchableColumns,
  ];

  const [inputValue, setInputValue] = useState(value);
  const [selectedColumn, setSelectedColumn] = useState(
    extendedColumns[0]?.accessor || ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (selectedColumn === "all") {
      onChange(newValue, "all");
    } else {
      onChange(newValue, selectedColumn);
    }

    if (onSearch && newValue.length > 2) {
      onSearch(newValue, selectedColumn);
    }
  };

  const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newColumn = e.target.value;
    setSelectedColumn(newColumn);
    if (inputValue) {
      onChange(inputValue, newColumn);
    }
  };

  return (
    <div className="w-full md:w-[400px]">
      <div className="w-full px-3 py-2 text-left bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
        <div className="flex items-center">
          <div className="flex items-center pr-2">
            <FaSearch className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            placeholder={placeholder}
            className="flex-grow text-sm text-gray-900 dark:text-gray-100 bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
          />
          <div className="border-l-2 border-gray-300 dark:border-gray-600">
            <select
              value={selectedColumn}
              onChange={handleColumnChange}
              className="text-sm text-gray-500 dark:text-gray-400 bg-transparent border-none focus:outline-none ml-2 pl-3"
            >
              {extendedColumns.map(column => (
                <option
                  className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  key={column.accessor}
                  value={column.accessor}
                >
                  {column.header}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinedSearchInput;
