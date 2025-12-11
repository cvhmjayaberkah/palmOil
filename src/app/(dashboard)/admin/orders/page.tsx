"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Calendar,
  Search,
  Filter,
  Eye,
  ShoppingCart,
  Mail,
  Phone,
  FileText,
  Edit3,
  RefreshCw,
} from "lucide-react";
import { getOrders, updateOrderStatus } from "@/lib/actions/orders";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Loading from "@/components/ui/common/Loading";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  totalPrice: number;
  productId: string;
  products?: {
    id: string;
    name: string;
    code: string;
    description?: string;
  };
}

interface Customer {
  id: string;
  name: string;
  address: string;
  email?: string;
  phone?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  notes?: string;
  customer: Customer;
  sales?: {
    id: string;
    name: string;
    email: string;
  };
  orderItems?: OrderItem[];
  order_items?: OrderItem[]; // Support both formats
}

export default function AdminOrdersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>("30");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      const params: {
        status?: string;
      } = {};

      if (selectedStatus !== "ALL") {
        params.status = selectedStatus;
      }

      const result = await getOrders(params);

      if (result.success) {
        const filteredByDate = (result.data as Order[]).filter((order) => {
          if (dateRange === "ALL") return true;

          const orderDate = new Date(order.orderDate);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));

          return orderDate >= cutoffDate;
        });

        setOrders(filteredByDate);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, dateRange]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orderId);
      const result = await updateOrderStatus(orderId, newStatus);

      if (result.success) {
        toast.success(result.message);
        loadOrders(); // Refresh orders list
      } else {
        toast.error(result.error || "Gagal mengubah status order");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Terjadi kesalahan saat mengubah status order");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      NEW: {
        color: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300",
        label: "Baru",
        icon: <Package className="w-3 h-3" />,
      },
      PENDING_CONFIRMATION: {
        color:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300",
        label: "Menunggu Konfirmasi",
        icon: <Clock className="w-3 h-3" />,
      },
      IN_PROCESS: {
        color:
          "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300",
        label: "Dalam Proses",
        icon: <ShoppingCart className="w-3 h-3" />,
      },
      COMPLETED: {
        color:
          "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300",
        label: "Selesai",
        icon: <CheckCircle className="w-3 h-3" />,
      },
      CANCELED: {
        color: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300",
        label: "Dibatal",
        icon: <XCircle className="w-3 h-3" />,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.NEW;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1 ${config.color}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getStatusOptions = (currentStatus: string) => {
    const allStatuses = [
      { value: "NEW", label: "Baru" },
      { value: "PENDING_CONFIRMATION", label: "Menunggu Konfirmasi" },
      { value: "IN_PROCESS", label: "Dalam Proses" },
      { value: "COMPLETED", label: "Selesai" },
      { value: "CANCELED", label: "Dibatal" },
    ];

    // Filter out current status and restrict transitions
    return allStatuses.filter((status) => {
      if (status.value === currentStatus) return false;

      // Restrict certain transitions
      if (currentStatus === "COMPLETED" || currentStatus === "CANCELED") {
        return false; // Cannot change from completed or canceled
      }

      return true;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter orders based on search term
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.customer.name.toLowerCase().includes(searchLower) ||
      order.customer.address.toLowerCase().includes(searchLower) ||
      order.sales?.name.toLowerCase().includes(searchLower) ||
      order.sales?.email.toLowerCase().includes(searchLower)
    );
  });

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const stats = {
    total: filteredOrders.length,
    totalAmount: filteredOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    ),
    pending: filteredOrders.filter(
      (order) => order.status === "PENDING_CONFIRMATION"
    ).length,
    completed: filteredOrders.filter((order) => order.status === "COMPLETED")
      .length,
    new: filteredOrders.filter((order) => order.status === "NEW").length,
    inProcess: filteredOrders.filter((order) => order.status === "IN_PROCESS")
      .length,
    canceled: filteredOrders.filter((order) => order.status === "CANCELED")
      .length,
  };

  if (userLoading || loading) {
    return <Loading />;
  }

  if (!user || !["ADMIN", "OWNER"].includes(user.role || "")) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Akses Ditolak
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Halaman ini hanya dapat diakses oleh admin atau owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent">
                Manajemen Orders
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Kelola semua orders dan ubah status proses orders
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadOrders}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl p-4 border border-white/20 dark:border-gray-700/30">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total Orders
            </div>
          </div>
          <div className="bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-xl rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/30">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              {stats.new}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Baru</div>
          </div>
          <div className="bg-yellow-50/80 dark:bg-yellow-900/30 backdrop-blur-xl rounded-xl p-4 border border-yellow-200/50 dark:border-yellow-700/30">
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
              {stats.pending}
            </div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">
              Pending
            </div>
          </div>
          <div className="bg-orange-50/80 dark:bg-orange-900/30 backdrop-blur-xl rounded-xl p-4 border border-orange-200/50 dark:border-orange-700/30">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
              {stats.inProcess}
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-400">
              Proses
            </div>
          </div>
          <div className="bg-green-50/80 dark:bg-green-900/30 backdrop-blur-xl rounded-xl p-4 border border-green-200/50 dark:border-green-700/30">
            <div className="text-2xl font-bold text-green-900 dark:text-green-300">
              {stats.completed}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Selesai
            </div>
          </div>
          <div className="bg-red-50/80 dark:bg-red-900/30 backdrop-blur-xl rounded-xl p-4 border border-red-200/50 dark:border-red-700/30">
            <div className="text-2xl font-bold text-red-900 dark:text-red-300">
              {stats.canceled}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              Dibatal
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-white/80 via-purple-50/60 to-blue-50/40 dark:from-gray-800/80 dark:via-purple-900/60 dark:to-blue-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Cari order, customer, atau sales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/80 dark:bg-gray-800/80 border border-purple-200/50 dark:border-purple-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all shadow-lg"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center space-x-3">
                  <Filter className="text-gray-600 dark:text-gray-400 h-5 w-5" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-3 bg-white/80 dark:bg-gray-800/80 border border-purple-200/50 dark:border-purple-700/50 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all shadow-lg"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="NEW">Baru</option>
                    <option value="PENDING_CONFIRMATION">
                      Menunggu Konfirmasi
                    </option>
                    <option value="IN_PROCESS">Dalam Proses</option>
                    <option value="COMPLETED">Selesai</option>
                    <option value="CANCELED">Dibatal</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="text-gray-600 dark:text-gray-400 h-5 w-5" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-4 py-3 bg-white/80 dark:bg-gray-800/80 border border-purple-200/50 dark:border-purple-700/50 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all shadow-lg"
                  >
                    <option value="7">7 Hari Terakhir</option>
                    <option value="30">30 Hari Terakhir</option>
                    <option value="90">90 Hari Terakhir</option>
                    <option value="ALL">Semua Waktu</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-white/80 via-blue-50/60 to-indigo-50/40 dark:from-gray-800/80 dark:via-gray-700/60 dark:to-gray-600/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30">
              <Package className="mx-auto h-16 w-16 text-blue-400 dark:text-blue-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tidak ada orders
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                Tidak ada orders yang cocok dengan filter yang dipilih.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrder === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-gradient-to-br from-white/80 via-blue-50/20 to-purple-50/30 dark:from-gray-800/90 dark:via-gray-700/50 dark:to-gray-600/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden hover:shadow-3xl hover:scale-[1.01] transition-all duration-300"
                >
                  <div className="p-6">
                    {/* Order Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {order.orderNumber}
                          </h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center mb-1">
                            <User className="w-4 h-4 mr-2" />
                            Sales: {order.sales?.name || "N/A"}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(order.orderDate)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="text-left sm:text-right">
                          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                            {formatCurrency(order.totalAmount)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleOrderExpansion(order.id)}
                            className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-300"
                            aria-label={
                              isExpanded ? "Tutup detail" : "Lihat detail"
                            }
                          >
                            <Eye className="w-5 h-5" />
                          </button>

                          {/* Status Update Dropdown */}
                          {!["COMPLETED", "CANCELED"].includes(
                            order.status
                          ) && (
                            <div className="relative">
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleStatusUpdate(
                                      order.id,
                                      e.target.value
                                    );
                                  }
                                }}
                                disabled={updatingStatus === order.id}
                                className="appearance-none bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-3 pr-8 rounded-xl text-sm font-medium hover:from-purple-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                              >
                                <option value="" disabled>
                                  {updatingStatus === order.id
                                    ? "Updating..."
                                    : "Ubah Status"}
                                </option>
                                {getStatusOptions(order.status).map(
                                  (status) => (
                                    <option
                                      key={status.value}
                                      value={status.value}
                                      className="bg-white text-gray-900"
                                    >
                                      {status.label}
                                    </option>
                                  )
                                )}
                              </select>
                              <Edit3 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Customer & Sales Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                          <User className="w-4 h-4 mr-2 text-blue-500" />
                          Customer
                        </h4>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {order.customer.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {order.customer.address}
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-900/20 dark:to-emerald-900/10 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                          <ShoppingCart className="w-4 h-4 mr-2 text-green-500" />
                          Sales Representative
                        </h4>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {order.sales?.name || "N/A"}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {order.sales?.email || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="pt-6 border-t border-white/20 dark:border-gray-700/30">
                        {/* Order Items */}
                        <div className="mb-6">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Package className="w-5 h-5 mr-2 text-purple-500" />
                            Items Order (
                            {(order.orderItems || order.order_items)?.length ||
                              0}{" "}
                            items)
                          </h4>
                          <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-900/20 dark:to-pink-900/10 backdrop-blur-sm rounded-xl p-4 border border-purple-100/50 dark:border-purple-800/30">
                            <div className="space-y-3">
                              {(order.orderItems || order.order_items)?.map(
                                (item: OrderItem, index: number) => (
                                  <div
                                    key={item.id}
                                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-purple-100/50 dark:border-purple-800/30"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white block break-words">
                                        {index + 1}.{" "}
                                        {item.products?.name ||
                                          `Product ${item.productId}`}
                                      </span>
                                      {item.products?.code && (
                                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                          ({item.products.code})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-left sm:text-right text-sm text-gray-700 dark:text-gray-300 flex-shrink-0 font-medium">
                                      <span className="break-all">
                                        {item.quantity} ×{" "}
                                        {formatCurrency(item.price)} ={" "}
                                        <span className="font-bold text-purple-600 dark:text-purple-400">
                                          {formatCurrency(item.totalPrice)}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                )
                              ) || (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  Tidak ada item order
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                              <FileText className="w-5 h-5 mr-2 text-orange-500" />
                              Catatan
                            </h4>
                            <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-900/20 dark:to-amber-900/10 backdrop-blur-sm rounded-xl p-4 border border-orange-100/50 dark:border-orange-800/30">
                              <p className="text-gray-900 dark:text-white break-words">
                                {order.notes}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
