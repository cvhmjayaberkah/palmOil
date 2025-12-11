// app/(dashboard)/sales/invoice-cancellation/page.tsx
"use client";
import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react";
import { formatDate } from "@/utils/formatDate";
import { formatRupiah } from "@/utils/formatRupiah";
import Link from "next/link";

const columns = [
  { header: "Kode Invoice", accessor: "code" },
  {
    header: "Customer",
    accessor: "customer",
    render: (value: any) => value?.name || "Tidak ada Customer",
  },
  {
    header: "Tanggal Invoice",
    accessor: "invoiceDate",
    render: (value: Date) => formatDate(value),
  },
  {
    header: "Jatuh Tempo",
    accessor: "dueDate",
    render: (value: Date | null) => (value ? formatDate(value) : "-"),
  },
  {
    header: "Total",
    accessor: "totalAmount",
    cell: (info: { getValue: () => number }) => formatRupiah(info.getValue()),
  },
  {
    header: "Terbayar",
    accessor: "paidAmount",
    cell: (info: { getValue: () => number }) => formatRupiah(info.getValue()),
  },
  {
    header: "Sisa",
    accessor: "remainingAmount",
    cell: (info: { getValue: () => number }) => formatRupiah(info.getValue()),
  },
  {
    header: "Status Invoice",
    accessor: "status",
    cell: (info: { getValue: () => string }) => {
      const value = info.getValue();
      const statusColors = {
        DRAFT: "text-gray-600 bg-gray-50 dark:bg-gray-900/20",
        PENDING: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
        SENT: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
        PAID: "text-green-600 bg-green-50 dark:bg-green-900/20",
        COMPLETED: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
        CANCELED: "text-red-600 bg-red-50 dark:bg-red-900/20",
      };

      const statusLabels = {
        DRAFT: "Draft",
        PENDING: "Pending",
        SENT: "Terkirim",
        PAID: "Terbayar",
        COMPLETED: "Selesai",
        CANCELED: "Dibatalkan",
      };

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[value as keyof typeof statusColors] ||
            "text-gray-500 bg-gray-50"
          }`}
        >
          {statusLabels[value as keyof typeof statusLabels] || value}
        </span>
      );
    },
  },
  {
    header: "Status Pembayaran",
    accessor: "paymentStatus",
    cell: (info: { getValue: () => string }) => {
      const value = info.getValue();
      const statusColors = {
        UNPAID: "text-red-600 bg-red-50 dark:bg-red-900/20",
        PAID: "text-green-600 bg-green-50 dark:bg-green-900/20",
      };

      const statusLabels = {
        UNPAID: "Belum Bayar",
        PAID: "Lunas",
      };

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[value as keyof typeof statusColors] ||
            "text-gray-500 bg-gray-50"
          }`}
        >
          {statusLabels[value as keyof typeof statusLabels] || value}
        </span>
      );
    },
  },
  {
    header: "Aksi",
    accessor: "id",
    render: (value: string, row: any) => (
      <Link
        href={`/sales/invoice-cancellation/edit/${value}`}
        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
      >
        Batalkan
      </Link>
    ),
  },
];

export default function InvoiceCancellationPage() {
  const data = useSharedData();

  // Add safety checks for data
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Pembatalan Invoice"
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
        isAddHidden={true}
      />

      <ManagementContent
        sampleData={data.data || []}
        columns={columns}
        excludedAccessors={["notes", "customerId"]}
        dateAccessor="invoiceDate"
        emptyMessage="Tidak ada invoice yang dapat dibatalkan"
        linkPath={`/${data.module}/${data.subModule}`}
      />
    </div>
  );
}
