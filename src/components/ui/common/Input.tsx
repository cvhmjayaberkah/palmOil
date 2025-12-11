// components/ui/Input.tsx (File Input Anda)
import React from "react";
import { formatRupiah, unformatRupiah } from "@/utils/formatRupiah"; // Impor fungsi

// 1. Tambahkan properti `format` pada interface
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  format?: "rupiah";
  type: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  name: string;
  errorMessage?: string;
  className?: string;
}

const Input: React.FC<InputProps> = ({
  type,
  value,
  onChange,
  placeholder,
  name,
  errorMessage,
  className = "",
  disabled,
  format, // Ambil properti format
  ...props
}) => {
  const hasError = errorMessage && errorMessage.length > 0;

  // 2. Buat handler baru untuk menangani perubahan
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (format === "rupiah") {
      const rawValue = unformatRupiah(e.target.value);
      // Buat event baru dengan nilai mentah (unformatted)
      const modifiedEvent = {
        ...e,
        target: {
          ...e.target,
          value: rawValue, // Kirim nilai angka mentah ke parent
        },
      };
      if (onChange) {
        onChange(modifiedEvent); // Panggil onChange dari parent dengan event yang sudah dimodifikasi
      }
    } else {
      // Jika tidak ada format, panggil onChange seperti biasa
      if (onChange) {
        onChange(e);
      }
    }
  };

  // 3. Tentukan nilai yang akan ditampilkan di input field
  // Jika format rupiah, format nilainya. Jika tidak, tampilkan apa adanya.
  const displayValue =
    format === "rupiah" && value ? formatRupiah(Number(value)) : value;

  return (
    <div className="flex flex-col gap-2 w-full">
      <input
        id={name}
        // Jika format rupiah, paksa tipe jadi "text" agar bisa menampilkan "Rp" dan "."
        type={format === "rupiah" ? "text" : type}
        // Tampilkan nilai yang sudah diformat
        value={displayValue}
        // Gunakan handler baru
        onChange={handleOnChange}
        placeholder={placeholder}
        name={name}
        disabled={disabled}
        className={`
           w-full px-3 py-2
           border rounded-lg
           text-sm
           transition-all duration-200
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
           disabled:opacity-50 disabled:cursor-not-allowed
           ${
             hasError
               ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
               : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
           }
           ${
             disabled
               ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
               : "text-gray-900 dark:text-gray-100"
           }
           hover:border-gray-400 dark:hover:border-gray-500
           ${className}
         `}
        {...props}
      />
      {hasError && (
        <span className="text-xs text-red-500 dark:text-red-400 mt-1">
          {errorMessage}
        </span>
      )}
    </div>
  );
};

export default Input;
