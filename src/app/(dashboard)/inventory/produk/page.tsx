// app/product/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import { formatRupiah } from "@/utils/formatRupiah";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import React from "react"; // Essential for JSX

const excludedAccessors = [""];

export default function ProductPage() {
  const data = useSharedData();
  const { user } = useCurrentUser();

  // Conditional columns based on user role
  const columns = React.useMemo(() => {
    // For WAREHOUSE role, only show Kode, Nama, and Stok
    if (user?.role === "WAREHOUSE") {
      return [
        { header: "Kode", accessor: "code" },
        { header: "Nama", accessor: "name" },
        { header: "Stok", accessor: "currentStock" },
      ];
    }

    // For other roles, show all columns including price
    return [
      { header: "Kode", accessor: "code" },
      { header: "Nama", accessor: "name" },
      {
        header: "Harga",
        accessor: "sellingPrice",
        // Tambahkan fungsi cell untuk memformat harga
        cell: (info: { getValue: () => number }) =>
          formatRupiah(info.getValue()),
      },
      { header: "Min Stok", accessor: "minStock" },
      { header: "Stok", accessor: "currentStock" },
    ];
  }, [user?.role]);

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
        emptyMessage="Tidak ada produk ditemukan"
        linkPath={`/${data.module}/${data.subModule}`}
      />
    </div>
  );
}
