"use server";
import db from "@/lib/db";

// --- Helper untuk Mapping Singkatan Tabel ---
const getTableAbbreviation = (tableName: string): string | null => {
  switch (tableName) {
    case "Categories":
      return "KTG";
    case "Swaps":
      return "TRG";
    case "Customers":
      return "CST";
    case "Products":
      return "PDK";
    case "PurchaseOrders":
      return "DPO";
    case "Invoices":
      return "INV";
    case "Payments":
      return "PAY";
    case "StockOpnames":
      return "SOP";
    case "ProductionLogs":
      return "PRI";
    case "ManagementStocks":
      return "SMN";
    case "Productions":
      return "PRD";
    case "DeliveryNotes":
      return "SJN";
    case "Deliveries":
      return "DLV";
    case "expenses":
      return "EXP";
    case "Expenses":
      return "EXP";
    case "swaps":
      return "SWP";
    case "Swaps":
      return "SWP";
    // Tambahkan singkatan untuk tabel lain yang akan memiliki kode
    // case 'Users': return 'USR'; // Contoh jika Users juga punya kode format ini
    // case 'Orders': return 'ORD'; // Contoh jika Orders juga punya kode format ini
    default:
      return null;
  }
};

/**
 * Mendapatkan kode terakhir dari sebuah tabel untuk bulan dan tahun saat ini.
 * Ini adalah fungsi internal yang digunakan oleh generateCodeByTable.
 *
 * @param tableName Nama tabel (sesuai nama model di schema.prisma, contoh: 'Categories')
 * @returns Kode terakhir (string) atau null jika tidak ada data untuk bulan/tahun ini.
 */
async function getLastCodeForCurrentMonth(
  tableName: string
): Promise<string | null> {
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0"); // '04' untuk April
  const currentYear = new Date().getFullYear().toString(); // '2023'

  let lastCode: string | null = null;

  try {
    // String yang akan dicari di awal 'code', contoh: 'KTG/04/2023/'
    const codePrefix = `${getTableAbbreviation(
      tableName
    )}/${currentMonth}/${currentYear}/`;

    switch (tableName) {
      case "Categories":
        const lastCategory = await db.categories.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" }, // Urutkan secara descending untuk mendapatkan yang terbesar
          select: { code: true },
        });
        lastCode = lastCategory?.code || null;
        break;

      case "Customers":
        const lastCustomer = await db.customers.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastCustomer?.code || null;
        break;

      case "Products":
        const lastProduct = await db.products.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastProduct?.code || null;
        break;

      case "PurchaseOrders":
        const lastPurchaseOrder = await db.purchaseOrders.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastPurchaseOrder?.code || null;
        break;

      case "Invoices":
        const lastInvoice = await db.invoices.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastInvoice?.code || null;
        break;

      case "Swaps":
        const lastSwaps = await db.swaps.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastSwaps?.code || null;
        break;

      case "Payments":
        const lastPayment = await db.payments.findFirst({
          where: {
            paymentCode: {
              startsWith: codePrefix,
            },
          },
          orderBy: { paymentCode: "desc" },
          select: { paymentCode: true },
        });
        lastCode = lastPayment?.paymentCode || null;
        break;

      case "StockOpnames":
        const lastStockOpname = await db.stockOpnames.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastStockOpname?.code || null;
        break;

      case "ProductionLogs":
        const lastProductionLog = await db.productions.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastProductionLog?.code || null;
        break;

      case "Productions":
        const lastProduction = await db.productions.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastProduction?.code || null;
        break;

      case "ManagementStocks":
        const lastManagementStock = await db.managementStocks.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastManagementStock?.code || null;
        break;

      case "DeliveryNotes":
        const lastDeliveryNote = await db.deliveryNotes.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastDeliveryNote?.code || null;
        break;

      case "Deliveries":
        const lastDelivery = await db.deliveries.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastDelivery?.code || null;
        break;

      case "expenses":
      case "Expenses":
        const lastExpense = await db.expenses.findFirst({
          where: {
            code: {
              startsWith: codePrefix,
            },
          },
          orderBy: { code: "desc" },
          select: { code: true },
        });
        lastCode = lastExpense?.code || null;
        break;

      default:
        console.warn(
          `[getLastCodeForCurrentMonth] Tabel '${tableName}' tidak dikenali, tidak memiliki kolom 'code' atau handler yang sesuai.`
        );
        lastCode = null;
        break;
    }
  } catch (error) {
    console.error(`Error fetching last code for table '${tableName}':`, error);
    lastCode = null;
  }

  return lastCode;
}

/**
 * Menghasilkan kode berikutnya dengan format (singkatan tabel)/bulan/Tahun/Index.
 * Index akan direset setiap bulan.
 *
 * @param tableName Nama tabel (sesuai nama model di schema.prisma, contoh: 'Categories')
 * @returns Kode baru yang siap digunakan (string).
 */
export async function generateCodeByTable(tableName: string): Promise<string> {
  const abbreviation = getTableAbbreviation(tableName);
  if (!abbreviation) {
    throw new Error(
      `Singkatan tabel untuk '${tableName}' tidak ditemukan atau tidak didukung.`
    );
  }

  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const currentYear = new Date().getFullYear().toString();
  const baseCodePrefix = `${abbreviation}/${currentMonth}/${currentYear}/`;

  const lastCode = await getLastCodeForCurrentMonth(tableName);

  let nextIndex = 1;

  if (lastCode) {
    // Asumsi format 'KTG/MM/YYYY/XXXX'
    const parts = lastCode.split("/");
    if (parts.length === 4) {
      const lastIndexString = parts[3];
      const lastMonth = parts[1];
      const lastYear = parts[2];

      // Cek apakah bulan dan tahun sama dengan saat ini
      if (lastMonth === currentMonth && lastYear === currentYear) {
        const parsedIndex = parseInt(lastIndexString, 10);
        if (!isNaN(parsedIndex)) {
          nextIndex = parsedIndex + 1;
        }
      }
      // Jika bulan atau tahun berbeda, nextIndex tetap 1 (reset)
    }
  }

  const paddedNextIndex = String(nextIndex).padStart(4, "0"); // Format indeks menjadi 4 digit (0001)

  return `${baseCodePrefix}${paddedNextIndex}`;
}
