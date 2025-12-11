// app/purchasing/daftar-po/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react"; // Essential for JSX
import { formatDate } from "@/utils/formatDate";
import { formatRupiah } from "@/utils/formatRupiah";
import {
  formatPurchaseOrderStatus,
  getPurchaseOrderStatusColors,
} from "@/utils/formatPurchaseOrderStatus";
import { PURCHASE_ORDER_STATUS_MAPPING } from "@/lib/constants/statusMappings";

const columns = [
  { header: "Kode", accessor: "code" },
  {
    header: "Tanggal Pesanan",
    accessor: "poDate",
    render: (value: Date) => formatDate(value),
  },
  {
    header: "Net",
    accessor: "paymentDeadline",
    render: (value: Date | null) =>
      value ? formatDate(value) : "Bayar langsung",
  },
  {
    header: "Customer",
    accessor: "order.customer.name",
  },
  {
    header: "Total",
    accessor: "totalPayment",
    render: (value: number) => formatRupiah(value),
  },
  {
    header: "Status",
    accessor: "status",
    cell: (info: { getValue: () => string }) => {
      const value = info.getValue();
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getPurchaseOrderStatusColors(
            value
          )}`}
        >
          {formatPurchaseOrderStatus(value)}
        </span>
      );
    },
  },
];

const excludedAccessors = ["poDate", "dateline", "notes", "totalPayment"];

// Status filter options for Purchase Order
const purchaseOrderStatusOptions = [
  { value: "PENDING", label: "Menunggu" },
  { value: "PROCESSING", label: "Diproses" },
  { value: "READY_FOR_DELIVERY", label: "Siap Kirim" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

export default function DaftarPOPage() {
  const data = useSharedData();

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Daftar Pesanan Pembelian`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementContent
        sampleData={data.data || []}
        columns={columns}
        excludedAccessors={excludedAccessors}
        dateAccessor="poDate"
        emptyMessage="Belum ada data pesanan pembelian"
        linkPath={`/${data.module}/${data.subModule}`}
        statusMapping={PURCHASE_ORDER_STATUS_MAPPING}
        statusFilterOptions={purchaseOrderStatusOptions}
        statusFilterField="status"
      />
    </div>
  );
}
