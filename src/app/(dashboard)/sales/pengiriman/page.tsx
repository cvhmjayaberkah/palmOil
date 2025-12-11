"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react"; // Essential for JSX
import { formatDate } from "@/utils/formatDate";
import { Badge } from "@/components/ui/common";
import { DELIVERY_STATUS_MAPPING } from "@/lib/constants/statusMappings";

const columns = [
  { header: "Kode Pengiriman", accessor: "code" },
  {
    header: "No. Invoice",
    accessor: "invoice.code",
    searchAccessor: "invoice.code", // Explicitly enable search for nested accessor
  },
  {
    header: "Kustomer",
    accessor: "invoice.customer.name",
    searchAccessor: "invoice.customer.name", // Explicitly enable search for nested accessor
  },
  {
    header: "Total",
    accessor: "invoice.totalAmount",
    render: (value: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(value),
  },
  // {
  //   header: "Tanggal Pengiriman",
  //   accessor: "deliveryDate",
  //   render: (value: Date) => formatDate(value),
  // },
  {
    header: "Status",
    accessor: "status",
    render: (value: string) => {
      const statusLabels = {
        PENDING: "Menunggu",
        IN_TRANSIT: "Dalam Perjalanan",
        DELIVERED: "Terkirim",
        RETURNED: "Dikembalikan",
        CANCELLED: "Dibatalkan",
      };

      return (
        <Badge
          colorScheme={
            value === "PENDING"
              ? "yellow"
              : value === "IN_TRANSIT"
              ? "blue"
              : value === "DELIVERED"
              ? "green"
              : value === "RETURNED"
              ? "red"
              : "gray"
          }
        >
          {statusLabels[value as keyof typeof statusLabels] || value}
        </Badge>
      );
    },
  },
];

const excludedAccessors = [
  "deliveryDate",
  "notes",
  "invoice.totalAmount",
  "helper.name",
];

export default function PengirimanPage() {
  const data = useSharedData();

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Daftar Pengiriman`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementContent
        sampleData={data.data || []}
        columns={columns}
        excludedAccessors={excludedAccessors}
        dateAccessor="deliveryDate"
        emptyMessage="Belum ada data pengiriman"
        linkPath={`/${data.module}/${data.subModule}`}
        statusMapping={DELIVERY_STATUS_MAPPING}
      />
    </div>
  );
}
