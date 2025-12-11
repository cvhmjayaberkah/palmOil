// app/sales/tukar/page.tsx
"use client"; // This component MUST be a Client Component

import { ManagementHeader, ManagementContent } from "@/components/ui";
import { useSharedData } from "@/contexts/StaticData";
import React, { useState, useEffect } from "react"; // Essential for JSX
import { formatDate } from "@/utils/formatDate";
import { Button } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { getSwaps } from "@/lib/actions/swaps";

const columns = [
  {
    header: "Kode Tukar Guling",
    accessor: "code",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return value || "-";
    },
  },
  {
    header: "Tanggal",
    accessor: "swapDate",
    cell: (info: { getValue: () => any }) => {
      const value = info.getValue();
      return value ? formatDate(new Date(value)) : "-";
    },
  },
  {
    header: "Invoice",
    accessor: "invoice",
    cell: (info: { getValue: () => any }) => {
      const invoice = info.getValue();
      return invoice?.code || "-";
    },
  },
  {
    header: "Customer",
    accessor: "invoice",
    cell: (info: { getValue: () => any }) => {
      const invoice = info.getValue();
      return invoice?.customer?.name || "-";
    },
  },
  {
    header: "Deadline",
    accessor: "invoice",
    cell: (info: { getValue: () => any }) => {
      const invoice = info.getValue();
      return invoice?.dueDate
        ? formatDate(new Date(invoice.dueDate))
        : "Bayar Langsung";
    },
  },
  {
    header: "Item Ditukar",
    accessor: "swapDetails",
    cell: (info: { getValue: () => any[] }) => {
      const details = info.getValue();
      if (!details || details.length === 0) return "0";
      return details.length.toString();
    },
  },
  {
    header: "Selisih",
    accessor: "difference",
    cell: (info: { getValue: () => number }) => {
      const difference = info.getValue() || 0;
      const isPositive = difference >= 0;
      const color = isPositive ? "text-green-600" : "text-red-600";
      const symbol = isPositive ? "+" : "";
      return (
        <span className={color}>
          {symbol}Rp {Math.abs(difference).toLocaleString()}
        </span>
      );
    },
  },
  // {
  //   header: "Total Nilai COGS",
  //   accessor: "swapDetails",
  //   cell: (info: { getValue: () => any[] }) => {
  //     const details = info.getValue();
  //     if (!details || details.length === 0) return "Rp 0";
  //     const totalValue = details.reduce(
  //       (sum, detail) => sum + detail.replacementItemCogs * detail.quantity,
  //       0
  //     );
  //     return `Rp ${totalValue.toLocaleString()}`;
  //   },
  // },
];

const excludedAccessors = ["swapDate", "invoice", "swapDetails", "difference"];

export default function TukarGulingPage() {
  const data = useSharedData();
  const { user } = useCurrentUser();
  const router = useRouter();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has permission to add new swap
  const allowedRoles = ["OWNER", "ADMIN"];
  const canAddSwap = user && allowedRoles.includes(user.role || "");

  // Load swaps data
  useEffect(() => {
    const loadSwaps = async () => {
      try {
        setIsLoading(true);
        const swapsData = await getSwaps();
        console.log("Swaps data received:", swapsData);
        console.log("Number of swaps:", swapsData?.length || 0);
        setSwaps(swapsData || []);
      } catch (error) {
        console.error("Error loading swaps:", error);
        setSwaps([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSwaps();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl md:text-3xl font-semibold text-gray-900 dark:text-white">
          Daftar Tukar Guling
        </h3>
        <div className="flex space-x-2">
          <Button
            size="medium"
            variant="primary"
            className="text-xs md:text-sm bg-blue-500"
            onClick={() => router.push("/sales/tukar")}
          >
            Daftar
          </Button>
          {canAddSwap && (
            <Button
              size="medium"
              variant="secondary"
              className="text-xs md:text-sm"
              onClick={() => router.push("/sales/tukar/create")}
            >
              Tambah Tukar Guling
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="text-gray-500 dark:text-gray-400">
            Memuat data tukar guling...
          </div>
        </div>
      ) : (
        <>
          {console.log("Rendering ManagementContent with swaps:", swaps)}
          {swaps && swaps.length > 0 ? (
            <ManagementContent
              sampleData={swaps}
              columns={columns}
              excludedAccessors={excludedAccessors}
              dateAccessor="swapDate"
              emptyMessage="Belum ada data tukar guling"
              linkPath="/sales/tukar"
            />
          ) : (
            <div className="flex justify-center items-center p-8">
              <div className="text-gray-500 dark:text-gray-400">
                Belum ada data tukar guling. Silakan buat tukar guling baru.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
