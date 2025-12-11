"use client";

import { ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputCheckbox,
  InputTextArea,
  ManagementForm,
  Select,
} from "@/components/ui";
import { createProduct, getActiveTaxForProducts } from "@/lib/actions/products";
import {
  calculateSellingPrice,
  validateProductData,
  formatCurrency,
} from "@/utils/productCalculations";
import { getActiveCategories } from "@/lib/actions/categories";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface ProductFormData {
  code: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  cost: number;
  sellingPrice: number;
  minStock: number;
  currentStock: number;
  isActive: boolean;
  categoryId: string;
  taxId: string;
  bottlesPerCrate: number | null;
  salaryPerBottle: number;
}

interface ProductFormErrors {
  code?: string;
  name?: string;
  description?: string;
  unit?: string;
  price?: string;
  cost?: string;
  sellingPrice?: string;
  minStock?: string;
  currentStock?: string;
  categoryId?: string;
  taxId?: string;
  isActive?: string;
  bottlesPerCrate?: string;
  salaryPerBottle?: string;
}

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface Tax {
  id: string;
  nominal: string;
  isActive: boolean;
}

export default function CreateProductPage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTax, setActiveTax] = useState<Tax | null>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    code: "",
    name: "",
    description: "",
    unit: "",
    price: 0,
    cost: 0,
    sellingPrice: 0,
    minStock: 0,
    currentStock: 0,
    isActive: true,
    categoryId: "",
    taxId: "",
    bottlesPerCrate: null,
    salaryPerBottle: 0,
  });

  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        // Fetch Categories and active tax
        const [categoriesData, activeTaxData] = await Promise.all([
          getActiveCategories(),
          getActiveTaxForProducts(),
        ]);

        const mappedCategories = categoriesData.map((cat) => ({
          id: cat.id,
          name: cat.name,
          isActive: cat.isActive,
        }));
        setCategories(mappedCategories);
        setActiveTax(activeTaxData);

        // Set default tax if available
        if (activeTaxData) {
          setFormData((prev) => ({ ...prev, taxId: activeTaxData.id }));
        }

        // Tidak generate kode otomatis, biarkan user input manual
      } catch (error: any) {
        console.error("Kesalahan memuat data awal:", error);
        setErrorLoadingData(
          error.message ||
            "Gagal memuat data initial. Harap muat ulang halaman."
        );
        toast.error("Gagal memuat data kategori.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Auto-sync: price follows sellingPrice
  useEffect(() => {
    if (formData.sellingPrice > 0) {
      setFormData((prev) => ({ ...prev, price: formData.sellingPrice }));
    }
  }, [formData.sellingPrice]);

  const validateForm = (): boolean => {
    const { errors, isValid } = validateProductData(formData);

    // If user is not OWNER, remove cost validation error if it exists
    if (user?.role !== "OWNER" && errors.cost) {
      delete errors.cost;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    field: keyof ProductFormData,
    value: string | boolean | number | null
  ) => {
    setFormData({ ...formData, [field]: value });

    if (formErrors[field as keyof ProductFormErrors]) {
      setFormErrors({ ...formErrors, [field]: undefined });
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
      const result = await createProduct({
        code: formData.code,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        unit: formData.unit.trim(),
        price: formData.price,
        cost: user?.role === "OWNER" ? formData.cost : 0, // Set cost to 0 if not OWNER
        sellingPrice: formData.sellingPrice,
        minStock: formData.minStock,
        currentStock: formData.currentStock,
        isActive: formData.isActive,
        categoryId: formData.categoryId,
        taxId: formData.taxId || undefined,
        bottlesPerCrate: formData.bottlesPerCrate,
        salaryPerBottle: formData.salaryPerBottle,
      });

      if (result.success) {
        toast.success(`Produk "${formData.name.trim()}" berhasil dibuat.`);
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        const errorMessage = result.error || `Gagal membuat ${data.subModule}`;
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "Terjadi kesalahan yang tidak terduga";
      toast.error(errorMessage);
      console.error(`Gagal membuat ${data.subModule}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  if (isLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle={`Buat ${data.subModule}`}
          mainPageName={`/${data.module}/${data.subModule}`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              Memuat formulir...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle={`Buat ${data.subModule}`}
          mainPageName={`/${data.module}/${data.subModule}`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500 dark:text-red-400">
              Error: {errorLoadingData}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Buat ${data.subModule}`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementForm
        subModuleName={data.subModule}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
        hideDeleteButton={true}
      >
        <FormField
          label="Kode Produk"
          htmlFor="code"
          required
          errorMessage={formErrors.code}
        >
          <Input
            type="text"
            name="code"
            placeholder="Masukkan kode produk"
            value={formData.code}
            onChange={(e) => handleInputChange("code", e.target.value)}
            disabled={isSubmitting}
            className={formErrors.code ? "border-red-500" : ""}
          />
        </FormField>

        <FormField
          label="Nama Produk"
          htmlFor="name"
          required
          errorMessage={formErrors.name}
        >
          <Input
            type="text"
            name="name"
            placeholder="Masukkan nama produk"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            maxLength={100}
          />
        </FormField>

        <FormField
          label="Deskripsi"
          htmlFor="description"
          errorMessage={formErrors.description}
        >
          <InputTextArea
            name="description"
            value={formData.description}
            placeholder="Masukkan deskripsi produk (opsional)"
            onChange={(e) => handleInputChange("description", e.target.value)}
            maxLength={500}
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.description.length}/500 karakter
          </p>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Satuan"
            htmlFor="unit"
            required
            errorMessage={formErrors.unit}
          >
            <Input
              type="text"
              name="unit"
              placeholder="contoh: pcs, kg, liter"
              value={formData.unit}
              onChange={(e) => handleInputChange("unit", e.target.value)}
              maxLength={20}
            />
          </FormField>

          <FormField
            label="Botol per Krat"
            htmlFor="bottlesPerCrate"
            errorMessage={formErrors.bottlesPerCrate}
          >
            <Input
              type="number"
              name="bottlesPerCrate"
              placeholder="Jumlah botol per krat (opsional)"
              value={formData.bottlesPerCrate?.toString() || ""}
              onChange={(e) =>
                handleInputChange(
                  "bottlesPerCrate",
                  parseInt(e.target.value) || null
                )
              }
              min="1"
            />
          </FormField>
        </div>

        <FormField
          label="Gaji per Botol (Rp)"
          htmlFor="salaryPerBottle"
          errorMessage={formErrors.salaryPerBottle}
        >
          <Input
            format="rupiah"
            type="number"
            name="salaryPerBottle"
            placeholder="Masukkan gaji per botol"
            value={formData.salaryPerBottle.toString()}
            onChange={(e) =>
              handleInputChange(
                "salaryPerBottle",
                parseFloat(e.target.value) || 0
              )
            }
            min="0"
            step="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Gaji karyawan per botol yang akan dihitung otomatis saat produksi
          </p>
        </FormField>

        <FormField
          label="Kategori"
          htmlFor="categoryId"
          required
          errorMessage={formErrors.categoryId}
        >
          <Select
            options={categoryOptions}
            value={formData.categoryId}
            onChange={(value) => handleInputChange("categoryId", value)}
            placeholder="— Pilih Kategori —"
          />
        </FormField>

        {/* HPP field - only visible for OWNER role */}
        {user?.role === "OWNER" && (
          <FormField
            label="HPP (Harga Pokok Penjualan)"
            htmlFor="cost"
            errorMessage={formErrors.cost}
          >
            <Input
              format="rupiah"
              type="number"
              name="cost"
              value={formData.cost.toString()}
              onChange={(e) =>
                handleInputChange("cost", parseFloat(e.target.value) || 0)
              }
              min="0"
              step="0.01"
            />
          </FormField>
        )}

        <FormField
          label="Harga Jual"
          htmlFor="sellingPrice"
          required
          errorMessage={formErrors.sellingPrice}
        >
          <Input
            format="rupiah"
            type="number"
            name="sellingPrice"
            value={formData.sellingPrice.toString()}
            onChange={(e) =>
              handleInputChange("sellingPrice", parseFloat(e.target.value) || 0)
            }
            min="0"
            step="1000"
          />
          <p className="text-xs text-gray-500 mt-1">
            Harga jual produk kepada pelanggan
          </p>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Stok Minimum"
            htmlFor="minStock"
            required
            errorMessage={formErrors.minStock}
          >
            <Input
              type="number"
              name="minStock"
              placeholder="0"
              value={formData.minStock.toString()}
              onChange={(e) =>
                handleInputChange("minStock", parseInt(e.target.value) || 0)
              }
              min="0"
            />
          </FormField>

          <FormField
            label="Stok Awal"
            htmlFor="currentStock"
            errorMessage={formErrors.currentStock}
          >
            <Input
              type="number"
              name="currentStock"
              placeholder="0"
              value={formData.currentStock.toString()}
              onChange={(e) =>
                handleInputChange("currentStock", parseInt(e.target.value) || 0)
              }
              min="0"
              readOnly
              className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Stok awal akan diatur di modul manajemen stok
            </p>
          </FormField>
        </div>
      </ManagementForm>
    </div>
  );
}
