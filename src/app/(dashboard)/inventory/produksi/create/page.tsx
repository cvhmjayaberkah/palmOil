// app/inventory/manajemen-stok/create/page.tsx
"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  ManagementForm,
  InputDate,
} from "@/components/ui";
import {
  createProductionLog,
  getAvailableProducts,
} from "@/lib/actions/productions";
// [PERBAIKAN IMPORT] Perbaiki import getActiveCategories
import { getActiveCategories } from "@/lib/actions/categories"; // Pastikan path ini benar jika getActiveCategories ada di file ini
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { formatRupiah } from "@/utils/formatRupiah";
import { Trash2, Plus } from "lucide-react";
// generateCodeByTable import removed - no longer needed in frontend
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ProductionLogItemFormData {
  productId: string;
  quantity: number;
  notes?: string;
}

interface ProductionLogFormData {
  // code removed - now auto-generated in server
  productionDate: string;
  notes: string;
  producedById: string;
  items: ProductionLogItemFormData[];
}

interface ProductionLogFormErrors {
  code?: string; // [PERUBAHAN] Tambahkan 'code' ke interface error
  productionDate?: string;
  notes?: string;
  items?: {
    [key: number]: {
      productId?: string;
      quantity?: string;
      notes?: string;
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

export default function CreateProductionLogPage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  // [PERUBAHAN] Ganti isLoading menjadi isLoadingData untuk kejelasan
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null); // [BARU] State untuk error loading data

  const [formData, setFormData] = useState<ProductionLogFormData>({
    productionDate: new Date().toISOString().split("T")[0],
    notes: "",
    producedById: user?.id || "",
    items: [{ productId: "", quantity: 0, notes: "" }],
  });

  const [formErrors, setFormErrors] = useState<ProductionLogFormErrors>({});

  // useEffect untuk fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null); // Reset error

        // Fetch products data only
        const products = await getAvailableProducts();

        setAvailableProducts(products);
        setFormData(prevData => ({
          ...prevData,
          producedById: user?.id || prevData.producedById,
        }));
      } catch (error: any) {
        console.error("Error fetching initial data:", error);
        setErrorLoadingData(error.message || "Gagal memuat data awal.");
        toast.error(error.message || "Gagal memuat data awal.");
        // Reset form on error
        setFormData({
          productionDate: new Date().toISOString().split("T")[0],
          notes: "",
          producedById: "",
          items: [{ productId: "", quantity: 0, notes: "" }],
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  const validateForm = (): boolean => {
    const errors: ProductionLogFormErrors = {};

    // Code validation removed - auto-generated in server

    if (!formData.productionDate) {
      errors.productionDate = "Tanggal produksi wajib diisi";
    }

    if (formData.items.length === 0) {
      errors.items = { 0: { productId: "Minimal harus ada satu item" } };
    } else {
      const itemErrors: {
        [key: number]: {
          productId?: string;
          quantity?: string;
          notes?: string;
        };
      } = {};

      formData.items.forEach((item, index) => {
        const itemError: {
          productId?: string;
          quantity?: string;
          notes?: string;
        } = {};

        if (!item.productId) {
          itemError.productId = "Produk wajib dipilih";
        }

        if (!item.quantity || item.quantity <= 0) {
          itemError.quantity = "Quantity harus lebih dari 0";
        }

        // Notes item is optional, no validation for empty string
        // if (item.notes && item.notes.length > 255) { // Example for max length
        //   itemError.notes = "Catatan item tidak boleh melebihi 255 karakter";
        // }

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
    value: any // Gunakan 'any' jika nilai bisa string, boolean, number, dll.
  ) => {
    setFormData({ ...formData, [field]: value });

    if (
      field !== "producedById" &&
      formErrors[field as keyof ProductionLogFormErrors]
    ) {
      setFormErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
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

    if (formErrors.items?.[index]?.[field]) {
      const newErrors = { ...formErrors };
      if (newErrors.items) {
        delete newErrors.items[index][field];
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
      items: [...formData.items, { productId: "", quantity: 0, notes: "" }],
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.warning("Harap periksa kembali data yang Anda masukkan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createProductionLog({
        // code removed - auto-generated in server
        productionDate: new Date(formData.productionDate),
        notes: formData.notes || undefined,
        producedById: formData.producedById,
        items: formData.items.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          notes: item.notes || undefined,
        })),
      });

      if (result.success) {
        toast.success("Productions log berhasil dibuat.");
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        const errorMessage = result.error || "Gagal membuat production log";
        toast.error(errorMessage);
        // Set general error for form validation
        setFormErrors(prevErrors => ({
          ...prevErrors,
          // Remove code error handling since code is auto-generated
          producedById: result.error, // Example if producedById is causing an error
        }));
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat membuat production log:", error);
      toast.error("Terjadi kesalahan yang tidak terduga.");
      setFormErrors(prevErrors => ({
        ...prevErrors,
        general: "Terjadi kesalahan yang tidak terduga.", // Tambahkan field error general jika belum ada
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center p-8 bg-white dark:bg-gray-950 rounded-lg shadow-sm">
        <div className="text-gray-500 dark:text-gray-400">
          Memuat data produk...
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
        headerTittle="Tambah Produksi"
        mainPageName={`/${data.module}/${data.subModule.toLowerCase()}`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName={data.subModule.toLowerCase()}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Code field removed - now auto-generated in server */}
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
              onChange={date => {
                const dateString = date ? date.toISOString().split("T")[0] : "";
                handleInputChange("productionDate", dateString);
              }}
              errorMessage={formErrors.productionDate}
              placeholder="Pilih tanggal produksi"
            />
          </FormField>
        </div>

        <FormField label="Catatan" errorMessage={formErrors.notes}>
          <InputTextArea
            name="notes"
            placeholder="Masukkan catatan produksi (opsional)"
            value={formData.notes}
            onChange={e => handleInputChange("notes", e.target.value)}
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
                  required
                >
                  <select
                    value={item.productId}
                    onChange={e =>
                      handleItemChange(index, "productId", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                      formErrors.items?.[index]?.productId
                        ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <option value="">Pilih Produk</option>
                    {availableProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Stok Saat Ini"
                  errorMessage={formErrors.items?.[index]?.productId}
                >
                  <Input
                    type="text"
                    name={`currentStock-${index}`}
                    value={
                      item.productId
                        ? `${
                            availableProducts.find(p => p.id === item.productId)
                              ?.currentStock || 0
                          } ${
                            availableProducts.find(p => p.id === item.productId)
                              ?.unit || ""
                          }`
                        : "-"
                    }
                    readOnly
                    className="bg-gray-100 dark:bg-gray-700 cursor-default"
                  />
                </FormField>

                <FormField
                  label="Quantity"
                  errorMessage={formErrors.items?.[index]?.quantity}
                  required
                >
                  <Input
                    type="number"
                    name={`quantity-${index}`}
                    min="0"
                    step="0.01"
                    value={item.quantity.toString()}
                    onChange={e =>
                      handleItemChange(
                        index,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      </ManagementForm>
    </div>
  );
}
