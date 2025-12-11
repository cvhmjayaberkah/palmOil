// app/management/profil/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getCompanyProfiles,
  createCompanyProfile,
} from "@/lib/actions/company-profiles";
import { Badge, Button } from "@/components/ui";
import {
  Edit,
  Building2,
  MapPin,
  Phone,
  User,
  CreditCard,
  UserCheck,
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

export default function ProfilPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Check if user has permission
  const hasPermission =
    user && user.role && ["OWNER", "ADMIN"].includes(user.role);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const profiles = await getCompanyProfiles();

        if (profiles.length > 0) {
          setCompanyProfile(profiles[0]); // Ambil profil pertama (seharusnya hanya ada satu)
        } else {
          setCompanyProfile(null); // Tidak ada profil
        }
      } catch (error) {
        console.error("Error fetching company profile:", error);
        setError("Gagal memuat data profil perusahaan");
      } finally {
        setIsLoading(false);
      }
    };

    if (hasPermission) {
      fetchCompanyProfile();
    }
  }, [hasPermission]);

  const handleCreateProfile = async () => {
    try {
      setIsCreating(true);

      // Generate code for new profile
      //   const generatedCode = await generateCodeByTable("CompanyProfiles");

      const defaultProfileData = {
        code: "001",
        name: "CV. HM Jaya Berkah",
        address:
          "Jl. Raya Dumajah Timur Kec. Tanah Merah Kab. Bangkalan Jawa Timur",
        city: "Bangkalan",
        phone: "087753833139",
        owner: "LAILATUL QAMARIYAH",
        bankAccountNumber: "1855999911",
        bankAccountNumber2: "",
        accountType1: "BCA",
        accountType2: "",
        accountHolderName1: "LAILATUL QAMARIYAH",
        accountHolderName2: "",
        isActive: true,
      };

      const result = await createCompanyProfile(defaultProfileData);

      if (result.success && result.data) {
        setCompanyProfile(result.data);
        toast.success(
          "Profil perusahaan berhasil dibuat. Silakan edit data sesuai kebutuhan."
        );
      } else {
        toast.error(result.error || "Gagal membuat profil perusahaan");
      }
    } catch (error) {
      console.error("Error creating company profile:", error);
      toast.error("Terjadi kesalahan saat membuat profil perusahaan");
    } finally {
      setIsCreating(false);
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Jika tidak ada profil, tampilkan tombol untuk membuat profil
  if (!companyProfile) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Profil Perusahaan
            </h1>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Belum Ada Profil Perusahaan
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Buat profil perusahaan untuk memulai mengelola informasi
              perusahaan Anda.
            </p>
            <Button
              onClick={handleCreateProfile}
              disabled={isCreating}
              className="inline-flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              {isCreating ? "Membuat..." : "Buat Profil Perusahaan"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Tampilkan profil perusahaan
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Profil Perusahaan
          </h1>
          <Button
            onClick={() =>
              router.push(`/management/profil/edit/${companyProfile.id}`)
            }
            className="inline-flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Profil
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Header dengan Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {companyProfile.name}
                </h2>
                <Badge colorScheme={companyProfile.isActive ? "green" : "red"}>
                  {companyProfile.isActive ? "Aktif" : "Tidak Aktif"}
                </Badge>
              </div>
            </div>
            {/* <div className="px-6 py-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Kode Profil
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {companyProfile.code}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Tanggal Dibuat
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(companyProfile.createdAt).toLocaleDateString(
                      "id-ID"
                    )}
                  </dd>
                </div>
              </dl>
            </div> */}
          </div>

          {/* Informasi Alamat */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Informasi Alamat
              </h3>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Alamat
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {companyProfile.address}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Kota
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {companyProfile.city}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Telepon
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {companyProfile.phone || "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Informasi Pemilik & Bank */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Pemilik & Perbankan
              </h3>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Pemilik Perusahaan
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {companyProfile.owner}
                  </dd>
                </div>

                {/* Rekening 1 */}
                <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Rekening Bank 1
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Nomor Rekening
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                        {companyProfile.bankAccountNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Jenis Nasabah
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {companyProfile.accountType1}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Nama Penerima
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {companyProfile.accountHolderName1 || "-"}
                      </dd>
                    </div>
                  </div>
                </div>

                {/* Rekening 2 */}
                {companyProfile.bankAccountNumber2 && (
                  <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Rekening Bank 2
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Nomor Rekening
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                          {companyProfile.bankAccountNumber2}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Jenis Nasabah
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                          {companyProfile.accountType2 || "-"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Nama Penerima
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                          {companyProfile.accountHolderName2 || "-"}
                        </dd>
                      </div>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
