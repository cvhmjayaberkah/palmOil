import TransactionHistoryClient from "./TransactionHistoryClient";

export const metadata = {
  title: "Riwayat Transaksi - Indana ERP",
  description: "Halaman untuk mengelola riwayat transaksi lengkap",
};

export default function TransactionHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="space-y-6">
          {/* <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Riwayat Transaksi
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Pantau seluruh alur transaksi dari order hingga pembayaran
            </div>
          </div> */}
          <TransactionHistoryClient />
        </div>
    </div>
  );
}
