import TransactionHistoryContent from "./components/TransactionHistoryContent";

export const metadata = {
  title: "Riwayat Transaksi - Indana ERP",
  description: "Halaman untuk mengelola riwayat transaksi lengkap",
};

export default function TransactionHistoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Riwayat Transaksi
        </h1>
      </div>

      <TransactionHistoryContent />
    </div>
  );
}
