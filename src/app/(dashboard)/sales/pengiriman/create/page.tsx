"use client";
import { ManagementHeader, ManagementForm } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  InputDate,
  Select,
} from "@/components/ui";
import {
  createDelivery,
  getAvailableInvoicesForDelivery,
} from "@/lib/actions/deliveries";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatRupiah } from "@/utils/formatRupiah";

interface DeliveryFormData {
  invoiceId: string;
  helperId: string;
  deliveryDate: Date | null;
  notes: string;
  deliveryItems: DeliveryItem[];
}

interface DeliveryItem {
  invoiceItemId: string;
  productId: string;
  productName: string;
  unit: string;
  invoiceQuantity: number;
  deliveryQuantity: number;
  price: number;
  totalPrice: number;
}

interface DeliveryFormErrors {
  invoiceId?: string;
  deliveryDate?: string;
  deliveryItems?: string;
}

interface Invoice {
  id: string;
  code: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  taxPercentage: number;
  discount: number;
  discountType: string;
  shippingCost: number;
  invoiceDate: Date;
  status: string;
  customer: {
    id: string;
    name: string;
    address: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  invoiceItems: {
    id: string;
    quantity: number;
    price: number;
    discount: number;
    discountType: string;
    totalPrice: number;
    products: {
      id: string;
      name: string;
      unit: string;
      price: number;
    };
  }[];
  deliveries: {
    id: string;
    code: string;
    status: string;
    returnReason: string | null;
  }[];
  payments?: {
    id: string;
    paymentCode: string;
    amount: number;
    paymentDate: Date;
    method: string;
    status: string;
  }[];
}

export default function CreateDeliveryPage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState<DeliveryFormData>({
    invoiceId: "",
    helperId: user?.id || "",
    deliveryDate: new Date(),
    notes: "",
    deliveryItems: [],
  });

  const [formErrors, setFormErrors] = useState<DeliveryFormErrors>({});

  // Helper function to check payment status
  const getPaymentStatus = (invoice: Invoice) => {
    if (!invoice.payments || invoice.payments.length === 0) {
      return { status: "UNPAID", message: "Belum Ada Pembayaran" };
    }

    const totalPaid = invoice.payments
      .filter((payment: any) => payment.status === "CONFIRMED")
      .reduce((sum: number, payment: any) => sum + payment.amount, 0);

    const totalAmount = invoice.totalAmount;

    if (totalPaid >= totalAmount) {
      return { status: "PAID", message: "Lunas" };
    } else if (totalPaid > 0) {
      return { status: "PARTIAL", message: "Sebagian Lunas" };
    }

    return { status: "UNPAID", message: "Belum Lunas" };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        // Ambil data invoice yang tersedia untuk delivery
        const availableInvoices = await getAvailableInvoicesForDelivery();

        setInvoices(availableInvoices);

        // Set helper ID dari session user
        setFormData(prev => ({
          ...prev,
          helperId: user?.id || "",
        }));
      } catch (error: any) {
        console.error("Kesalahan mengambil invoice:", error);
        setErrorLoadingData(error.message || "Gagal memuat data invoice.");
        toast.error("Gagal memuat data invoice");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  const handleDeliveryQuantityChange = (
    invoiceItemId: string,
    newQuantity: number
  ) => {
    setFormData(prev => ({
      ...prev,
      deliveryItems: prev.deliveryItems.map(item =>
        item.invoiceItemId === invoiceItemId
          ? {
              ...item,
              deliveryQuantity: newQuantity,
              totalPrice: newQuantity * item.price,
            }
          : item
      ),
    }));
  };

  const handleSelectAllItems = () => {
    setFormData(prev => ({
      ...prev,
      deliveryItems: prev.deliveryItems.map(item => ({
        ...item,
        deliveryQuantity: item.invoiceQuantity,
        totalPrice: item.invoiceQuantity * item.price,
      })),
    }));
  };

  const handleClearAllItems = () => {
    setFormData(prev => ({
      ...prev,
      deliveryItems: prev.deliveryItems.map(item => ({
        ...item,
        deliveryQuantity: 0,
        totalPrice: 0,
      })),
    }));
  };

  const handleInputChange = (
    field: keyof DeliveryFormData,
    value: string | Date | null
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Update selected invoice when invoiceId changes
    if (field === "invoiceId" && value) {
      const invoice = invoices.find(inv => inv.id === value);
      setSelectedInvoice(invoice || null);

      // Update delivery items based on selected invoice
      if (invoice && invoice.invoiceItems) {
        const deliveryItems: DeliveryItem[] = invoice.invoiceItems.map(
          item => ({
            invoiceItemId: item.id,
            productId: item.products.id,
            productName: item.products.name,
            unit: item.products.unit,
            invoiceQuantity: item.quantity,
            deliveryQuantity: item.quantity, // Default to full quantity
            price: item.price,
            totalPrice: item.totalPrice,
          })
        );

        setFormData(prev => ({
          ...prev,
          deliveryItems,
        }));
      }
    } else if (field === "invoiceId" && !value) {
      setSelectedInvoice(null);
      setFormData(prev => ({
        ...prev,
        deliveryItems: [],
      }));
    }

    // Clear error when user starts typing
    if (formErrors[field as keyof DeliveryFormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: DeliveryFormErrors = {};

    if (!formData.invoiceId) {
      errors.invoiceId = "Invoice harus dipilih";
    }

    if (!formData.deliveryDate) {
      errors.deliveryDate = "Tanggal pengiriman harus diisi";
    }

    // Validate delivery items
    if (formData.deliveryItems.length === 0) {
      errors.deliveryItems = "Harus ada minimal satu item untuk dikirim";
    } else {
      const hasValidItems = formData.deliveryItems.some(
        item => item.deliveryQuantity > 0
      );
      if (!hasValidItems) {
        errors.deliveryItems = "Minimal satu item harus memiliki quantity > 0";
      }

      const hasInvalidQuantity = formData.deliveryItems.some(
        item => item.deliveryQuantity > item.invoiceQuantity
      );
      if (hasInvalidQuantity) {
        errors.deliveryItems =
          "Quantity pengiriman tidak boleh melebihi quantity invoice";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Mohon periksa kembali form yang diisi");
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare delivery items data
      const deliveryItems = formData.deliveryItems
        .filter(item => item.deliveryQuantity > 0)
        .map(item => ({
          invoiceItemId: item.invoiceItemId,
          quantityToDeliver: item.deliveryQuantity,
        }));

      // Buat pengiriman dengan data sesungguhnya termasuk delivery items
      const result = await createDelivery({
        invoiceId: formData.invoiceId,
        helperId: formData.helperId,
        deliveryDate: formData.deliveryDate!,
        status: "PENDING",
        notes: formData.notes || undefined,
        deliveryItems: deliveryItems,
      });

      if (result.success) {
        toast.success("Pengiriman berhasil dibuat");
        router.push("/sales/pengiriman");
      } else {
        toast.error(result.error || "Gagal membuat pengiriman");
      }
    } catch (error) {
      console.error("Kesalahan membuat pengiriman:", error);
      toast.error("Terjadi kesalahan saat membuat pengiriman");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center p-8 bg-white dark:bg-gray-950 rounded-lg shadow-sm">
        <div className="text-gray-500 dark:text-gray-400">
          Memuat data invoice...
        </div>
      </div>
    );
  }

  if (errorLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-red-500 dark:text-red-400">
          Error: {errorLoadingData}. Harap muat ulang halaman.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Buat Pengiriman Baru"
        mainPageName={`/sales/pengiriman`}
        allowedRoles={data.allowedRole}
      />
      <ManagementForm
        subModuleName="pengiriman"
        moduleName="sales"
        isSubmitting={isSubmitting}
        handleFormSubmit={handleSubmit}
        hideDeleteButton={true}
      >
        <FormField label="Invoice" errorMessage={formErrors.invoiceId} required>
          <Select
            searchable={true}
            searchPlaceholder="Cari invoice..."
            value={formData.invoiceId}
            onChange={value => handleInputChange("invoiceId", value)}
            placeholder="Pilih Invoice"
            options={invoices.map(invoice => {
              const baseLabel = `${invoice.code} - ${
                invoice.customer?.name || "N/A"
              } (${formatRupiah(invoice.totalAmount)})`;

              // Add delivery status info if exists (get the latest failed delivery)
              if (invoice.deliveries && invoice.deliveries.length > 0) {
                const latestFailedDelivery = invoice.deliveries.find(
                  d => d.status === "CANCELLED" || d.status === "RETURNED"
                );

                if (latestFailedDelivery) {
                  const statusText =
                    latestFailedDelivery.status === "CANCELLED"
                      ? "Dibatalkan"
                      : "Dikembalikan";
                  return {
                    value: invoice.id,
                    label: `${baseLabel} [${statusText}: ${latestFailedDelivery.code}]`,
                  };
                }
              }

              return {
                value: invoice.id,
                label: baseLabel,
              };
            })}
          />
          {formData.invoiceId &&
            selectedInvoice?.deliveries &&
            selectedInvoice.deliveries.length > 0 && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-600 dark:text-yellow-400">
                    ⚠️
                  </span>
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Invoice ini sebelumnya sudah pernah dikirim
                    </p>
                    {(() => {
                      const latestFailedDelivery =
                        selectedInvoice.deliveries?.find(
                          d =>
                            d.status === "CANCELLED" || d.status === "RETURNED"
                        );

                      if (latestFailedDelivery) {
                        return (
                          <p className="text-yellow-700 dark:text-yellow-300">
                            Delivery terakhir:{" "}
                            <strong>{latestFailedDelivery.code}</strong> -
                            Status:{" "}
                            <strong>
                              {latestFailedDelivery.status === "CANCELLED"
                                ? "Dibatalkan"
                                : "Dikembalikan"}
                            </strong>
                            {latestFailedDelivery.returnReason && (
                              <span className="block mt-1">
                                Alasan: {latestFailedDelivery.returnReason}
                              </span>
                            )}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            )}
        </FormField>

        {/* Display Invoice Information and Items */}
        {selectedInvoice && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg dark:text-gray-300">
            <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
              Informasi Invoice
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p>
                  <strong>Kode:</strong> {selectedInvoice.code}
                </p>
                <p>
                  <strong>Tanggal:</strong>{" "}
                  {new Date(selectedInvoice.invoiceDate).toLocaleDateString(
                    "id-ID"
                  )}
                </p>
              </div>
              <div>
                <p>
                  <strong>Customer:</strong>{" "}
                  {selectedInvoice.customer?.name || "N/A"}
                </p>
                <p className="break-words">
                  <strong>Alamat:</strong>{" "}
                  {selectedInvoice.customer?.address || "N/A"}
                </p>
              </div>
            </div>

            {/* Item Invoice yang bisa diedit */}
            {formData.deliveryItems && formData.deliveryItems.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
                  Detail Item yang Akan Dikirim
                </h3>

                {/* Action Buttons */}
                {/* <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllItems}
                    className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllItems}
                    className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Kosongkan
                  </button>
                </div> */}
                {formErrors.deliveryItems && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {formErrors.deliveryItems}
                    </p>
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full table-auto bg-white dark:bg-gray-900">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Produk
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-20 hidden md:table-cell">
                          Qty Invoice
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">
                          Qty Kirim
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 w-28 hidden md:table-cell">
                          Harga
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 w-32 hidden md:table-cell">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {formData.deliveryItems.map((item, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          {/* Product */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {item.productName}
                              </span>
                            </div>
                          </td>

                          {/* Invoice Quantity - Hidden on mobile */}
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">
                                {item.invoiceQuantity}
                              </span>
                              <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
                                {item.unit}
                              </span>
                            </div>
                          </td>

                          {/* Delivery Quantity (Editable) */}
                          <td className="px-4 py-3 text-center">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">
                                {item.deliveryQuantity}
                              </span>
                              <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
                                {item.unit}
                              </span>
                            </div>
                          </td>

                          {/* Price - Hidden on mobile */}
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatRupiah(item.price)}
                            </span>
                          </td>

                          {/* Total Price - Hidden on mobile */}
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              {formatRupiah(item.totalPrice)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Delivery Summary */}
                <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-lg mb-3 text-green-800 dark:text-green-200 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
                    </svg>
                    Ringkasan Pengiriman
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formData.deliveryItems.reduce(
                          (sum, item) => sum + item.deliveryQuantity,
                          0
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total Krat Barang
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {
                          formData.deliveryItems.filter(
                            item => item.deliveryQuantity > 0
                          ).length
                        }
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Jenis Barang Dikirim
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg sm:col-span-2 lg:col-span-1">
                      <div className="text-xl lg:text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {formatRupiah(selectedInvoice.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total Invoice
                      </div>
                    </div>
                  </div>

                  {/* Partial Delivery Warning */}
                  {formData.deliveryItems.some(
                    item =>
                      item.deliveryQuantity < item.invoiceQuantity &&
                      item.deliveryQuantity > 0
                  ) && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            ⚠️ Pengiriman Sebagian
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Beberapa item tidak dikirim dalam jumlah penuh.
                            Pastikan ini sesuai dengan kebutuhan.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <Input
          name="helper"
          type="hidden"
          value={user?.name || ""}
          readOnly
          className="mt-1 block w-full bg-gray-100 cursor-default dark:bg-gray-800"
        />

        <FormField label="Catatan">
          <InputTextArea
            name="notes"
            value={formData.notes}
            onChange={e => handleInputChange("notes", e.target.value)}
            placeholder="Tambahkan catatan (opsional)"
          />
        </FormField>
      </ManagementForm>
    </div>
  );
}
