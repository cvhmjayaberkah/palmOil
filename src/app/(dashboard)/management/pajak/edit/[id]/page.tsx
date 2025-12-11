"use client";
import { ManagementForm, ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
import { Button, Input, FormField, InputTextArea } from "@/components/ui";
import { getTaxById, updateTax, deleteTax } from "@/lib/actions/taxes";
import { useRouter, useParams } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";

interface TaxFormData {
  nominal: string;
  notes: string;
  isActive: boolean;
}

interface TaxFormErrors {
  nominal?: string;
  notes?: string;
  isActive?: string;
}

export default function EditTaxPage() {
  const router = useRouter();
  const params = useParams();
  const taxId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tax, setTax] = useState<any | null>(null);
  const [formData, setFormData] = useState<TaxFormData>({
    nominal: "",
    notes: "",
    isActive: false,
  });

  const data = useSharedData();

  const [formErrors, setFormErrors] = useState<TaxFormErrors>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Load tax data
  useEffect(() => {
    const loadTax = async () => {
      try {
        const taxData = await getTaxById(taxId);
        if (taxData) {
          setTax(taxData);
          setFormData({
            nominal: taxData.nominal,
            notes: taxData.notes || "",
            isActive: taxData.isActive || false,
          });
        } else {
          toast.error("Pajak tidak ditemukan.");
          router.push(`/${data.module}/${data.subModule}`);
        }
      } catch (error) {
        console.error("Error loading tax:", error);
        toast.error("Gagal memuat data pajak.");
        router.push(`/${data.module}/${data.subModule}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (taxId) {
      loadTax();
    }
  }, [taxId, router, data.module, data.subModule]);

  const validateForm = (): boolean => {
    const errors: TaxFormErrors = {};

    if (!formData.nominal.trim()) {
      errors.nominal = "Nominal pajak wajib diisi";
    } else if (isNaN(Number(formData.nominal.trim()))) {
      errors.nominal = "Nominal pajak harus berupa angka";
    } else if (Number(formData.nominal.trim()) < 0) {
      errors.nominal = "Nominal pajak tidak boleh negatif";
    }

    if (formData.notes && formData.notes.length > 500) {
      errors.notes = "Catatan tidak boleh melebihi 500 karakter";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    field: keyof TaxFormData,
    value: string | boolean
  ) => {
    setFormData({ ...formData, [field]: value });

    if (formErrors[field as keyof TaxFormErrors]) {
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
      const result = await updateTax(taxId, {
        nominal: formData.nominal.trim(),
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success(
          `Pajak "${formData.nominal.trim()}%" berhasil diperbarui.`
        );
        router.push(`/${data.module}/${data.subModule}`);
      } else {
        const errorMessage =
          result.error || `Gagal memperbarui ${data.subModule}`;
        toast.error(errorMessage);
        setFormErrors({
          nominal: errorMessage,
        });
      }
    } catch (error) {
      console.error("Error updating tax:", error);
      toast.error("Terjadi kesalahan saat memperbarui pajak.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTax(taxId);

      if (result.success) {
        toast.success(`Pajak berhasil dihapus.`);
        router.push(`/${data.module}/${data.subModule}`);
      } else {
        const errorMessage =
          result.error || `Gagal menghapus ${data.subModule}`;
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error deleting tax:", error);
      toast.error("Terjadi kesalahan saat menghapus pajak.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!tax) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">
            Pajak tidak ditemukan.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Edit ${data.subModule}`}
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName={data.subModule}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
        handleDelete={() => setIsDeleteModalOpen(true)}
        hideDeleteButton={false}
      >
        <FormField
          label="Nominal Pajak (%)"
          htmlFor="nominal"
          required
          errorMessage={formErrors.nominal}
        >
          <Input
            type="number"
            name="nominal"
            placeholder="Masukkan nominal pajak (contoh: 10 untuk 10%)"
            value={formData.nominal}
            onChange={e => handleInputChange("nominal", e.target.value)}
            min="0"
            max="100"
            step="0.01"
          />
        </FormField>

        <FormField
          label="Catatan"
          htmlFor="notes"
          errorMessage={formErrors.notes}
        >
          <InputTextArea
            name="notes"
            value={formData.notes}
            placeholder="Masukkan catatan pajak (opsional)"
            onChange={e => handleInputChange("notes", e.target.value)}
            maxLength={500}
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.notes.length}/500 karakter
          </p>
        </FormField>

        <FormField
          label="Status Aktif"
          htmlFor="isActive"
          errorMessage={formErrors.isActive}
        >
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={e => handleInputChange("isActive", e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              htmlFor="isActive"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Jadikan pajak ini sebagai pajak aktif
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Hanya satu pajak yang dapat aktif pada satu waktu. Mengaktifkan
            pajak ini akan menonaktifkan pajak lainnya.
          </p>
        </FormField>
      </ManagementForm>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Pajak"
        isLoading={isDeleting}
      >
        <p>
          Apakah Anda yakin ingin menghapus pajak "{tax.nominal}%"? Tindakan ini
          tidak dapat dibatalkan.
        </p>
      </ConfirmationModal>
    </div>
  );
}
