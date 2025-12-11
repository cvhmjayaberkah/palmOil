"use client";
import { ManagementForm, ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Button,
  Input,
  FormField,
  InputCheckbox,
  InputTextArea,
} from "@/components/ui";
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "@/lib/actions/categories";
import { useRouter, useParams } from "next/navigation";
import { Categories } from "@prisma/client";
import { useSharedData } from "@/contexts/StaticData";
// --- [PERUBAHAN 1] Impor komponen yang dibutuhkan ---
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";

interface CategoryFormData {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface CategoryFormErrors {
  code?: string;
  name?: string;
  description?: string;
  isActive?: string;
}

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [category, setCategory] = useState<Categories | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });

  const data = useSharedData();

  const [formErrors, setFormErrors] = useState<CategoryFormErrors>({});

  // --- [PERUBAHAN 2] State untuk kontrol modal ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Load category data
  useEffect(() => {
    const loadCategory = async () => {
      // ... (logika useEffect tidak berubah) ...
      try {
        const categoryData = await getCategoryById(categoryId);
        if (categoryData) {
          setCategory(categoryData);
          setFormData({
            code: categoryData.code,
            name: categoryData.name,
            description: categoryData.description || "",
            isActive: categoryData.isActive,
          });
        } else {
          toast.error("Kategori tidak ditemukan.");
          router.push(`/${data.module}/${data.subModule}`);
        }
      } catch (error) {
        console.error("Error loading Kategori:", error);
        toast.error("Gagal memuat data kategori.");
        router.push(`/${data.module}/${data.subModule}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (categoryId) {
      loadCategory();
    }
  }, [categoryId, router, data.module, data.subModule]);

  const validateForm = (): boolean => {
    // ... (logika validateForm tidak berubah) ...
    const errors: CategoryFormErrors = {};

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
    // ... (logika handleInputChange tidak berubah) ...
    setFormData({ ...formData, [field]: value });
    if (formErrors[field as keyof CategoryFormErrors]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    // ... (logika handleFormSubmit tidak berubah, namun bisa ditambahkan toast) ...
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await updateCategory(categoryId, {
        code: formData.code,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      });
      if (result.success) {
        toast.success("Kategori berhasil diperbarui.");
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        setFormErrors({ name: result.error || "Gagal memperbarui kategori" });
      }
    } catch (error) {
      console.error("Error updating category:", error);
      setFormErrors({ name: "Terjadi kesalahan yang tidak terduga" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- [PERUBAHAN 3] Fungsi ini sekarang untuk Aksi Konfirmasi Hapus ---
  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteCategory(categoryId);

      if (result.success) {
        toast.success("Kategori berhasil dihapus.");
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        toast.error(result.error || "Gagal menghapus kategori");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Terjadi kesalahan yang tidak terduga saat menghapus.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false); // Selalu tutup modal setelah aksi selesai
    }
  };

  const handleToggleStatus = async () => {
    // ... (logika handleToggleStatus tidak berubah, tapi bisa juga pakai toast) ...
    try {
      const newStatus = !formData.isActive;
      const result = await toggleCategoryStatus(categoryId);

      if (result.success && result.data) {
        setCategory(result.data);
        setFormData({ ...formData, isActive: result.data.isActive });
        toast.success(
          `Status kategori diubah menjadi ${
            newStatus ? "Aktif" : "Tidak Aktif"
          }.`
        );
      } else {
        toast.error(result.error || "Gagal mengubah status kategori");
      }
    } catch (error) {
      console.error("Error toggling category status:", error);
      toast.error("Terjadi kesalahan yang tidak terduga");
    }
  };

  if (isLoading) {
    // ... (tampilan loading tidak berubah) ...
    return <div>Memuat...</div>;
  }

  if (!category) {
    // ... (tampilan kategori tidak ditemukan tidak berubah) ...
    return <div>Kategori tidak ditemukan</div>;
  }


  return (
    <>
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle={`Ubah ${data.subModule}`}
          mainPageName={`/${data.module}/${data.subModule}`}
          allowedRoles={data.allowedRole}
        />

        <ManagementForm
          subModuleName={data.subModule.toLowerCase()}
          moduleName={data.module}
          isSubmitting={isSubmitting || isDeleting} // Gabungkan state loading
          handleFormSubmit={handleFormSubmit}
          handleDelete={() => setIsDeleteModalOpen(true)}
          hideDeleteButton={false}
        >
          {/* ... Field-field form tidak berubah ... */}
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

      {/* --- [PERUBAHAN 5] Render komponen modal konfirmasi --- */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Konfirmasi Hapus Kategori"
      >
        <p>
          Apakah Anda yakin ingin menghapus kategori{" "}
          <strong>{formData.name}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
      </ConfirmationModal>
    </>
  );
}
