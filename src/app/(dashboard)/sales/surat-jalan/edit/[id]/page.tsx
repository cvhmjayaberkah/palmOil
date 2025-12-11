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
import { getCompanyProfiles } from "@/lib/actions/company-profiles";
import {
  generateDeliveryNotePdf,
  type DeliveryNoteData,
  type DeliveryNoteItem,
} from "@/utils/generateDeliveryNotePdf";
import { formatDate } from "@/utils/formatDate";
import { useRouter, useParams } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";
import { formatRupiah } from "@/utils/formatRupiah";

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
  const [companyProfile, setCompanyProfile] = useState<any>(null);

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
          throw new Error("ID tidak ditemukan");
        }

        const [data, companyProfiles] = await Promise.all([
          getDeliveryNoteById(id),
          getCompanyProfiles(),
        ]);

        if (!data) {
          throw new Error("Surat jalan tidak ditemukan");
        }

        setDeliveryNote(data);
        setFormData({
          deliveryDate: new Date(data.deliveryDate).toISOString().split("T")[0],
          driverName: data.driverName,
          vehicleNumber: data.vehicleNumber,
          notes: data.notes || "",
        });

        // Set the first active company profile
        const activeProfile = companyProfiles.find(profile => profile.isActive);
        setCompanyProfile(activeProfile || companyProfiles[0] || null);
      } catch (error) {
        console.error("Kesalahan mengambil surat jalan:", error);
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

  const handlePrint = async () => {
    if (!deliveryNote) {
      toast.error("Data surat jalan tidak tersedia");
      return;
    }

    try {
      // Get company profile data
      const companyProfiles = await getCompanyProfiles();
      const companyProfile =
        companyProfiles.length > 0 ? companyProfiles[0] : null;

      // Prepare delivery note data for PDF
      const deliveryNoteData = {
        // Company Information from profile
        companyName: companyProfile?.name || "CV HM JAYA BERKAH",
        companyAddress: companyProfile?.address || undefined,
        companyPhone: companyProfile?.phone || undefined,

        // Delivery Note Information
        deliveryNoteNo: deliveryNote.code,
        deliveryDate: formatDate(deliveryNote.deliveryDate),
        invoiceNo: deliveryNote.invoices.code,

        // Customer Information
        customerName: deliveryNote.customers.name,
        customerAddress: deliveryNote.customers.address,

        // Delivery Information
        driverName: deliveryNote.driverName,
        vehicleNumber: deliveryNote.vehicleNumber,
        notes: deliveryNote.notes || undefined,

        // Items from invoice items instead of delivery note items
        items:
          deliveryNote.invoices.invoiceItems?.map(item => ({
            productCode: item.products.code,
            productName: item.products.name,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            discountType:
              item.discountType === "AMOUNT"
                ? ("FIXED" as const)
                : ("PERCENTAGE" as const),
            totalPrice: item.totalPrice,
            bottlesPerCrate: item.products.bottlesPerCrate || 24,
            totalBottles: item.quantity * (item.products.bottlesPerCrate || 24),
          })) || [],

        // Totals from invoice
        subtotal: deliveryNote.invoices.subtotal,
        discount: deliveryNote.invoices.discount,
        tax: deliveryNote.invoices.tax,
        taxPercentage: deliveryNote.invoices.taxPercentage,
        totalAmount: deliveryNote.invoices.totalAmount,

        // Additional Info
        warehouseStaff: deliveryNote.users.name,
        createdBy: user?.name,
      };

      // Generate and download PDF
      generateDeliveryNotePdf(deliveryNoteData);
      toast.success("PDF surat jalan berhasil diunduh");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF surat jalan");
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
        hidePrintButton={false}
        handlePrint={handlePrint}
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
          </div>

          {/* Item Invoice */}
          {deliveryNote.invoices.invoiceItems &&
            deliveryNote.invoices.invoiceItems.length > 0 && (
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
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[50px]">
                            No
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[120px]">
                            Kode
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[200px]">
                            Nama Produk
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[80px]">
                            Jumlah
                          </th>
                          <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[80px]">
                            Krat
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryNote.invoices.invoiceItems.map(
                          (item, index) => (
                            <tr
                              key={index}
                              className="border-t border-gray-200 dark:border-gray-600"
                            >
                              {/* No */}
                              <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                                <div className="text-m text-center text-gray-700 dark:text-gray-300">
                                  {index + 1}
                                </div>
                              </td>

                              {/* Product Code */}
                              <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                                <div className="text-m text-gray-700 dark:text-gray-300">
                                  {item.products.code}
                                </div>
                              </td>

                              {/* Product Name */}
                              <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                                <div className="text-m text-gray-700 dark:text-gray-300">
                                  {item.products.name}
                                </div>
                              </td>

                              {/* Total Bottles (Jumlah) */}
                              <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                                <div className="text-m text-center text-gray-700 dark:text-gray-300">
                                  {item.quantity *
                                    (item.products.bottlesPerCrate || 24)}{" "}
                                  {/* Use from database, fallback to 24 */}
                                </div>
                              </td>

                              {/* Crates (Krat) */}
                              <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                                <div className="text-m text-center text-gray-700 dark:text-gray-300">
                                  {item.quantity}
                                </div>
                              </td>
                            </tr>
                          )
                        )}
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
