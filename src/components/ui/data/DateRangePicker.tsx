"use client";
import React, { useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import Button from "../common/Button";
import Modal from "../common/Modal";
import Calendar from "../common/Calendar";
import { FaCalendarAlt } from "react-icons/fa"; // Mengimpor ikon
import { formatDate } from "@/utils/formatDate"; // Import the formatDate function

interface DateRangePreset {
  label: string;
  range: [Date, Date];
}

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDatesChange: (dates: { startDate: Date; endDate: Date }) => void;
  presets?: DateRangePreset[];
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDatesChange,
  presets = [],
  className = "",
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  // Default presets - Monthly selection in Indonesian
  const defaultPresets: DateRangePreset[] = [
    { label: "Semua Waktu", range: [new Date(0), new Date()] },
    {
      label: "Januari",
      range: [
        new Date(new Date().getFullYear(), 0, 1), // January 1st
        new Date(new Date().getFullYear(), 0, 31, 23, 59, 59, 999), // January 31st
      ],
    },
    {
      label: "Februari",
      range: [
        new Date(new Date().getFullYear(), 1, 1), // February 1st
        new Date(new Date().getFullYear(), 1 + 1, 0, 23, 59, 59, 999), // Last day of February
      ],
    },
    {
      label: "Maret",
      range: [
        new Date(new Date().getFullYear(), 2, 1), // March 1st
        new Date(new Date().getFullYear(), 2, 31, 23, 59, 59, 999), // March 31st
      ],
    },
    {
      label: "April",
      range: [
        new Date(new Date().getFullYear(), 3, 1), // April 1st
        new Date(new Date().getFullYear(), 3, 30, 23, 59, 59, 999), // April 30th
      ],
    },
    {
      label: "Mei",
      range: [
        new Date(new Date().getFullYear(), 4, 1), // May 1st
        new Date(new Date().getFullYear(), 4, 31, 23, 59, 59, 999), // May 31st
      ],
    },
    {
      label: "Juni",
      range: [
        new Date(new Date().getFullYear(), 5, 1), // June 1st
        new Date(new Date().getFullYear(), 5, 30, 23, 59, 59, 999), // June 30th
      ],
    },
    {
      label: "Juli",
      range: [
        new Date(new Date().getFullYear(), 6, 1), // July 1st
        new Date(new Date().getFullYear(), 6, 31, 23, 59, 59, 999), // July 31st
      ],
    },
    {
      label: "Agustus",
      range: [
        new Date(new Date().getFullYear(), 7, 1), // August 1st
        new Date(new Date().getFullYear(), 7, 31, 23, 59, 59, 999), // August 31st
      ],
    },
    {
      label: "September",
      range: [
        new Date(new Date().getFullYear(), 8, 1), // September 1st
        new Date(new Date().getFullYear(), 8, 30, 23, 59, 59, 999), // September 30th
      ],
    },
    {
      label: "Oktober",
      range: [
        new Date(new Date().getFullYear(), 9, 1), // October 1st
        new Date(new Date().getFullYear(), 9, 31, 23, 59, 59, 999), // October 31st
      ],
    },
    {
      label: "November",
      range: [
        new Date(new Date().getFullYear(), 10, 1), // November 1st
        new Date(new Date().getFullYear(), 10, 30, 23, 59, 59, 999), // November 30th
      ],
    },
    {
      label: "Desember",
      range: [
        new Date(new Date().getFullYear(), 11, 1), // December 1st
        new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999), // December 31st
      ],
    },
  ];

  const allPresets = presets.length > 0 ? presets : defaultPresets;

  const formatDateRange = () => {
    if (
      startDate.getTime() === 0 &&
      endDate.getTime() === new Date().getTime()
    ) {
      return "Semua Waktu";
    }
    return `${formatDate(tempStartDate)} - ${formatDate(tempEndDate)}`; // Use Indonesia format
  };

  const handleDateRangeChange = (range: { startDate: Date; endDate: Date }) => {
    setTempStartDate(range.startDate);
    setTempEndDate(range.endDate);
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    setTempStartDate(preset.range[0]);
    setTempEndDate(preset.range[1]);
  };

  const handleApply = () => {
    onDatesChange({ startDate: tempStartDate, endDate: tempEndDate });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    const allTimeRange = [new Date(0), new Date()]; // Default to Semua Waktu
    setTempStartDate(allTimeRange[0]);
    setTempEndDate(allTimeRange[1]);
    onDatesChange({ startDate: allTimeRange[0], endDate: allTimeRange[1] }); // Notify parent component
    setIsOpen(false); // Close the modal
  };

  const renderPresets = () => (
    <div
      className={`${
        isMobile
          ? "grid grid-cols-2 gap-2 max-h-60 overflow-y-auto"
          : "space-y-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pr-1"
      }`}
    >
      {allPresets.map((preset, index) => (
        <Button
          key={index}
          variant="outline"
          size="small"
          className="w-full text-xs flex-shrink-0 py-1 px-2"
          onClick={() => handlePresetClick(preset)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );

  const renderModalFooter = () => (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size={isMobile ? "small" : "medium"}
        onClick={handleClear} // Clear button added
        className="flex-1"
      >
        Hapus
      </Button>
      <Button
        variant="outline"
        size={isMobile ? "small" : "medium"}
        onClick={handleCancel}
        className="flex-1"
      >
        Batal
      </Button>
      <Button
        size={isMobile ? "small" : "medium"}
        onClick={handleApply}
        className="flex-1"
      >
        Terapkan
      </Button>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size={isMobile ? "small" : "medium"}
        onClick={() => setIsOpen(true)}
        className="w-full text-xs md:text-sm"
      >
        <FaCalendarAlt className="mr-1" />
        {formatDateRange()} {/* Use formatted date range */}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Pilih Rentang Tanggal"
        size={isMobile ? "sm" : "lg"}
        footer={renderModalFooter()}
      >
        <div className="flex flex-col md:flex-row md:h-72">
          <div
            className={`${
              isMobile ? "mb-4" : "w-1/5 pr-3 border-r flex flex-col"
            }`}
          >
            <h3 className="text-xs font-medium text-gray-900 dark:text-white mb-2 flex-shrink-0">
              Pilih Cepat
            </h3>
            <div className="flex-1 min-h-0">{renderPresets()}</div>
          </div>

          <div className="flex-grow md:pl-4">
            <Calendar
              startDate={tempStartDate}
              endDate={tempEndDate}
              onDateRangeChange={handleDateRangeChange}
              isMobile={isMobile}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DateRangePicker;
