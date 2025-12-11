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
  createDeliveryNote,
  getEligibleInvoices,
  generateDeliveryNumber,
  type EligibleInvoice,
} from "@/lib/actions/deliveryNotes";
import { getCompanyProfiles } from "@/lib/actions/company-profiles";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatRupiah } from "@/utils/formatRupiah";
import { formatDate } from "@/utils/formatDate";
import {
  generateDeliveryNotePdf,
  type DeliveryNoteData,
  type DeliveryNoteItem,
} from "@/utils/generateDeliveryNotePdf";

interface DeliveryNoteFormData {
  code: string;
  deliveryDate: string;
  driverName: string;
  vehicleNumber: string;
  notes: string;
  invoiceId: string;
  warehouseUserId: string;
}

interface DeliveryNoteFormErrors {
  code?: string;
  deliveryDate?: string;
  driverName?: string;
  vehicleNumber?: string;
  invoiceId?: string;
}

export default function CreateDeliveryNotePage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleInvoice[]>(
    []
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<EligibleInvoice | null>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    code: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    driverName: "",
    vehicleNumber: "",
    notes: "",
    invoiceId: "",
    warehouseUserId: user?.id || "",
  });

  const [formErrors, setFormErrors] = useState<DeliveryNoteFormErrors>({});

  useEffect(() => {
    const fetchDataAndCode = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        const [invoices, newDeliveryNumber, companyProfiles] =
          await Promise.all([
            getEligibleInvoices(),
            generateDeliveryNumber(),
            getCompanyProfiles(),
          ]);

        setEligibleInvoices(invoices);
        setFormData(prevData => ({
          ...prevData,
          code: newDeliveryNumber,
        }));

        // Set the first active company profile
        const activeProfile = companyProfiles.find(profile => profile.isActive);
        setCompanyProfile(activeProfile || companyProfiles[0] || null);
      } catch (error) {
        console.error("Kesalahan mengambil data:", error);
        setErrorLoadingData("Gagal memuat data. Silakan coba lagi.");
        toast.error("Gagal memuat data");
      } finally {
        setIsLoadingData(false);
      }
    };

    if (user?.id) {
      setFormData(prevData => ({
        ...prevData,
        warehouseUserId: user.id,
      }));
    }

    fetchDataAndCode();
  }, [user?.id]);

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

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = eligibleInvoices.find(inv => inv.id === invoiceId);
    setSelectedInvoice(invoice || null);
    handleInputChange("invoiceId", invoiceId);
  };

  const validateForm = (): boolean => {
    const newErrors: DeliveryNoteFormErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = "Nomor surat jalan harus diisi";
    }

    if (!formData.deliveryDate) {
      newErrors.deliveryDate = "Tanggal pengiriman harus diisi";
    }

    if (!formData.driverName.trim()) {
      newErrors.driverName = "Nama driver harus diisi";
    }

    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = "Nomor kendaraan harus diisi";
    }

    if (!formData.invoiceId) {
      newErrors.invoiceId = "Invoice harus dipilih";
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

    try {
      setIsSubmitting(true);

      const submitData = {
        code: formData.code,
        deliveryDate: new Date(formData.deliveryDate),
        driverName: formData.driverName,
        vehicleNumber: formData.vehicleNumber,
        notes: formData.notes || undefined,
        invoiceId: formData.invoiceId,
        warehouseUserId: formData.warehouseUserId,
      };

      const result = await createDeliveryNote(submitData);

      if (result.success) {
        toast.success("Surat jalan berhasil dibuat");
        router.push(`/sales/surat-jalan`);
      } else {
        toast.error(result.error || "Gagal membuat surat jalan");
      }
    } catch (error) {
      console.error("Kesalahan membuat surat jalan:", error);
      toast.error("Terjadi kesalahan saat membuat surat jalan");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * CREATE PAGE PRINT LOGIC:
   * Since data doesn't exist in database yet, we need to:
   * 1. Validate form data
   * 2. Save data to database first (createDeliveryNote)
   * 3. Generate PDF from the saved data
   * 4. Redirect to list page
   */
  // Create Page: Save data first, then generate PDF
  const handlePrintPdf = async () => {
    if (!selectedInvoice) {
      toast.error("Pilih invoice terlebih dahulu");
      return;
    }

    if (!validateForm()) {
      toast.error("Harap lengkapi semua field yang wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      // STEP 1: Save the delivery note data to database first
      const submitData = {
        code: formData.code,
        deliveryDate: new Date(formData.deliveryDate),
        driverName: formData.driverName,
        vehicleNumber: formData.vehicleNumber,
        notes: formData.notes || undefined,
        invoiceId: formData.invoiceId,
        warehouseUserId: formData.warehouseUserId,
      };

      const result = await createDeliveryNote(submitData);

      if (result.success) {
        // STEP 2: Get company profile data (use state if available, fallback to API call)
        const companyProfileData =
          companyProfile ||
          (await getCompanyProfiles()).find(profile => profile.isActive) ||
          (await getCompanyProfiles())[0] ||
          null;

        // STEP 3: After successful save, generate PDF from saved data
        const items: DeliveryNoteItem[] =
          selectedInvoice.invoiceItems?.map(item => ({
            productCode: item.products.code,
            productName: item.products.name,
            quantity: item.quantity, // Number of crates
            bottlesPerCrate: item.products.bottlesPerCrate || 24, // Use from database, fallback to 24
            totalBottles: item.quantity * (item.products.bottlesPerCrate || 24), // Calculate total bottles
            price: item.price,
            discount: item.discount,
            discountType: item.discountType as "FIXED" | "PERCENTAGE",
            totalPrice: item.totalPrice,
            notes: undefined, // No notes for individual items in this context
          })) || [];

        const pdfData: DeliveryNoteData = {
          // Company Information from profile
          companyName: companyProfileData?.name || "CV HM JAYA BERKAH",
          companyAddress: companyProfileData?.address || undefined,
          companyPhone: companyProfileData?.phone || undefined,

          // Delivery Note Information
          deliveryNoteNo: formData.code,
          deliveryDate: formatDate(new Date(formData.deliveryDate)),
          invoiceNo: selectedInvoice.code,
          invoiceDate: formatDate(selectedInvoice.invoiceDate),

          // Customer Information
          customerName: selectedInvoice.customer.name,
          customerAddress: selectedInvoice.customer.address || "",

          // Delivery Information
          driverName: formData.driverName,
          vehicleNumber: formData.vehicleNumber,
          notes: formData.notes,

          // Items
          items: items,

          // Totals
          subtotal: selectedInvoice.subtotal,
          discount: selectedInvoice.discount,
          tax: selectedInvoice.tax,
          taxPercentage: selectedInvoice.taxPercentage,
          totalAmount: selectedInvoice.totalAmount,

          // Additional Info
          warehouseStaff: user?.name || "",
          createdBy: user?.name || "",
        };

        generateDeliveryNotePdf(pdfData);
        toast.success(
          "Surat jalan berhasil disimpan ke database dan PDF berhasil di-generate"
        );
        router.push(`/sales/surat-jalan`);
      } else {
        toast.error(result.error || "Gagal menyimpan surat jalan ke database");
      }
    } catch (error) {
      console.error(
        "Kesalahan menyimpan surat jalan dan menghasilkan PDF:",
        error
      );
      toast.error(
        "Terjadi kesalahan saat menyimpan surat jalan dan generate PDF"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Buat Surat Jalan Baru"
          mainPageName={`/sales/surat-jalan`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Memuat data...</div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-2">
            Hanya invoice dengan fitur surat jalan yang diaktifkan akan
            ditampilkan.
          </div>
        </div>
      </div>
    );
  }

  if (errorLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Buat Surat Jalan Baru"
          mainPageName={`/sales/surat-jalan`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">{errorLoadingData}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Buat Surat Jalan Baru"
        mainPageName={`/sales/surat-jalan`}
        allowedRoles={data.allowedRole}
      />
      <ManagementForm
        subModuleName="surat-jalan"
        moduleName="sales"
        isSubmitting={isSubmitting}
        handleFormSubmit={handleSubmit}
        handlePrint={handlePrintPdf}
        hidePrintButton={!selectedInvoice} // CREATE PAGE: Show print button only when invoice is selected
      >
        {/* Informasi Form Section */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-4 text-gray-700 dark:text-gray-300">
            Informasi Surat Jalan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Nomor Surat Jalan" errorMessage={formErrors.code}>
              <Input
                name="code"
                type="text"
                value={formData.code}
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

        <FormField label="Pilih Invoice" errorMessage={formErrors.invoiceId}>
          {eligibleInvoices.length > 0 ? (
            <>
              <Select
                value={formData.invoiceId || ""}
                onChange={handleInvoiceChange}
                options={eligibleInvoices.map(invoice => ({
                  value: invoice.id,
                  label: `${invoice.code} - ${invoice.customer.name}`,
                }))}
                placeholder="Pilih Invoice"
                searchable={true}
                searchPlaceholder="Cari invoice..."
                className={formErrors.invoiceId ? "border-red-500" : ""}
              />
              <div className="text-xs text-gray-500 mt-1">
                Hanya invoice dengan fitur surat jalan (useDeliveryNote) yang
                diaktifkan akan ditampilkan.
              </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-100 rounded p-3 text-yellow-700 text-sm">
              Tidak ada invoice yang tersedia untuk dibuat surat jalan.
              <br />
              Pastikan invoice telah dicentang dengan "Menggunakan surat jalan"
              saat pembuatan.
            </div>
          )}
        </FormField>

        {selectedInvoice && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg dark:text-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Company Profile Information */}
              {companyProfile && (
                <div>
                  <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Profil Perusahaan
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Nama:</strong> {companyProfile.name}
                    </p>
                    <p>
                      <strong>Alamat:</strong> {companyProfile.address}
                    </p>
                    {companyProfile.phone && (
                      <p>
                        <strong>Telepon:</strong> {companyProfile.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Informasi Invoice
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Kode:</strong> {selectedInvoice.code}
                  </p>
                  <p>
                    <strong>Tanggal:</strong>{" "}
                    {new Date(selectedInvoice.invoiceDate).toLocaleDateString(
                      "id-ID"
                    )}
                  </p>
                  <p>
                    <strong>Customer:</strong> {selectedInvoice.customer.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Item Surat Jalan */}
            {selectedInvoice.invoiceItems &&
              selectedInvoice.invoiceItems.length > 0 && (
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
                          {selectedInvoice.invoiceItems.map((item, index) => (
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

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
