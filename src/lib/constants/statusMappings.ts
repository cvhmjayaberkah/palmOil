// Status mapping untuk search functionality
// Mapping dari bahasa Indonesia ke bahasa Inggris (database values)

export const PURCHASE_ORDER_STATUS_MAPPING = {
  menunggu: "PENDING",
  pending: "PENDING",
  diproses: "PROCESSING",
  processing: "PROCESSING",
  "siap kirim": "READY_FOR_DELIVERY",
  "ready for delivery": "READY_FOR_DELIVERY",
  ready_for_delivery: "READY_FOR_DELIVERY",
  selesai: "COMPLETED",
  completed: "COMPLETED",
  dibatalkan: "CANCELLED",
  cancelled: "CANCELLED",
  batal: "CANCELLED",
};

export const INVOICE_STATUS_MAPPING = {
  draft: "DRAFT",
  konsep: "DRAFT",
  dikirim: "SENT",
  sent: "SENT",
  terkirim: "SENT", // "Terkirim" adalah display value untuk SENT
  dibayar: "PAID",
  paid: "PAID",
  lunas: "PAID",
  selesai: "COMPLETED",
  completed: "COMPLETED",
  terlambat: "OVERDUE",
  overdue: "OVERDUE",
  telat: "OVERDUE",
  "jatuh tempo": "OVERDUE",
  dibatalkan: "CANCELLED",
  cancelled: "CANCELLED",
  batal: "CANCELLED",
  dikembalikan: "RETURNED",
  returned: "RETURNED",
  kembali: "RETURNED",
};

export const DELIVERY_STATUS_MAPPING = {
  menunggu: "PENDING",
  pending: "PENDING",
  perjalanan: "IN_TRANSIT",
  "in transit": "IN_TRANSIT",
  in_transit: "IN_TRANSIT",
  "dalam perjalanan": "IN_TRANSIT",
  terkirim: "DELIVERED",
  delivered: "DELIVERED",
  selesai: "DELIVERED",
  dibatalkan: "CANCELLED",
  cancelled: "CANCELLED",
  batal: "CANCELLED",
  dikembalikan: "RETURNED",
  returned: "RETURNED",
  kembali: "RETURNED",
};

export const PAYMENT_STATUS_MAPPING = {
  // Payment Status (invoice payment status)
  "belum bayar": "UNPAID",
  unpaid: "UNPAID",
  "belum lunas": "UNPAID",
  lunas: "PAID",
  paid: "PAID",
  dibayar: "PAID",

  // Paid Status (individual payment status)
  pending: "PENDING",
  menunggu: "PENDING",
  disetujui: "CLEARED",
  cleared: "CLEARED",
  berhasil: "CLEARED",
  sukses: "CLEARED",
  ditolak: "REJECTED",
  rejected: "REJECTED",
  gagal: "REJECTED",
};

export const ORDER_STATUS_MAPPING = {
  pending: "PENDING",
  menunggu: "PENDING",
  konfirmasi: "CONFIRMED",
  confirmed: "CONFIRMED",
  dikonfirmasi: "CONFIRMED",
  diproses: "PROCESSING",
  processing: "PROCESSING",
  selesai: "COMPLETED",
  completed: "COMPLETED",
  dibatalkan: "CANCELLED",
  cancelled: "CANCELLED",
  batal: "CANCELLED",
};
