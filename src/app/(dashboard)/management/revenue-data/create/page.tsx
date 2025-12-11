"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState } from "react";
import { Input, FormField, ManagementForm } from "@/components/ui";
import { createRevenueAnalytics } from "@/lib/actions/revenue-analytics";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";

interface RevenueAnalyticsFormData {
  period: string;
  timeRange: "MONTH" | "QUARTER" | "YEAR";
  totalRevenue: string;
  growth: string;
  bestMonth: string;
  topProduct: string;
  topSalesRep: string;
}

interface FormErrors {
  period?: string;
  totalRevenue?: string;
  [key: string]: string | undefined;
}

export default function CreateRevenueAnalyticsPage() {
  const data = useSharedData();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RevenueAnalyticsFormData>({
    period: "",
    timeRange: "MONTH",
    totalRevenue: "0",
    growth: "0",
    bestMonth: "",
    topProduct: "",
    topSalesRep: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.period.trim()) {
      errors.period = "Period wajib diisi";
    }

    if (parseFloat(formData.totalRevenue) < 0) {
      errors.totalRevenue = "Total revenue tidak boleh negatif";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    field: keyof RevenueAnalyticsFormData,
    value: any
  ) => {
    setFormData({ ...formData, [field]: value });

    if (formErrors[field]) {
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
      // Since createRevenueAnalytics is not implemented, show a warning
      toast.warning("Fitur ini belum diimplementasikan. Gunakan data invoice untuk analisis revenue.");
      router.push("/management/revenue-data");
      return;
      
      /* TODO: Uncomment when revenue analytics is properly implemented
      const result = await createRevenueAnalytics({
        period: formData.period,
        timeRange: formData.timeRange,
        totalRevenue: parseFloat(formData.totalRevenue) || 0,
        // ... other data
      });

      if (result.success) {
        toast.success("Revenue Analytics berhasil dibuat!");
        router.push("/management/revenue-data");
      } else {
        toast.error(result.error || "Gagal membuat revenue analytics");
      }
      */
    } catch (error) {
      console.error("Terjadi kesalahan saat membuat revenue analytics:", error);
      const errorMessage = "Terjadi kesalahan yang tidak terduga";
      toast.error(errorMessage);
      setFormErrors({ period: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Create Revenue Analytics Data"
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName={data.subModule}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
      >
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Period"
            htmlFor="period"
            required
            errorMessage={formErrors.period}
          >
            <Input
              type="text"
              name="period"
              placeholder="e.g., 2024-01, Q1-2024, 2024"
              value={formData.period}
              onChange={(e) => handleInputChange("period", e.target.value)}
            />
          </FormField>

          <FormField label="Time Range" htmlFor="timeRange" required>
            <select
              name="timeRange"
              value={formData.timeRange}
              onChange={(e) =>
                handleInputChange(
                  "timeRange",
                  e.target.value as "MONTH" | "QUARTER" | "YEAR"
                )
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="MONTH">Month</option>
              <option value="QUARTER">Quarter</option>
              <option value="YEAR">Year</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Total Revenue"
            htmlFor="totalRevenue"
            required
            errorMessage={formErrors.totalRevenue}
          >
            <Input
              type="number"
              name="totalRevenue"
              placeholder="0"
              value={formData.totalRevenue}
              onChange={(e) =>
                handleInputChange("totalRevenue", e.target.value)
              }
            />
          </FormField>

          <FormField label="Growth (%)" htmlFor="growth">
            <Input
              type="number"
              name="growth"
              placeholder="0"
              step="0.1"
              value={formData.growth}
              onChange={(e) => handleInputChange("growth", e.target.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="Best Month" htmlFor="bestMonth">
            <Input
              type="text"
              name="bestMonth"
              placeholder="e.g., January 2024"
              value={formData.bestMonth}
              onChange={(e) => handleInputChange("bestMonth", e.target.value)}
            />
          </FormField>

          <FormField label="Top Product" htmlFor="topProduct">
            <Input
              type="text"
              name="topProduct"
              placeholder="Product name"
              value={formData.topProduct}
              onChange={(e) => handleInputChange("topProduct", e.target.value)}
            />
          </FormField>

          <FormField label="Top Sales Rep" htmlFor="topSalesRep">
            <Input
              type="text"
              name="topSalesRep"
              placeholder="Sales representative name"
              value={formData.topSalesRep}
              onChange={(e) => handleInputChange("topSalesRep", e.target.value)}
            />
          </FormField>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <strong>Note:</strong> This is a simplified form. Detailed data
            (monthly trends, product performance, sales representatives, etc.)
            can be managed through the edit page after creation.
          </p>
        </div>
      </ManagementForm>
    </div>
  );
}
