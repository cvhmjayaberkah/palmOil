"use client";

import { useMemo, useCallback } from "react";
import { useSharedData } from "@/contexts/StaticData";
import { InvoiceTransactionHistoryItem } from "@/lib/actions/invoice-transaction-history";
import { ManagementContent, ManagementHeader } from "@/components/ui";
import { Badge } from "@/components/ui/common";
import { formatRupiah } from "@/utils/formatRupiah";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function TransactionHistoryClient() {
  const sharedData = useSharedData();
  const { user } = useCurrentUser();
  const transactions: InvoiceTransactionHistoryItem[] = sharedData?.data || [];

  // Refresh data manually
  const handleRefresh = useCallback(() => {
    if (sharedData?.refetch) {
      sharedData.refetch();
    }
  }, [sharedData]);

  // Kolom untuk table sesuai spesifikasi: nama toko, telepon, alamat, sales, status pembayaran
  const columns = [
    {
      header: "Invoice",
      accessor: "invoiceCode",
      render: (value: string, row: InvoiceTransactionHistoryItem) => (
        <div>
          <Link
            href={`/sales/invoice/edit/${row.id}`}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {value}
          </Link>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(row.invoiceDate).toLocaleDateString("id-ID")}
          </div>
        </div>
      ),
    },
    {
      header: "Nama Customer",
      accessor: "customerName",
      render: (value: string) => (
        <div className="font-medium text-sm">{value}</div>
      ),
    },
    {
      header: "No. Telepon",
      accessor: "customerPhone",
      render: (value: string | null) => (
        <div className="text-sm">
          {value || <span className="text-gray-400 italic">-</span>}
        </div>
      ),
    },
    {
      header: "Alamat Toko",
      accessor: "customerAddress",
      render: (value: string) => (
        <div className="text-sm max-w-xs truncate" title={value}>
          {value}
        </div>
      ),
    },
    {
      header: "Nama Sales",
      accessor: "salesName",
      render: (value: string) => (
        <div className="font-medium text-sm">{value}</div>
      ),
    },
    {
      header: "Status Pembayaran",
      accessor: "paymentStatus",
      render: (value: string, row: InvoiceTransactionHistoryItem) => {
        const paymentStatus = row.paymentStatus;
        const dueDate = row.dueDate;

        // Hitung NET days jika ada due date
        let termLabel = "Lunas";
        if (paymentStatus !== "PAID" && dueDate) {
          const invoiceDate = new Date(row.invoiceDate);
          const dueDateObj = new Date(dueDate);
          const diffDays = Math.ceil(
            (dueDateObj.getTime() - invoiceDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (diffDays === 7) {
            termLabel = "NET 7";
          } else if (diffDays === 14) {
            termLabel = "NET 14";
          } else {
            termLabel = `NET ${diffDays}`;
          }
        }

        const statusLabels: Record<string, string> = {
          UNPAID: termLabel === "Lunas" ? "Belum Dibayar" : termLabel,
          PAID: "Lunas",
          OVERPAID: "Kelebihan Bayar",
        };

        const getColorScheme = (
          status: string
        ): "gray" | "blue" | "yellow" | "green" | "red" => {
          if (status === "PAID") return "green";
          if (status === "UNPAID") return "red";
          if (status === "OVERPAID") return "blue";
          return "gray";
        };

        return (
          <div>
            <Badge colorScheme={getColorScheme(paymentStatus)}>
              {statusLabels[paymentStatus] || paymentStatus}
            </Badge>
            <div className="text-xs text-gray-500 mt-1">
              {row.paidAmount > 0
                ? `Dibayar: ${formatRupiah(row.paidAmount)}`
                : "Belum ada pembayaran"}
            </div>
          </div>
        );
      },
    },
  ];

  // Kolom yang tidak digunakan untuk filter
  const excludedAccessors = ["paymentStatus", "customerCode"];

  // Format data untuk kompatibilitas dengan ManagementContent
  const formattedData = useMemo(() => {
    return transactions.map((transaction: InvoiceTransactionHistoryItem) => ({
      ...transaction,
      customerPhone: transaction.customerPhone || null,
      customerAddress: transaction.customerAddress || "",
      paymentStatus: transaction.paymentStatus || null,
    }));
  }, [transactions]);

  // Check if user has permission
  const hasPermission =
    user && user.role && sharedData?.allowedRole?.includes(user.role);

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">
          Anda tidak memiliki akses ke halaman ini.
        </p>
      </div>
    );
  }

  // Show loading state
  if (sharedData?.loading) {
    return (
      <div>
        <ManagementHeader
          allowedRoles={["OWNER", "ADMIN"]}
          mainPageName="/purchasing/transaction-history"
          headerTittle="Riwayat Transaksi"
          isAddHidden={true}
          onRefresh={handleRefresh}
        />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Memuat data transaksi...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ManagementHeader
        allowedRoles={["OWNER", "ADMIN"]}
        mainPageName="/purchasing/transaction-history"
        headerTittle="Riwayat Transaksi"
        isAddHidden={true}
        onRefresh={handleRefresh}
      />

      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementContent
          sampleData={formattedData}
          columns={columns}
          excludedAccessors={excludedAccessors}
          dateAccessor="invoiceDate"
          emptyMessage="Belum ada data transaksi"
          linkPath="/sales/invoice/edit"
          disableRowLinks={true}
        />
      </div>
    </div>
  );
}
