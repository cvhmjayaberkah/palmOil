"use client";

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React from "react";

const columns = [
  { header: "Period", accessor: "period" },
  { header: "Time Range", accessor: "timeRange" },
  {
    header: "Total Revenue",
    accessor: "totalRevenue",
    cell: (info: { getValue: () => number }) => {
      const value = info.getValue();
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(value);
    },
  },
  {
    header: "Growth",
    accessor: "growth",
    cell: (info: { getValue: () => number }) => {
      const value = info.getValue();
      return (
        <span className={value >= 0 ? "text-green-600" : "text-red-600"}>
          {value.toFixed(1)}%
        </span>
      );
    },
  },
  { header: "Best Month", accessor: "bestMonth" },
  { header: "Top Product", accessor: "topProduct" },
  { header: "Top Sales Rep", accessor: "topSalesRep" },
  {
    header: "Status",
    accessor: "isActive",
    cell: (info: { getValue: () => boolean }) => {
      const value = info.getValue();
      return (
        <span className={value ? "text-green-500" : "text-red-500"}>
          {value ? "Active" : "Inactive"}
        </span>
      );
    },
  },
];

const excludedAccessors = ["period", "timeRange", "totalRevenue"];

export default function RevenueDataPage() {
  const data = useSharedData();

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Revenue Analytics Data`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementContent
        sampleData={data.data || []}
        columns={columns}
        excludedAccessors={excludedAccessors}
        dateAccessor="createdAt"
        emptyMessage="No revenue analytics data found"
        linkPath={`/${data.module}/${data.subModule}`}
      />
    </div>
  );
}
