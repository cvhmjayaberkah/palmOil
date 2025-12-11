import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface CancelOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orderNumber: string;
  isLoading?: boolean;
}

export function CancelOrderDialog({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  isLoading = false,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Batalkan Order</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <p className="text-gray-900 dark:text-white mb-4">
              Apakah Anda yakin ingin membatalkan order{" "}
              <span className="font-bold text-red-600 dark:text-red-400">
                {orderNumber}
              </span>
              ?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Tindakan ini tidak dapat dibatalkan. Jika order sudah diproses,
              stock produk akan dikembalikan.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alasan pembatalan (opsional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Masukkan alasan pembatalan order..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 transform hover:scale-105"
            >
              {isLoading ? "Membatalkan..." : "Ya, Batalkan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
