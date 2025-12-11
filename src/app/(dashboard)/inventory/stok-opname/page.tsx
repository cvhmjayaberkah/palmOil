// app/inventory/stok-opname/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementContent } from "@/components/ui";
import {
  CombinedSearchInput,
  DataRangePicker,
  DataTable,
} from "@/components/ui";
import React, { useState, useEffect, useMemo } from "react"; // Essential for JSX
import { formatDate } from "@/utils/formatDate";
import { Button } from "@/components/ui";
import { FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Type definitions for our data
interface StockMovementData {
  id: string;
  date: Date;
  productCode: string;
  productName: string;
  warehouseStock: number;
  stockIn: number;
  stockOut: number;
  returns: number;
  remaining: number;
}

// Custom Management Content Component for Stock Opname with Date Filter
interface Column {
  header: string;
  accessor: string;
  cell?: (info: { getValue: () => any }) => React.ReactNode;
  render?: (value: any, row: any) => React.ReactNode;
}

interface StockOpnameManagementContentProps {
  sampleData: StockMovementData[];
  columns: Column[];
  excludedAccessors: string[];
  dateAccessor?: string;
  emptyMessage?: string;
  linkPath: string;
  onFilteredDataChange?: (filteredData: StockMovementData[]) => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  isLoading?: boolean;
}

const StockOpnameManagementContent: React.FC<
  StockOpnameManagementContentProps
> = ({
  sampleData,
  columns,
  excludedAccessors,
  dateAccessor = "date",
  emptyMessage = "Tidak ada data ditemukan",
  linkPath,
  onFilteredDataChange,
  onDateRangeChange,
  isLoading = false,
}) => {
  const initialDateRange = useMemo(() => {
    return {
      startDate: new Date(2025, 0, 1), // Start date: January 1, 2025
      endDate: new Date(), // Current date
    };
  }, []);

  const [startDate, setStartDate] = useState(initialDateRange.startDate);
  const [endDate, setEndDate] = useState(initialDateRange.endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOption, setSearchOption] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const enhancedColumns = useMemo(() => {
    return columns.map((column) => {
      if (column.cell && typeof column.cell === "function") {
        const cellFn = column.cell;
        return {
          ...column,
          render: (value: any, row: any) => cellFn({ getValue: () => value }),
        };
      }
      return column;
    });
  }, [columns]);

  const handleDateChange = (dates: { startDate: Date; endDate: Date }) => {
    setStartDate(dates.startDate);
    const adjustedEndDate = new Date(dates.endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
    setEndDate(adjustedEndDate);

    // Trigger parent date range change to fetch new data
    if (onDateRangeChange) {
      onDateRangeChange(dates.startDate, adjustedEndDate);
    }
  };

  const handleSearch = (query: string, option: string) => {
    setSearchQuery(query);
    setSearchOption(option);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return sampleData.filter((item) => {
      // Date filtering
      let isWithinDateRange = true;
      if (dateAccessor && item[dateAccessor as keyof StockMovementData]) {
        const itemDate = new Date(
          item[dateAccessor as keyof StockMovementData] as string
        );
        isWithinDateRange = itemDate >= startDate && itemDate <= endDate;
      }

      // Search filtering
      const searchMatch =
        !searchQuery ||
        (searchOption === "all"
          ? Object.values(item).some((value) =>
              String(value).toLowerCase().includes(searchQuery.toLowerCase())
            )
          : String(item[searchOption as keyof StockMovementData] || "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase()));

      return isWithinDateRange && searchMatch;
    });
  }, [sampleData, searchQuery, searchOption, startDate, endDate, dateAccessor]);

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

  const defaultLinkPath = (row: StockMovementData) => {
    return `${linkPath}/edit/${row.id}`;
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
        <CombinedSearchInput
          columns={enhancedColumns}
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Cari..."
          filterColumnAccessor={columnFilterFunction}
        />
      </div>
      <DataTable
        currentPage={currentPage}
        columns={enhancedColumns}
        data={paginatedData}
        emptyMessage={isLoading ? "Memuat data..." : emptyMessage}
        enableFiltering={false}
        pageSize={pageSize}
        linkPath={defaultLinkPath}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
        totalPages={Math.ceil(filteredData.length / pageSize)}
        totalItems={filteredData.length}
      />
    </div>
  );
};

// Function to fetch and process real database data based on date filters
const fetchStockMovementData = async (
  startDate?: Date,
  endDate?: Date
): Promise<StockMovementData[]> => {
  try {
    // Build query parameters for date filtering
    let apiUrl = "/api/stock-movements";
    const params = new URLSearchParams();

    if (startDate) {
      params.append("startDate", startDate.toISOString());
    }
    if (endDate) {
      params.append("endDate", endDate.toISOString());
    }

    if (params.toString()) {
      apiUrl += "?" + params.toString();
    }

    // Fetch stock movements from API with date filters
    const stockMovementsResponse = await fetch(apiUrl);
    if (!stockMovementsResponse.ok) {
      throw new Error("Failed to fetch stock movements");
    }
    const stockMovements = await stockMovementsResponse.json();

    // Fetch current products with their stock levels
    const productsResponse = await fetch("/api/products");
    if (!productsResponse.ok) {
      throw new Error("Failed to fetch products");
    }
    const products = await productsResponse.json();

    const processedData: StockMovementData[] = [];

    // Group stock movements by product and date
    const dailyStockMap = new Map();

    // Get unique dates from movements within the filter range
    const uniqueDates = new Set<string>();

    stockMovements.forEach((movement: any) => {
      const movementDate = new Date(movement.movementDate);
      const dateKey = movementDate.toDateString();
      uniqueDates.add(dateKey);

      const mapKey = `${movement.productId}-${dateKey}`;

      if (!dailyStockMap.has(mapKey)) {
        const product = products.find((p: any) => p.id === movement.productId);
        dailyStockMap.set(mapKey, {
          productId: movement.productId,
          date: movementDate,
          productCode: product?.code || "-",
          productName: product?.name || "Unknown Product",
          currentStock: product?.currentStock || 0,
          stockIn: 0,
          stockOut: 0,
          returns: 0,
          movements: [] as any[], // Store all movements for this product-date
        });
      }

      const dailyData = dailyStockMap.get(mapKey);
      dailyData.movements.push(movement);

      switch (movement.type) {
        case "PRODUCTION_IN":
        case "ADJUSTMENT_IN":
          dailyData.stockIn += movement.quantity || 0;
          break;
        case "SALES_OUT":
        case "ADJUSTMENT_OUT":
          dailyData.stockOut += movement.quantity || 0;
          break;
        case "RETURN_IN":
          dailyData.returns += movement.quantity || 0;
          break;
      }
    });

    // If no movements in date range, show current stock for today only
    if (dailyStockMap.size === 0) {
      const today = new Date();
      products.forEach((product: any) => {
        processedData.push({
          id: `${today.getTime()}-${product.id}`,
          date: today,
          productCode: product.code || "-",
          productName: product.name || "Unknown Product",
          warehouseStock: product.currentStock || 0,
          stockIn: 0,
          stockOut: 0,
          returns: 0,
          remaining: product.currentStock || 0,
        });
      });
    } else {
      // Process movements chronologically to build accurate stock progression
      const sortedDates = Array.from(uniqueDates).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      // Collect and group all movements by product and date
      const movementsByProductAndDate = new Map();

      stockMovements.forEach((movement: any) => {
        const dateKey = new Date(movement.movementDate).toDateString();
        const productId = movement.productId;
        const mapKey = `${productId}-${dateKey}`;

        if (!movementsByProductAndDate.has(mapKey)) {
          movementsByProductAndDate.set(mapKey, {
            productId: productId,
            date: new Date(movement.movementDate),
            productCode: movement.products?.code || "-",
            productName: movement.products?.name || "Unknown Product",
            stockIn: 0,
            stockOut: 0,
            returns: 0,
          });
        }

        const data = movementsByProductAndDate.get(mapKey);

        switch (movement.type) {
          case "PRODUCTION_IN":
          case "ADJUSTMENT_IN":
            data.stockIn += movement.quantity || 0;
            break;
          case "SALES_OUT":
          case "ADJUSTMENT_OUT":
            data.stockOut += movement.quantity || 0;
            break;
          case "RETURN_IN":
            data.returns += movement.quantity || 0;
            break;
        }
      });

      // Track running stock balance for each product
      const productStockBalance = new Map();

      // Initialize with current stock (we'll calculate backwards to get historical starting point)
      products.forEach((product: any) => {
        productStockBalance.set(product.id, product.currentStock || 0);
      });

      // Calculate historical starting stock by working backwards from current stock
      const historicalStartStock = new Map();
      products.forEach((product: any) => {
        let totalMovements = { in: 0, out: 0, returns: 0 };

        // Sum all movements for this product in the date range
        movementsByProductAndDate.forEach((movement: any) => {
          if (movement.productId === product.id) {
            totalMovements.in += movement.stockIn;
            totalMovements.out += movement.stockOut;
            totalMovements.returns += movement.returns;
          }
        });

        // Calculate starting stock: current - total_in + total_out - total_returns
        const startingStock =
          (product.currentStock || 0) -
          totalMovements.in +
          totalMovements.out -
          totalMovements.returns;
        historicalStartStock.set(product.id, Math.max(0, startingStock)); // Ensure non-negative
      });

      // Process dates chronologically to build accurate progression
      sortedDates.forEach((dateStr) => {
        const date = new Date(dateStr);

        // Get all product movements for this date
        const dateMovements = Array.from(
          movementsByProductAndDate.values()
        ).filter((movement: any) => movement.date.toDateString() === dateStr);

        dateMovements.forEach((movement: any) => {
          const productId = movement.productId;

          // Get stock at start of day
          let stockAtStartOfDay: number;

          if (dateStr === sortedDates[0]) {
            // First date - use historical starting stock
            stockAtStartOfDay = historicalStartStock.get(productId) || 0;
          } else {
            // Use running balance from previous calculations
            stockAtStartOfDay = productStockBalance.get(productId) || 0;
          }

          // Calculate stock at end of day
          const stockAtEndOfDay =
            stockAtStartOfDay +
            movement.stockIn -
            movement.stockOut +
            movement.returns;

          // Update running balance for this product
          productStockBalance.set(productId, stockAtEndOfDay);

          processedData.push({
            id: `${productId}-${dateStr}`,
            date: date,
            productCode: movement.productCode,
            productName: movement.productName,
            warehouseStock: stockAtStartOfDay, // Stock di gudang pada awal tanggal
            stockIn: movement.stockIn,
            stockOut: movement.stockOut,
            returns: movement.returns,
            remaining: stockAtEndOfDay, // Sisa setelah movement hari ini
          });
        });
      });
    }

    // Sort by date (newest first) then by product name
    return processedData.sort((a, b) => {
      const dateCompare =
        new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.productName.localeCompare(b.productName);
    });
  } catch (error) {
    console.error("Error fetching stock data:", error);
    return [];
  }
};

const columns = [
  {
    header: "Tanggal",
    accessor: "date",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return value ? formatDate(new Date(value)) : "-";
    },
  },
  {
    header: "Kode Barang",
    accessor: "productCode",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return <span className="font-mono text-sm">{value || "-"}</span>;
    },
  },
  {
    header: "Nama Barang",
    accessor: "productName",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return <span className="text-sm">{value || "-"}</span>;
    },
  },
  {
    header: "Barang di Gudang",
    accessor: "warehouseStock",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return (
        <span className="font-medium text-blue-600">
          {value?.toLocaleString() || "0"}
        </span>
      );
    },
  },
  {
    header: "Stock In (Produksi)",
    accessor: "stockIn",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return (
        <span className="text-green-600">{value?.toLocaleString() || "0"}</span>
      );
    },
  },
  {
    header: "Stock Out (Penjualan)",
    accessor: "stockOut",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return (
        <span className="text-red-600">{value?.toLocaleString() || "0"}</span>
      );
    },
  },
  {
    header: "Retur",
    accessor: "returns",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return (
        <span className="text-orange-600">
          {value?.toLocaleString() || "0"}
        </span>
      );
    },
  },
  {
    header: "Sisa",
    accessor: "remaining",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return (
        <span className="font-medium text-blue-600">
          {value?.toLocaleString() || "0"}
        </span>
      );
    },
  },
  // Manual stock opname column
  {
    header: "Keterangan",
    accessor: "keterangan",
    cell: () => {
      return (
        <div className="w-40 h-8 border border-gray-300 bg-gray-50 rounded text-center flex items-center justify-center">
          <span className="text-gray-400 text-xs">Manual Entry</span>
        </div>
      );
    },
  },
];

const StokOpnamePage = () => {
  const [dailyStockData, setDailyStockData] = useState<StockMovementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [filteredDataForPDF, setFilteredDataForPDF] = useState<
    StockMovementData[]
  >([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(2025, 0, 1), // January 1, 2025
    endDate: new Date(), // Current date
  });

  // Function to load stock data based on date range
  const loadStockData = async (startDate?: Date, endDate?: Date) => {
    setIsLoading(true);
    try {
      const data = await fetchStockMovementData(startDate, endDate);
      setDailyStockData(data);
      setFilteredDataForPDF(data); // Initialize filtered data
    } catch (error) {
      console.error("Error loading stock data:", error);
      setDailyStockData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date range change from ManagementContent
  const handleDateRangeChange = async (filteredData: StockMovementData[]) => {
    setFilteredDataForPDF(filteredData);
  };

  useEffect(() => {
    // Initial load with default date range
    loadStockData(dateRange.startDate, dateRange.endDate);
  }, []);

  // Effect to reload data when date range changes
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      loadStockData(dateRange.startDate, dateRange.endDate);
    }
  }, [dateRange]);

  // Function to generate PDF with current filtered data
  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);

      // Create A4 PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Use filtered data
      const dataToProcess =
        filteredDataForPDF.length > 0 ? filteredDataForPDF : dailyStockData;

      // Get date range from filtered data
      let periodText = "Semua Data";
      if (dataToProcess.length > 0) {
        const dates = dataToProcess
          .map((item) => new Date(item.date))
          .sort((a, b) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        if (dates.length === 1) {
          periodText = formatDate(startDate);
        } else {
          periodText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
        }
      }

      // Add company header
      const pageWidth = doc.internal.pageSize.getWidth();

      // Company name
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("CV HM JAYA BERKAH", pageWidth / 2, 20, { align: "center" });

      // Company subtitle
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Laporan Stok Opname Manual", pageWidth / 2, 28, {
        align: "center",
      });

      // Add report details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN STOK OPNAME", pageWidth / 2, 40, { align: "center" });

      // Add simple divider line
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.line(20, 45, pageWidth - 20, 45);

      // Report information
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Tanggal Cetak: ${formatDate(new Date())}`, 20, 55);
      doc.text(`Periode: ${periodText}`, 20, 62);

      // Add another divider
      doc.line(20, 68, pageWidth - 20, 68);

      // Prepare table data with row numbers
      const tableData = dataToProcess.map((item, index) => [
        (index + 1).toString(),
        formatDate(new Date(item.date)),
        item.productCode,
        item.productName,
        item.warehouseStock.toLocaleString(),
        item.stockIn.toLocaleString(),
        item.stockOut.toLocaleString(),
        item.returns.toLocaleString(),
        item.remaining.toLocaleString(),
        "", // Empty column for manual notes
      ]);

      // Add simple table with optimized column widths
      autoTable(doc, {
        head: [
          [
            "No",
            "Tanggal",
            "Kode Barang",
            "Nama Barang",
            "Barang di Gudang",
            "Stock In",
            "Stock Out",
            "Retur",
            "Sisa",
            "Keterangan Manual",
          ],
        ],
        body: tableData,
        startY: 75,
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
          fontStyle: "normal",
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 7,
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" }, // No
          1: { cellWidth: 18, halign: "center" }, // Tanggal
          2: { cellWidth: 15, halign: "center" }, // Kode Barang
          3: { cellWidth: 30, halign: "left" }, // Nama Barang
          4: { cellWidth: 16, halign: "right" }, // Barang di Gudang
          5: { cellWidth: 14, halign: "right" }, // Stock In
          6: { cellWidth: 14, halign: "right" }, // Stock Out
          7: { cellWidth: 12, halign: "right" }, // Retur
          8: { cellWidth: 12, halign: "right" }, // Sisa
          9: { cellWidth: 25, halign: "left" }, // Keterangan Manual
        },
        margin: { left: 15, right: 15 },
        tableWidth: "wrap",
        showHead: "everyPage",
      });

      // Add simple summary section
      const totalStockIn = dataToProcess.reduce(
        (sum, item) => sum + item.stockIn,
        0
      );
      const totalStockOut = dataToProcess.reduce(
        (sum, item) => sum + item.stockOut,
        0
      );
      const totalReturns = dataToProcess.reduce(
        (sum, item) => sum + item.returns,
        0
      );
      const totalRemaining = dataToProcess.reduce(
        (sum, item) => sum + item.remaining,
        0
      );

      const finalY = (doc as any).lastAutoTable.finalY || 75;

      // Simple summary section
      const summaryStartY = finalY + 15;

      // Summary header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("RINGKASAN STOK OPNAME", 20, summaryStartY);

      // Summary data
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const summaryY = summaryStartY + 8;
      doc.text(
        `Total Stock In: ${totalStockIn.toLocaleString()}`,
        20,
        summaryY
      );
      doc.text(
        `Total Stock Out: ${totalStockOut.toLocaleString()}`,
        20,
        summaryY + 6
      );
      doc.text(
        `Total Retur: ${totalReturns.toLocaleString()}`,
        20,
        summaryY + 12
      );
      doc.text(
        `Total Sisa: ${totalRemaining.toLocaleString()}`,
        20,
        summaryY + 18
      );

      // Add simple footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Dicetak pada: ${formatDate(new Date())} - CV HM JAYA BERKAH`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );

      // Save the PDF
      const fileName = `Laporan-Stok-Opname-CV-HM-JAYA-BERKAH-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Terjadi kesalahan saat membuat PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Custom Header with PDF button */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl md:text-3xl font-semibold text-gray-900 dark:text-white">
          Stok Opname Manual
        </h3>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {isLoading
              ? "Memuat data..."
              : `Total data: ${dailyStockData.length} entries`}
          </div>
          <Button
            onClick={generatePDF}
            disabled={isGeneratingPDF || dailyStockData.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 text-xs md:text-sm"
            title={`Cetak PDF (${filteredDataForPDF.length} data sesuai filter)`}
          >
            {isGeneratingPDF ? (
              <>
                <Download className="h-4 w-4 animate-spin" />
                Membuat PDF...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Cetak PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <StockOpnameManagementContent
        sampleData={dailyStockData}
        columns={columns}
        excludedAccessors={["id"]}
        linkPath=""
        dateAccessor="date"
        emptyMessage={
          isLoading
            ? "Memuat data stok dari database..."
            : "Belum ada data stok movement"
        }
        onFilteredDataChange={handleDateRangeChange}
        onDateRangeChange={(startDate: Date, endDate: Date) => {
          setDateRange({ startDate, endDate });
        }}
        isLoading={isLoading}
      />
    </div>
  );
};

export default StokOpnamePage;
