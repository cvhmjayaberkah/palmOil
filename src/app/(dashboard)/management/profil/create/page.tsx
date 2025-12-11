// app/management/profil/create/page.tsx
"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  ManagementForm,
} from "@/components/ui";
import { createCompanyProfile } from "@/lib/actions/company-profiles";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { generateCodeByTable } from "@/utils/getCode";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface CompanyProfileFormData {
  code: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  owner: string;
  bankAccountNumber: string;
  accountType: string;
  accountHolderName1: string;
  isActive: boolean;
}

interface CompanyProfileFormErrors {
  code?: string;
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  owner?: string;
  bankAccountNumber?: string;
  accountType?: string;
  accountHolderName1?: string;
}

export default function CreateCompanyProfilePage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);

  const [formData, setFormData] = useState<CompanyProfileFormData>({
    code: "",
    name: "",
    address: "",
    city: "",
    phone: "",
    owner: "",
    bankAccountNumber: "",
    accountType: "",
    accountHolderName1: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<CompanyProfileFormErrors>({});

  // Check if user has permission
  const hasPermission =
    user && user.role && data?.allowedRole?.includes(user.role);

  useEffect(() => {
    const fetchDataAndCode = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        // Generate company profile code
        const generatedCode = await generateCodeByTable("CompanyProfiles");

        setFormData(prev => ({
          ...prev,
          code: generatedCode,
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorLoadingData(
          error instanceof Error ? error.message : "Failed to fetch data"
        );
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDataAndCode();
  }, []);

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">
          Anda tidak memiliki akses ke halaman ini.
        </p>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    );
  }

  if (errorLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Error: {errorLoadingData}</p>
      </div>
    );
  }

  const validateForm = (): boolean => {
    const errors: CompanyProfileFormErrors = {};

    if (!formData.code.trim()) {
      errors.code = "Kode profil perusahaan harus diisi";
    }

    if (!formData.name.trim()) {
      errors.name = "Nama perusahaan harus diisi";
    }

    if (!formData.address.trim()) {
      errors.address = "Alamat harus diisi";
    }

    if (!formData.city.trim()) {
      errors.city = "Kota harus diisi";
    }

    if (!formData.owner.trim()) {
      errors.owner = "Nama pemilik harus diisi";
    }

    if (!formData.bankAccountNumber.trim()) {
      errors.bankAccountNumber = "Nomor rekening harus diisi";
    }

    if (!formData.accountType.trim()) {
      errors.accountType = "Jenis nasabah harus diisi";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Mohon periksa kembali data yang diisi");
      return;
    }

    setIsSubmitting(true);

    try {
      const companyProfileData = {
        code: formData.code,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        phone: formData.phone || undefined,
        owner: formData.owner,
        bankAccountNumber: formData.bankAccountNumber,
        accountType1: formData.accountType,
        accountHolderName1: formData.accountHolderName1,
        isActive: formData.isActive,
      };

      const result = await createCompanyProfile(companyProfileData);

      if (result.success) {
        toast.success("Profil perusahaan berhasil dibuat");
        router.push("/management/profil");
      } else {
        toast.error(result.error || "Gagal membuat profil perusahaan");
      }
    } catch (error) {
      console.error("Error creating company profile:", error);
      toast.error("Terjadi kesalahan saat membuat profil perusahaan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof CompanyProfileFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (formErrors[field as keyof CompanyProfileFormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return (
    <div>
      <ManagementHeader
        allowedRoles={["OWNER", "ADMIN"]}
        mainPageName="/management/profil"
        headerTittle="Tambah Profil Perusahaan"
      />

      <ManagementForm
        subModuleName="profil"
        moduleName="management"
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
        disableSubmit={isSubmitting}
      >
        {/* Kode Profil & Nama Perusahaan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Kode Profil" errorMessage={formErrors.code}>
            <Input
              readOnly
              type="text"
              name="code"
              value={formData.code}
              onChange={e => handleInputChange("code", e.target.value)}
              placeholder="Kode profil perusahaan"
              disabled={isSubmitting}
              className={formErrors.code ? "border-red-500" : ""}
            />
          </FormField>

          <FormField
            label="Nama Perusahaan"
            required
            errorMessage={formErrors.name}
          >
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={e => handleInputChange("name", e.target.value)}
              placeholder="Nama perusahaan"
              disabled={isSubmitting}
              className={formErrors.name ? "border-red-500" : ""}
            />
          </FormField>
        </div>

        {/* Alamat */}
        <FormField label="Alamat" required errorMessage={formErrors.address}>
          <InputTextArea
            name="address"
            value={formData.address}
            onChange={e => handleInputChange("address", e.target.value)}
            placeholder="Alamat lengkap perusahaan"
            disabled={isSubmitting}
            className={formErrors.address ? "border-red-500" : ""}
            rows={3}
          />
        </FormField>

        {/* Kota & Telepon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Kota" required errorMessage={formErrors.city}>
            <Input
              type="text"
              name="city"
              value={formData.city}
              onChange={e => handleInputChange("city", e.target.value)}
              placeholder="Nama kota"
              disabled={isSubmitting}
              className={formErrors.city ? "border-red-500" : ""}
            />
          </FormField>

          <FormField label="Telepon" errorMessage={formErrors.phone}>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={e => handleInputChange("phone", e.target.value)}
              placeholder="021xxxxxxxx"
              disabled={isSubmitting}
              className={formErrors.phone ? "border-red-500" : ""}
            />
          </FormField>
        </div>

        {/* Pemilik Perusahaan & Jenis Nasabah */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Pemilik Perusahaan"
            required
            errorMessage={formErrors.owner}
          >
            <Input
              type="text"
              name="owner"
              value={formData.owner}
              onChange={e => handleInputChange("owner", e.target.value)}
              placeholder="Nama pemilik perusahaan"
              disabled={isSubmitting}
              className={formErrors.owner ? "border-red-500" : ""}
            />
          </FormField>

          <FormField
            label="Jenis Nasabah"
            required
            errorMessage={formErrors.accountType}
          >
            <Input
              type="text"
              name="accountType"
              value={formData.accountType}
              onChange={e => handleInputChange("accountType", e.target.value)}
              placeholder="Contoh: Perusahaan, Perorangan"
              disabled={isSubmitting}
              className={formErrors.accountType ? "border-red-500" : ""}
            />
          </FormField>
        </div>

        {/* Nomor Rekening & Nama Penerima */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Nomor Rekening"
            required
            errorMessage={formErrors.bankAccountNumber}
          >
            <Input
              type="text"
              name="bankAccountNumber"
              value={formData.bankAccountNumber}
              onChange={e =>
                handleInputChange("bankAccountNumber", e.target.value)
              }
              placeholder="Nomor rekening bank"
              disabled={isSubmitting}
              className={formErrors.bankAccountNumber ? "border-red-500" : ""}
            />
          </FormField>

          <FormField
            label="Nama Penerima"
            required
            errorMessage={formErrors.accountHolderName1}
          >
            <Input
              type="text"
              name="accountHolderName1"
              value={formData.accountHolderName1}
              onChange={e =>
                handleInputChange("accountHolderName1", e.target.value)
              }
              placeholder="Nama penerima rekening"
              disabled={isSubmitting}
              className={formErrors.accountHolderName1 ? "border-red-500" : ""}
            />
          </FormField>
        </div>

        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Status">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={e => handleInputChange("isActive", e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Profil Aktif
              </label>
            </div>
          </FormField>
        </div>
      </ManagementForm>
    </div>
  );
}
