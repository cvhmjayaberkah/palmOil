"use client";
import React, { useState, useEffect, useRef } from "react";
import { formatDate } from "@/utils/formatDate"; // Import the formatDate function

interface InputDateProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  errorMessage?: string;
  disabled?: boolean;
  showNullAsText?: string; // Text to show when value is null
  allowClearToNull?: boolean; // Allow clearing to null
  isOptional?: boolean; // Make the field optional (allows null values)
  showClearButton?: boolean; // Show clear button in popup (default: false)
}

const InputDate: React.FC<InputDateProps> = ({
  value,
  onChange,
  placeholder = "Select a date",
  errorMessage,
  disabled,
  showNullAsText,
  allowClearToNull = false,
  isOptional = false,
  showClearButton = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement | null>(null);

  const hasError = errorMessage && errorMessage.length > 0;

  // Sync selectedDate with value prop
  useEffect(() => {
    setSelectedDate(value || null);
  }, [value]);

  // Toggle the calendar visibility
  const toggleCalendar = () => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  };

  // Handle date selection
  const handleDateSelection = (day: number) => {
    // Buat tanggal pada 00:00:00 UTC
    const newDate = new Date(
      Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    );
    setSelectedDate(newDate);
    if (onChange) onChange(newDate);
    setIsOpen(false);
  };

  // Handle clear to null (if allowed)
  const handleClearToNull = () => {
    setSelectedDate(null);
    if (onChange) onChange(null);
    setIsOpen(false);
  };

  // Get display value
  const getDisplayValue = () => {
    if (selectedDate) {
      return formatDate(selectedDate);
    }
    if (showNullAsText) {
      return showNullAsText;
    }
    return "";
  };

  // Navigate to the next month
  const nextMonth = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    setCurrentMonth(
      prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  // Navigate to the previous month
  const prevMonth = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    setCurrentMonth(
      prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  // Close calendar on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Days in the month
  const daysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

  // Start day of the month
  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  // Calendar JSX
  const renderCalendar = () => {
    const monthDays = [];
    const daysCount = daysInMonth(
      currentMonth.getMonth(),
      currentMonth.getFullYear()
    );
    const firstDay = getFirstDayOfMonth(currentMonth);

    // Fill the calendar with empty cells for days of the previous month
    for (let i = 0; i < firstDay; i++) {
      monthDays.push(<div className="w-8 h-8" key={`empty-${i}`} />);
    }

    // Add the days of the current month
    for (let day = 1; day <= daysCount; day++) {
      monthDays.push(
        <button
          key={day}
          onClick={() => handleDateSelection(day)}
          disabled={disabled}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition duration-200 cursor-pointer ${
            selectedDate &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === currentMonth.getMonth()
              ? "bg-blue-500 text-white"
              : "text-gray-800 hover:bg-blue-100 dark:text-gray-300 dark:hover:bg-blue-700"
          }`}
        >
          {day}
        </button>
      );
    }

    return monthDays;
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="relative" ref={datePickerRef}>
        <input
          type="text"
          value={getDisplayValue()}
          onClick={toggleCalendar}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={`
            cursor-pointer
            w-full px-3 py-2 
            border rounded-lg 
            text-sm
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${
              hasError
                ? "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/10"
                : "border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-600"
            } 
            ${
              disabled
                ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                : "text-gray-900 dark:text-gray-100"
            }
            ${
              !selectedDate && showNullAsText
                ? "text-blue-600 dark:text-blue-400 font-medium"
                : ""
            }
            hover:border-gray-400 dark:hover:border-gray-500
          `}
        />
        {isOpen && (
          <div className="absolute z-10 mt-1 w-60 bg-white border border-gray-300 rounded-lg shadow-lg p-2 overflow-hidden dark:bg-gray-900 dark:border-gray-600">
            <div className="flex justify-between mb-2">
              <button
                className="text-gray-600 hover:text-blue-600 dark:text-gray-300"
                onClick={prevMonth}
              >
                ❮
              </button>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {currentMonth.toLocaleString("default", { month: "long" })}{" "}
                {currentMonth.getFullYear()}
              </span>
              <button
                className="text-gray-600 hover:text-blue-600 dark:text-gray-300"
                onClick={nextMonth}
              >
                ❯
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            {showClearButton && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={handleClearToNull}
                  className="w-full px-3 py-2 text-sm bg-gray-100 
                  dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {showNullAsText || "Clear Date"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {hasError && (
        <span className="text-xs text-red-500 dark:text-red-400 mt-1">
          {errorMessage}
        </span>
      )}
    </div>
  );
};

export default InputDate;
