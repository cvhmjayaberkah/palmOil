// app/(dashboard)/sales/invoice-cancellation/history/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { ManagementHeader, ManagementContent } from "@/components/ui";
import { getCanceledInvoices } from "@/lib/actions/invoices";
import { formatDate } from "@/utils/formatDate";
import { formatRupiah } from "@/utils/formatRupiah";
import { toast } from "sonner";

interface CanceledInvoice {
  id: string;
  code: string;
  invoiceDate: Date;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  paymentStatus: string;
  canceledAt: Date | null;
  cancelReason: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
  canceler: {
    id: string;
    name: string;
  } | null;
}

export default function CancellationHistoryPage() {
  const [canceledInvoices, setCanceledInvoices] = useState<CanceledInvoice[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load canceled invoices
  useEffect(() => {
    const loadCanceledInvoices = async () => {
      try {
        setIsLoading(true);
        const invoices = await getCanceledInvoices();
        setCanceledInvoices(invoices);
      } catch (error) {
        console.error("Error loading canceled invoices:", error);
        toast.error("Gagal memuat data invoice yang dibatalkan");
      } finally {
        setIsLoading(false);
      }
    };

    loadCanceledInvoices();
  }, []);

  // Filter and sort invoices
  const getStatusBadge = (status: string, type: "invoice" | "payment") => {
    const statusColors =
      type === "invoice"
        ? {
            DRAFT: "text-gray-600 bg-gray-50",
            PENDING: "text-yellow-600 bg-yellow-50",
            SENT: "text-blue-600 bg-blue-50",
            PAID: "text-green-600 bg-green-50",
            COMPLETED: "text-purple-600 bg-purple-50",
            CANCELED: "text-red-600 bg-red-50",
          }
        : {
            UNPAID: "text-red-600 bg-red-50",
            PAID: "text-green-600 bg-green-50",
          };

    const statusLabels =
      type === "invoice"
        ? {
            DRAFT: "Draft",
            PENDING: "Pending",
            SENT: "Terkirim",
            PAID: "Terbayar",
            COMPLETED: "Selesai",
            CANCELED: "Dibatalkan",
          }
        : {
            UNPAID: "Belum Bayar",
            PAID: "Lunas",
          };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusColors[status as keyof typeof statusColors] ||
          "text-gray-500 bg-gray-50"
        }`}
      >
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  const columns = [
    {
      header: "Kode Invoice",
      accessor: "code" as keyof CanceledInvoice,
      sortable: true,
      render: (invoice: CanceledInvoice) => (
        <span className="font-mono text-sm">{invoice.code}</span>
      ),
    },
    {
      header: "Customer",
      accessor: "customer" as keyof CanceledInvoice,
      sortable: true,
      render: (invoice: CanceledInvoice) => (
        <span>{invoice.customer?.name || "Tidak ada customer"}</span>
      ),
    },
    {
      header: "Tanggal Invoice",
      accessor: "invoiceDate" as keyof CanceledInvoice,
      sortable: true,
      render: (invoice: CanceledInvoice) => (
        <span>{formatDate(invoice.invoiceDate)}</span>
      ),
    },
    {
      header: "Total Amount",
      accessor: "totalAmount" as keyof CanceledInvoice,
      sortable: true,
      render: (invoice: CanceledInvoice) => (
        <span className="font-semibold">
          {formatRupiah(invoice.totalAmount)}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status" as keyof CanceledInvoice,
      sortable: true,
      render: (invoice: CanceledInvoice) => (
        <div className="space-y-1">
          {getStatusBadge(invoice.status, "invoice")}
          <br />
          {getStatusBadge(invoice.paymentStatus, "payment")}
        </div>
      ),
    },
    {
      header: "Dibatalkan Tanggal",
      accessor: "canceledAt" as keyof CanceledInvoice,
      sortable: true,
      render: (invoice: CanceledInvoice) => (
        <span>{invoice.canceledAt ? formatDate(invoice.canceledAt) : "-"}</span>
      ),
    },
    {
      header: "Dibatalkan Oleh",
      accessor: "canceler" as keyof CanceledInvoice,
      sortable: true,
      render: (invoice: CanceledInvoice) => (
        <span>{invoice.canceler?.name || "-"}</span>
      ),
    },
    {
      header: "Alasan",
      accessor: "cancelReason" as keyof CanceledInvoice,
      sortable: false,
      render: (invoice: CanceledInvoice) => (
        <div className="max-w-xs">
          <span
            className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
            title={invoice.cancelReason || ""}
          >
            {invoice.cancelReason || "-"}
          </span>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <ManagementHeader
            headerTittle="Riwayat Pembatalan Invoice"
            mainPageName="/sales/invoice-cancellation"
            allowedRoles={["OWNER", "ADMIN"]}
            isAddHidden={true}
          />
        </div>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Memuat riwayat pembatalan...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Riwayat Pembatalan Invoice"
          mainPageName="/sales/invoice-cancellation"
          allowedRoles={["OWNER", "ADMIN"]}
          isAddHidden={true}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {canceledInvoices.length} invoice dibatalkan
          </div>
        </div>
      </div>

      {/* Content */}
      <ManagementContent
        sampleData={canceledInvoices}
        columns={columns}
        excludedAccessors={[]}
        linkPath=""
        disableRowLinks={true}
        emptyMessage="Tidak ada invoice yang dibatalkan"
      />
    </div>
  );
}
