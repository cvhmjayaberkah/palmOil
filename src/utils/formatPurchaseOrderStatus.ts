/**
 * Utility function to format Purchase Order status for display
 * @param status - Raw Purchase Order status from database
 * @returns Formatted status text for user interface
 */
export function formatPurchaseOrderStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    PENDING: "Menunggu",
    PROCESSING: "Diproses",
    READY_FOR_DELIVERY: "Siap Kirim",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };
  return statusMap[status] || status;
}

/**
 * Get status badge color classes for Purchase Order status
 * @param status - Raw Purchase Order status from database
 * @returns CSS classes for status badge styling
 */
export function getPurchaseOrderStatusColors(status: string): string {
  const statusColors: { [key: string]: string } = {
    PENDING: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    PROCESSING: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    READY_FOR_DELIVERY: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
    COMPLETED: "text-green-500 bg-green-50 dark:bg-green-900/20",
    CANCELLED: "text-red-500 bg-red-50 dark:bg-red-900/20",
  };
  return statusColors[status] || "text-gray-500 bg-gray-50";
}
