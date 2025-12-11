import React from "react";
import { Calendar } from "lucide-react";

interface MonthFilterProps {
  selectedYear: number | null;
  selectedMonth: number | null;
  onMonthChange: (year: number | null, month: number | null) => void;
  className?: string;
}

export const MonthFilter: React.FC<MonthFilterProps> = ({
  selectedYear,
  selectedMonth,
  onMonthChange,
  className = "",
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const months = [
    { value: 0, label: "Semua Waktu" },
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  const handleYearChange = (year: number) => {
    if (selectedMonth === 0 || selectedMonth === null) {
      onMonthChange(null, null); // All time
    } else {
      onMonthChange(year, selectedMonth);
    }
  };

  const handleMonthChange = (month: number) => {
    if (month === 0) {
      onMonthChange(null, null); // All time
    } else {
      onMonthChange(selectedYear || currentYear, month);
    }
  };

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Calendar className="h-5 w-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter Periode:</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <select
          value={selectedMonth || 0}
          onChange={(e) => handleMonthChange(parseInt(e.target.value))}
          className="block w-36 px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        
        {(selectedMonth !== null && selectedMonth !== 0) && (
          <select
            value={selectedYear || currentYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            className="block w-24 px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
