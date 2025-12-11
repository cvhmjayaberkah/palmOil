// app/(dashboard)/sales/invoice-cancellation/cancel/[id]/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ManagementHeader } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getInvoiceForCancellation,
  cancelInvoice,
} from "@/lib/actions/invoices";
import { formatDate } from "@/utils/formatDate";
import { formatRupiah } from "@/utils/formatRupiah";
import { toast } from "sonner";
import { Button } from "@/components/ui";

interface InvoiceDetails {
  id: string;
  code: string;
  invoiceDate: Date;
  dueDate: Date | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  isCanceled?: boolean;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  creator: {
    id: string;
    name: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    paymentDate: Date;
    method: string;
  }>;
  invoiceItems: Array<{
    id: string;
    quantity: number;
    price: number;
    totalPrice: number;
    products: {
      id: string;
      name: string;
      code: string;
    };
  }>;
  purchaseOrder: {
    id: string;
    code: string;
    status: string;
  } | null;
}

export default function CancelInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useCurrentUser();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [errors, setErrors] = useState<{ reason?: string }>({});

  const invoiceId = params.id as string;

  // Load invoice data
  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setIsLoading(true);
        const invoiceData = await getInvoiceForCancellation(invoiceId);

        if (!invoiceData) {
          toast.error("Invoice tidak ditemukan");
          router.push("/sales/invoice-cancellation");
          return;
        }

        // Validate if invoice can be canceled
        if ((invoiceData as any).isCanceled) {
          toast.error("Invoice sudah dibatalkan sebelumnya");
          router.push("/sales/invoice-cancellation");
          return;
        }

        if (invoiceData.status === "COMPLETED") {
          toast.error("Invoice yang sudah selesai tidak dapat dibatalkan");
          router.push("/sales/invoice-cancellation");
          return;
        }

        // Transform the invoice data to match our interface
        const transformedInvoice = {
          ...invoiceData,
          isCanceled: (invoiceData as any).isCanceled || false,
          invoiceItems: invoiceData.invoiceItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            products: item.products,
          })),
        } as InvoiceDetails;

        setInvoice(transformedInvoice);
      } catch (error) {
        console.error("Error loading invoice:", error);
        toast.error("Gagal memuat data invoice");
        router.push("/sales/invoice-cancellation");
      } finally {
        setIsLoading(false);
      }
    };

    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId, router]);

  const validateForm = () => {
    const newErrors: { reason?: string } = {};

    if (!cancelReason.trim()) {
      newErrors.reason = "Alasan pembatalan harus diisi";
    } else if (cancelReason.trim().length < 10) {
      newErrors.reason = "Alasan pembatalan minimal 10 karakter";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !invoice || !user) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await cancelInvoice(
        invoice.id,
        cancelReason.trim(),
        user.id
      );

      if (result.success) {
        toast.success("Invoice berhasil dibatalkan");
        router.push("/sales/invoice-cancellation");
      } else {
        toast.error(result.error || "Gagal membatalkan invoice");
      }
    } catch (error) {
      console.error("Error canceling invoice:", error);
      toast.error("Terjadi kesalahan saat membatalkan invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Memuat data invoice...
          </p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          Invoice tidak ditemukan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Batalkan Invoice"
          mainPageName="/sales/invoice-cancellation"
          allowedRoles={["OWNER", "ADMIN"]}
          isAddHidden={true}
        />
      </div>

      {/* Invoice Details */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Detail Invoice
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Kode Invoice
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {invoice.code}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Customer
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {invoice.customer?.name || "Tidak ada customer"}
              </p>
              {invoice.customer?.email && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {invoice.customer.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status Invoice
              </label>
              <div className="mt-1">
                {getStatusBadge(invoice.status, "invoice")}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status Pembayaran
              </label>
              <div className="mt-1">
                {getStatusBadge(invoice.paymentStatus, "payment")}
              </div>
            </div>
          </div>

          {/* Financial Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tanggal Invoice
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatDate(invoice.invoiceDate)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Jatuh Tempo
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Invoice
              </label>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatRupiah(invoice.totalAmount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sudah Dibayar
              </label>
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                {formatRupiah(invoice.paidAmount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sisa Tagihan
              </label>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {formatRupiah(invoice.remainingAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Payments if any */}
        {invoice.payments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Riwayat Pembayaran
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Tanggal
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Jumlah
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Metode
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoice.payments.map(payment => (
                    <tr key={payment.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {formatRupiah(payment.amount)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {payment.method}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {getStatusBadge(payment.status, "payment")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Pembayaran terkait akan otomatis dibatalkan
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Form */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Konfirmasi Pembatalan
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                errors.reason
                  ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="Masukkan alasan pembatalan invoice (minimal 10 karakter)"
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.reason}
              </p>
            )}
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Peringatan Pembatalan Invoice
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Invoice yang dibatalkan tidak dapat dikembalikan</li>
                    <li>Semua pembayaran terkait akan otomatis dibatalkan</li>
                    <li>Purchase Order terkait akan dibatalkan jika ada</li>
                    <li>Stock yang sudah dialokasi akan dikembalikan</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/sales/invoice-cancellation")}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? "Membatalkan..." : "Batalkan Invoice"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
