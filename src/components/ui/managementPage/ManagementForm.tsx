"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { FaArrowLeft, FaSave, FaTrash, FaPrint } from "react-icons/fa";

interface ManagementFormProps {
  children: React.ReactNode;
  subModuleName: string;
  moduleName: string;
  isSubmitting?: boolean;
  handleFormSubmit: (event: React.FormEvent) => void;
  // --- [PERBAIKAN] Ubah tipe data di sini ---
  handleDelete?: () => void;
  hideDeleteButton?: boolean;
  handlePrint?: () => void;
  hidePrintButton?: boolean;
  disableSubmit?: boolean;
}

export default function ManagementForm({
  children,
  subModuleName,
  moduleName,
  isSubmitting = false,
  handleFormSubmit,
  handleDelete,
  hideDeleteButton = true,
  handlePrint,
  hidePrintButton = true,
  disableSubmit = false,
}: ManagementFormProps) {
  const router = useRouter();
  const subModule = subModuleName.split(" ");

  return (
    <div className="flex flex-col">
      <div className="p-3 md:px-28 md:py-6">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {children}

          <div className="flex gap-4 pt-4">
            {/* Tombol "Kembali" di kiri */}
            <Button
              type="button"
              variant="outline"
              className="w-full max-w-[100px] flex items-center justify-center gap-2"
              onClick={() =>
                router.push(`/${moduleName}/${subModuleName.toLowerCase()}`)
              }
              disabled={isSubmitting}
            >
              <FaArrowLeft /> Kembali
            </Button>

            <div className="flex gap-4 ml-auto">
              {/* Kontainer untuk Print, Hapus dan Simpan, didorong ke kanan */}
              {!hidePrintButton && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full max-w-[100px] flex items-center justify-center gap-2"
                  onClick={handlePrint}
                  disabled={isSubmitting}
                >
                  <FaPrint /> Print
                </Button>
              )}
              {!hideDeleteButton && (
                <Button
                  type="button"
                  variant="danger"
                  className="w-full max-w-[100px] flex items-center justify-center gap-2"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  <FaTrash /> Hapus
                </Button>
              )}
              {/* Tombol "Simpan" di kanan */}
              {!disableSubmit && (
                <Button
                  type="submit"
                  className="w-full max-w-[100px] flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  <FaSave /> Simpan
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
