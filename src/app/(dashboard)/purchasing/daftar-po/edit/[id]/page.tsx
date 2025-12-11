// app/purchasing/daftar-po/edit/[id]/page.tsx
"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState, useEffect, useCallback } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  ManagementForm,
  InputDate,
  Select,
  CustomerInfo,
  TaxSelect,
} from "@/components/ui";
import { FiTrash2, FiPlus } from "react-icons/fi";
import {
  updatePurchaseOrder,
  deletePurchaseOrder,
  canDeletePurchaseOrder,
  getPurchaseOrderById,
  getAvailableOrders,
  getProductsWithStock,
} from "@/lib/actions/purchaseOrders";
import { getActiveTax } from "@/lib/actions/taxes";
import { useRouter, useParams } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { formatRupiah } from "@/utils/formatRupiah";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";
import { formatPurchaseOrderStatus } from "@/utils/formatPurchaseOrderStatus";

interface PurchaseOrderItemFormData {
  productId: string;
  quantity: number;
  price: number;
  discount: number;
  discountType: "AMOUNT" | "PERCENTAGE";
  totalPrice: number;
}

interface PurchaseOrderFormData {
  code: string;
  poDate: string;
  // dateline: string;
  notes: string;
  creatorId: string;
  orderId: string;
  orderLevelDiscount: number;
  orderLevelDiscountType: "AMOUNT" | "PERCENTAGE";
  paymentMethod: Date | null;
  totalAmount: number;
  totalDiscount: number;
  totalTax: number;
  taxPercentage: number | null;
  taxAmount: number; // Nominal pajak yang akan disimpan
  shippingCost: number;
  totalPayment: number;
  paymentDeadline: Date | null;
  items: PurchaseOrderItemFormData[];
}

interface PurchaseOrderFormErrors {
  code?: string;
  poDate?: string;
  // dateline?: string;
  notes?: string;
  orderId?: string;
  poType?: string;
  orderLevelDiscount?: string;
  orderLevelDiscountType?: string;
  paymentMethod?: string;
  totalAmount?: string;
  totalDiscount?: string;
  totalTax?: string;
  taxPercentage?: string;
  shippingCost?: string;
  totalPayment?: string;
  paymentDeadline?: string;
  items?: {
    [key: number]: {
      productId?: string;
      quantity?: string;
      price?: string;
      discount?: string;
      discountType?: string;
      totalPrice?: string;
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  paymentDeadline?: Date | null;
  discount: number;
  discountUnit?: "AMOUNT" | "PERCENTAGE" | null;
  shippingCost: number;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  orderItems: {
    id: string;
    quantity: number;
    price: number;
    discount: number;
    discountType?: "AMOUNT" | "PERCENTAGE" | null;
    totalPrice: number;
    orderId: string;
    productId: string;
    createdAt: Date;
    updatedAt: Date;
    products: {
      id: string;
      name: string;
      unit: string;
      price: number;
      sellingPrice?: number | null;
    };
  }[];
}

interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  sellingPrice?: number | null;
  currentStock: number;
  code: string;
}

export default function EditPurchaseOrderPage() {
  const data = useSharedData();
  const router = useRouter();
  const params = useParams();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canDelete, setCanDelete] = useState(true);
  const [deleteReason, setDeleteReason] = useState<string>("");
  const [originalPO, setOriginalPO] = useState<any>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [editBlockReason, setEditBlockReason] = useState<string>("");

  const purchaseOrderId = params.id as string;

  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    code: "",
    poDate: new Date().toISOString().split("T")[0],
    notes: "",
    creatorId: "",
    orderId: "",
    orderLevelDiscount: 0,
    orderLevelDiscountType: "AMOUNT",
    paymentMethod: null,
    totalAmount: 0,
    totalDiscount: 0,
    totalTax: 0,
    taxPercentage: null,
    taxAmount: 0, // Nominal pajak yang akan disimpan
    shippingCost: 0,
    totalPayment: 0,
    paymentDeadline: null,
    items: [],
  });

  const [formErrors, setFormErrors] = useState<PurchaseOrderFormErrors>({});

  // Fungsi untuk menghitung potongan item - dimemoized untuk performa
  const calculateItemDiscount = React.useCallback(
    (
      price: number,
      discount: number,
      discountType: "AMOUNT" | "PERCENTAGE"
    ) => {
      if (discountType === "PERCENTAGE") {
        return (price * discount) / 100;
      }
      return discount;
    },
    []
  );

  // Fungsi untuk menghitung potongan order level - dimemoized untuk performa
  const calculateOrderLevelDiscount = React.useCallback(
    (
      subtotal: number,
      discount: number,
      discountType: "AMOUNT" | "PERCENTAGE"
    ) => {
      if (discountType === "PERCENTAGE") {
        return (subtotal * discount) / 100;
      }
      return discount;
    },
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch data if user is available and we have purchaseOrderId
        if (!user?.id || !purchaseOrderId) return;

        const [orders, products, purchaseOrder, activeTax] = await Promise.all([
          getAvailableOrders(purchaseOrderId), // Pass current PO ID to include its order
          getProductsWithStock(),
          getPurchaseOrderById(purchaseOrderId),
          getActiveTax(),
        ]);

        if (!purchaseOrder) {
          toast.error("Pesanan Pembelian tidak ditemukan");
          router.push("/purchasing/daftar-po");
          return;
        }

        // Check if PO can be deleted
        const deleteCheck = await canDeletePurchaseOrder(purchaseOrderId);
        setCanDelete(deleteCheck.canDelete);
        setDeleteReason(deleteCheck.reason || "");

        // Check if PO can be edited (only if status is PROCESSING or PENDING)
        if (!["PENDING"].includes(purchaseOrder.status)) {
          setCanEdit(false);
          setEditBlockReason(
            `Pesanan Pembelian dengan status ${formatPurchaseOrderStatus(
              purchaseOrder.status
            )} tidak dapat diedit`
          );
        } else {
          setCanEdit(true);
          setEditBlockReason("");
        }

        setAvailableOrders(orders);
        setAvailableProducts(products);
        setOriginalPO(purchaseOrder);

        // Set selected order if exists
        if (purchaseOrder.order) {
          setSelectedOrder(purchaseOrder.order as any);
        }

        // Populate form with existing data
        setFormData({
          code: purchaseOrder.code,
          poDate: new Date(purchaseOrder.poDate).toISOString().split("T")[0],
          notes: purchaseOrder.notes || "",
          creatorId: purchaseOrder.creatorId,
          orderId: purchaseOrder.orderId || "",
          orderLevelDiscount: purchaseOrder.orderLevelDiscount || 0,
          orderLevelDiscountType: (purchaseOrder.orderLevelDiscountType ||
            "AMOUNT") as "AMOUNT" | "PERCENTAGE",
          paymentMethod: purchaseOrder.paymentMethod
            ? new Date(purchaseOrder.paymentMethod)
            : null,
          totalAmount: purchaseOrder.totalAmount,
          totalDiscount: purchaseOrder.totalDiscount,
          totalTax: purchaseOrder.totalTax,
          taxPercentage:
            purchaseOrder.taxPercentage !== null
              ? purchaseOrder.taxPercentage
              : activeTax
              ? parseFloat(activeTax.nominal)
              : null,
          taxAmount:
            purchaseOrder.taxAmount !== null
              ? purchaseOrder.taxAmount
              : activeTax
              ? parseFloat(activeTax.nominal)
              : 0,
          shippingCost: purchaseOrder.shippingCost || 0,
          totalPayment: purchaseOrder.totalPayment,
          paymentDeadline: purchaseOrder.paymentDeadline
            ? new Date(purchaseOrder.paymentDeadline)
            : null,
          items: purchaseOrder.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0,
            discountType: (item.discountType || "AMOUNT") as
              | "AMOUNT"
              | "PERCENTAGE",
            totalPrice: item.totalPrice,
          })),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data");
        router.push("/purchasing/daftar-po");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, purchaseOrderId, router]); // Include router in dependencies

  // Memoized calculations to prevent unnecessary recalculations
  const calculations = React.useMemo(() => {
    // Hitung total potongan item (untuk tampilan saja)
    const totalItemDiscount = formData.items.reduce((sum, item) => {
      const itemDiscountAmount = calculateItemDiscount(
        item.price || 0,
        item.discount || 0,
        item.discountType || "AMOUNT"
      );
      return sum + itemDiscountAmount * (item.quantity || 0);
    }, 0);

    // Subtotal dari item (totalPrice sudah dikurangi diskon per item)
    const subtotal = formData.items.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0
    );

    // Hitung potongan order level berdasarkan subtotal (yang sudah dikurangi diskon item)
    const orderLevelDiscountAmount = calculateOrderLevelDiscount(
      subtotal,
      formData.orderLevelDiscount || 0,
      formData.orderLevelDiscountType || "AMOUNT"
    );

    // Total diskon keseluruhan (item + order level) - untuk tampilan saja
    const totalDiscount = totalItemDiscount + orderLevelDiscountAmount;

    // Pajak hanya ditampilkan sebagai informasi, tidak dihitung dalam total
    const totalTax = 0; // Hapus kalkulasi pajak

    // Total pembayaran: subtotal - order level discount + shipping (tanpa pajak)
    // (diskon item sudah dikurangi di subtotal)
    const totalPayment =
      subtotal - orderLevelDiscountAmount + (formData.shippingCost || 0);

    return {
      subtotal,
      totalItemDiscount,
      orderLevelDiscountAmount,
      totalDiscount,
      totalTax,
      totalPayment,
    };
  }, [
    formData.items,
    formData.orderLevelDiscount,
    formData.orderLevelDiscountType,
    formData.taxPercentage,
    formData.shippingCost,
    calculateItemDiscount,
    calculateOrderLevelDiscount,
  ]);

  // Update formData when calculations change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalAmount: calculations.subtotal,
      totalDiscount: calculations.totalDiscount,
      totalTax: calculations.totalTax,
      totalPayment: calculations.totalPayment,
    }));
  }, [calculations]);

  const validateForm = (): boolean => {
    const errors: PurchaseOrderFormErrors = {};

    if (!formData.code) {
      errors.code = "Kode Pesanan wajib diisi";
    }
    if (!formData.poDate) {
      errors.poDate = "Tanggal Pesanan wajib diisi";
    }
    // if (!formData.dateline) {
    //   errors.dateline = "Deadline wajib diisi";
    // } else if (new Date(formData.dateline) < new Date(formData.poDate)) {
    //   errors.dateline = "Deadline tidak boleh lebih awal dari tanggal pesanan";
    // }
    // Removed creatorId validation - automatically filled from session
    if (!formData.orderId) {
      errors.orderId = "Pesanan wajib dipilih";
    }
    if (
      formData.taxPercentage === undefined ||
      formData.taxPercentage === null
    ) {
      errors.taxPercentage = "Pajak wajib dipilih";
    }
    if (formData.items.length === 0) {
      errors.items = { 0: { productId: "Minimal harus ada satu item" } };
    } else {
      const itemErrors: { [key: number]: { [key: string]: string } } = {};
      formData.items.forEach((item, index) => {
        const itemError: { [key: string]: string } = {};
        if (!item.productId) itemError.productId = "Produk wajib dipilih";
        if (!item.quantity || item.quantity <= 0)
          itemError.quantity = "Quantity harus lebih dari 0";
        if (!item.price || item.price < 0)
          itemError.price = "Harga tidak boleh negatif";

        // Validasi stok
        if (item.productId && item.quantity > 0) {
          const product = availableProducts.find(p => p.id === item.productId);
          if (product && product.currentStock < item.quantity) {
            itemError.quantity = `Stok tidak mencukupi`;
          }
        }

        if (Object.keys(itemError).length > 0) itemErrors[index] = itemError;
      });
      if (Object.keys(itemErrors).length > 0) errors.items = itemErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = useCallback(
    (field: keyof PurchaseOrderFormData, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (formErrors[field as keyof PurchaseOrderFormErrors]) {
        setFormErrors(prev => ({ ...prev, [field]: undefined }));
      }
    },
    [formErrors]
  );

  const handleOrderChange = (orderId: string) => {
    const order = availableOrders.find(o => o.id === orderId);
    setSelectedOrder(order || null);

    if (order) {
      const items: PurchaseOrderItemFormData[] = order.orderItems.map(item => {
        const price = item.products.sellingPrice || item.products.price;
        const quantity = item.quantity;
        const discount = item.discount || 0;
        const priceAfterDiscount = price - discount;
        const totalPrice = priceAfterDiscount * quantity;
        return {
          productId: item.products.id,
          quantity,
          price,
          discount,
          discountType: "AMOUNT" as const,
          totalPrice,
        };
      });

      setFormData(prev => ({
        ...prev,
        orderId,
        items,
        orderLevelDiscount: order.discount || 0,
        shippingCost: order.shippingCost || 0,
        paymentDeadline: order.paymentDeadline || null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        orderId: "",
        items: [],
        orderLevelDiscount: 0,
        shippingCost: 0,
        paymentDeadline: null,
      }));
    }

    if (formErrors.orderId) {
      setFormErrors({ ...formErrors, orderId: undefined });
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseOrderItemFormData,
    value: any
  ) => {
    const newItems = [...formData.items];
    const currentItem = { ...newItems[index], [field]: value };

    if (["quantity", "price", "discount", "discountType"].includes(field)) {
      const itemDiscountAmount = calculateItemDiscount(
        currentItem.price || 0,
        currentItem.discount || 0,
        currentItem.discountType || "AMOUNT"
      );
      const priceAfterDiscount = (currentItem.price || 0) - itemDiscountAmount;
      currentItem.totalPrice = priceAfterDiscount * (currentItem.quantity || 0);
    }

    if (field === "productId") {
      const product = availableProducts.find(p => p.id === value);
      if (product) {
        currentItem.price = product.sellingPrice || product.price;
        const itemDiscountAmount = calculateItemDiscount(
          product.sellingPrice || product.price,
          currentItem.discount || 0,
          currentItem.discountType || "AMOUNT"
        );
        const priceAfterDiscount =
          (product.sellingPrice || product.price) - itemDiscountAmount;
        currentItem.totalPrice =
          priceAfterDiscount * (currentItem.quantity || 0);
      }
    }

    // Validasi stok jika field quantity atau productId berubah
    if (field === "quantity" || field === "productId") {
      const productId = field === "productId" ? value : currentItem.productId;
      const quantity = field === "quantity" ? value : currentItem.quantity;

      if (productId && quantity) {
        const product = availableProducts.find(p => p.id === productId);
        if (product && product.currentStock < quantity) {
          // Set error untuk item ini
          const newErrors = { ...formErrors };
          if (!newErrors.items) newErrors.items = {};
          if (!newErrors.items[index]) newErrors.items[index] = {};
          newErrors.items[index].quantity = `Stok tidak mencukupi.`;
          setFormErrors(newErrors);
        } else {
          // Hapus error stok jika ada
          const newErrors = { ...formErrors };
          if (
            newErrors.items?.[index]?.quantity?.includes("Stok tidak mencukupi")
          ) {
            delete newErrors.items[index].quantity;
            if (Object.keys(newErrors.items[index]).length === 0) {
              delete newErrors.items[index];
              if (Object.keys(newErrors.items).length === 0) {
                delete newErrors.items;
              }
            }
            setFormErrors(newErrors);
          }
        }
      }
    }

    newItems[index] = currentItem;
    setFormData({ ...formData, items: newItems });

    if (
      formErrors.items?.[index]?.[field] &&
      !formErrors.items[index][field]?.includes("Stok tidak mencukupi")
    ) {
      const newErrors = { ...formErrors };
      if (newErrors.items && newErrors.items[index]) {
        delete newErrors.items[index][field as keyof PurchaseOrderItemFormData];
        if (Object.keys(newErrors.items[index]).length === 0) {
          delete newErrors.items[index];
          if (Object.keys(newErrors.items).length === 0) {
            delete newErrors.items;
          }
        }
      }
      setFormErrors(newErrors);
    }
  };

  const handleDelete = async () => {
    // Double-check if deletion is allowed
    if (!canDelete) {
      toast.error(deleteReason || "Pesanan Pembelian tidak dapat dihapus");
      setShowDeleteModal(false);
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deletePurchaseOrder(params.id as string);

      if (result.success) {
        toast.success("Pesanan Pembelian berhasil dihapus!");
        router.push("/purchasing/daftar-po");
      } else {
        toast.error(result.error || "Gagal menghapus Pesanan Pembelian");
      }
    } catch (error) {
      console.error("Error deleting PO:", error);
      toast.error("Terjadi kesalahan saat menghapus data");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: "",
          quantity: 1,
          price: 0,
          discount: 0,
          discountType: "AMOUNT" as const,
          totalPrice: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if PO cannot be edited
    if (!canEdit) {
      toast.warning("Pesanan Pembelian ini tidak dapat diedit");
      return;
    }

    if (!validateForm()) {
      toast.warning("Harap periksa kembali data yang Anda masukkan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePurchaseOrder(purchaseOrderId, {
        ...formData,
        poDate: new Date(formData.poDate),
        paymentDeadline: formData.paymentDeadline
          ? new Date(formData.paymentDeadline)
          : null,
      });

      if (result.success) {
        toast.success("Pesanan Pembelian berhasil diupdate!");
        router.push("/purchasing/daftar-po");
      } else {
        toast.error(result.error || "Gagal mengupdate Pesanan Pembelian");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        allowedRoles={["ADMIN", "OWNER", "WAREHOUSE"]}
        mainPageName="/purchasing/daftar-po"
        headerTittle="Edit Pesanan Pembelian"
      />

      <ManagementForm
        subModuleName="daftar-po"
        moduleName="purchasing"
        isSubmitting={isSubmitting}
        hideDeleteButton={!canDelete}
        handleDelete={() => setShowDeleteModal(true)}
        handleFormSubmit={handleFormSubmit}
        disableSubmit={!canEdit}
      >
        {/* Banner untuk PO yang tidak dapat diedit */}
        {!canEdit && (
          <div className="mt-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Pesanan Pembelian Tidak Dapat Diedit
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{editBlockReason}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Kode Pesanan" errorMessage={formErrors.code}>
            <Input
              name="code"
              type="text"
              value={formData.code}
              readOnly
              className="mt-1 block w-full bg-gray-100 cursor-default dark:bg-gray-800"
            />
          </FormField>
          <FormField label="Tanggal Pesanan" errorMessage={formErrors.poDate}>
            <InputDate
              value={new Date(formData.poDate)}
              onChange={value =>
                value &&
                handleInputChange("poDate", value.toISOString().split("T")[0])
              }
            />
          </FormField>
        </div>

        {/* Hidden field untuk Pembuat PO - diambil langsung dari session */}
        <input type="hidden" name="creatorId" value={formData.creatorId} />

        <FormField label="Pesanan Terkait" errorMessage={formErrors.orderId}>
          {originalPO?.orderId ? (
            <div className="mt-1">
              <Input
                type="text"
                name="orderId"
                value={
                  selectedOrder
                    ? `${selectedOrder.orderNumber} - ${selectedOrder.customer.name}`
                    : "Pesanan tidak ditemukan"
                }
                readOnly
                className="bg-gray-100 cursor-default dark:bg-gray-800"
              />
              <div className="text-sm text-gray-500 mt-1">
                Pesanan sudah terkait dan tidak dapat diubah
              </div>
            </div>
          ) : canEdit ? (
            <Select
              value={formData.orderId || ""}
              onChange={handleOrderChange}
              options={availableOrders.map(order => ({
                value: order.id,
                label: `${order.orderNumber} - ${order.customer.name}`,
              }))}
              placeholder="Pilih Pesanan"
              searchable={true}
              searchPlaceholder="Cari pesanan..."
              className={formErrors.orderId ? "border-red-500" : ""}
            />
          ) : (
            <Input
              type="text"
              name="orderId"
              value={
                selectedOrder
                  ? `${selectedOrder.orderNumber} - ${selectedOrder.customer.name}`
                  : "Tidak ada order terpilih"
              }
              readOnly
              className="bg-gray-100 cursor-default dark:bg-gray-800"
            />
          )}
        </FormField>

        {selectedOrder && (
          <div className="mt-6">
            {/* Customer Info Component */}
            <CustomerInfo
              customerId={selectedOrder.customer.id}
              orderNumber={selectedOrder.orderNumber}
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Net" errorMessage={formErrors.paymentDeadline}>
                <InputDate
                  value={formData.paymentDeadline}
                  showClearButton={true}
                  showNullAsText="Bayar Langsung"
                  onChange={value =>
                    handleInputChange("paymentDeadline", value)
                  }
                />
              </FormField>
              <FormField
                label="Biaya Pengiriman"
                errorMessage={formErrors.shippingCost}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    Rp
                  </span>
                  <Input
                    type="text"
                    name="shippingCost"
                    value={formData.shippingCost.toLocaleString("id-ID")}
                    onChange={e => {
                      const value =
                        parseFloat(e.target.value.replace(/\D/g, "")) || 0;
                      handleInputChange("shippingCost", value);
                    }}
                    placeholder="0"
                    className="mt-1 block w-full pl-10"
                  />
                </div>
              </FormField>
            </div>
          </div>
        )}

        <div className="mt-6">
          <FormField label="Catatan" errorMessage={formErrors.notes}>
            <InputTextArea
              name="notes"
              value={formData.notes}
              onChange={e => handleInputChange("notes", e.target.value)}
              placeholder="Catatan tambahan (opsional)"
            />
          </FormField>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Item Pesanan Pembelian
            </h3>
            <button
              type="button"
              onClick={addItem}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-500 hover:bg-blue-600 text-white `}
            >
              <FiPlus className="w-3 h-3" />
              Tambah Item
            </button>
          </div>
        </div>

        {formData.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Belum ada item. Pilih Order untuk menampilkan barang.
          </div>
        ) : (
          <div className="overflow-x-auto shadow-sm">
            <div className="min-w-[1000px]">
              {" "}
              {/* Ensure minimum width for all columns */}
              <table className="w-full table-fixed border-collapse bg-white dark:bg-gray-900">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[200px]">
                      Produk
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[60px]">
                      Stok
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[80px]">
                      Qty
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[140px]">
                      Harga Per Krat
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[160px]">
                      Potongan
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[140px]">
                      Total
                    </th>
                    <th className="border border-gray-200 dark:border-gray-600 px-2 py-2 text-left text-m font-medium text-gray-700 dark:text-gray-300 w-[30px]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => {
                    const product = availableProducts.find(
                      p => p.id === item.productId
                    );

                    return (
                      <tr
                        key={index}
                        className="border-t border-gray-200 dark:border-gray-600"
                      >
                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                          <select
                            value={item.productId}
                            onChange={e =>
                              handleItemChange(
                                index,
                                "productId",
                                e.target.value
                              )
                            }
                            className={`w-full px-2 py-1 text-m border rounded dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              formErrors.items?.[index]?.productId
                                ? "border-red-500"
                                : "border-gray-300"
                            } ${""}`}
                          >
                            <option value="">Pilih Produk</option>
                            {availableProducts
                              .filter(
                                product =>
                                  // Show current product or products not selected in other rows
                                  product.id === item.productId ||
                                  !formData.items.some(
                                    (otherItem, otherIndex) =>
                                      otherIndex !== index &&
                                      otherItem.productId === product.id
                                  )
                              )
                              .map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                          </select>
                          {formErrors.items?.[index]?.productId && (
                            <div className="text-xs text-red-500 mt-1">
                              {formErrors.items[index].productId}
                            </div>
                          )}
                        </td>

                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                          {product && (
                            <div className="text-m text-center text-gray-700 dark:text-gray-300">
                              {product.currentStock}
                            </div>
                          )}
                          {formErrors.items?.[index]?.quantity && (
                            <div className="text-xs text-red-500 mt-1">
                              {formErrors.items[index].quantity}
                            </div>
                          )}
                        </td>

                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                          <Input
                            type="number"
                            name={`quantity_${index}`}
                            value={item.quantity.toString()}
                            onChange={e =>
                              handleItemChange(
                                index,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="w-full text-m px-2 py-1"
                          />
                        </td>

                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-m">
                              Rp
                            </span>
                            <Input
                              type="text"
                              name={`price_${index}`}
                              value={item.price.toLocaleString("id-ID")}
                              onChange={e => {
                                const value =
                                  parseFloat(
                                    e.target.value.replace(/\D/g, "")
                                  ) || 0;
                                handleItemChange(index, "price", value);
                              }}
                              className="pl-6 pr-1 w-full text-right text-m py-1"
                              placeholder="0"
                              title={`Rp ${item.price.toLocaleString("id-ID")}`}
                            />
                          </div>
                          {formErrors.items?.[index]?.price && (
                            <div className="text-xs text-red-500 mt-1">
                              {formErrors.items[index].price}
                            </div>
                          )}
                        </td>

                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                          <div className="flex gap-1">
                            <div className="relative flex-1 min-w-0">
                              <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">
                                {item.discountType === "PERCENTAGE"
                                  ? "%"
                                  : "Rp"}
                              </span>
                              <Input
                                type="text"
                                name={`discount_${index}`}
                                value={item.discount.toLocaleString("id-ID")}
                                onChange={e => {
                                  const value =
                                    parseFloat(
                                      e.target.value.replace(/\D/g, "")
                                    ) || 0;
                                  handleItemChange(index, "discount", value);
                                }}
                                className="pl-5 pr-1 w-full text-right text-s py-1"
                                placeholder="0"
                                title={`${
                                  item.discountType === "PERCENTAGE"
                                    ? ""
                                    : "Rp "
                                }${item.discount.toLocaleString("id-ID")}${
                                  item.discountType === "PERCENTAGE" ? "%" : ""
                                }`}
                              />
                            </div>
                            <select
                              value={item.discountType}
                              onChange={e =>
                                handleItemChange(
                                  index,
                                  "discountType",
                                  e.target.value as "AMOUNT" | "PERCENTAGE"
                                )
                              }
                              className={`w-11 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs ${""}`}
                            >
                              <option value="AMOUNT">Rp</option>
                              <option value="PERCENTAGE">%</option>
                            </select>
                          </div>
                          {formErrors.items?.[index]?.discount && (
                            <div className="text-xs text-red-500 mt-1">
                              {formErrors.items[index].discount}
                            </div>
                          )}
                        </td>

                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                          <div
                            className="font-medium text-gray-900 dark:text-gray-100 text-right text-m truncate"
                            title={formatRupiah(item.totalPrice)}
                          >
                            {formatRupiah(item.totalPrice)}
                          </div>
                        </td>

                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className={`cursor-pointer flex items-center justify-center w-6 h-6 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 ${
                              canEdit
                                ? "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                            title={
                              canEdit
                                ? "Hapus item"
                                : "Tidak dapat menghapus item"
                            }
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    <td
                      className="border border-gray-200 dark:border-gray-600 px-2 py-2 font-bold text-xl dark:text-gray-100"
                      colSpan={5}
                    >
                      Subtotal:
                      <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
                        (Pajak {formData.taxPercentage || 0}% sudah dihitung
                        dalam subtotal)
                      </div>
                    </td>
                    <td className="font-bold border border-gray-200 dark:border-gray-600 px-2 py-2 text-m text-right dark:text-gray-100">
                      {formatRupiah(formData.totalAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="mt-6 border-t pt-4 border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Detail Potongan
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Total Potongan Item:
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -Rp{" "}
                      {calculations.totalItemDiscount.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Potongan Keseluruhan:
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{formatRupiah(calculations.orderLevelDiscountAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 border-gray-200 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Total Potongan:
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{formatRupiah(calculations.totalDiscount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Potongan Keseluruhan:
                </span>
                <div className="flex gap-2">
                  <select
                    name="orderLevelDiscountType"
                    value={formData.orderLevelDiscountType}
                    onChange={e =>
                      handleInputChange(
                        "orderLevelDiscountType",
                        e.target.value as "AMOUNT" | "PERCENTAGE"
                      )
                    }
                    className="w-14 px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="AMOUNT">Rp</option>
                    <option value="PERCENTAGE">%</option>
                  </select>
                  <div className="w-25">
                    <Input
                      type="text"
                      name="orderLevelDiscount"
                      value={formData.orderLevelDiscount.toLocaleString(
                        "id-ID"
                      )}
                      onChange={e => {
                        const value =
                          parseFloat(e.target.value.replace(/\D/g, "")) || 0;
                        handleInputChange("orderLevelDiscount", value);
                      }}
                      className="py-1 text-sm h-8"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Sub setelah potongan */}
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Setelah potongan Keseluruhan:
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatRupiah(
                    calculations.subtotal -
                      calculations.orderLevelDiscountAmount
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Biaya Pengiriman:
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatRupiah(formData.shippingCost)}
                </span>
              </div>

              <div className="flex justify-between border-t pt-2 border-gray-200 dark:border-gray-600">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Total Pembayaran:
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatRupiah(formData.totalPayment)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ManagementForm>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Hapus Pesanan Pembelian"
        isLoading={isDeleting}
      >
        <p>
          Apakah Anda yakin ingin menghapus Pesanan Pembelian ini? Tindakan ini
          tidak dapat dibatalkan.
        </p>
      </ConfirmationModal>
    </div>
  );
}
