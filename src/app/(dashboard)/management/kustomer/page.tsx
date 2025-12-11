// app/management/kustomer/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React, { useState, useEffect, useCallback } from "react"; // Essential for JSX
import { formatDate } from "@/utils/formatDate";
import { formatRupiah } from "@/utils/formatRupiah";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui";

const columns = [
  {
    header: "Kode",
    accessor: "code",
    render: (value: string) => value || "-",
  },
  {
    header: "Nama",
    accessor: "name",
    render: (value: string) => value || "-",
  },
  //   {
  //     header: "Email",
  //     accessor: "email",
  //     render: (value: string) => value || "-",
  //   },
  {
    header: "Telepon",
    accessor: "phone",
    render: (value: string) => value || "-",
  },
  //   {
  //     header: "Alamat",
  //     accessor: "address",
  //     render: (value: string) => value || "-",
  //   },
  {
    header: "Kota",
    accessor: "city",
    render: (value: string) => value || "-",
  },
  {
    header: "Status",
    accessor: "isActive",
    render: (value: boolean) => (
      <Badge colorScheme={value ? "green" : "red"}>
        {value ? "Aktif" : "Tidak Aktif"}
      </Badge>
    ),
  },
];

export default function KustomerPage() {
  const data = useSharedData();
  const { user } = useCurrentUser();
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Memoize the status mapping to prevent re-creation on every render
  const statusMapping = React.useMemo(
    () => ({
      true: "Aktif",
      false: "Tidak Aktif",
    }),
    []
  );

  // Initialize filteredData when data changes
  useEffect(() => {
    if (data?.data) {
      setFilteredData(data.data);
    }
  }, [data?.data]);

  // Memoize the callback to prevent infinite re-renders
  const handleFilteredDataChange = useCallback((newFilteredData: any[]) => {
    setFilteredData(newFilteredData);
  }, []);

  // Refresh data manually
  const handleRefresh = useCallback(() => {
    if (data?.refetch) {
      data.refetch();
    }
  }, [data]);

  // Check if user has permission
  const hasPermission =
    user && user.role && data?.allowedRole?.includes(user.role);

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
  if (data?.loading) {
    return (
      <div>
        <ManagementHeader
          allowedRoles={["OWNER", "ADMIN"]}
          mainPageName="/management/kustomer"
          headerTittle="Manajemen Kustomer"
        />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Memuat data customer...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ManagementHeader
        allowedRoles={["OWNER", "ADMIN"]}
        mainPageName="/management/kustomer"
        headerTittle="Manajemen Kustomer"
        onRefresh={handleRefresh}
      />

      <ManagementContent
        sampleData={data?.data || []}
        columns={columns}
        excludedAccessors={["id", "latitude", "longitude", "updatedAt"]}
        dateAccessor="createdAt"
        emptyMessage="Tidak ada data customer ditemukan"
        linkPath="/management/kustomer"
        onFilteredDataChange={handleFilteredDataChange}
        statusMapping={statusMapping}
      />
    </div>
  );
}
