"use client";

import { ManagementContent, ManagementHeader } from "@/components/ui";
import { formatRupiah } from "@/utils/formatRupiah";
import { Card, Badge } from "@/components/ui/common";
import { MonthFilter } from "@/components/ui/MonthFilter";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTransactions,
  getExpenseStatisticsByMonth,
  getAllTimeExpenseStatistics,
  deleteTransaction,
} from "@/lib/actions/transactions";
import {
  Plus, Edit, Trash2, TrendingUp, Calendar, DollarSign, Download,
} from "lucide-react";
import { Button } from "@/components/ui/common";
import { toast } from "sonner";

interface ExpenseData {
  id: string;
  transactionDate: string;
  description: string;
  category: string;
  amount: number;
  reference: string | null;
  userName: string;
  itemCount: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // State for month filter
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number | null>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentDate.getMonth() + 1);

  const loadData = async (year: number | null, month: number | null) => {
    try {
      setLoading(true);
      
      let expensesResult, statsResult;
      
      if (year === null || month === null) {
        // All time data
        const [allExpenses, allStats] = await Promise.all([
          getTransactions({ type: "EXPENSE" }),
          getAllTimeExpenseStatistics(),
        ]);
        expensesResult = allExpenses;
        statsResult = allStats;
      } else {
        // Specific month data
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        
        const [monthExpenses, monthStats] = await Promise.all([
          getTransactions({ 
            type: "EXPENSE",
            startDate: startOfMonth,
            endDate: endOfMonth 
          }),
          getExpenseStatisticsByMonth(year, month),
        ]);
        expensesResult = monthExpenses;
        statsResult = monthStats;
      }

      if (expensesResult.success) {
        setExpenses(expensesResult.data);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const handleMonthChange = (year: number | null, month: number | null) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengeluaran ini?")) return;

    try {
      const result = await deleteTransaction(id);
      if (result.success) {
        toast.success("Pengeluaran berhasil dihapus");
        // Reload data with current filter
        loadData(selectedYear, selectedMonth);
      } else {
        toast.error("Gagal menghapus pengeluaran");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Terjadi kesalahan saat menghapus data");
    }
  };

  // PDF Export function
  const exportToPDF = async () => {
    if (transformedData.length === 0) {
      toast.error("Tidak ada data untuk di-export");
      return;
    }

    try {
      // Import jsPDF and autoTable
      const { default: jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = autoTableModule.default;
      
      // Create new jsPDF instance
      const doc = new jsPDF();
      
      // Set title
      const title = "Laporan Pengeluaran";
      const subtitle = `Periode: ${selectedMonth ? `${selectedMonth}/${selectedYear}` : selectedYear || 'Semua'}`;
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 22);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 14, 32);
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 42);

      // Summary Statistics
      if (stats) {
        const summaryData = [
          ['Total Pengeluaran', formatRupiah(stats.totalAmount)],
          ['Total Transaksi', `${stats.totalCount} transaksi`],
          ['Rata-rata per Transaksi', formatRupiah(stats.averageAmount)],
          ['Kategori Terbanyak', stats.categoryBreakdown.length > 0 ? stats.categoryBreakdown[0].category : '-'],
        ];

        autoTable(doc, {
          startY: 55,
          head: [['Ringkasan', 'Nilai']],
          body: summaryData,
          theme: 'plain',
          headStyles: { 
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
          },
          styles: { 
            fontSize: 9,
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
          },
          columnStyles: {
            0: { cellWidth: 70, halign: 'left' },
            1: { cellWidth: 70, halign: 'right' }
          }
        });
      }

      // Detail Table
      const tableColumns = [
        'No',
        'Tanggal',
        'Deskripsi',
        'Kategori',
        'Jumlah'
      ];

      const tableRows = transformedData.map((item, index) => [
        (index + 1).toString(),
        new Date(item.transactionDate).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        }),
        item.description.length > 30 ? item.description.substring(0, 30) + '...' : item.description,
        item.category,
        formatRupiah(item.amount).replace('Rp ', '')
      ]);

      autoTable(doc, {
        startY: stats ? 120 : 55,
        head: [tableColumns],
        body: tableRows,
        theme: 'plain',
        headStyles: { 
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.5,
          lineColor: [0, 0, 0]
        },
        styles: { 
          fontSize: 8,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 70, halign: 'left' },
          3: { cellWidth: 35, halign: 'left' },
          4: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'wrap'
      });

      // Save the PDF
      const fileName = `Laporan_Pengeluaran_${selectedMonth ? `${selectedMonth}_${selectedYear}` : selectedYear || 'Semua'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF berhasil diunduh");
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Gagal mengunduh PDF: ${errorMessage}`);
    }
  };

  // Transform data for ManagementContent
  const transformedData: ExpenseData[] = expenses.map((expense) => ({
    id: expense.id,
    transactionDate: new Date(expense.transactionDate).toISOString().split('T')[0],
    description: expense.description,
    category: expense.category,
    amount: expense.amount,
    reference: expense.reference,
    userName: expense.user?.name || "-",
    itemCount: expense.transactionItems?.length || 0,
  }));

  const myStaticData = {
    module: "management/finance",
    subModule: "expenses",
    allowedRole: ["OWNER", "ADMIN"],
    data: transformedData,
  };

  // Define columns for the table
  const columns = [
    {
      header: "Tanggal",
      accessor: "transactionDate",
      render: (value: string) => new Date(value).toLocaleDateString('id-ID'),
    },
    {
      header: "Deskripsi",
      accessor: "description",
      render: (value: string, row: ExpenseData) => (
        <div>
          <div className="max-w-xs truncate">{value}</div>
          {row.itemCount > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {row.itemCount} item(s)
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Kategori",
      accessor: "category",
      render: (value: string) => <Badge colorScheme="gray">{value}</Badge>,
    },
    {
      header: "Jumlah",
      accessor: "amount",
      render: (value: number) => (
        <span className="font-medium text-red-600">{formatRupiah(value)}</span>
      ),
    },
    {
      header: "Referensi",
      accessor: "reference",
      render: (value: string | null) => value || "-",
    },
    {
      header: "Aksi",
      accessor: "id",
      render: (value: string) => (
        <div className="flex items-center justify-end space-x-2">
          <Link href={`/management/finance/expenses/edit/${value}`}>
            <Button variant="outline" size="small">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button 
            onClick={() => handleDelete(value)}
            variant="outline" 
            size="small"
            className="text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const excludedAccessors = ["itemCount", "userName"];

  if (loading) {
    return (
      <div className="space-y-6">
        <ManagementHeader
          allowedRoles={["OWNER", "ADMIN"]}
          mainPageName="finance/expenses"
          headerTittle="Manajemen Pengeluaran"
        />
        <Card className="p-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Memuat data...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ManagementHeader
        allowedRoles={["OWNER", "ADMIN"]}
        mainPageName="finance/expenses"
        headerTittle="Manajemen Pengeluaran"
      />

      {/* Month Filter */}
      <Card className="p-4">
        <MonthFilter
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          className="justify-center"
        />
      </Card>

      {/* Month Indicator */}
      {stats && (
        <Card className="p-4">
          <div className="flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Data Pengeluaran - {stats.monthName}
            </h2>
          </div>
        </Card>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatRupiah(stats.totalAmount)}
                </p>
                <p className="text-sm text-gray-500">{stats.totalCount} transaksi</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCount}</p>
                <p className="text-sm text-gray-500">transaksi pada periode ini</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rata-rata Pengeluaran</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatRupiah(stats.averageAmount)}
                </p>
                <p className="text-sm text-gray-500">per transaksi</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Kategori Terbanyak</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.categoryBreakdown.length > 0 ? stats.categoryBreakdown[0].category : "-"}
                </p>
                <p className="text-sm text-gray-500">
                  {stats.categoryBreakdown.length > 0 ? 
                    `${formatRupiah(stats.categoryBreakdown[0].amount)}` : 
                    "Tidak ada data"
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Button */}
      <div className="flex justify-end gap-3">
        <Button 
          onClick={exportToPDF}
          disabled={transformedData.length === 0}
          variant="outline"
          className="disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Link href="/management/finance/expenses/create">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pengeluaran
          </Button>
        </Link>
      </div>

      {/* Main Content Table */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementContent
          sampleData={transformedData}
          columns={columns}
          excludedAccessors={excludedAccessors}
          dateAccessor="transactionDate"
          emptyMessage="Belum ada data pengeluaran"
          linkPath="/management/finance/expenses"
        />
      </div>

      {/* Category Breakdown */}
      {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Breakdown Kategori - {stats.monthName}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.categoryBreakdown.map((category: any) => (
              <div key={category.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{category.category}</p>
                  <p className="text-sm text-gray-600">{category.count} transaksi</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-600">{formatRupiah(category.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {((category.amount / stats.totalAmount) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
