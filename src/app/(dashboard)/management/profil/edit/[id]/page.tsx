// app/management/profil/edit/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button, Input, InputTextArea } from "@/components/ui";
import {
  getCompanyProfileById,
  updateCompanyProfile,
  deleteCompanyProfile,
  CompanyProfileFormData,
} from "@/lib/actions/company-profiles";
import {
  ArrowLeft,
  Save,
  Trash2,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface CompanyProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  owner: string;
  bankAccountNumber: string;
  bankAccountNumber2?: string | null;
  accountType1: string;
  accountType2?: string | null;
  accountHolderName1?: string | null;
  accountHolderName2?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  code: string;
}

interface EditProfilPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditProfilPage({ params }: EditProfilPageProps) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const { user } = useCurrentUser();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<CompanyProfileFormData>({
    code: "",
    name: "",
    address: "",
    city: "",
    phone: "",
    owner: "",
    bankAccountNumber: "",
    bankAccountNumber2: "",
    accountType1: "Perusahaan",
    accountType2: "",
    accountHolderName1: "",
    accountHolderName2: "",
    isActive: true,
  });

  // Check if user has permission
  const hasPermission =
    user && user.role && ["OWNER", "ADMIN"].includes(user.role);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        setIsLoading(true);

        const result = await getCompanyProfileById(resolvedParams.id);

        if (result) {
          setCompanyProfile(result);
          setFormData({
            code: result.code,
            name: result.name,
            address: result.address,
            city: result.city,
            phone: result.phone || "",
            owner: result.owner,
            bankAccountNumber: result.bankAccountNumber,
            bankAccountNumber2: result.bankAccountNumber2 || "",
            accountType1: result.accountType1,
            accountType2: result.accountType2 || "",
            accountHolderName1: result.accountHolderName1 || "",
            accountHolderName2: result.accountHolderName2 || "",
            isActive: result.isActive,
          });
        } else {
          toast.error("Profil perusahaan tidak ditemukan");
          router.push("/management/profil");
        }
      } catch (error) {
        console.error("Error fetching company profile:", error);
        toast.error("Gagal memuat data profil perusahaan");
        router.push("/management/profil");
      } finally {
        setIsLoading(false);
      }
    };

    if (hasPermission && resolvedParams.id) {
      fetchCompanyProfile();
    }
  }, [hasPermission, resolvedParams.id, router]);

  const handleInputChange = (
    field: keyof CompanyProfileFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyProfile) return;

    try {
      setIsSubmitting(true);

      const result = await updateCompanyProfile(companyProfile.id, formData);

      if (result.success) {
        toast.success("Profil perusahaan berhasil diperbarui");
        router.push("/management/profil");
      } else {
        toast.error(result.error || "Gagal memperbarui profil perusahaan");
      }
    } catch (error) {
      console.error("Error updating company profile:", error);
      toast.error("Terjadi kesalahan saat memperbarui profil perusahaan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!companyProfile) return;

    try {
      setIsDeleting(true);

      const result = await deleteCompanyProfile(companyProfile.id);

      if (result.success) {
        toast.success("Profil perusahaan berhasil dihapus");
        router.push("/management/profil");
      } else {
        toast.error(result.error || "Gagal menghapus profil perusahaan");
      }
    } catch (error) {
      console.error("Error deleting company profile:", error);
      toast.error("Terjadi kesalahan saat menghapus profil perusahaan");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 dark:text-red-400">
          Anda tidak memiliki akses ke halaman ini.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">
          Memuat data profil perusahaan...
        </p>
      </div>
    );
  }

  if (!companyProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 dark:text-red-400">
          Profil perusahaan tidak ditemukan
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/management/profil")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Profil Perusahaan
              </h1>
              {/* <p className="text-sm text-gray-500">
                Kode: {companyProfile.code}
              </p> */}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                companyProfile.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {companyProfile.isActive ? "Aktif" : "Tidak Aktif"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informasi Perusahaan */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informasi Perusahaan
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nama Perusahaan *
                  </label>
                  <Input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={e => handleInputChange("name", e.target.value)}
                    placeholder="Masukkan nama perusahaan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pemilik Perusahaan *
                  </label>
                  <Input
                    name="owner"
                    type="text"
                    value={formData.owner}
                    onChange={e => handleInputChange("owner", e.target.value)}
                    placeholder="Masukkan nama pemilik"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alamat *
                </label>
                <InputTextArea
                  name="address"
                  value={formData.address}
                  onChange={e => handleInputChange("address", e.target.value)}
                  placeholder="Masukkan alamat lengkap perusahaan"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kota *
                  </label>
                  <Input
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={e => handleInputChange("city", e.target.value)}
                    placeholder="Masukkan nama kota"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nomor Telepon
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={e => handleInputChange("phone", e.target.value)}
                    placeholder="Masukkan nomor telepon"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informasi Perbankan */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Informasi Perbankan
              </h3>
            </div>
            <div className="px-6 py-4 space-y-6">
              {/* Rekening Bank 1 */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Rekening Bank 1
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nomor Rekening *
                    </label>
                    <Input
                      name="bankAccount"
                      type="text"
                      value={formData.bankAccountNumber}
                      onChange={e =>
                        handleInputChange("bankAccountNumber", e.target.value)
                      }
                      placeholder="Masukkan nomor rekening utama"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Jenis Nasabah *
                    </label>
                    <Input
                      name="accountType1"
                      type="text"
                      value={formData.accountType1}
                      onChange={e =>
                        handleInputChange("accountType1", e.target.value)
                      }
                      placeholder="Masukkan jenis nasabah (contoh: Perusahaan, Perorangan, UMKM, Korporasi)"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nama Penerima *
                    </label>
                    <Input
                      name="accountHolderName1"
                      type="text"
                      value={formData.accountHolderName1}
                      onChange={e =>
                        handleInputChange("accountHolderName1", e.target.value)
                      }
                      placeholder="Masukkan nama penerima rekening"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Rekening Bank 2 */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Rekening Bank 2 (Opsional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nomor Rekening
                    </label>
                    <Input
                      name="bankAccount2"
                      type="text"
                      value={formData.bankAccountNumber2}
                      onChange={e =>
                        handleInputChange("bankAccountNumber2", e.target.value)
                      }
                      placeholder="Masukkan nomor rekening kedua (opsional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Jenis Nasabah
                    </label>
                    <Input
                      name="accountType2"
                      type="text"
                      value={formData.accountType2}
                      onChange={e =>
                        handleInputChange("accountType2", e.target.value)
                      }
                      placeholder="Masukkan jenis nasabah untuk rekening kedua"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nama Penerima
                    </label>
                    <Input
                      name="accountHolderName2"
                      type="text"
                      value={formData.accountHolderName2}
                      onChange={e =>
                        handleInputChange("accountHolderName2", e.target.value)
                      }
                      placeholder="Masukkan nama penerima rekening kedua"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Status & Tindakan
              </h3>
            </div> */}
            <div className="px-6 py-4 space-y-4">
              {/* <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e =>
                    handleInputChange("isActive", e.target.checked)
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700"
                >
                  Profil Aktif
                </label>
              </div> */}

              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/management/profil")}
                >
                  Batal
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Konfirmasi Hapus
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Apakah Anda yakin ingin menghapus profil perusahaan ini?
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Menghapus..." : "Hapus"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
