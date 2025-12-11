// utils/formatRupiah.ts

/**
 * Mengubah angka menjadi format mata uang Rupiah.
 * Contoh: 100000 menjadi Rp 100.000
 * @param amount Angka yang akan diformat.
 * @returns String dalam format Rupiah.
 */
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0, // Tidak menampilkan desimal untuk mata uang tanpa desimal (seperti Rupiah)
    maximumFractionDigits: 0,
  }).format(amount);
};

// Fungsi untuk menghapus format, contoh: "Rp 10.000" -> "10000"
export const unformatRupiah = (formattedValue: string): string => {
  if (!formattedValue) return "";
  return formattedValue.replace(/[^0-9]/g, "");
};
