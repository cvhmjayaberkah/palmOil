// Utility functions for product calculations

// Calculate selling price with tax and round to thousands
export function calculateSellingPrice(
  basePrice: number,
  taxPercentage: number
): number {
  const priceWithTax = basePrice * (1 + taxPercentage / 100);
  // Round to nearest thousand (e.g., 1500 becomes 2000, 1200 becomes 1000)
  return Math.ceil(priceWithTax / 1000) * 1000;
}

// Format currency to IDR
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
}

// Validate product form data
export function validateProductData(data: any) {
  const errors: any = {};

  if (!data.code?.trim()) {
    errors.code = "Kode produk tidak boleh kosong.";
  }

  if (!data.name?.trim()) {
    errors.name = "Nama produk wajib diisi";
  } else if (data.name.trim().length < 2) {
    errors.name = "Nama produk minimal 2 karakter";
  }

  if (!data.unit?.trim()) {
    errors.unit = "Satuan wajib diisi";
  }

  if (data.price <= 0) {
    errors.price = "Harga dasar harus lebih dari 0";
  }

  if (data.cost < 0) {
    errors.cost = "HPP tidak boleh negatif";
  }

  if (data.sellingPrice <= 0) {
    errors.sellingPrice = "Harga jual harus lebih dari 0";
  }

  if (data.minStock < 0) {
    errors.minStock = "Stok minimum tidak boleh negatif";
  }

  if (data.currentStock < 0) {
    errors.currentStock = "Stok saat ini tidak boleh negatif";
  }

  if (!data.categoryId) {
    errors.categoryId = "Kategori wajib dipilih";
  }

  if (data.description && data.description.length > 500) {
    errors.description = "Deskripsi tidak boleh lebih dari 500 karakter";
  }

  if (data.bottlesPerCrate !== null && data.bottlesPerCrate <= 0) {
    errors.bottlesPerCrate =
      "Jumlah botol per krat harus lebih dari 0 jika diisi";
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}
