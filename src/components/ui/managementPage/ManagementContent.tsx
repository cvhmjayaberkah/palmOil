"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  CombinedSearchInput,
  DataRangePicker,
  DataTable,
  StatusFilter,
} from "@/components/ui";
import { formatDate } from "@/utils/formatDate";

// Interface Column tidak perlu diubah
interface Column {
  header: string;
  accessor: string;
  // Menambahkan properti 'cell' agar dikenali
  cell?: (info: { getValue: () => any }) => React.ReactNode;
  render?: (value: any, row: any) => React.ReactNode;
}

interface StatusOption {
  value: string;
  label: string;
}

interface ManagementContentProps<T extends Record<string, any>> {
  sampleData: T[];
  columns: Column[];
  excludedAccessors: string[];
  dateAccessor?: keyof T; // Use a key of T for date filtering (optional)
  emptyMessage?: string | "Tidak ada data ditemukan";
  linkPath: string; // Dynamic link path for editing the row
  onFilteredDataChange?: (filteredData: T[]) => void; // New prop to expose filtered data
  disableRowLinks?: boolean; // New prop to disable row linking
  statusMapping?: Record<string, string> | Record<string, string[]>; // Support both mapping formats
  statusFilterOptions?: StatusOption[]; // New prop for status filter options
  statusFilterField?: keyof T; // Field to filter by status
}

const ManagementContent = <T extends Record<string, any>>({
  sampleData,
  columns,
  excludedAccessors,
  dateAccessor = "createdAt", // Default date accessor
  emptyMessage = "No data found",
  linkPath,
  onFilteredDataChange, // New prop
  disableRowLinks = false, // New prop with default value
  statusMapping: customStatusMapping, // New prop for custom status mapping
  statusFilterOptions, // New prop for status filter options
  statusFilterField, // Field to filter by status
}: ManagementContentProps<T>) => {
  // Status mapping untuk pencarian bahasa Indonesia
  const statusMapping = useMemo(() => {
    // Jika ada customStatusMapping dari props, gunakan itu
    if (customStatusMapping) {
      return customStatusMapping;
    }

    // Fallback ke default status mapping
    return {
      // Invoice status
      DRAFT: ["draft", "konsep", "rancangan"],
      PENDING: ["pending", "menunggu", "tertunda"],
      SENT: ["sent", "terkirim", "dikirim"],
      PAID: ["paid", "terbayar", "lunas"],
      DELIVERED: ["delivered", "terkirim", "sampai"],
      COMPLETED: ["completed", "selesai", "lengkap"],
      CANCELLED: ["cancelled", "canceled", "dibatalkan", "batal"],
      RETURNED: ["returned", "dikembalikan", "retur"],
      OVERDUE: ["overdue", "terlambat", "lewat jatuh tempo"],

      // Payment status
      UNPAID: ["unpaid", "belum bayar", "belum dibayar"],
      OVERPAID: ["overpaid", "lebih bayar", "kelebihan bayar"],

      // Order status
      NEW: ["new", "baru"],
      PROCESSING: ["processing", "diproses", "proses"],
      IN_PROCESS: ["in_process", "in process", "dalam proses"],
      PENDING_CONFIRMATION: [
        "pending_confirmation",
        "pending confirmation",
        "menunggu konfirmasi",
      ],
      CANCELED: ["canceled", "cancelled", "dibatalkan", "batal"],

      // Delivery status
      IN_TRANSIT: ["in_transit", "in transit", "dalam perjalanan", "dikirim"],

      // Purchase Order status
      READY_FOR_DELIVERY: [
        "ready_for_delivery",
        "ready for delivery",
        "siap kirim",
      ],

      // Payment method status
      CLEARED: ["cleared", "berhasil", "sukses"],

      // General status
      ACTIVE: ["active", "aktif"],
      INACTIVE: ["inactive", "tidak aktif", "nonaktif"],
      ENABLED: ["enabled", "diaktifkan", "aktif"],
      DISABLED: ["disabled", "dinonaktifkan", "tidak aktif"],
    };
  }, [customStatusMapping]);

  // Fungsi untuk mencari status berdasarkan mapping
  const findStatusBySearchTerm = useCallback(
    (searchTerm: string) => {
      const lowerSearchTerm = searchTerm.toLowerCase();

      // Jika ada customStatusMapping, gunakan logic sesuai format
      if (customStatusMapping) {
        // Check if it's Record<string, string> format (Indonesian -> English)
        const firstValue = Object.values(customStatusMapping)[0];

        if (typeof firstValue === "string") {
          // Format: { indonesian: "ENGLISH_STATUS" }
          const mapping = customStatusMapping as Record<string, string>;

          // Check if search term matches any Indonesian key or English value
          for (const [indonesianTerm, englishStatus] of Object.entries(
            mapping
          )) {
            if (
              indonesianTerm.toLowerCase().includes(lowerSearchTerm) ||
              englishStatus.toLowerCase().includes(lowerSearchTerm)
            ) {
              return englishStatus;
            }
          }
        } else {
          // Format: { "ENGLISH_STATUS": ["indonesian1", "indonesian2"] }
          const mapping = customStatusMapping as Record<string, string[]>;

          for (const [englishStatus, indonesianTerms] of Object.entries(
            mapping
          )) {
            if (
              indonesianTerms.some((term: string) =>
                term.includes(lowerSearchTerm)
              ) ||
              englishStatus.toLowerCase().includes(lowerSearchTerm)
            ) {
              return englishStatus;
            }
          }
        }
      } else {
        // Use internal statusMapping (Record<string, string[]> format)
        for (const [englishStatus, indonesianTerms] of Object.entries(
          statusMapping
        )) {
          if (
            (indonesianTerms as string[]).some((term: string) =>
              term.includes(lowerSearchTerm)
            ) ||
            englishStatus.toLowerCase().includes(lowerSearchTerm)
          ) {
            return englishStatus;
          }
        }
      }

      return null;
    },
    [customStatusMapping, statusMapping]
  );

  const initialDateRange = useMemo(() => {
    return {
      startDate: new Date(2025, 0, 1), // Start date: January 1, 2025
      endDate: new Date(), // Current date
    };
  }, []);

  const enhancedColumns = useMemo(() => {
    return columns.map(column => {
      // Jika Anda tetap ingin mengkonversi 'cell' ke 'render' secara universal
      if (column.cell && typeof column.cell === "function") {
        const cellFn = column.cell;
        return {
          ...column,
          render: (value: any, row: any) => cellFn({ getValue: () => value }), // Pastikan 'row' juga diteruskan jika cellFn memerlukan
        };
      }
      return column; // Kembalikan kolom apa adanya, karena 'render' sudah ada di definisi kolom
    });
  }, [columns]);

  const [startDate, setStartDate] = useState(initialDateRange.startDate);
  const [endDate, setEndDate] = useState(initialDateRange.endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOption, setSearchOption] = useState("all");
  const [statusFilter, setStatusFilter] = useState(""); // New state for status filter
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const path = linkPath.toLowerCase();

  const handleDateChange = (dates: { startDate: Date; endDate: Date }) => {
    setStartDate(dates.startDate);

    // Adding one day to the selected endDate
    const adjustedEndDate = new Date(dates.endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);

    setEndDate(adjustedEndDate);
  };

  const handleSearch = (query: string, option: string) => {
    setSearchQuery(query);
    setSearchOption(option);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to the first page on page size change
  };

  const filteredData = useMemo(() => {
    return sampleData.filter(item => {
      // Date filtering (only if dateAccessor exists in the data)
      let isWithinDateRange = true;
      if (dateAccessor && item[dateAccessor]) {
        const itemDate = new Date(item[dateAccessor]);
        isWithinDateRange = itemDate >= startDate && itemDate <= endDate;
      }

      // Status filtering
      let statusMatch = true;
      if (statusFilter && statusFilterField) {
        const itemStatus = String(item[statusFilterField]);
        statusMatch = itemStatus === statusFilter;
      }

      // Helper function to get nested property value
      const getNestedValue = (obj: any, path: string): any => {
        return path.split(".").reduce((current, key) => current?.[key], obj);
      };

      // Search filtering with status mapping
      let searchMatch = true;

      if (searchQuery) {
        if (searchOption === "all") {
          // Search across all fields including nested ones
          const searchInObject = (
            obj: any,
            searchTerm: string,
            prefix = ""
          ): boolean => {
            return Object.entries(obj).some(([key, value]) => {
              const currentPath = prefix ? `${prefix}.${key}` : key;

              // If value is an object, search recursively
              if (
                value &&
                typeof value === "object" &&
                !Array.isArray(value) &&
                !(value instanceof Date)
              ) {
                return searchInObject(value, searchTerm, currentPath);
              }

              const stringValue = String(value).toLowerCase();

              // Regular text search
              if (stringValue.includes(searchTerm)) {
                return true;
              }

              // Status mapping search for status-related fields
              if (
                key.toLowerCase().includes("status") ||
                key.toLowerCase().includes("paymentstatus") ||
                key.toLowerCase().includes("deliverystatus")
              ) {
                const mappedStatus = findStatusBySearchTerm(searchTerm);
                if (
                  mappedStatus &&
                  stringValue.includes(mappedStatus.toLowerCase())
                ) {
                  return true;
                }
              }

              return false;
            });
          };

          searchMatch = searchInObject(item, searchQuery.toLowerCase());
        } else {
          // Search in specific field (support nested accessor)
          const fieldValue = getNestedValue(item, searchOption);
          if (fieldValue !== undefined && fieldValue !== null) {
            const stringValue = String(fieldValue).toLowerCase();
            const searchTerm = searchQuery.toLowerCase();

            // Regular text search
            searchMatch = stringValue.includes(searchTerm);

            // If regular search fails and it's a status field, try status mapping
            if (
              !searchMatch &&
              (searchOption.toLowerCase().includes("status") ||
                searchOption.toLowerCase().includes("paymentstatus") ||
                searchOption.toLowerCase().includes("deliverystatus"))
            ) {
              const mappedStatus = findStatusBySearchTerm(searchTerm);
              if (mappedStatus) {
                searchMatch = stringValue.includes(mappedStatus.toLowerCase());
              }
            }
          } else {
            searchMatch = false;
          }
        }
      }

      return isWithinDateRange && statusMatch && searchMatch;
    });
  }, [
    sampleData,
    searchQuery,
    searchOption,
    statusFilter,
    statusFilterField,
    startDate,
    endDate,
    dateAccessor,
    statusMapping,
    findStatusBySearchTerm,
  ]);

  // Use useEffect to call the callback after render
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData);
    }
  }, [filteredData, onFilteredDataChange]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const columnFilterFunction = (accessor: string) => {
    return !excludedAccessors.includes(accessor);
  };

  const defaultLinkPath = (row: T) => {
    return `${path}/edit/${row.id}`;
  };

  return (
    <div className="p-3 md:p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div className="w-full md:w-auto">
          <DataRangePicker
            startDate={startDate}
            endDate={endDate}
            onDatesChange={handleDateChange}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <CombinedSearchInput
            columns={enhancedColumns}
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Cari..."
            filterColumnAccessor={columnFilterFunction}
          />
          {statusFilterOptions && statusFilterField && (
            <StatusFilter
              value={statusFilter}
              onChange={handleStatusFilter}
              options={statusFilterOptions}
              placeholder="Status"
            />
          )}
        </div>
      </div>
      <DataTable
        currentPage={currentPage}
        columns={enhancedColumns}
        data={paginatedData}
        emptyMessage={emptyMessage}
        enableFiltering={false}
        pageSize={pageSize}
        linkPath={disableRowLinks ? undefined : defaultLinkPath}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        totalPages={Math.ceil(filteredData.length / pageSize)}
        totalItems={filteredData.length}
      />
    </div>
  );
};

export default ManagementContent;
