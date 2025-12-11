// app/purchasing/pengeluaran/page.tsx
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
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Calendar,
  DollarSign,
  Download,
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

const columns = [
  {
    header: "Tanggal",
    accessor: "transactionDate",
    render: (value: string) => new Date(value).toLocaleDateString("id-ID"),
  },
  {
    header: "Deskripsi",
    accessor: "description",
  },
  {
    header: "Kategori",
    accessor: "category",
  },
  {
    header: "Jumlah",
    accessor: "amount",
    render: (value: number) => formatRupiah(value),
  },
  {
    header: "Referensi",
    accessor: "reference",
    render: (value: string | null) => value || "-",
  },
  {
    header: "User",
    accessor: "userName",
    render: (value: string) => value || "-",
  },
];

const excludedAccessors = [
  "transactionDate",
  "category",
  "reference",
  "userName",
];

export default function ExpensePage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State for month filter
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number | null>(
    currentDate.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    currentDate.getMonth() + 1
  );

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
            endDate: endOfMonth,
          }),
          getExpenseStatisticsByMonth(year, month),
        ]);
        expensesResult = monthExpenses;
        statsResult = monthStats;
      }

      if (expensesResult.success) {
        // Transform data to match the expected format
        const transformedData = expensesResult.data.map((transaction: any) => ({
          id: transaction.id,
          transactionDate: transaction.transactionDate,
          description: transaction.description,
          category: transaction.category,
          amount: transaction.amount,
          reference: transaction.reference,
          userName: transaction.user?.name || "",
          itemCount: transaction.transactionItems?.length || 0,
        }));
        setExpenses(transformedData);
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
        loadData(selectedYear, selectedMonth); // Reload data
      } else {
        toast.error(result.error || "Gagal menghapus pengeluaran");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Terjadi kesalahan saat menghapus pengeluaran");
    }
  };

  // Add safety checks for data
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="">
      <ManagementHeader
        headerTittle="Daftar Pengeluaran"
        mainPageName="/purchasing/pengeluaran"
        allowedRoles={["OWNER", "ADMIN"]}
      />

      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementContent
          sampleData={expenses}
          columns={columns}
          excludedAccessors={excludedAccessors}
          dateAccessor="transactionDate"
          emptyMessage="Belum ada data pengeluaran"
          linkPath="/purchasing/pengeluaran"
        />
      </div>
    </div>
  );
}
