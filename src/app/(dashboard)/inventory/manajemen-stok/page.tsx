// app/inventory/manajemen-stok/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react"; // Essential for JSX
import { formatDate } from "@/utils/formatDate";

const columns = [
  { header: "Kode", accessor: "code" },
  {
    header: "Tanggal Manajemen",
    accessor: "managementDate",
    render: (value: Date) => formatDate(value),
  },
  {
    header: "Tipe",
    accessor: "status",
    cell: (info: { getValue: () => string }) => {
      const value = info.getValue();
      const statusColors = {
        IN: "text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200",
        OUT: "text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200",
      };
      return (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            statusColors[value as keyof typeof statusColors] ||
            "text-gray-500 bg-gray-50"
          }`}
        >
          {value === "IN"
            ? "Adjustment In"
            : value === "OUT"
            ? "Adjustment Out"
            : value}
        </span>
      );
    },
  },
  {
    header: "Dibuat Oleh",
    accessor: "producedBy.name",
  },
  {
    header: "Jumlah Item",
    accessor: "items",
    cell: (info: { getValue: () => any[] }) => {
      const items = info.getValue();
      return items?.length || 0;
    },
  },
  //   {
  //     header: "Total Quantity",
  //     accessor: "items",
  //     cell: (info: { getValue: () => any[] }) => {
  //       const items = info.getValue();
  //       const total =
  //         items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  //       return total.toLocaleString();
  //     },
  //   },
  {
    header: "Catatan",
    accessor: "notes",
    cell: (info: { getValue: () => string }) => {
      const value = info.getValue();
      return value ? (
        <span
          className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs"
          title={value}
        >
          {value.length > 50 ? `${value.substring(0, 50)}...` : value}
        </span>
      ) : (
        <span className="text-gray-400 italic">-</span>
      );
    },
  },
];

const excludedAccessors = ["managementDate", "status", "notes"];

export default function ManajemenStokPage() {
  const data = useSharedData();

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Daftar Manajemen Stok`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementContent
        sampleData={data.data || []}
        columns={columns}
        excludedAccessors={excludedAccessors}
        dateAccessor="managementDate"
        emptyMessage="Belum ada data manajemen stok"
        linkPath={`/${data.module}/${data.subModule}`}
      />
    </div>
  );
}
