// app/management/kustomer/create/page.tsx
"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  ManagementForm,
} from "@/components/ui";
import { createCustomer } from "@/lib/actions/customers";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { generateCodeByTable } from "@/utils/getCode";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface CustomerFormData {
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  isActive: boolean;
}

interface CustomerFormErrors {
  code?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}

export default function CreateCustomerPage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);

  const [formData, setFormData] = useState<CustomerFormData>({
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<CustomerFormErrors>({});

  // Check if user has permission
  const hasPermission =
    user && user.role && data?.allowedRole?.includes(user.role);

  useEffect(() => {
    const fetchDataAndCode = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        // Generate customer code
        const generatedCode = await generateCodeByTable("Customers");

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
    const errors: CustomerFormErrors = {};

    if (!formData.code.trim()) {
      errors.code = "Kode customer harus diisi";
    }

    if (!formData.name.trim()) {
      errors.name = "Nama customer harus diisi";
    }

    if (!formData.address.trim()) {
      errors.address = "Alamat harus diisi";
    }

    if (!formData.city.trim()) {
      errors.city = "Kota harus diisi";
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Format email tidak valid";
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
      const customerData = {
        code: formData.code,
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address,
        city: formData.city,
        isActive: formData.isActive,
      };

      const result = await createCustomer(customerData);

      if (result.success) {
        toast.success("Customer berhasil dibuat");
        router.push("/management/kustomer");
      } else {
        toast.error(result.error || "Gagal membuat customer");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("Terjadi kesalahan saat membuat customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof CustomerFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (formErrors[field as keyof CustomerFormErrors]) {
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
        mainPageName="/management/kustomer"
        headerTittle="Tambah Kustomer"
      />

      <ManagementForm
        subModuleName="kustomer"
        moduleName="management"
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
        disableSubmit={isSubmitting}
      >
        {/* Kode Customer & Nama Customer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Kode Customer" errorMessage={formErrors.code}>
            <Input
              readOnly
              type="text"
              name="code"
              value={formData.code}
              onChange={e => handleInputChange("code", e.target.value)}
              placeholder="Kode customer"
              disabled={isSubmitting}
              className={formErrors.code ? "border-red-500" : ""}
            />
          </FormField>

          <FormField
            label="Nama Customer"
            required
            errorMessage={formErrors.name}
          >
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={e => handleInputChange("name", e.target.value)}
              placeholder="Nama customer"
              disabled={isSubmitting}
              className={formErrors.name ? "border-red-500" : ""}
            />
          </FormField>
        </div>

        {/* Email & Telepon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Email" errorMessage={formErrors.email}>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={e => handleInputChange("email", e.target.value)}
              placeholder="email@example.com"
              disabled={isSubmitting}
              className={formErrors.email ? "border-red-500" : ""}
            />
          </FormField>

          <FormField label="Telepon" required errorMessage={formErrors.phone}>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={e => handleInputChange("phone", e.target.value)}
              placeholder="08xxxxxxxxxx"
              disabled={isSubmitting}
              className={formErrors.phone ? "border-red-500" : ""}
            />
          </FormField>
        </div>

        {/* Alamat */}
        <FormField label="Alamat" required errorMessage={formErrors.address}>
          <InputTextArea
            name="address"
            value={formData.address}
            onChange={e => handleInputChange("address", e.target.value)}
            placeholder="Alamat lengkap customer"
            disabled={isSubmitting}
            className={formErrors.address ? "border-red-500" : ""}
            rows={3}
          />
        </FormField>

        {/* Kota */}
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
      </ManagementForm>
    </div>
  );
}
