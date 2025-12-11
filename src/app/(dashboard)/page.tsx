"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

export default function DashboardPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
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
      render: (value: string | undefined, row: TransactionDetail) => (
        <div className="max-w-xs truncate">{value || row.category || "-"}</div>
      ),
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
    // Don't fetch if user doesn't have access
    if (!user || (user.role !== "OWNER" && user.role !== "KEUANGAN")) {
      return;
    }

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
  }, [selectedMonth, filterType, user]);

  // Fetch all transactions for PDF export (without pagination)
  const fetchAllTransactions = useCallback(async () => {
    // Don't fetch if user doesn't have access
    if (!user || (user.role !== "OWNER" && user.role !== "KEUANGAN")) {
      return [];
    }

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
  }, [selectedMonth, filterType, user]);

  useEffect(() => {
    // Only fetch data if user has access to financial dashboard
    if (
      selectedMonth &&
      user &&
      (user.role === "OWNER" || user.role === "KEUANGAN")
    ) {
      fetchTransactionDetails();
    }
  }, [fetchTransactionDetails, selectedMonth, user]);

  // Auto-redirect effect for users without access to financial dashboard
  useEffect(() => {
    if (user && user.role !== "OWNER" && user.role !== "KEUANGAN") {
      // Determine redirect URL based on user role and available menu items
      let redirectUrl = "/sales"; // Default fallback

      switch (user.role) {
        case "SALES":
          redirectUrl = "/sales"; // Sales Dashboard - available for SALES role
          break;
        case "ADMIN":
          redirectUrl = "/management/kustomer"; // Customer Management - available for ADMIN role
          break;
        case "WAREHOUSE":
          redirectUrl = "/inventory/produksi"; // Inventory/Produksi - available for WAREHOUSE role
          break;
        case "HELPER":
          redirectUrl = "/sales/pengiriman"; // Pengiriman - available for HELPER role
          break;
        default:
          redirectUrl = "/sales";
      }

      // Redirect using Next.js router
      router.push(redirectUrl);
    }
  }, [user, router]);

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
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Detail Transaksi Bulanan", 14, 20);

      // Month info and filters
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Periode: ${monthInfo}`, 14, 30);

      // Show active filters
      let filterText = "";
      if (filterType !== "ALL") {
        filterText += `Filter: ${
          filterType === "INVOICE" ? "Invoice" : "Pengeluaran"
        }`;
      }
      if (filterText) {
        doc.setFontSize(10);
        doc.text(filterText, 14, 37);
      }

      // Summary statistics if available
      if (monthlyStats) {
        const startY = filterText ? 47 : 40;
        const summaryData = [
          ["Total Transaksi", `${monthlyStats.totalTransactions}`],
          ["Total Pendapatan", formatRupiah(monthlyStats.grossRevenue)],
          ["Total HPP", formatRupiah(monthlyStats.totalCOGS)],
          ["Total Piutang", formatRupiah(monthlyStats.totalReceivables)],
          ["Total Pengeluaran", formatRupiah(monthlyStats.totalExpenseAmount)],
          ["Keuntungan Bersih", formatRupiah(monthlyStats.netProfit)],
        ];

        autoTable(doc, {
          startY: startY,
          head: [["Ringkasan", "Nilai"]],
          body: summaryData,
          theme: "plain",
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            lineWidth: 0.5,
            lineColor: [0, 0, 0],
          },
          styles: {
            fontSize: 9,
            lineWidth: 0.5,
            lineColor: [0, 0, 0],
          },
          columnStyles: {
            0: { cellWidth: 70, halign: "left" },
            1: { cellWidth: 70, halign: "right" },
          },
        });
      }

      // Filter transactions for search term
      const filteredAllTransactions = allTransactions;

      // Prepare table data using ALL filtered transactions
      const tableData = filteredAllTransactions.map(
        (transaction: TransactionDetail, index: number) => [
          (index + 1).toString(), // Nomor urut
          new Date(transaction.date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          }),
          transaction.type === "INVOICE" ? "Invoice" : "Pengeluaran",
          transaction.number,
          transaction.description.length > 25
            ? transaction.description.substring(0, 25) + "..."
            : transaction.description,
          (transaction.customer || transaction.category || "-").length > 15
            ? (transaction.customer || transaction.category || "-").substring(
                0,
                15
              ) + "..."
            : transaction.customer || transaction.category || "-",
          formatRupiah(transaction.amount).replace("Rp ", ""),
          transaction.type === "INVOICE"
            ? formatRupiah(transaction.hpp).replace("Rp ", "")
            : "-",
          transaction.status === "PAID"
            ? "Lunas"
            : transaction.status === "COMPLETED"
            ? "Selesai"
            : transaction.status === "UNPAID"
            ? "Belum Bayar"
            : transaction.status === "OVERDUE"
            ? "Terlambat"
            : transaction.status === "CANCELLED"
            ? "Dibatalkan"
            : "Pending",
        ]
      );

      // Table headers
      const headers = [
        "No",
        "Tanggal",
        "Tipe",
        "Nomor",
        "Deskripsi",
        "Customer/Kategori",
        "Jumlah",
        "HPP",
        "Status",
      ];

      // Calculate startY position dynamically
      let tableStartY = 40;
      if (filterText) tableStartY += 7;
      if (monthlyStats) tableStartY += 45;

      // Use autoTable function
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: tableStartY,
        theme: "plain",
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 8,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" }, // No
          1: { cellWidth: 18, halign: "center" }, // Tanggal
          2: { cellWidth: 16, halign: "center" }, // Tipe
          3: { cellWidth: 22, halign: "left" }, // Nomor
          4: { cellWidth: 28, halign: "left" }, // Deskripsi
          5: { cellWidth: 22, halign: "left" }, // Customer/Kategori
          6: { cellWidth: 22, halign: "right" }, // Jumlah
          7: { cellWidth: 22, halign: "right" }, // HPP
          8: { cellWidth: 15, halign: "center" }, // Status
        },
        margin: { left: 14, right: 14 },
        tableWidth: "wrap",
        didDrawPage: function (data: { pageNumber: number }) {
          // Footer on each page
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
          doc.text(
            `Halaman ${data.pageNumber}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 15,
            { align: "center" }
          );
        },
      });

      // Save the PDF
      const filename = `detail-transaksi-${currentMonthData.monthName}-${currentMonthData.year}-${filteredAllTransactions.length}-transaksi.pdf`;
      doc.save(filename);

      toast.dismiss(loadingToast);
      toast.success(
        `PDF berhasil diekspor! Total ${filteredAllTransactions.length} transaksi`
      );
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

  // Access control: Only OWNER and KEUANGAN can access financial dashboard
  if (user && user.role !== "OWNER" && user.role !== "KEUANGAN") {
    // Show loading state while redirecting
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Mengalihkan ke dashboard yang sesuai...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Role: {user.role}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Warning Banner */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xl">🔒</span>
          <div className="text-center">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              INFORMASI RAHASIA PERUSAHAAN
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Dashboard ini berisi data keuangan sensitif. Akses terbatas untuk
              Owner & Keuangan.
            </p>
          </div>
          <div className="text-xs text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
            {user.role}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard Utama
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ringkasan Transaksi dan Keuangan CV HM JAYA BERKAH
          </p>
        </div>
      </div>

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
            Export PDF (Semua Data)
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
            linkPath="/"
            disableRowLinks={true}
          />
        )}
      </div>
    </div>
  );
}
