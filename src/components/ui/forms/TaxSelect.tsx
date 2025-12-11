"use client";

import React, { useState, useEffect } from "react";
import { Select } from "@/components/ui";
import { getTaxes } from "@/lib/actions/taxes";

interface TaxSelectProps {
  value?: string;
  onChange: (
    value: string,
    taxData?: { id: string; nominal: string; notes?: string }
  ) => void;
  placeholder?: string;
  required?: boolean;
  name: string;
  errorMessage?: string;
  className?: string;
  disabled?: boolean;
  returnValue?: "id" | "percentage"; // New prop to control what value is returned
}

interface TaxOption {
  value: string;
  label: string;
  taxData?: { id: string; nominal: string; notes?: string };
}

export default function TaxSelect({
  value = "",
  onChange,
  placeholder = "Pilih pajak",
  required = false,
  name,
  errorMessage,
  className = "",
  disabled = false,
  returnValue = "id", // Default to returning ID
}: TaxSelectProps) {
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTaxes = async () => {
      try {
        setIsLoading(true);
        const taxes = await getTaxes();

        const options: TaxOption[] = taxes.map(tax => ({
          value: returnValue === "id" ? tax.id : tax.nominal,
          label: `${tax.nominal}% ${tax.notes ? `- ${tax.notes}` : ""}`,
          taxData: {
            id: tax.id,
            nominal: tax.nominal,
            notes: tax.notes || undefined,
          },
        }));

        setTaxOptions([{ value: "", label: placeholder }, ...options]);
      } catch (error) {
        console.error("Error loading taxes:", error);
        setTaxOptions([{ value: "", label: "Error loading taxes" }]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTaxes();
  }, [placeholder, returnValue]);

  const handleChange = (value: string) => {
    const selectedOption = taxOptions.find(option => option.value === value);
    onChange(value, selectedOption?.taxData);
  };

  if (isLoading) {
    return (
      <Select
        value=""
        onChange={() => {}}
        className={className}
        options={[{ value: "", label: "Loading taxes..." }]}
      />
    );
  }

  return (
    <Select
      value={value}
      onChange={handleChange}
      className={className}
      options={taxOptions}
      errorMessage={errorMessage}
    />
  );
}
