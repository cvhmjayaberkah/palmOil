"use client";
import React, { useState, useMemo } from "react";
import Button from "../common/Button";
import { useRouter } from "next/navigation"; // Gunakan dari next/navigation

interface Column {
  header: string;
  accessor: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
}

interface SortState {
  column: string | null;
  direction: "asc" | "desc" | null;
}

interface FilterState {
  column: string;
  value: string;
}

interface TableProps {
  linkPath?: (row: any) => string; // Menambahkan properti ini
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  showPagination?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  onSort?: (column: string, direction: "asc" | "desc" | null) => void;
  onFilter?: (column: string, value: string) => void;
  statusMapping?: Record<string, string>; // Mapping untuk search status bahasa Indonesia ke Inggris
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
}

// Updated SearchAndFilter component with right alignment

const SearchAndFilter: React.FC<{
  columns: Column[];
  onFilter: (column: string, value: string) => void;
  filterState: FilterState;
}> = ({ columns, onFilter, filterState }) => {
  const filterableColumns = columns.filter(col => col.filterable !== false);

  return (
    <div className="flex justify-end items-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="flex w-full max-w-md">
        <div className="relative flex-grow flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder={`Search ${filterState.column}...`}
            value={filterState.value}
            onChange={e => onFilter(filterState.column, e.target.value)}
            className="w-full pl-10 pr-36 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
          />
          <div className="absolute right-0 flex items-center">
            <select
              value={filterState.column}
              onChange={e => onFilter(e.target.value, filterState.value)}
              className="w-32 pl-2 pr-8 py-2 border-y border-r border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-400 text-sm rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
            >
              {filterableColumns.map(column => (
                <option key={column.accessor} value={column.accessor}>
                  {column.header}
                </option>
              ))}
            </select>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-gray-400 absolute right-2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sort Icon component
const SortIcon: React.FC<{ direction: "asc" | "desc" | null }> = ({
  direction,
}) => {
  return (
    <span className="ml-2 inline-flex flex-col">
      <svg
        className={`w-3 h-3 ${
          direction === "asc" ? "text-blue-500" : "text-gray-400"
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
          clipRule="evenodd"
        />
      </svg>
      <svg
        className={`w-3 h-3 -mt-1 ${
          direction === "desc" ? "text-blue-500" : "text-gray-400"
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
};

// Skeleton loader component
const TableSkeleton: React.FC<{ columns: Column[] }> = ({ columns }) => {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="border-b border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {columns.map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 bg-gray-300 dark:bg-gray-600 rounded"
              ></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Pagination component
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize: propPageSize = 10,
  onPageSizeChange,
  totalItems = 0,
}) => {
  // Local state for page size with fallback to prop value
  const [pageSize, setPageSize] = useState(propPageSize);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const [jumpToPage, setJumpToPage] = useState<string>("");

  // Handle direct page jump
  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPage("");
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    // Update local state
    setPageSize(newPageSize);

    // If onPageSizeChange prop is provided, call it
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }

    // Reset to page 1 when changing page size
    if (currentPage > 1) {
      onPageChange(1);
    }
  };

  // Get page numbers logic remains the same...
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 sm:px-6 gap-4">
      {/* Items info and page size selector */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        <p className="text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
          Menampilkan <span className="font-medium">{startItem}</span>{" "}
          <span className="font-extrabold">-</span>{" "}
          <span className="font-medium">{endItem}</span> dari{" "}
          <span className="font-medium">{totalItems}</span> hasil
        </p>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Baris Halaman:
          </label>
          <select
            value={pageSize}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex flex-wrap items-center space-x-1">
        <Button
          variant="outline"
          size="small"
          disabled={!canGoPrevious}
          onClick={() => onPageChange(currentPage - 1)}
          className="whitespace-nowrap"
        >
          Sebelumnya
        </Button>

        <div className="hidden sm:flex items-center space-x-1">
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span key={index} className="px-3 py-1 text-gray-500">
                ...
              </span>
            ) : (
              <Button
                key={index}
                variant={page === currentPage ? "primary" : "outline"}
                size="small"
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Mobile page indicator */}
        <div className="sm:hidden px-2 py-1 text-sm text-gray-700 dark:text-gray-300">
          Halaman {currentPage} <span className="font-extrabold">-</span>{" "}
          {totalPages}
        </div>

        <Button
          variant="outline"
          size="small"
          disabled={!canGoNext}
          onClick={() => onPageChange(currentPage + 1)}
          className="whitespace-nowrap"
        >
          Selanjutnya
        </Button>

        {/* Jump to page form - visible on larger screens */}
        {totalPages > 5 && (
          <form
            onSubmit={handleJumpToPage}
            className="hidden sm:flex items-center ml-4 space-x-2"
          >
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Menuju ke:
            </span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpToPage}
              onChange={e => setJumpToPage(e.target.value)}
              className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
              placeholder="Page"
            />
            <Button type="submit" variant="outline" size="small">
              Go
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 mb-4 text-gray-400 dark:text-gray-500">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          className="w-full h-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    </div>
  );
};

// Fungsi helper untuk mendapatkan nilai dari properti bersarang
const getNestedValue = (obj: any, accessor: string): any => {
  return accessor.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return acc[part];
    }
    return undefined;
  }, obj);
};

const DataTable: React.FC<TableProps> = ({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data available",
  className = "",
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showPagination = true,
  pageSize = 10,
  onPageSizeChange,
  totalItems = 0,
  enableSorting = true,
  enableFiltering = true,
  onSort,
  onFilter,
  linkPath, // Menerima link dari luar
  statusMapping, // Mapping untuk search status
}) => {
  // Local state for sorting and filtering
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });
  const [filterState, setFilterState] = useState<FilterState>({
    column:
      columns.find(col => col.filterable !== false)?.accessor ||
      columns[0]?.accessor ||
      "",
    value: "",
  });

  // Handle sorting
  const handleSort = (column: Column) => {
    if (!column.sortable && column.sortable !== undefined) return;
    if (!enableSorting) return;

    let newDirection: "asc" | "desc" | null = "asc";

    if (sortState.column === column.accessor) {
      if (sortState.direction === "asc") {
        newDirection = "desc";
      } else if (sortState.direction === "desc") {
        newDirection = null;
      }
    }

    setSortState({ column: column.accessor, direction: newDirection });

    if (onSort) {
      onSort(column.accessor, newDirection);
    }
  };

  // Handle filtering with enhanced search for status mapping
  const handleFilter = (column: string, value: string) => {
    setFilterState({ column, value });

    // If statusMapping is provided and this might be a status search, try mapping
    let mappedValue = value;
    if (statusMapping && value) {
      const lowerValue = value.toLowerCase();
      // Check if the search term matches any Indonesian status
      for (const [indonesian, english] of Object.entries(statusMapping)) {
        if (indonesian.toLowerCase().includes(lowerValue)) {
          mappedValue = english;
          break;
        }
      }
    }

    if (onFilter) {
      onFilter(column, mappedValue);
    }
  };

  // Apply local sorting and filtering if no external handlers provided
  const processedData = useMemo(() => {
    let result = [...data]; // Balikkan urutan data

    // Apply filtering
    if (!onFilter && filterState.value) {
      result = result.filter(row => {
        const cellValue = getNestedValue(row, filterState.column);
        const searchValue = filterState.value.toLowerCase();
        const cellString = String(cellValue).toLowerCase();

        // Direct search
        if (cellString.includes(searchValue)) {
          return true;
        }

        // Status mapping search
        if (statusMapping) {
          for (const [indonesian, english] of Object.entries(statusMapping)) {
            // If user searches Indonesian and cell contains English
            if (
              indonesian.toLowerCase().includes(searchValue) &&
              cellString.includes(english.toLowerCase())
            ) {
              return true;
            }
            // If user searches English and cell contains English
            if (
              english.toLowerCase().includes(searchValue) &&
              cellString.includes(english.toLowerCase())
            ) {
              return true;
            }
          }
        }

        return false;
      });
    }

    // Apply sorting
    if (!onSort && sortState.column && sortState.direction) {
      result.sort((a, b) => {
        const aValue = a[sortState.column!];
        const bValue = b[sortState.column!];

        if (aValue < bValue) {
          return sortState.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortState.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [data, sortState, filterState, onSort, onFilter]);


  if (isLoading) {
    return (
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
      >
        <TableSkeleton columns={columns} />
      </div>
    );
  }

  const displayData = processedData;
  const router = useRouter();

  return (
    <div
      className={`w-full max-w-full bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Search and Filter */}
      {enableFiltering && columns.some(col => col.filterable !== false) && (
        <SearchAndFilter
          columns={columns}
          onFilter={handleFilter}
          filterState={filterState}
        />
      )}

      {displayData.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <>
          {/* Table View with horizontal scroll for all devices */}
          <div className="block">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700 min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {/* Add sequence number column */}
                    <th className="w-[50px] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      #
                    </th>

                    {columns.map((column, index) => (
                      <th
                        key={index}
                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                          index === 0 ? "w-[150px]" : ""
                        } ${
                          enableSorting && column.sortable !== false
                            ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            : ""
                        }`}
                        onClick={() => handleSort(column)}
                      >
                        <div className="flex items-center">
                          {column.header}
                          {enableSorting && column.sortable !== false && (
                            <SortIcon
                              direction={
                                sortState.column === column.accessor
                                  ? sortState.direction
                                  : null
                              }
                            />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {displayData.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                    >
                      <td className="w-[50px] px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-center">
                        {(currentPage - 1) * pageSize + rowIndex + 1}
                      </td>

                      {columns.map((column, colIndex) => {
                        const value = getNestedValue(row, column.accessor);
                        const cellContent = column.render
                          ? column.render(value, row)
                          : value;

                        // Jika ini kolom pertama dan ada linkPath, buat menjadi link
                        if (linkPath && colIndex === 0) {
                          return (
                            <td key={colIndex} className="px-3 py-3 w-[150px]">
                              <a
                                href={linkPath(row)}
                                onClick={e => {
                                  e.preventDefault();
                                  router.push(linkPath(row));
                                }}
                                className="text-blue-600 hover:underline"
                              >
                                {cellContent}
                              </a>
                            </td>
                          );
                        }

                        // Render sel biasa untuk kolom lainnya
                        return (
                          <td
                            key={colIndex}
                            className={`px-3 py-3 text-sm text-gray-900 dark:text-gray-100 break-words ${
                              colIndex === 0 ? "w-[150px]" : ""
                            }`}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      {showPagination && onPageChange && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(totalPages, 1)}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          totalItems={totalItems || processedData.length}
        />
      )}
    </div>
  );
};

export default DataTable;
