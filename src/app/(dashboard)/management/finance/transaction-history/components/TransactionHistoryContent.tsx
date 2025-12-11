"use client";

import { useState, useMemo } from "react";
import { useSharedData } from "@/contexts/StaticData";
import { TransactionHistoryItem } from "../actions";
import { Card, DataTable, Badge } from "@/components/ui";
import { formatRupiah } from "@/utils/formatRupiah";
import { formatDate } from "@/utils/formatDate";

interface TransactionHistoryContentProps {
  initialData?: TransactionHistoryItem[];
}

export default function TransactionHistoryContent({
  initialData = [],
}: TransactionHistoryContentProps) {
  const { data } = useSharedData();
  const transactions: TransactionHistoryItem[] = data || initialData;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter data berdasarkan search dan filter
  const filteredData = useMemo(() => {
    return transactions.filter((transaction: TransactionHistoryItem) => {
      const matchesSearch =
        transaction.orderNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        transaction.customerName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        transaction.salesName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        transaction.invoice?.code
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        transaction.purchaseOrder?.code
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || transaction.orderStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  // Function untuk render status badge
  const renderStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string; label: string }> = {
      NEW: { className: "bg-gray-100 text-gray-800", label: "Baru" },
      CONFIRMED: {
        className: "bg-blue-100 text-blue-800",
        label: "Dikonfirmasi",
      },
      PROCESSING: {
        className: "bg-yellow-100 text-yellow-800",
        label: "Diproses",
      },
      COMPLETED: { className: "bg-green-100 text-green-800", label: "Selesai" },
      CANCELLED: { className: "bg-red-100 text-red-800", label: "Dibatalkan" },
      DRAFT: { className: "bg-gray-100 text-gray-800", label: "Draft" },
      SENT: { className: "bg-yellow-100 text-yellow-800", label: "Terkirim" },
      PAID: { className: "bg-green-100 text-green-800", label: "Dibayar" },
      OVERDUE: { className: "bg-red-100 text-red-800", label: "Terlambat" },
      UNPAID: { className: "bg-red-100 text-red-800", label: "Belum Dibayar" },
      OVERPAID: {
        className: "bg-blue-100 text-blue-800",
        label: "Kelebihan Bayar",
      },
    };

    const config = statusMap[status] || {
      className: "bg-gray-100 text-gray-800",
      label: status,
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  // Function untuk render flow progress
  const renderFlowProgress = (transaction: TransactionHistoryItem) => {
    const steps = [
      { name: "Order", completed: true, status: transaction.orderStatus },
      {
        name: "PO",
        completed: !!transaction.purchaseOrder,
        status: transaction.purchaseOrder?.status || "N/A",
      },
      {
        name: "Invoice",
        completed: !!transaction.invoice,
        status: transaction.invoice?.status || "N/A",
      },
      {
        name: "Delivery",
        completed:
          !!transaction.deliveries?.length ,
        status:
          transaction.deliveries?.[0]?.status ||
          "N/A",
      },
      {
        name: "Payment",
        completed: !!transaction.payments?.length,
        status: transaction.invoice?.paymentStatus || "N/A",
      },
    ];

    return (
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => (
          <div key={step.name} className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full ${
                step.completed ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span
              className={`ml-1 text-xs ${
                step.completed ? "text-green-600" : "text-gray-500"
              }`}
            >
              {step.name}
            </span>
            {index < steps.length - 1 && (
              <div className="w-4 h-px bg-gray-300 mx-2" />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Kolom untuk DataTable
  const columns = [
    {
      header: "Order",
      accessor: "orderNumber",
      render: (value: any, row: TransactionHistoryItem) => (
        <div>
          <div className="font-medium">{row.orderNumber}</div>
          <div className="text-sm text-gray-500">
            {formatDate(row.orderDate)}
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      accessor: "customerName",
      render: (value: any, row: TransactionHistoryItem) => (
        <div>
          <div className="font-medium">{row.customerName}</div>
          <div className="text-sm text-gray-500">{row.customerCode}</div>
        </div>
      ),
    },
    {
      header: "Sales",
      accessor: "salesName",
    },
    {
      header: "Total Amount",
      accessor: "totalAmount",
      render: (value: any, row: TransactionHistoryItem) =>
        formatRupiah(row.totalAmount),
    },
    {
      header: "Status Order",
      accessor: "orderStatus",
      render: (value: any, row: TransactionHistoryItem) =>
        renderStatusBadge(row.orderStatus),
    },
    {
      header: "Flow Progress",
      accessor: "id",
      render: (value: any, row: TransactionHistoryItem) =>
        renderFlowProgress(row),
    },
    {
      header: "Invoice",
      accessor: "invoice",
      render: (value: any, row: TransactionHistoryItem) => (
        <div>
          {row.invoice ? (
            <>
              <div className="font-medium">{row.invoice.code}</div>
              <div className="text-sm">
                {renderStatusBadge(row.invoice.status)}
              </div>
              <div className="text-sm text-gray-500">
                {formatRupiah(row.invoice.totalAmount)}
              </div>
            </>
          ) : (
            <span className="text-gray-400">Belum dibuat</span>
          )}
        </div>
      ),
    },
    {
      header: "Payment",
      accessor: "payments",
      render: (value: any, row: TransactionHistoryItem) => (
        <div>
          {row.payments && row.payments.length > 0 ? (
            <>
              <div className="text-sm font-medium">
                {row.payments.length} pembayaran
              </div>
              <div className="text-sm text-gray-500">
                Total:{" "}
                {formatRupiah(
                  row.payments.reduce(
                    (sum: number, payment: any) => sum + payment.amount,
                    0
                  )
                )}
              </div>
              {row.invoice && (
                <div className="text-sm">
                  {renderStatusBadge(row.invoice.paymentStatus)}
                </div>
              )}
            </>
          ) : (
            <span className="text-gray-400">Belum dibayar</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Transaksi
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari order, customer, sales, invoice..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="NEW">Baru</option>
              <option value="CONFIRMED">Dikonfirmasi</option>
              <option value="PROCESSING">Diproses</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-2xl font-bold text-blue-600">
            {filteredData.length}
          </div>
          <p className="text-sm text-gray-600">Total Transaksi</p>
        </Card>

        <Card className="p-6">
          <div className="text-2xl font-bold text-green-600">
            {formatRupiah(
              filteredData.reduce(
                (sum: number, t: TransactionHistoryItem) => sum + t.totalAmount,
                0
              )
            )}
          </div>
          <p className="text-sm text-gray-600">Total Nilai</p>
        </Card>

        <Card className="p-6">
          <div className="text-2xl font-bold text-orange-600">
            {
              filteredData.filter(
                (t: TransactionHistoryItem) =>
                  t.invoice?.paymentStatus === "PAID"
              ).length
            }
          </div>
          <p className="text-sm text-gray-600">Sudah Dibayar</p>
        </Card>

        <Card className="p-6">
          <div className="text-2xl font-bold text-red-600">
            {
              filteredData.filter(
                (t: TransactionHistoryItem) =>
                  t.invoice?.paymentStatus === "UNPAID"
              ).length
            }
          </div>
          <p className="text-sm text-gray-600">Belum Dibayar</p>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            Riwayat Transaksi ({filteredData.length})
          </h3>
        </div>

        <DataTable columns={columns} data={filteredData} />
      </Card>
    </div>
  );
}
