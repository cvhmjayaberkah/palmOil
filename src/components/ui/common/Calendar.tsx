"use client";
import React, { useState, useEffect } from "react";

interface CalendarProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (range: { startDate: Date; endDate: Date }) => void;
  isMobile?: boolean;
}

const Calendar: React.FC<CalendarProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  isMobile = false,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>({ startDate, endDate });
  const [isSelectingStart, setIsSelectingStart] = useState(true);

  useEffect(() => {
    setSelectedRange({ startDate, endDate });
  }, [startDate, endDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days: (Date | null)[] = [];

    // Add padding days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), day));
    }

    return days;
  };

  const isDateInRange = (date: Date) => {
    return date >= selectedRange.startDate && date <= selectedRange.endDate;
  };

  const isStartOrEndDate = (date: Date) => {
    return (
      date.toDateString() === selectedRange.startDate.toDateString() ||
      date.toDateString() === selectedRange.endDate.toDateString()
    );
  };

  const handleDateClick = (date: Date) => {
    if (isSelectingStart) {
      setSelectedRange({
        startDate: date,
        endDate: date,
      });
      setIsSelectingStart(false);
    } else {
      const newStartDate =
        date < selectedRange.startDate ? date : selectedRange.startDate;
      const newEndDate =
        date > selectedRange.startDate ? date : selectedRange.startDate;

      setSelectedRange({
        startDate: newStartDate,
        endDate: newEndDate,
      });
      onDateRangeChange({ startDate: newStartDate, endDate: newEndDate });
      setIsSelectingStart(true);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newMonth;
    });
  };

  const renderCalendar = () => {
    const days = generateCalendarDays(currentMonth);
    const monthName = currentMonth.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">{monthName}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {"<"}
            </button>
            <button
              onClick={() => navigateMonth("next")}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {">"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
            <div key={day} className="text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
          {days.map((day, index) => (
            <button
              key={index}
              disabled={!day}
              onClick={() => day && handleDateClick(day)}
              className={`
                p-1 text-sm rounded 
                ${!day ? "disabled:opacity-0" : ""}
                ${
                  day && isStartOrEndDate(day)
                    ? "bg-blue-500 text-white"
                    : day && isDateInRange(day)
                    ? "bg-blue-100 text-blue-600"
                    : "hover:bg-gray-100"
                }
              `}
            >
              {day ? day.getDate() : ""}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${isMobile ? "w-full" : "w-full md[w-1/2]"}`}>
      {renderCalendar()}
    </div>
  );
};

export default Calendar;