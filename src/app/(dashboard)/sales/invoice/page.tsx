// app/sales/invoice/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react"; // Essential for JSX
import { formatDate } from "@/utils/formatDate";
import { formatRupiah } from "@/utils/formatRupiah";
import { INVOICE_STATUS_MAPPING } from "@/lib/constants/statusMappings";

const columns = [
  { header: "Kode", accessor: "code" },
  {
    header: "Tanggal Invoice",
    accessor: "invoiceDate",
    render: (value: Date) => formatDate(value),
  },
  {
    header: "Net",
    accessor: "dueDate",
    render: (value: Date | null) =>
      value ? formatDate(value) : "Bayar langsung",
  },
  {
    header: "Customer",
    accessor: "customer.name",
  },
  {
    header: "Total Pembayaran",
    accessor: "totalAmount",
    render: (value: number) => formatRupiah(value),
  },
  {
    header: "Status",
    accessor: "status",
    cell: (info: { getValue: () => string }) => {
      const value = info.getValue();
      const statusColors = {
        DRAFT: "text-gray-500 bg-gray-50 dark:bg-gray-900/20",
        SENT: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
        DELIVERED: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
        PAID: "text-green-500 bg-green-50 dark:bg-green-900/20",
        COMPLETED: "text-green-600 bg-green-100 dark:bg-green-900/30",
        OVERDUE: "text-red-500 bg-red-50 dark:bg-red-900/20",
        CANCELLED: "text-red-500 bg-red-50 dark:bg-red-900/20",
        RETURNED: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
      };
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[value as keyof typeof statusColors] ||
            "text-gray-500 bg-gray-50"
          }`}
        >
          {value === "DRAFT"
            ? "Draft"
            : value === "SENT"
            ? "Tercetak"
            : value === "DELIVERED"
            ? "Dikirim"
            : value === "PAID"
            ? "Dibayar"
            : value === "COMPLETED"
            ? "Selesai"
            : value === "OVERDUE"
            ? "Jatuh Tempo"
            : value === "CANCELLED"
            ? "Dibatalkan"
            : value === "RETURNED"
            ? "Dikembalikan"
            : value}
        </span>
      );
    },
  },
];

const excludedAccessors = [
  "invoiceDate",
  "dueDate",
  "notes",
  "totalAmount",
  "status",
];

// Status filter options for Invoice
const invoiceStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Tercetak" },
  { value: "DELIVERED", label: "Dikirim" },
  { value: "PAID", label: "Dibayar" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
  { value: "RETURNED", label: "Dikembalikan" },
];

export default function InvoicePage() {
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
        headerTittle={`Daftar Invoice`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementContent
        sampleData={data.data || []}
        columns={columns}
        excludedAccessors={excludedAccessors}
        dateAccessor="invoiceDate"
        emptyMessage="Belum ada data invoice"
        linkPath={`/${data.module}/${data.subModule}`}
        statusMapping={INVOICE_STATUS_MAPPING}
        statusFilterOptions={invoiceStatusOptions}
        statusFilterField="status"
      />
    </div>
  );
}
