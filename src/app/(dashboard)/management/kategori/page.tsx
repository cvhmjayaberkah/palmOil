// app/category/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react"; // Essential for JSX

const columns = [
  { header: "Kode", accessor: "code" },
  { header: "Nama", accessor: "name" },
  { header: "Deskripsi", accessor: "description" },
  {
    header: "Status",
    accessor: "isActive",
    // Gunakan 'cell' untuk status
    cell: (info: { getValue: () => boolean }) => {
      const value = info.getValue();
      return (
        <span className={value ? "text-green-500" : "text-red-500"}>
          {value ? "Aktif" : "Tidak Aktif"}
        </span>
      );
    },
  },
  { header: "Jumlah Produk", accessor: "_count.products" },
  // Anda juga bisa memindahkan logikanya ke 'render' atau 'cell' di sini.
  // Contoh:
  // {
  //   header: "Tanggal Dibuat",
  //   accessor: "createdAt",
  //   render: (value: Date) => formatDate(value),
  // },
];

const excludedAccessors = ["name", "description", "isActive"];

export default function CategoryPage() {
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
        emptyMessage="Tidak ada kategori ditemukan"
        linkPath={`/${data.module}/${data.subModule}`}
      />
    </div>
  );
}
