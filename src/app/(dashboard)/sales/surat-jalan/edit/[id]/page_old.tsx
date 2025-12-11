"use client";
import { ManagementHeader, ManagementForm } from "@/components/ui";
import React, { useState, useEffect } from "react";
import { Input, FormField, InputTextArea, InputDate } from "@/components/ui";
import {
  updateDeliveryNote,
  getDeliveryNoteById,
  deleteDeliveryNote,
  type DeliveryNoteWithDetails,
} from "@/lib/actions/deliveryNotes";
import { useRouter, useParams } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";
import { formatRupiah } from "@/utils/formatRupiah";
import {
  generateDeliveryNotePdf,
  type DeliveryNoteData,
  type DeliveryNoteItem,
} from "@/utils/generateDeliveryNotePdf";

interface DeliveryNoteFormData {
  deliveryDate: string;
  driverName: string;
  vehicleNumber: string;
  notes: string;
}

interface DeliveryNoteFormErrors {
  deliveryDate?: string;
  driverName?: string;
  vehicleNumber?: string;
}

export default function EditDeliveryNotePage() {
  const data = useSharedData();
  const router = useRouter();
  const params = useParams();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deliveryNote, setDeliveryNote] =
    useState<DeliveryNoteWithDetails | null>(null);

  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    deliveryDate: "",
    driverName: "",
    vehicleNumber: "",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState<DeliveryNoteFormErrors>({});

  useEffect(() => {
    const fetchDeliveryNote = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (!id) {
          throw new Error("ID not found");
        }

        const data = await getDeliveryNoteById(id);
        if (!data) {
          throw new Error("Delivery note not found");
        }

        setDeliveryNote(data);
        setFormData({
          deliveryDate: new Date(data.deliveryDate).toISOString().split("T")[0],
          driverName: data.driverName,
          vehicleNumber: data.vehicleNumber,
          notes: data.notes || "",
        });
      } catch (error) {
        console.error("Error fetching delivery note:", error);
        setErrorLoadingData("Gagal memuat data surat jalan.");
        toast.error("Gagal memuat data surat jalan");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDeliveryNote();
  }, [params.id]);

  const handleInputChange = (
    field: keyof DeliveryNoteFormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field as keyof DeliveryNoteFormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: DeliveryNoteFormErrors = {};

    if (!formData.deliveryDate) {
      newErrors.deliveryDate = "Tanggal pengiriman harus diisi";
    }

    if (!formData.driverName.trim()) {
      newErrors.driverName = "Nama driver harus diisi";
    }

    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = "Nomor kendaraan harus diisi";
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Harap lengkapi semua field yang wajib diisi");
      return;
    }

    if (!deliveryNote) return;

    try {
      setIsSubmitting(true);

      const submitData = {
        deliveryDate: new Date(formData.deliveryDate),
        driverName: formData.driverName,
        vehicleNumber: formData.vehicleNumber,
        notes: formData.notes || undefined,
      };

      const result = await updateDeliveryNote(deliveryNote.id, submitData);

      if (result.success) {
        toast.success("Surat jalan berhasil diperbarui");
        router.push(`/sales/surat-jalan`);
      } else {
        toast.error(result.error || "Gagal memperbarui surat jalan");
      }
    } catch (error) {
      console.error("Error updating delivery note:", error);
      toast.error("Terjadi kesalahan saat memperbarui surat jalan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deliveryNote) return;

    setIsDeleting(true);

    try {
      const result = await deleteDeliveryNote(deliveryNote.id);

      if (result.success) {
        toast.success("Surat jalan berhasil dihapus.");
        router.push("/sales/surat-jalan");
      } else {
        toast.error(result.error || "Gagal menghapus surat jalan");
      }
    } catch (error) {
      console.error("Error menghapus surat jalan:", error);
      toast.error("Terjadi kesalahan yang tidak terduga saat menghapus.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  /**
   * EDIT PAGE PRINT LOGIC:
   * Since data already exists in database, we can:
   * 1. Generate PDF directly from existing database data
   * 2. Use current form data for updated delivery info (driver, vehicle, etc.)
   * 3. No need to save to database before printing
   */
  // Edit Page: Data already exists in database, directly generate PDF
  const handlePrintPdf = () => {
    if (!deliveryNote) {
      toast.error("Data surat jalan tidak ditemukan");
      return;
    }

    try {
      // Generate PDF directly from existing database data (no need to save first)
      const items: DeliveryNoteItem[] =
        deliveryNote.delivery_note_items?.map((item: any) => ({
          productName: item.products.name,
          quantity: item.quantity,
          price: item.products.price,
          discount: 0, // delivery note items don't have discount
          discountType: "FIXED" as "FIXED" | "PERCENTAGE",
          totalPrice: item.quantity * item.products.price,
        })) ||
        deliveryNote.invoices.invoiceItems?.map((item: any) => ({
          productName: item.products.name,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          discountType: item.discountType as "FIXED" | "PERCENTAGE",
          totalPrice: item.totalPrice,
        })) ||
        [];

      const pdfData: DeliveryNoteData = {
        // Company Information
        companyName: "CV HM JAYA BERKAH",
        companyAddress:
          "Jl. Raya Dumajah Timur, Kec. Tanah Merah, Kab. Bangkalan, Jawa Timur",
        companyPhone: "087753833139",

        // Delivery Note Information (using current form data for updated info)
        deliveryNoteNo: deliveryNote.code,
        deliveryDate: new Date(formData.deliveryDate).toLocaleDateString(
          "id-ID"
        ),
        invoiceNo: deliveryNote.invoices.code,
        invoiceDate: new Date(deliveryNote.createdAt).toLocaleDateString(
          "id-ID"
        ), // Use createdAt as fallback

        // Customer Information
        customerName: deliveryNote.customers.name,
        customerAddress: deliveryNote.customers.address || "",

        // Delivery Information (using current form data for updated info)
        driverName: formData.driverName,
        vehicleNumber: formData.vehicleNumber,
        notes: formData.notes || "",

        // Items
        items: items,

        // Totals
        subtotal: deliveryNote.invoices.subtotal,
        discount: deliveryNote.invoices.discount,
        tax: deliveryNote.invoices.tax,
        taxPercentage: deliveryNote.invoices.taxPercentage,
        totalAmount: deliveryNote.invoices.totalAmount,

        // Additional Info
        warehouseStaff: deliveryNote.users?.name || "",
        createdBy: deliveryNote.users?.name || "",
      };

      generateDeliveryNotePdf(pdfData);
      toast.success(
        "PDF surat jalan berhasil di-generate dari data yang tersimpan"
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF");
    }
  };

  if (isLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit Surat Jalan"
          mainPageName={`/sales/surat-jalan`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Memuat data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (errorLoadingData || !deliveryNote) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit Surat Jalan"
          mainPageName={`/sales/surat-jalan`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">
              {errorLoadingData || "Data tidak ditemukan"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Edit Surat Jalan - ${deliveryNote.code}`}
        mainPageName={`/sales/surat-jalan`}
        allowedRoles={data.allowedRole}
      />
      <ManagementForm
        subModuleName="surat-jalan"
        moduleName="sales"
        isSubmitting={isSubmitting}
        handleFormSubmit={handleSubmit}
        hideDeleteButton={false}
        handleDelete={() => setIsDeleteModalOpen(true)}
        handlePrint={handlePrintPdf}
        hidePrintButton={false} // EDIT PAGE: Always show print button because data already exists in database
      >
        {/* Informasi Form Section */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-4 text-gray-700 dark:text-gray-300">
            Informasi Surat Jalan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Nomor Surat Jalan">
              <Input
                name="code"
                type="text"
                value={deliveryNote.code}
                readOnly
                className="mt-1 block w-full bg-gray-100 cursor-default dark:bg-gray-800"
              />
            </FormField>

            <FormField
              label="Tanggal Pengiriman"
              errorMessage={formErrors.deliveryDate}
            >
              <InputDate
                value={new Date(formData.deliveryDate)}
                onChange={value =>
                  value &&
                  handleInputChange(
                    "deliveryDate",
                    value.toISOString().split("T")[0]
                  )
                }
              />
            </FormField>
          </div>
        </div>

        {/* Invoice Information Section */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg dark:text-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                Informasi Invoice
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Kode:</strong> {deliveryNote.invoices.code}
                </p>
                <p>
                  <strong>Tanggal:</strong>{" "}
                  {new Date(deliveryNote.deliveryDate).toLocaleDateString(
                    "id-ID"
                  )}
                </p>
                <p>
                  <strong>Customer:</strong> {deliveryNote.customers.name}
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                Detail Invoice
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Subtotal:</strong>{" "}
                  {formatRupiah(deliveryNote.invoices.subtotal)}
                </p>
                <p>
                  <strong>Potongan:</strong>{" "}
                  {formatRupiah(deliveryNote.invoices.discount)}
                  {deliveryNote.invoices.discountType === "PERCENTAGE" &&
                    " (%)"}
                </p>
                <p>
                  <strong>
                    Pajak ({deliveryNote.invoices.taxPercentage}%):
                  </strong>{" "}
                  {formatRupiah(deliveryNote.invoices.tax)}
                </p>
                <p>
                  <strong>Total:</strong>{" "}
                  {formatRupiah(deliveryNote.invoices.totalAmount)}
                </p>
              </div>
            </div>
            {/* <div>
              <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                Status
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    deliveryNote.status
                  )}`}
                >
                  {getStatusLabel(deliveryNote.status)}
                </span>
              </div>
            </div> */}
          </div>

          {/* Item Invoice */}
          {deliveryNote.delivery_note_items &&
            deliveryNote.delivery_note_items.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300">
                    Item Surat Jalan
                  </h3>
                </div>
                <div className="overflow-x-auto shadow-sm">
                  <div className="min-w-[800px]">
                    <table className="w-full table-fixed border-collapse bg-white dark:bg-gray-900">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[200px]">
                            Produk
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[80px]">
                            Qty
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[80px]">
                            Terkirim
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[120px]">
                            Harga
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[140px]">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryNote.delivery_note_items.map((item, index) => (
                          <tr
                            key={index}
                            className="border-t border-gray-200 dark:border-gray-600"
                          >
                            {/* Product */}
                            <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                              <div className="text-m text-gray-700 dark:text-gray-300">
                                {item.products.name}
                              </div>
                            </td>

                            {/* Quantity */}
                            <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                              <div className="text-m text-center text-gray-700 dark:text-gray-300">
                                {item.quantity}
                              </div>
                            </td>

                            {/* Delivered Quantity */}
                            <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                              <div className="text-m text-center text-gray-700 dark:text-gray-300">
                                {item.deliveredQty}
                              </div>
                            </td>

                            {/* Price */}
                            <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                              <div className="text-m text-right text-gray-700 dark:text-gray-300">
                                {formatRupiah(item.products.price)}
                              </div>
                            </td>

                            {/* Total Price */}
                            <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-right text-m truncate">
                                {formatRupiah(
                                  item.quantity * item.products.price
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Input Form Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Nama Driver"
            errorMessage={formErrors.driverName}
            required
          >
            <Input
              name="driverName"
              type="text"
              value={formData.driverName}
              onChange={e => handleInputChange("driverName", e.target.value)}
              placeholder="Masukkan nama driver"
            />
          </FormField>

          <FormField
            label="Nomor Kendaraan"
            errorMessage={formErrors.vehicleNumber}
            required
          >
            <Input
              name="vehicleNumber"
              type="text"
              value={formData.vehicleNumber}
              onChange={e => handleInputChange("vehicleNumber", e.target.value)}
              placeholder="Masukkan nomor kendaraan"
            />
          </FormField>
        </div>

        <Input
          name="createdBy"
          type="hidden"
          value={deliveryNote.users.name || ""}
          readOnly
          className="mt-1 block w-full bg-gray-100 cursor-default dark:bg-gray-800"
        />

        <FormField label="Catatan">
          <InputTextArea
            name="notes"
            value={formData.notes}
            onChange={e => handleInputChange("notes", e.target.value)}
            placeholder="Tambahkan catatan"
          />
        </FormField>
      </ManagementForm>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Konfirmasi Hapus Surat Jalan"
      >
        <p>
          Apakah Anda yakin ingin menghapus Surat Jalan{" "}
          <strong>{deliveryNote.code}</strong>? Tindakan ini tidak dapat
          dibatalkan.
        </p>
      </ConfirmationModal>
    </div>
  );
}
