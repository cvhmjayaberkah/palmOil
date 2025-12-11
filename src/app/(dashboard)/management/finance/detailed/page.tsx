"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/common/Card";
import { ManagementContent, ManagementHeader } from "@/components/ui";
import { Badge, Button } from "@/components/ui/common";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  Users,
  Download,
} from "lucide-react";
import { formatRupiah } from "@/utils/formatRupiah";
import { toast } from "sonner";

interface TransactionDetail {
  id: string;
  date: string;
  type: "INVOICE" | "EXPENSE";
  number: string;
  description: string;
  customer?: string | null;
  amount: number;
  status: string;
  category?: string | null;
  hpp: number;
}

interface MonthlyStats {
  totalInvoices: number;
  totalExpenses: number;
  totalTransactions: number;
  grossRevenue: number;
  totalExpenseAmount: number;
  totalCOGS: number;
  totalReceivables: number;
  netProfit: number;
}

export default function DetailedTransactionsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  });
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "INVOICE" | "EXPENSE">(
    "ALL"
  );

  // Helper function to format transaction status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge colorScheme="green">Lunas</Badge>;
      case "COMPLETED":
        return <Badge colorScheme="green">Selesai</Badge>;
      case "UNPAID":
        return <Badge colorScheme="red">Belum Bayar</Badge>;
      case "OVERDUE":
        return <Badge colorScheme="red">Terlambat</Badge>;
      case "CANCELLED":
        return <Badge colorScheme="gray">Dibatalkan</Badge>;
      default:
        return <Badge colorScheme="yellow">Pending</Badge>;
    }
  };

  // Helper function to format transaction type
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "INVOICE":
        return <Badge colorScheme="green">Invoice</Badge>;
      case "EXPENSE":
        return <Badge colorScheme="red">Pengeluaran</Badge>;
      default:
        return <Badge colorScheme="gray">-</Badge>;
    }
  };

  // Define columns for the table
  const columns = [
    {
      header: "Tanggal",
      accessor: "date",
      render: (value: string) =>
        new Date(value).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
    },
    {
      header: "Tipe",
      accessor: "type",
      render: (value: string) => getTypeBadge(value),
    },
    {
      header: "Nomor",
      accessor: "number",
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      header: "Deskripsi",
      accessor: "description",
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      ),
    },
    {
      header: "Customer/Kategori",
      accessor: "customer",
      render: (value: string | undefined, row: TransactionDetail) => {
        // For invoices, show customer name or "-" if null/empty
        if (row.type === "INVOICE") {
          const customerName = row.customer || "-";
          return <div className="max-w-xs truncate">{customerName}</div>;
        }
        // For expenses, show category
        return <div className="max-w-xs truncate">{row.category || "-"}</div>;
      },
    },
    {
      header: "Jumlah",
      accessor: "amount",
      render: (value: number) => (
        <span className="font-semibold">{formatRupiah(value)}</span>
      ),
    },
    {
      header: "HPP",
      accessor: "hpp",
      render: (value: number, row: TransactionDetail) =>
        row.type === "INVOICE" ? (
          <span className="text-orange-600 dark:text-orange-400 font-semibold">
            {formatRupiah(value)}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (value: string) => getStatusBadge(value),
    },
  ];

  const excludedAccessors = ["id", "category"];

  const fetchTransactionDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/finance/detailed-transactions?month=${selectedMonth}&type=${filterType}&limit=999999`
      );
      const result = await response.json();

      if (result.success) {
        setTransactions(result.data.transactions || []);
        setMonthlyStats(result.data.stats || null);
      } else {
        console.error("Failed to load transactions:", result.error);
        toast.error("Failed to load transaction details");
        setTransactions([]);
        setMonthlyStats(null);
      }
    } catch (error) {
      console.error("Error loading transaction details:", error);
      toast.error("Failed to load transaction details");
      setTransactions([]);
      setMonthlyStats(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, filterType]);

  // Fetch all transactions for PDF export (without pagination)
  const fetchAllTransactions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/finance/detailed-transactions?month=${selectedMonth}&type=${filterType}&limit=999999`
      );
      const result = await response.json();

      if (result.success) {
        return result.data.transactions || [];
      } else {
        console.error("Failed to load all transactions:", result.error);
        return [];
      }
    } catch (error) {
      console.error("Error loading all transactions:", error);
      return [];
    }
  }, [selectedMonth, filterType]);

  useEffect(() => {
    if (selectedMonth) {
      fetchTransactionDetails();
    }
  }, [fetchTransactionDetails, selectedMonth]);

  const handleMonthChange = (direction: "prev" | "next") => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let newYear = year;
    let newMonth = month;

    if (direction === "next") {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    } else {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    }

    setSelectedMonth(`${newYear}-${newMonth.toString().padStart(2, "0")}`);
  };

  const getMonthName = (monthString: string) => {
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
    });
  };

  const getCurrentMonthYear = () => {
    const [year, month] = selectedMonth.split("-");
    return {
      monthName: new Date(
        parseInt(year),
        parseInt(month) - 1
      ).toLocaleDateString("id-ID", { month: "long" }),
      year: year,
    };
  };

  const exportToPDF = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Mengambil semua data transaksi...");

      // Fetch all transactions for export
      const allTransactions = await fetchAllTransactions();

      if (allTransactions.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("Tidak ada data untuk di-export");
        return;
      }

      // Update loading message
      toast.loading("Membuat PDF...", { id: loadingToast });

      const { default: jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF();

      // Header dengan informasi bulan
      const monthInfo = getMonthName(selectedMonth);
      const currentMonthData = getCurrentMonthYear();

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN LABA RUGI", doc.internal.pageSize.width / 2, 20, {
        align: "center",
      });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`CV. HM JAYA BERKAH`, doc.internal.pageSize.width / 2, 30, {
        align: "center",
      });
      doc.text(`Periode: ${monthInfo}`, doc.internal.pageSize.width / 2, 38, {
        align: "center",
      });

      // P&L Statement structure if stats available
      if (monthlyStats) {
        const startY = 50;

        // Calculate components for P&L
        const totalPenjualan = monthlyStats.grossRevenue;
        const totalHPP = monthlyStats.totalCOGS;
        const labaKotor = totalPenjualan - totalHPP;
        const totalBeban = monthlyStats.totalExpenseAmount;
        const labaBersih = labaKotor - totalBeban;

        // Create P&L structure data
        const plData = [
          ["PENDAPATAN", ""],
          ["Penjualan", formatRupiah(totalPenjualan)],
          ["", ""],
          ["HARGA POKOK PENJUALAN", ""],
          ["Harga Pokok Penjualan", `(${formatRupiah(totalHPP)})`],
          ["", ""],
          ["LABA KOTOR", formatRupiah(labaKotor)],
          ["", ""],
          ["BEBAN OPERASIONAL", ""],
          ["Total Beban", `(${formatRupiah(totalBeban)})`],
          ["", ""],
          ["LABA BERSIH", formatRupiah(labaBersih)],
        ];

        autoTable(doc, {
          startY: startY,
          body: plData,
          theme: "plain",
          styles: {
            fontSize: 11,
            cellPadding: 3,
            lineWidth: 0,
          },
          columnStyles: {
            0: {
              cellWidth: 120,
              halign: "left",
            },
            1: {
              cellWidth: 60,
              halign: "right",
            },
          },
          didParseCell: function (data: any) {
            const text = data.cell.text[0];

            // Apply bold styling to header sections and totals
            if (
              text === "PENDAPATAN" ||
              text === "HARGA POKOK PENJUALAN" ||
              text === "LABA KOTOR" ||
              text === "BEBAN OPERASIONAL" ||
              text === "LABA BERSIH"
            ) {
              data.cell.styles.fontStyle = "bold";
            }

            // Add borders for totals
            if (text === "LABA KOTOR" || text === "LABA BERSIH") {
              data.cell.styles.lineWidth = 0.5;
              data.cell.styles.lineColor = [0, 0, 0];
              if (data.column.index === 1) {
                data.cell.styles.borders = ["top", "bottom"];
              }
            }

            // Header sections styling
            if (
              text === "PENDAPATAN" ||
              text === "HARGA POKOK PENJUALAN" ||
              text === "BEBAN OPERASIONAL"
            ) {
              data.cell.styles.fillColor = [245, 245, 245];
            }

            // Bold for totals in right column
            if (data.column.index === 1) {
              const rowText = plData[data.row.index][0];
              if (rowText === "LABA KOTOR" || rowText === "LABA BERSIH") {
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
        });
      }

      // Add footer to the P&L statement page
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Digenerate pada: ${new Date().toLocaleDateString(
          "id-ID"
        )} ${new Date().toLocaleTimeString("id-ID")}`,
        14,
        doc.internal.pageSize.height - 15
      );
      doc.text(
        "CV. HM JAYA BERKAH",
        doc.internal.pageSize.width - 14,
        doc.internal.pageSize.height - 15,
        { align: "right" }
      );

      // Filter transactions for detailed list
      const filteredAllTransactions = allTransactions;

      // Save the PDF (only P&L statement, no detailed transactions)
      const filename = `laporan-laba-rugi-${currentMonthData.monthName}-${currentMonthData.year}.pdf`;
      doc.save(filename);

      toast.dismiss(loadingToast);
      toast.success(`Laporan Laba Rugi berhasil diekspor!`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal mengekspor PDF");
    }
  };

  const filteredTransactions = transactions;

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need to be logged in to view this page.
          </p>
          <Link
            href="/sign-in"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Sign In
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ManagementHeader
        allowedRoles={["OWNER", "ADMIN"]}
        mainPageName="management/finance/detailed"
        headerTittle="Detail Transaksi Bulanan"
      />

      {/* Month Navigation */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleMonthChange("prev")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Bulan Sebelumnya
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {getMonthName(selectedMonth)}
            </h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="mt-2 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <button
            onClick={() => handleMonthChange("next")}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors"
          >
            Bulan Selanjutnya
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Monthly Statistics */}
      {monthlyStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Transaksi
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {monthlyStats.totalTransactions}
                </p>
              </div>
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Pendapatan
                </p>
                <p className="text-xl font-bold text-green-600 leading-tight break-words">
                  {formatRupiah(monthlyStats.grossRevenue)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total HPP
                </p>
                <p className="text-xl font-bold text-orange-600 leading-tight break-words">
                  {formatRupiah(monthlyStats.totalCOGS)}
                </p>
              </div>
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Piutang
                </p>
                <p className="text-xl font-bold text-amber-600 leading-tight break-words">
                  {formatRupiah(monthlyStats.totalReceivables)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Pengeluaran
                </p>
                <p className="text-xl font-bold text-red-600 leading-tight break-words">
                  {formatRupiah(monthlyStats.totalExpenseAmount)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-red-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Keuntungan Bersih
                </p>
                <p
                  className={`text-xl font-bold leading-tight break-words ${
                    monthlyStats.netProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {formatRupiah(monthlyStats.netProfit)}
                </p>
              </div>
              <DollarSign
                className={`h-6 w-6 ${
                  monthlyStats.netProfit >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Export */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as "ALL" | "INVOICE" | "EXPENSE")
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="ALL">Semua Transaksi</option>
            <option value="INVOICE">Invoice Saja</option>
            <option value="EXPENSE">Pengeluaran Saja</option>
          </select>
        </div>

        {/* Export Button */}
        <div className="flex gap-2">
          <Button
            onClick={exportToPDF}
            variant="outline"
            size="medium"
            disabled={loading || transactions.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Laporan Laba Rugi
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading...
            </span>
          </div>
        ) : (
          <ManagementContent
            sampleData={filteredTransactions}
            columns={columns}
            excludedAccessors={excludedAccessors}
            dateAccessor="date"
            emptyMessage={`Tidak ada transaksi ditemukan untuk bulan ${getMonthName(
              selectedMonth
            )}`}
            linkPath="/management/finance/detailed"
            disableRowLinks={true}
          />
        )}
      </div>
    </div>
  );
}
