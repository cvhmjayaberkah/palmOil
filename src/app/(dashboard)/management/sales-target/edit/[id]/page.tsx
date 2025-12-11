"use client";
import { ManagementForm, ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Button,
  Input,
  FormField,
  InputCheckbox,
  Select,
} from "@/components/ui";
import {
  getSalesTargetById,
  updateSalesTarget,
  deleteSalesTarget,
  toggleSalesTargetStatus,
  generateTargetPeriod,
  getSalesUsers,
} from "@/lib/actions/sales-targets";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";
import { TargetType } from "@prisma/client";

interface SalesTargetFormData {
  userId: string;
  targetType: TargetType;
  targetPeriod: string;
  targetAmount: number;
  isActive: boolean;
}

interface SalesTargetFormErrors {
  userId?: string;
  targetType?: string;
  targetPeriod?: string;
  targetAmount?: string;
  isActive?: string;
}

export default function EditSalesTargetPage() {
  const router = useRouter();
  const params = useParams();
  const targetId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [target, setTarget] = useState<any>(null);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState<SalesTargetFormData>({
    userId: "",
    targetType: "MONTHLY" as TargetType,
    targetPeriod: "",
    targetAmount: 0,
    isActive: true,
  });

  // Static configuration
  const config = {
    module: "management",
    subModule: "sales-target",
    allowedRole: ["OWNER", "ADMIN"],
  };

  const [formErrors, setFormErrors] = useState<SalesTargetFormErrors>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Load target data and sales users
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load sales users
        const users = await getSalesUsers();
        setSalesUsers(users);

        // Load target data
        const targetData = await getSalesTargetById(targetId);
        if (targetData) {
          setTarget(targetData);
          setFormData({
            userId: targetData.userId,
            targetType: targetData.targetType as TargetType,
            targetPeriod: targetData.targetPeriod,
            targetAmount: targetData.targetAmount,
            isActive: targetData.isActive,
          });
        } else {
          toast.error("Sales target tidak ditemukan.");
          router.push(`/${config.module}/${config.subModule}`);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Gagal memuat data.");
        router.push(`/${config.module}/${config.subModule}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (targetId) {
      loadData();
    }
  }, [targetId, router, config.module, config.subModule]);

  // Generate target period automatically when target type changes
  useEffect(() => {
    if (formData.targetType && !isLoading) {
      generateTargetPeriod(formData.targetType).then((newPeriod) => {
        setFormData((prev) => ({ ...prev, targetPeriod: newPeriod }));
      });
    }
  }, [formData.targetType, isLoading]);

  const validateForm = (): boolean => {
    const errors: SalesTargetFormErrors = {};

    if (!formData.userId) {
      errors.userId = "Sales user wajib dipilih";
    }

    if (!formData.targetType) {
      errors.targetType = "Tipe target wajib dipilih";
    }

    if (!formData.targetPeriod) {
      errors.targetPeriod = "Periode target wajib diisi";
    }

    if (formData.targetAmount <= 0) {
      errors.targetAmount = "Target krat harus lebih besar dari 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    field: keyof SalesTargetFormData,
    value: string | number | boolean
  ) => {
    setFormData({ ...formData, [field]: value });

    if (formErrors[field as keyof SalesTargetFormErrors]) {
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
      const result = await updateSalesTarget(targetId, {
        userId: formData.userId,
        targetType: formData.targetType,
        targetPeriod: formData.targetPeriod,
        targetAmount: formData.targetAmount,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success("Sales target berhasil diperbarui.");
        router.push(`/${config.module}/${config.subModule}`);
      } else {
        const errorMessage = result.error || "Gagal memperbarui sales target";
        toast.error(errorMessage);
        setFormErrors({
          userId: errorMessage,
        });
      }
    } catch (error) {
      console.error("Terjadi kesalahan saat memperbarui sales target:", error);
      const errorMessage = "Terjadi kesalahan yang tidak terduga";
      toast.error(errorMessage);
      setFormErrors({ userId: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSalesTarget(targetId);
      if (result.success) {
        toast.success("Sales target berhasil dihapus.");
        router.push(`/${config.module}/${config.subModule}`);
      } else {
        toast.error(result.error || "Gagal menghapus sales target");
      }
    } catch (error) {
      console.error("Error deleting sales target:", error);
      toast.error("Terjadi kesalahan saat menghapus sales target");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const result = await toggleSalesTargetStatus(targetId);
      if (result.success) {
        setTarget((prev: any) => ({ ...prev, isActive: !prev.isActive }));
        setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
        toast.success(
          `Status berhasil diubah menjadi ${
            formData.isActive ? "Nonaktif" : "Aktif"
          }`
        );
      } else {
        toast.error(result.error || "Gagal mengubah status");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Terjadi kesalahan saat mengubah status");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Sales target tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  // salesUsers is already loaded in state from useEffect above

  const targetTypeOptions = [
    { value: "", label: "Pilih Tipe Target" },
    { value: "MONTHLY", label: "Bulanan" },
    { value: "QUARTERLY", label: "Kuartalan" },
    { value: "YEARLY", label: "Tahunan" },
  ];

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Edit ${config.subModule
          .replace("-", " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase())}`}
        mainPageName={`/${config.module}/${config.subModule}`}
        allowedRoles={config.allowedRole}
      />

      <ManagementForm
        subModuleName={config.subModule}
        moduleName={config.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Sales User"
            htmlFor="userId"
            required
            errorMessage={formErrors.userId}
          >
            <Select
              value={formData.userId}
              onChange={(selectedValue: string) =>
                handleInputChange("userId", selectedValue)
              }
              options={[
                {
                  value: "",
                  label:
                    salesUsers.length === 0
                      ? "Tidak ada sales user tersedia"
                      : "Pilih Sales User",
                },
                ...salesUsers.map((user: any) => ({
                  value: user.id,
                  label: `${user.name} (${user.email})`,
                })),
              ]}
            />
          </FormField>

          <FormField
            label="Tipe Target"
            htmlFor="targetType"
            required
            errorMessage={formErrors.targetType}
          >
            <Select
              value={formData.targetType}
              onChange={(selectedValue: string) =>
                handleInputChange("targetType", selectedValue as TargetType)
              }
              options={targetTypeOptions}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Periode Target"
            htmlFor="targetPeriod"
            required
            errorMessage={formErrors.targetPeriod}
          >
            <Input
              type="text"
              name="targetPeriod"
              placeholder="Contoh: 2024-01, 2024-Q1, 2024"
              value={formData.targetPeriod}
              onChange={(e) =>
                handleInputChange("targetPeriod", e.target.value)
              }
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: YYYY-MM untuk bulanan, YYYY-Q1 untuk kuartalan, YYYY untuk
              tahunan
            </p>
          </FormField>

          <FormField
            label="Target Krat"
            htmlFor="targetAmount"
            required
            errorMessage={formErrors.targetAmount}
          >
            <Input
              type="number"
              name="targetAmount"
              placeholder="Masukkan target dalam krat"
              value={formData.targetAmount.toString()}
              onChange={(e) =>
                handleInputChange(
                  "targetAmount",
                  parseFloat(e.target.value) || 0
                )
              }
              min="0"
              step="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Target dalam satuan krat (bukan rupiah)
            </p>
          </FormField>
        </div>

        <FormField
          label="Status"
          htmlFor="isActive"
          errorMessage={formErrors.isActive}
        >
          <InputCheckbox
            checked={formData.isActive}
            onChange={(e) => handleInputChange("isActive", e.target.checked)}
            label="Aktif (target akan digunakan untuk tracking)"
          />
        </FormField>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={handleToggleStatus}
            className="w-full sm:w-auto"
          >
            {formData.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full sm:w-auto"
          >
            Hapus
          </Button>
        </div>
      </ManagementForm>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Konfirmasi Hapus"
        isLoading={isDeleting}
      >
        <p>
          Apakah Anda yakin ingin menghapus sales target untuk periode{" "}
          {formData.targetPeriod}? Tindakan ini tidak dapat dibatalkan.
        </p>
      </ConfirmationModal>
    </div>
  );
}
