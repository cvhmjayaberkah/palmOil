// app/inventory/manajemen-stok/edit/[id]/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  ManagementForm,
  InputDate,
  ManagementHeader,
} from "@/components/ui";
import {
  updateProductionLog,
  getProductionLogById,
  getAvailableProducts,
  getAvailableUsers,
  deleteProductionLog,
} from "@/lib/actions/productions";
import { useRouter, useParams } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";
import { formatRupiah } from "@/utils/formatRupiah";
import type { ProductionLogItemFormData } from "@/lib/actions/productions";

// [PERUBAHAN] Tambahkan 'code' ke ProductionLogFormData
interface ProductionLogFormData {
  code: string; // Kode akan diambil dari data yang sudah ada
  productionDate: string;
  notes: string;
  producedById: string;
  items: ProductionLogItemFormData[];
}

// [PERUBAHAN] Tambahkan 'code' ke ProductionLogFormErrors
interface ProductionLogFormErrors {
  code?: string;
  productionDate?: string;
  notes?: string;
  producedById?: string;
  items?: {
    [key: number]: {
      productId?: string;
      quantity?: string;
      salaryPerBottle?: string;
    };
  };
}

interface Product {
  id: string;
  name: string;
  code: string;
  unit: string;
  currentStock: number;
  bottlesPerCrate: number;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function EditProductionLogPage() {
  const data = useSharedData();
  const router = useRouter();
  const params = useParams();
  const productionLogId = params.id as string; // Gunakan ini sebagai ID unik

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Status loading keseluruhan halaman
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [formData, setFormData] = useState<ProductionLogFormData>({
    code: "", // [PERUBAHAN] Default kosong, akan diisi dari data yang diambil
    productionDate: "",
    notes: "",
    producedById: "",
    items: [{ productId: "", quantity: 0, salaryPerBottle: 0 }],
  });

  const [formErrors, setFormErrors] = useState<ProductionLogFormErrors>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true); // Mulai loading

        const [productionLog, products, users] = await Promise.all([
          getProductionLogById(productionLogId),
          getAvailableProducts(),
          getAvailableUsers(),
        ]);

        if (!productionLog) {
          toast.error("Productions log tidak ditemukan");
          router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
          return;
        }

        setAvailableProducts(products);
        setAvailableUsers(users);

        // Set form data with existing values from productionLog
        setFormData({
          code: productionLog.code, // [PERUBAHAN] Ambil code dari data yang ada
          productionDate: new Date(productionLog.productionDate)
            .toISOString()
            .split("T")[0],
          notes: productionLog.notes || "",
          producedById: productionLog.producedById,
          items: productionLog.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            salaryPerBottle: (item as any).salaryPerBottle || 0,
          })),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data.");
        // Redirect if data loading fails critically
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } finally {
        setIsLoading(false); // Selesai loading
      }
    };

    if (productionLogId) {
      fetchData();
    }
  }, [productionLogId, data.module, data.subModule, router]);

  const validateForm = (): boolean => {
    const errors: ProductionLogFormErrors = {};

    // [PERUBAHAN] Validasi untuk code (pastikan tidak kosong)
    if (!formData.code.trim()) {
      errors.code = "Kode produksi tidak boleh kosong.";
    }

    if (!formData.productionDate) {
      errors.productionDate = "Tanggal produksi wajib diisi";
    }

    if (!formData.producedById) {
      errors.producedById = "User yang melakukan produksi wajib dipilih";
    }

    if (formData.items.length === 0) {
      errors.items = { 0: { productId: "Minimal harus ada satu item" } };
    } else {
      const itemErrors: {
        [key: number]: {
          productId?: string;
          quantity?: string;
          salaryPerBottle?: string;
        };
      } = {};

      formData.items.forEach((item, index) => {
        const itemError: {
          productId?: string;
          quantity?: string;
          salaryPerBottle?: string;
        } = {};

        if (!item.productId) {
          itemError.productId = "Produk wajib dipilih";
        }

        if (!item.quantity || item.quantity <= 0) {
          itemError.quantity = "Quantity harus lebih dari 0";
        }

        if (!item.salaryPerBottle || item.salaryPerBottle < 0) {
          itemError.salaryPerBottle =
            "Gaji per botol harus lebih dari atau sama dengan 0";
        }

        if (Object.keys(itemError).length > 0) {
          itemErrors[index] = itemError;
        }
      });

      if (Object.keys(itemErrors).length > 0) {
        errors.items = itemErrors;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    field: keyof ProductionLogFormData,
    value: any
  ) => {
    setFormData({ ...formData, [field]: value });

    if (formErrors[field]) {
      setFormErrors((prevErrors) => ({ ...prevErrors, [field]: undefined }));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof ProductionLogItemFormData,
    value: any
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });

    if (formErrors.items?.[index] && field in formErrors.items[index]) {
      const newErrors = { ...formErrors };
      if (newErrors.items) {
        delete (newErrors.items[index] as any)[field];
        if (Object.keys(newErrors.items[index]).length === 0) {
          delete newErrors.items[index];
        }
      }
      setFormErrors(newErrors);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { productId: "", quantity: 0, salaryPerBottle: 0 },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
      // Hapus error terkait item yang dihapus
      const newErrors = { ...formErrors };
      if (newErrors.items) {
        delete newErrors.items[index];
      }
      setFormErrors(newErrors);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteProductionLog(productionLogId);

      if (result.success) {
        toast.success("Produksi berhasil dihapus.");
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        toast.error(result.error || "Gagal menghapus produksi");
      }
    } catch (error) {
      console.error("Error menghapus produksi:", error);
      toast.error("Terjadi kesalahan yang tidak terduga saat menghapus.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false); // Selalu tutup modal setelah aksi selesai
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.warning("Harap periksa kembali data yang Anda masukkan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateProductionLog(productionLogId, {
        code: formData.code, // [PERUBAHAN] Kirimkan kode yang sudah ada
        productionDate: new Date(formData.productionDate),
        notes: formData.notes || undefined,
        producedById: formData.producedById,
        items: formData.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          notes: item.notes || undefined,
          salaryPerBottle: Number(item.salaryPerBottle),
        })),
      });

      if (result.success) {
        toast.success("Productions log berhasil diperbarui.");
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        const errorMessage = result.error || "Gagal memperbarui production log";
        toast.error(errorMessage);
        setFormErrors((prevErrors) => ({
          ...prevErrors,
          code: result.error?.includes("duplicate")
            ? "Kode ini sudah ada. Harap coba lagi."
            : undefined, // Contoh error handling duplikat kode
          general: errorMessage, // Contoh error umum
        }));
      }
    } catch (error) {
      console.error(
        "Terjadi kesalahan saat memperbarui production log:",
        error
      );
      toast.error("Terjadi kesalahan yang tidak terduga.");
      setFormErrors((prevErrors) => ({
        ...prevErrors,
        general: "Terjadi kesalahan yang tidak terduga.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const userOptions = availableUsers.map((user) => ({
    value: user.id,
    label: `${user.name} (${user.role})`,
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8 bg-white dark:bg-gray-950 rounded-lg shadow-sm">
        <div className="text-gray-500 dark:text-gray-400">
          Memuat data produksi...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Edit Produksi"
        mainPageName={`/${data.module}/${data.subModule.toLowerCase()}`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName={data.subModule.toLowerCase()}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
        hideDeleteButton={false}
        handleDelete={() => setIsDeleteModalOpen(true)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* [BARU] Field Kode Produksi (READ-ONLY) */}
          <FormField
            label="Kode Produksi"
            htmlFor="code"
            required
            errorMessage={formErrors.code}
          >
            <Input
              type="text"
              name="code"
              value={formData.code}
              readOnly // Penting: Kode tidak boleh diubah
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-default dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
            />
          </FormField>

          <FormField
            label="Tanggal Produksi"
            errorMessage={formErrors.productionDate}
          >
            <InputDate
              value={
                formData.productionDate
                  ? new Date(formData.productionDate)
                  : null
              }
              onChange={(date) => {
                const dateString = date ? date.toISOString().split("T")[0] : "";
                handleInputChange("productionDate", dateString);
              }}
              errorMessage={formErrors.productionDate}
              placeholder="Pilih tanggal produksi"
            />
          </FormField>
        </div>

        <FormField label="Dibuat Oleh" errorMessage={formErrors.producedById}>
          <select
            value={formData.producedById}
            onChange={(e) => handleInputChange("producedById", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
              formErrors.producedById
                ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            <option value="">Pilih User</option>
            {userOptions.map((user) => (
              <option key={user.value} value={user.value}>
                {user.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Catatan" errorMessage={formErrors.notes}>
          <InputTextArea
            name="notes"
            placeholder="Masukkan catatan produksi (opsional)"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            errorMessage={formErrors.notes}
            rows={3}
          />
        </FormField>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Item Produksi
            </label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Plus size={16} />
              Tambah Item
            </button>
          </div>

          {formData.items.map((item, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-md space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Item #{index + 1}
                </h4>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="Produk"
                  errorMessage={formErrors.items?.[index]?.productId}
                >
                  <select
                    value={item.productId}
                    onChange={(e) =>
                      handleItemChange(index, "productId", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                      formErrors.items?.[index]?.productId
                        ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <option value="">Pilih Produk</option>
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.unit}) - Stock:{" "}
                        {product.currentStock}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Quantity"
                  errorMessage={formErrors.items?.[index]?.quantity}
                >
                  <Input
                    type="number"
                    name={`quantity-${index}`}
                    min="0"
                    step="0.01"
                    value={item.quantity.toString()}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    errorMessage={formErrors.items?.[index]?.quantity}
                    placeholder="0"
                  />
                </FormField>

                <FormField
                  label="Gaji Karyawan/Botol (Rp)"
                  errorMessage={formErrors.items?.[index]?.salaryPerBottle}
                >
                  <Input
                    type="number"
                    name={`salaryPerBottle-${index}`}
                    min="0"
                    step="1"
                    value={item.salaryPerBottle?.toString() || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleItemChange(
                        index,
                        "salaryPerBottle",
                        value === "" ? 0 : parseFloat(value)
                      );
                    }}
                    errorMessage={formErrors.items?.[index]?.salaryPerBottle}
                    placeholder="0"
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      </ManagementForm>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Konfirmasi Hapus Produksi"
      >
        <p>
          Apakah Anda yakin ingin menghapus Produksi{" "}
          <strong>{formData.code}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
      </ConfirmationModal>
    </div>
  );
}
