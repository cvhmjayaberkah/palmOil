// app/management/pajak/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react"; // Essential for JSX

const columns = [
  { header: "Nominal", accessor: "nominal" },
  { header: "Catatan", accessor: "notes" },
  {
    header: "Tanggal Dibuat",
    accessor: "createdAt",
    cell: (info: { getValue: () => string }) => {
      const value = info.getValue();
      return new Date(value).toLocaleDateString("id-ID");
    },
  },
  {
    header: "Status",
    accessor: "isActive",
    cell: (info: { getValue: () => boolean }) => {
      const isActive = info.getValue();
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {isActive ? "Aktif" : "Tidak Aktif"}
        </span>
      );
    },
  },
];

const excludedAccessors = ["nominal", "notes", "isActive"];

export default function TaxPage() {
  const data = useSharedData();

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Daftar ${data.subModule}`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementContent
        sampleData={data.data || []}
        columns={columns}
        excludedAccessors={excludedAccessors}
        dateAccessor="createdAt"
        emptyMessage="Tidak ada data pajak ditemukan"
        linkPath={`/${data.module}/${data.subModule}`}
      />
    </div>
  );
}
