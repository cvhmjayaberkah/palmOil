"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react"; // Essential for JSX
import { formatDate } from "@/utils/formatDate";

const columns = [
  { header: "No. Surat Jalan", accessor: "code" },
  {
    header: "No. Invoice",
    accessor: "invoices.code",
  },
  {
    header: "Tanggal Kirim",
    accessor: "deliveryDate",
    render: (value: Date) => formatDate(value),
  },
  {
    header: "Customer",
    accessor: "customers.name",
  },
  {
    header: "Driver",
    accessor: "driverName",
  },
  {
    header: "Kendaraan",
    accessor: "vehicleNumber",
  },
];

const excludedAccessors = ["deliveryDate", "status", "notes"];

export default function SuratJalanPage() {
  const data = useSharedData();

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Daftar Surat Jalan`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementContent
        sampleData={data.data || []}
        columns={columns}
        excludedAccessors={excludedAccessors}
        dateAccessor="deliveryDate"
        emptyMessage="Belum ada data surat jalan"
        linkPath={`/${data.module}/${data.subModule}`}
      />
    </div>
  );
}
