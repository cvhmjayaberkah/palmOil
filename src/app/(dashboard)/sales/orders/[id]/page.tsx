"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  ArrowLeft,
  ShoppingCart,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Truck,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getOrderById, updateOrder } from "@/lib/actions/orders";
import { getProducts } from "@/lib/actions/products";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { OrderTracking } from "@/components/sales";
import Loading from "@/components/ui/common/Loading";
import { Button } from "@/components/ui/common";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  totalPrice: number;
  productId: string;
  crates?: number; // Jumlah krat
  products?: {
    id: string;
    name: string;
    code: string;
    description?: string;
    unit?: string;
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
  deliveryAddress?: string;
  paymentDeadline?: string;
  customer: Customer;
  orderItems?: OrderItem[];
  order_items?: OrderItem[]; // Support both formats
}

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  currentStock: number;
  unit: string;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: userLoading } = useCurrentUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Edit form states
  const [editForm, setEditForm] = useState({
    notes: "",
    deliveryAddress: "",
    paymentDeadline: "",
    items: [] as Array<{
      id?: string;
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      crates?: number;
    }>,
  });

  const orderId = params.id as string;

  // Helper function to get bottles per crate based on volume
  const getBottlesPerCrate = (productId: string): number => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 24; // default

    // Extract volume from product name or unit
    const mlMatch =
      product.unit.match(/(\d+)\s*ml/i) || product.name.match(/(\d+)\s*ml/i);
    const literMatch =
      product.unit.match(/(\d+(?:\.\d+)?)\s*(?:liter|litre|L)\b/i) ||
      product.name.match(/(\d+(?:\.\d+)?)\s*(?:liter|litre|L)\b/i);

    if (literMatch) {
      // Convert liters to ml (1 liter = 1000ml)
      const volume = parseFloat(literMatch[1]) * 1000;
      if (volume > 800) return 12; // Above 800ml = 12 bottles per crate
      if (volume >= 250 && volume <= 800) return 24; // 250-800ml = 24 bottles per crate
    } else if (mlMatch) {
      const volume = parseInt(mlMatch[1]);
      if (volume > 800) return 12; // Above 800ml = 12 bottles per crate
      if (volume >= 250 && volume <= 800) return 24; // 250-800ml = 24 bottles per crate
    }
    return 24; // default for smaller volumes
  };

  // Helper function to calculate crates from quantity
  const calculateCrates = (quantity: number, productId: string): number => {
    const bottlesPerCrate = getBottlesPerCrate(productId);
    return quantity / bottlesPerCrate;
  };

  useEffect(() => {
    loadOrder();
    loadProducts();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const result = await getOrderById(orderId);
      if (result.success && result.data) {
        const orderData = result.data as any;
        setOrder({
          ...orderData,
          orderDate: orderData.orderDate,
          orderItems: orderData.order_items || orderData.orderItems,
        } as Order);

        // Initialize edit form with current order data
        setEditForm({
          notes: orderData.notes || "",
          deliveryAddress: orderData.deliveryAddress || "",
          paymentDeadline: orderData.paymentDeadline
            ? new Date(orderData.paymentDeadline).toISOString().split("T")[0]
            : "",
          items: (orderData.order_items || orderData.orderItems || []).map(
            (item: any) => ({
              id: item.id,
              productId: item.productId,
              productName: item.products?.name || "",
              quantity: item.quantity,
              price: item.price,
              crates: 0, // Initialize crates to 0
            })
          ),
        });
      }
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const products = await getProducts();
      setProducts(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          price: p.price,
          currentStock: p.currentStock,
          unit: p.unit,
        }))
      );
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleSaveOrder = async () => {
    if (!order) return;

    // Validate items
    if (
      editForm.items.some(
        (item) => !item.productId || item.quantity <= 0 || item.price <= 0
      )
    ) {
      toast.error("Lengkapi semua item dengan benar.");
      return;
    }

    setIsSaving(true);
    startTransition(async () => {
      try {
        const result = await updateOrder({
          orderId: order.id,
          notes: editForm.notes || undefined,
          deliveryAddress: editForm.deliveryAddress || undefined,
          paymentDeadline: editForm.paymentDeadline
            ? new Date(editForm.paymentDeadline)
            : undefined,
          items: editForm.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        });

        if (result.success) {
          toast.success("Order berhasil diperbarui!");
          setIsEditing(false);
          loadOrder(); // Reload order data
        } else {
          toast.error(result.error || "Gagal memperbarui order.");
        }
      } catch (error) {
        console.error("Error updating order:", error);
        toast.error("Terjadi kesalahan saat memperbarui order.");
      } finally {
        setIsSaving(false);
      }
    });
  };

  const addItem = () => {
    setEditForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          productName: "",
          quantity: 1,
          price: 0,
          crates: 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setEditForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value };

          // Auto-update product name and price when product is selected
          if (field === "productId") {
            const selectedProduct = products.find((p) => p.id === value);
            if (selectedProduct) {
              updated.productName = selectedProduct.name;
              updated.price = selectedProduct.price;
            }
            // Reset crates and quantity when product changes
            updated.crates = 0;
            updated.quantity = 1;
          }

          return updated;
        }
        return item;
      }),
    }));
  };

  const updateCrateAndQuantity = (index: number, crateValue: number) => {
    setEditForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const bottlesPerCrate = getBottlesPerCrate(item.productId);
          return {
            ...item,
            crates: crateValue,
            quantity: crateValue * bottlesPerCrate,
          };
        }
        return item;
      }),
    }));
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

  const calculateTotalAmount = () => {
    return editForm.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
  };

  if (userLoading || loading) {
    return <Loading />;
  }

  if (!user || user.role !== "SALES") {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Akses Ditolak
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Halaman ini hanya dapat diakses oleh sales representative.
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Order Tidak Ditemukan
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Order yang Anda cari tidak ditemukan atau sudah dihapus.
          </p>
          <Button onClick={() => router.back()}>Kembali</Button>
        </div>
      </div>
    );
  }

  // Check if order can be edited (only if status is NEW or PENDING_CONFIRMATION)
  const canEdit = ["NEW", "PENDING_CONFIRMATION"].includes(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent">
                  Detail Order
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  {order.orderNumber}
                </p>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center space-x-3">
                {isEditing ? (
                  <>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      disabled={isSaving}
                      className="flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Batal</span>
                    </Button>
                    <Button
                      onClick={handleSaveOrder}
                      disabled={isSaving || isPending}
                      className="flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? "Menyimpan..." : "Simpan"}</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Order</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Order Info Card */}
        <div className="bg-gradient-to-br from-white/80 via-blue-50/20 to-purple-50/30 dark:from-gray-800/90 dark:via-gray-700/50 dark:to-gray-600/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden mb-8">
          <div className="p-6 bg-gradient-to-br from-white/90 via-blue-50/40 to-indigo-50/20 dark:from-gray-800/90 dark:via-gray-700/40 dark:to-gray-600/20 backdrop-blur-sm">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {order.orderNumber}
                </h2>
                {getStatusBadge(order.status)}
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {isEditing
                    ? formatCurrency(calculateTotalAmount())
                    : formatCurrency(order.totalAmount)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center sm:justify-end">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(order.orderDate)}
                </div>
              </div>
            </div>

            {/* Order Tracking */}
            <div className="mb-6">
              <OrderTracking
                status={order.status}
                orderDate={new Date(order.orderDate)}
              />
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-500" />
                  Customer
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-xl">
                    <User className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Nama
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.customer.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-900/20 dark:to-emerald-900/10 rounded-xl">
                    <MapPin className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Alamat
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.customer.address}
                      </p>
                    </div>
                  </div>
                  {order.customer.email && (
                    <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50/50 to-orange-50/30 dark:from-yellow-900/20 dark:to-orange-900/10 rounded-xl">
                      <Mail className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Email
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white break-all">
                          {order.customer.email}
                        </p>
                      </div>
                    </div>
                  )}
                  {order.customer.phone && (
                    <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50/50 to-pink-50/30 dark:from-purple-900/20 dark:to-pink-900/10 rounded-xl">
                      <Phone className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Telepon
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {order.customer.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-green-500" />
                  Pengiriman & Pembayaran
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-900/20 dark:to-emerald-900/10 rounded-xl">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      Alamat Pengiriman
                    </p>
                    {isEditing ? (
                      <textarea
                        value={editForm.deliveryAddress}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            deliveryAddress: e.target.value,
                          }))
                        }
                        className="w-full p-2 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        rows={2}
                        placeholder="Alamat pengiriman..."
                      />
                    ) : (
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.deliveryAddress || "Belum ditentukan"}
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-xl">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      Tenggat Pembayaran
                    </p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.paymentDeadline}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            paymentDeadline: e.target.value,
                          }))
                        }
                        className="w-full p-2 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {order.paymentDeadline
                          ? formatDate(order.paymentDeadline)
                          : "Belum ditentukan"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Package className="w-5 h-5 mr-2 text-purple-500" />
                  Items Order (
                  {isEditing
                    ? editForm.items.length
                    : (order.orderItems || order.order_items)?.length || 0}{" "}
                  items)
                </h3>
                {isEditing && (
                  <Button
                    onClick={addItem}
                    variant="outline"
                    size="small"
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Item</span>
                  </Button>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/30 dark:from-purple-900/20 dark:to-pink-900/10 backdrop-blur-sm rounded-xl p-4 border border-purple-100/50 dark:border-purple-800/30">
                <div className="space-y-3">
                  {isEditing
                    ? // Edit mode - show form inputs
                      editForm.items.map((item, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-purple-100/50 dark:border-purple-800/30"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Produk
                              </label>
                              <select
                                value={item.productId}
                                onChange={(e) =>
                                  updateItem(index, "productId", e.target.value)
                                }
                                className="w-full p-2 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                              >
                                <option value="">Pilih produk...</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} ({product.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Krat
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={item.crates || 0}
                                onChange={(e) =>
                                  updateCrateAndQuantity(
                                    index,
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="w-full p-2 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                              />
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {getBottlesPerCrate(item.productId)} btl/krat
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Qty (Pieces)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    parseFloat(e.target.value)
                                  )
                                }
                                disabled={true}
                                className="w-full p-2 bg-gray-100 dark:bg-gray-500 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Harga
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "price",
                                    parseFloat(e.target.value)
                                  )
                                }
                                disabled={true}
                                className="w-full p-2 bg-gray-100 dark:bg-gray-500 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <button
                                onClick={() => removeItem(index)}
                                className="w-full p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 text-right">
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                              Subtotal:{" "}
                              {formatCurrency(item.quantity * item.price)}
                            </span>
                          </div>
                        </div>
                      ))
                    : // View mode - show read-only items
                      (order.orderItems || order.order_items)?.map(
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
                                {item.quantity} × {formatCurrency(item.price)} ={" "}
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

                  <div className="pt-4 border-t border-purple-200 dark:border-purple-700">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span className="text-gray-900 dark:text-white">
                        Total:
                      </span>
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                        {isEditing
                          ? formatCurrency(calculateTotalAmount())
                          : formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-orange-500" />
                Catatan
              </h3>
              <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-900/20 dark:to-amber-900/10 backdrop-blur-sm rounded-xl p-4 border border-orange-100/50 dark:border-orange-800/30">
                {isEditing ? (
                  <textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full p-3 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-none"
                    rows={3}
                    placeholder="Tambahkan catatan untuk order ini..."
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white break-words font-medium">
                    {order.notes || (
                      <span className="text-gray-500 dark:text-gray-400 italic">
                        Tidak ada catatan
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
