"use client";

import { ManagementContent, ManagementHeader } from "@/components/ui";
import { formatRupiah } from "@/utils/formatRupiah";
import { Card, Badge } from "@/components/ui/common";
import { MonthFilter } from "@/components/ui/MonthFilter";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Eye,
  DollarSign,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/common";
import { toast } from "sonner";

interface ReceivableData {
  id: string;
  code: string;
  customerName: string;
  customerCode: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "UNPAID" | "PAID";
  daysOverdue: number;
  category: "CURRENT" | "OVERDUE_1_30" | "OVERDUE_31_60" | "OVERDUE_60_PLUS";
}

interface ReceivableStats {
  totalReceivables: number;
  totalAmount: number;
  currentAmount: number;
  overdue1To30Amount: number;
  overdue31To60Amount: number;
  overdue60PlusAmount: number;
  averageDaysOverdue: number;
}

export default function PiutangPage() {
  const [receivables, setReceivables] = useState<ReceivableData[]>([]);
  const [stats, setStats] = useState<ReceivableStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    new Date().getMonth() + 1
  );
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // PDF Export function
  const exportToPDF = async () => {
    try {
      // Import jsPDF first
      const { default: jsPDF } = await import("jspdf");

      // Import autoTable plugin - this extends jsPDF prototype
      const autoTableModule = await import("jspdf-autotable");

      // Create new jsPDF instance AFTER importing autoTable
      const doc = new jsPDF();

      // Alternative approach: use autoTable from the imported module
      const autoTable = autoTableModule.default;

      // Set title
      const title = "Laporan Piutang Usaha";
      const subtitle = `Periode: ${
        selectedMonth
          ? `${selectedMonth}/${selectedYear}`
          : selectedYear || "Semua"
      }`;

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, 22);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(subtitle, 14, 32);
      doc.text(
        `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`,
        14,
        42
      );

      // Summary Statistics
      if (stats) {
        const summaryData = [
          ["Total Piutang", `${stats.totalReceivables} invoice`],
          ["Total Nominal", formatRupiah(stats.totalAmount)],
          ["Piutang Lancar", formatRupiah(stats.currentAmount)],
          ["Terlambat 1-30 hari", formatRupiah(stats.overdue1To30Amount)],
          ["Terlambat 31-60 hari", formatRupiah(stats.overdue31To60Amount)],
          ["Terlambat 60+ hari", formatRupiah(stats.overdue60PlusAmount)],
          [
            "Rata-rata Hari Terlambat",
            `${stats.averageDaysOverdue.toFixed(1)} hari`,
          ],
        ];

        // Use autoTable function directly
        autoTable(doc, {
          startY: 55,
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

      // Detail Table - Simplified columns
      const tableColumns = [
        "No",
        "Kode",
        "Customer",
        "Tgl Invoice",
        "Jatuh Tempo",
        "Total",
        "Sisa",
        "Status",
      ];

      const tableRows = receivables.map((item, index) => [
        (index + 1).toString(),
        item.code,
        item.customerName.length > 15
          ? item.customerName.substring(0, 15) + "..."
          : item.customerName,
        new Date(item.invoiceDate).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
        item.dueDate
          ? new Date(item.dueDate).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })
          : "-",
        formatRupiah(item.totalAmount).replace("Rp ", ""),
        formatRupiah(item.remainingAmount).replace("Rp ", ""),
        item.paymentStatus === "UNPAID"
          ? "Belum Bayar"
          : item.paymentStatus === "PAID"
          ? "Lunas"
          : "Belum Lunas",
      ]);

      // Use autoTable function directly
      autoTable(doc, {
        startY: stats ? 120 : 55,
        head: [tableColumns],
        body: tableRows,
        theme: "plain",
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
        },
        styles: {
          fontSize: 7,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 25, halign: "left" },
          2: { cellWidth: 30, halign: "left" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 30, halign: "right" },
          6: { cellWidth: 30, halign: "right" },
          7: { cellWidth: 22, halign: "center" },
        },
        margin: { left: 14, right: 14 },
        tableWidth: "wrap",
      });

      // Save the PDF
      const fileName = `Laporan_Piutang_${
        selectedMonth
          ? `${selectedMonth}_${selectedYear}`
          : selectedYear || "Semua"
      }_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      toast.success("PDF berhasil diunduh");
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Gagal mengunduh PDF: ${errorMessage}`);
    }
  };

  const loadData = async (year: number | null, month: number | null) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (year) params.append("year", year.toString());
      if (month) params.append("month", month.toString());
      if (filterCategory !== "ALL") params.append("category", filterCategory);

      const response = await fetch(
        `/api/finance/receivables?${params.toString()}`
      );
      const result = await response.json();

      if (result.success) {
        setReceivables(result.data.receivables || []);
        setStats(result.data.stats || null);
      } else {
        toast.error("Gagal memuat data piutang");
        setReceivables([]);
        setStats(null);
      }
    } catch (error) {
      console.error("Error loading receivables:", error);
      toast.error("Terjadi kesalahan saat memuat data");
      setReceivables([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, filterCategory]);

  const handleMonthChange = (year: number | null, month: number | null) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "CURRENT":
        return <Badge colorScheme="green">Lancar</Badge>;
      case "OVERDUE_1_30":
        return <Badge colorScheme="yellow">Terlambat 1-30 hari</Badge>;
      case "OVERDUE_31_60":
        return <Badge colorScheme="red">Terlambat 31-60 hari</Badge>;
      case "OVERDUE_60_PLUS":
        return <Badge colorScheme="red">Terlambat 60+ hari</Badge>;
      default:
        return <Badge colorScheme="gray">-</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge colorScheme="green">Lunas</Badge>;
      case "PARTIALLY_PAID":
        return <Badge colorScheme="yellow">Dibayar Sebagian</Badge>;
      case "UNPAID":
        return <Badge colorScheme="red">Belum Dibayar</Badge>;
      default:
        return <Badge colorScheme="gray">-</Badge>;
    }
  };

  // Transform data for ManagementContent
  const transformedData: ReceivableData[] = receivables;

  // Define columns for the table
  const columns = [
    {
      header: "Invoice",
      accessor: "code",
      render: (value: string, row: ReceivableData) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.customerName}</div>
        </div>
      ),
    },
    {
      header: "Tanggal Invoice",
      accessor: "invoiceDate",
      render: (value: string) => new Date(value).toLocaleDateString("id-ID"),
    },
    {
      header: "Jatuh Tempo",
      accessor: "dueDate",
      render: (value: string | null, row: ReceivableData) => (
        <div>
          <div>{value ? new Date(value).toLocaleDateString("id-ID") : "-"}</div>
          {row.daysOverdue > 0 && (
            <div className="text-xs text-red-600">
              Terlambat {row.daysOverdue} hari
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Total Invoice",
      accessor: "totalAmount",
      render: (value: number) => (
        <span className="font-medium">{formatRupiah(value)}</span>
      ),
    },
    {
      header: "Sudah Dibayar",
      accessor: "paidAmount",
      render: (value: number) => (
        <span className="text-green-600">{formatRupiah(value)}</span>
      ),
    },
    {
      header: "Sisa Piutang",
      accessor: "remainingAmount",
      render: (value: number) => (
        <span className="font-medium text-red-600">{formatRupiah(value)}</span>
      ),
    },
    {
      header: "Status Pembayaran",
      accessor: "paymentStatus",
      render: (value: string) => getPaymentStatusBadge(value),
    },
    {
      header: "Kategori",
      accessor: "category",
      render: (value: string) => getCategoryBadge(value),
    },
    {
      header: "Aksi",
      accessor: "id",
      render: (value: string) => (
        <div className="flex items-center justify-end space-x-2">
          <Link href={`/sales/invoice/edit/${value}`}>
            <Button variant="outline" size="small">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const excludedAccessors = ["customerCode", "daysOverdue"];

  if (loading) {
    return (
      <div className="space-y-6">
        <ManagementHeader
          allowedRoles={["OWNER", "ADMIN"]}
          mainPageName="management/finance/piutang"
          headerTittle="Manajemen Piutang"
        />
        <div className="text-center py-8">Memuat data piutang...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ManagementHeader
        allowedRoles={["OWNER", "ADMIN"]}
        mainPageName="management/finance/piutang"
        headerTittle="Manajemen Piutang"
      />

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Piutang
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatRupiah(stats.totalAmount)}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.totalReceivables} invoice
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Lancar
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatRupiah(stats.currentAmount)}
                </p>
                <p className="text-xs text-gray-500">Belum jatuh tempo</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Terlambat 1-30 hari
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatRupiah(stats.overdue1To30Amount)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Terlambat 60+ hari
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatRupiah(stats.overdue60PlusAmount)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <MonthFilter
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="CURRENT">Lancar</option>
            <option value="OVERDUE_1_30">Terlambat 1-30 hari</option>
            <option value="OVERDUE_31_60">Terlambat 31-60 hari</option>
            <option value="OVERDUE_60_PLUS">Terlambat 60+ hari</option>
          </select>
        </div>

        {/* Export Button */}
        <div className="flex gap-2">
          <Button
            onClick={exportToPDF}
            variant="outline"
            size="medium"
            disabled={loading || receivables.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementContent
          sampleData={transformedData}
          columns={columns}
          excludedAccessors={excludedAccessors}
          dateAccessor="invoiceDate"
          emptyMessage="Belum ada data piutang"
          linkPath="/management/finance/piutang"
          disableRowLinks={true}
        />
      </div>

      {/* Detailed Information Section */}
      {stats && receivables.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary Details */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ringkasan Detail
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Invoice
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.totalReceivables}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Rata-rata Terlambat
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.averageDaysOverdue.toFixed(1)} hari
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Total Piutang:
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatRupiah(stats.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Piutang Lancar:
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatRupiah(stats.currentAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Terlambat 1-30 hari:
                  </span>
                  <span className="font-semibold text-yellow-600">
                    {formatRupiah(stats.overdue1To30Amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Terlambat 31-60 hari:
                  </span>
                  <span className="font-semibold text-orange-600">
                    {formatRupiah(stats.overdue31To60Amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Terlambat 60+ hari:
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatRupiah(stats.overdue60PlusAmount)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Analisis Kategori
              </h3>
            </div>

            <div className="space-y-4">
              {/* Category percentages */}
              {stats.totalAmount > 0 && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Lancar
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {(
                            (stats.currentAmount / stats.totalAmount) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatRupiah(stats.currentAmount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Terlambat 1-30
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {(
                            (stats.overdue1To30Amount / stats.totalAmount) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatRupiah(stats.overdue1To30Amount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Terlambat 31-60
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {(
                            (stats.overdue31To60Amount / stats.totalAmount) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatRupiah(stats.overdue31To60Amount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Terlambat 60+
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {(
                            (stats.overdue60PlusAmount / stats.totalAmount) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatRupiah(stats.overdue60PlusAmount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Penilaian Risiko
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {(() => {
                        const overduePercentage =
                          ((stats.overdue31To60Amount +
                            stats.overdue60PlusAmount) /
                            stats.totalAmount) *
                          100;
                        if (overduePercentage < 10) {
                          return (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>
                                Risiko Rendah - Mayoritas piutang dalam kondisi
                                baik
                              </span>
                            </div>
                          );
                        } else if (overduePercentage < 25) {
                          return (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-500" />
                              <span>
                                Risiko Sedang - Perlu monitoring lebih ketat
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span>
                                Risiko Tinggi - Tindakan segera diperlukan
                              </span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Footer Information */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              Keterangan Piutang
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Data piutang menampilkan semua invoice yang belum dibayar penuh.
              Kategori ditentukan berdasarkan selisih tanggal jatuh tempo dengan
              tanggal hari ini.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              Terakhir diperbarui: {new Date().toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-gray-500">
              Periode:{" "}
              {selectedMonth
                ? `${selectedMonth}/${selectedYear}`
                : selectedYear || "Semua Data"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
