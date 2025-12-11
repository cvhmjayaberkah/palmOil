"use client";

import { ManagementHeader } from "@/components/ui";

import React, { useState, useEffect } from "react"; // [PERUBAHAN] Tambahkan useEffect

import {
  Input,
  FormField,
  InputCheckbox,
  InputTextArea,
  ManagementForm,
} from "@/components/ui";

import { createCategory } from "@/lib/actions/categories";

import { useRouter } from "next/navigation";

import { useSharedData } from "@/contexts/StaticData";

import { toast } from "sonner";

import { generateCodeByTable } from "@/utils/getCode"; // [PERBAIKAN] Pastikan path import benar ke lokasi file db-helpers.ts Anda
// Contoh: '@/lib/db-helpers' jika ada di lib
// Contoh: '@/utils/getCode' jika ada di utils/getCode.ts

interface CategoryFormData {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface CategoryFormErrors {
  code?: string; // [PERUBAHAN] Tambahkan error untuk code jika perlu
  name?: string;
  description?: string;
  isActive?: string;
}

export default function CreateCategoryPage() {
  const data = useSharedData();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    code: "", // Akan diisi otomatis oleh useEffect
    name: "",
    description: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<CategoryFormErrors>({});
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [errorGeneratingCode, setErrorGeneratingCode] = useState<string | null>(
    null
  ); // [BARU] State untuk error generasi code

  // --- [BARU] useEffect untuk menghasilkan dan mengisi kode saat komponen dimuat ---
  useEffect(() => {
    const fetchAndSetCode = async () => {
      try {
        setIsLoadingCode(true); // Mulai loading
        setErrorGeneratingCode(null); // Reset error
        // Panggil fungsi untuk mendapatkan kode otomatis untuk tabel 'Categories'
        const newCode = await generateCodeByTable("Categories");

        // Update state formData dengan kode yang baru
        setFormData(prevData => ({
          ...prevData, // Pertahankan nilai-nilai lain
          code: newCode,
        }));
      } catch (error: any) {
        console.error("Kesalahan membuat kode kategori awal:", error);
        setErrorGeneratingCode(
          error.message || "Gagal menghasilkan kode kategori awal."
        );
        // Anda bisa memilih untuk mengosongkan kode atau menampilkan pesan error
        setFormData(prevData => ({
          ...prevData,
          code: "ERROR_CODE", // Contoh: bisa diisi dengan string error atau kosong
        }));
      } finally {
        setIsLoadingCode(false); // Selesai loading
      }
    };

    fetchAndSetCode();
  }, []); // Array dependensi kosong agar hanya berjalan sekali saat komponen mount

  const validateForm = (): boolean => {
    const errors: CategoryFormErrors = {};

    if (!formData.code.trim()) {
      // [PERUBAHAN] Tambahkan validasi untuk code
      errors.code = "Kode kategori tidak boleh kosong.";
    }

    if (!formData.name.trim()) {
      errors.name = "Nama kategori wajib diisi";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Nama kategori minimal 2 karakter";
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = "Deskripsi tidak boleh melebihi 500 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    field: keyof CategoryFormData,
    value: string | boolean
  ) => {
    setFormData({ ...formData, [field]: value });

    // Hapus error terkait field yang diubah
    if (formErrors[field as keyof CategoryFormErrors]) {
      setFormErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
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
      // Pastikan objek yang dikirim ke createCategory memiliki 'code'
      const result = await createCategory({
        code: formData.code, // [PERUBAHAN] Kirimkan kode yang sudah digenerate
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success(`Kategori "${formData.name.trim()}" berhasil dibuat.`);
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        const errorMessage = result.error || `Gagal membuat ${data.subModule}`;
        toast.error(errorMessage);
        setFormErrors({
          name: errorMessage, // [PERUBAHAN] Arahkan error ke field 'name' atau 'code' yang sesuai
        });
      }
    } catch (error) {
      console.error(`Terjadi kesalahan saat membuat ${data.subModule}:`, error);
      const errorMessage = "Terjadi kesalahan yang tidak terduga";
      toast.error(errorMessage);
      setFormErrors({ name: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- [BARU] Tampilkan loading atau error saat mengambil kode awal ---
  if (isLoadingCode) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Memuat formulir... Sedang menghasilkan kode kategori...
        </p>
      </div>
    );
  }

  if (errorGeneratingCode) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-red-500">
          Error: {errorGeneratingCode}. Harap muat ulang halaman.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Buat ${data.subModule}`}
        mainPageName={`/${data.module}/${data.subModule.toLowerCase()}`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName={data.subModule.toLowerCase()}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
      >
        <FormField
          label="Kode Kategori"
          htmlFor="code"
          required
          errorMessage={formErrors.code}
        >
          <Input
            type="text"
            name="code"
            value={formData.code}
            readOnly // Kode digenerate otomatis, tidak bisa diubah manual
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-default dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
          />
        </FormField>

        <FormField
          label="Nama Kategori"
          htmlFor="name"
          required
          errorMessage={formErrors.name}
        >
          <Input
            type="text"
            name="name"
            placeholder="Masukkan nama kategori"
            value={formData.name}
            onChange={e => handleInputChange("name", e.target.value)}
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
            placeholder="Masukkan deskripsi kategori (opsional)"
            onChange={e => handleInputChange("description", e.target.value)}
            maxLength={500}
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.description.length}/500 karakter
          </p>
        </FormField>

        <FormField
          label="Status"
          htmlFor="isActive"
          errorMessage={formErrors.isActive}
        >
          <InputCheckbox
            checked={formData.isActive}
            onChange={e => handleInputChange("isActive", e.target.checked)}
            label="Aktif (kategori akan tersedia untuk digunakan)"
          />
        </FormField>
      </ManagementForm>
    </div>
  );
}
