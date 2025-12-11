"use client";

import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Tindakan",
  isLoading = false,
  children,
}: ConfirmationModalProps) {
  // Komponen footer untuk tombol aksi
  const modalFooter = (
    <>
      <Button variant="outline" onClick={onClose} disabled={isLoading}>
        Batal
      </Button>
      <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
        {isLoading ? "Memproses..." : "Ya, Lanjutkan"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      footer={modalFooter}
      showCloseButton={false}
    >
      {/* Custom Header dengan Icon di samping Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <FaExclamationTriangle
              className="h-4 w-4 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>

        {/* Custom Close Button */}
        <button
          onClick={onClose}
          className="
            text-gray-400 hover:text-gray-600 
            dark:hover:text-gray-300 
            rounded-md focus:outline-none focus:ring-2 
            focus:ring-offset-2 focus:ring-blue-500
            transition-all duration-200
          "
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="text-sm text-gray-600 dark:text-gray-300">{children}</div>
    </Modal>
  );
}
