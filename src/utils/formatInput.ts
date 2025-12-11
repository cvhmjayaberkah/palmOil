// Utility functions for formatting input fields

// Format number to Rupiah string for input display
export const formatInputRupiah = (value: number): string => {
  if (value === 0) return "";
  return value.toLocaleString("id-ID");
};

// Parse Rupiah formatted string to number
export const parseInputRupiah = (value: string): number => {
  if (!value || value.trim() === "") return 0;
  // Remove all non-digit characters
  const numericValue = value.replace(/\D/g, "");
  return parseFloat(numericValue) || 0;
};

// Format number for display with Rp prefix
export const formatDisplayRupiah = (value: number): string => {
  if (value === 0) return "Rp 0";
  return `Rp ${value.toLocaleString("id-ID")}`;
};
