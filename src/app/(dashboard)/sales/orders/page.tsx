"use client";

import { useState, useEffect, useTransition } from "react";
import { ShoppingCart, Plus, Trash2, Users, Search } from "lucide-react";
import { toast } from "sonner";
import { createOrder } from "@/lib/actions/orders";
import { getActiveCustomers } from "@/lib/actions/customers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Loading from "@/components/ui/common/Loading";
import { Button } from "@/components/ui/common";
import { getProducts } from "@/lib/actions/products";
import { formatRupiah } from "@/utils/formatRupiah";

interface Product {
  id: string;
  name: string;
  price: number;
  sellingPrice?: number | null;
  unit: string;
  currentStock: number;
  isActive: boolean;
  bottlesPerCrate: number;
}

interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address: string;
  city: string;
  isActive: boolean;
}

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  discount?: number; // Diskon per item
  discountType?: "AMOUNT" | "PERCENTAGE"; // Tipe diskon per item
  crates?: number; // Jumlah krat
}

export default function OrdersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [, startTransition] = useTransition();

  // Customer selection states
  const [customerSelectionType, setCustomerSelectionType] = useState<
    "existing" | "new"
  >("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [notes, setNotes] = useState("");

  // New form states for shipping, discount, and payment
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderDiscountUnit, setOrderDiscountUnit] = useState<
    "AMOUNT" | "PERCENTAGE"
  >("AMOUNT");
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<"IMMEDIATE" | "DEFERRED">(
    "IMMEDIATE"
  );
  const [paymentDeadline, setPaymentDeadline] = useState("");

  const [items, setItems] = useState<OrderItem[]>([
    {
      productName: "",
      quantity: 1,
      price: 0,
      discount: 0,
      discountType: "AMOUNT",
      crates: 0,
    },
  ]);

  // Helper function to get bottles per crate from product data
  const getBottlesPerCrate = (productName: string): number => {
    const product = products.find((p) => p.name === productName);
    return product?.bottlesPerCrate || 24; // default to 24 if product not found
  };

  // Helper function to calculate crates from quantity
  const calculateCrates = (quantity: number, productName: string): number => {
    const bottlesPerCrate = getBottlesPerCrate(productName);
    return quantity / bottlesPerCrate;
  };

  // Load data on component mount
  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const products = await getProducts();
      setProducts(products);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const customers = await getActiveCustomers();
      setCustomers(customers);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Handle customer selection
  const handleCustomerSelection = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomerId(customerId);
      setCustomerName(customer.name);
      setCustomerEmail(customer.email || "");
      setCustomerPhone(customer.phone || "");
      setCustomerAddress(customer.address);
      setCustomerCity(customer.city);
      setCustomerSearchTerm(customer.name);
    }
  };

  // Reset customer form when switching to new customer
  const handleCustomerTypeChange = (type: "existing" | "new") => {
    setCustomerSelectionType(type);
    if (type === "new") {
      setSelectedCustomerId("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerCity("");
      setCustomerSearchTerm("");
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.code.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(customerSearchTerm))
  );

  const addItem = () => {
    setItems([
      ...items,
      {
        productName: "",
        quantity: 1,
        price: 0,
        discount: 0,
        discountType: "AMOUNT",
        crates: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (
    index: number,
    field: keyof OrderItem,
    value: string | number
  ) => {
    const updatedItems = [...items];
    if (
      field === "quantity" ||
      field === "price" ||
      field === "discount" ||
      field === "crates"
    ) {
      updatedItems[index][field] = Number(value);
    } else {
      (updatedItems[index] as any)[field] = value as string;
    }
    setItems(updatedItems);
  };

  const updateCrateAndQuantity = (index: number, crateValue: number) => {
    const updatedItems = [...items];
    const item = updatedItems[index];
    const bottlesPerCrate = getBottlesPerCrate(item.productName);

    updatedItems[index].crates = crateValue;
    updatedItems[index].quantity = crateValue * bottlesPerCrate;

    setItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      // Hitung harga setelah diskon item terlebih dahulu
      let priceAfterDiscount = item.price;

      if (item.discount && item.discount > 0) {
        if (item.discountType === "PERCENTAGE") {
          priceAfterDiscount = item.price - (item.price * item.discount) / 100;
        } else {
          priceAfterDiscount = item.price - item.discount;
        }
        priceAfterDiscount = Math.max(0, priceAfterDiscount);
      }

      // Krat dikali harga setelah diskon
      return sum + (item.crates || 0) * priceAfterDiscount;
    }, 0);
  };

  const calculateItemDiscounts = () => {
    // Karena subtotal sudah mengurangi diskon item,
    // fungsi ini hanya untuk menampilkan total diskon item saja
    return items.reduce((totalDiscount, item) => {
      if (!item.discount || item.discount <= 0) return totalDiscount;

      let discountPerUnit = 0;
      if (item.discountType === "PERCENTAGE") {
        discountPerUnit = (item.price * item.discount) / 100;
      } else {
        discountPerUnit = item.discount;
      }

      return totalDiscount + (item.crates || 0) * discountPerUnit;
    }, 0);
  };

  const calculateOrderDiscount = () => {
    if (!orderDiscount || orderDiscount <= 0) return 0;

    const subtotal = calculateSubtotal(); // Subtotal sudah dikurangi diskon item

    if (orderDiscountUnit === "PERCENTAGE") {
      return (subtotal * orderDiscount) / 100;
    } else {
      return orderDiscount;
    }
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal(); // Subtotal sudah dikurangi diskon item
    const orderDiscountAmount = calculateOrderDiscount();

    return Math.round(subtotal - orderDiscountAmount + shippingCost);
  };

  const handleSubmitOrder = async () => {
    // Validation
    if (!user) {
      toast.error("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (customerSelectionType === "existing" && !selectedCustomerId) {
      toast.error("Pilih customer yang sudah ada atau ganti ke customer baru.");
      return;
    }

    if (!customerName) {
      toast.error("Masukkan nama customer.");
      return;
    }

    if (!customerPhone) {
      toast.error("Masukkan nomor telepon customer.");
      return;
    }

    if (customerPhone.length < 10) {
      toast.error("Nomor telepon customer minimal 10 digit.");
      return;
    }

    // if (!deliveryAddress) {
    //   toast.error("Masukkan alamat pengiriman.");
    //   return;
    // }

    if (paymentType === "DEFERRED" && !paymentDeadline) {
      toast.error("Masukkan tenggat pembayaran.");
      return;
    }

    if (
      items.some(
        (item) => !item.productName || item.quantity <= 0 || item.price <= 0
      )
    ) {
      toast.error("Lengkapi semua item produk dengan benar.");
      return;
    }

    try {
      setIsSaving(true);

      startTransition(async () => {
        try {
          const result = await createOrder({
            salesId: user.id, // Use current user ID
            customerId:
              customerSelectionType === "existing"
                ? selectedCustomerId
                : undefined,
            customerName,
            customerEmail: customerEmail || undefined,
            customerPhone: customerPhone || undefined,
            customerAddress: customerAddress || undefined,
            customerCity: customerCity || undefined,
            items,
            notes: notes || undefined,
            deliveryAddress: deliveryAddress || undefined,
            discountType: "OVERALL", // Always use OVERALL for order-level discounts
            discountUnit: orderDiscountUnit,
            discount: orderDiscount, // Order-level discount
            shippingCost,
            paymentType,
            paymentDeadline:
              paymentType === "DEFERRED" && paymentDeadline
                ? new Date(paymentDeadline)
                : undefined,
            requiresConfirmation: true, // Always require confirmation
          });

          if (result.success) {
            toast.success(result.message);

            // Reset form
            setCustomerSelectionType("existing");
            setSelectedCustomerId("");
            setCustomerSearchTerm("");
            setCustomerName("");
            setCustomerEmail("");
            setCustomerPhone("");
            setCustomerAddress("");
            setCustomerCity("");
            setNotes("");
            setDeliveryAddress("");
            setOrderDiscount(0);
            setShippingCost(0);
            setPaymentDeadline("");
            setOrderDiscountUnit("AMOUNT");
            setItems([
              {
                productName: "",
                quantity: 1,
                price: 0,
                discount: 0,
                discountType: "AMOUNT",
                crates: 0,
              },
            ]);
          } else {
            toast.error(
              "Gagal menyimpan order: " + (result.error || "Unknown error")
            );
          }
        } catch (error) {
          console.error("Error saving order:", error);
          toast.error("Gagal menyimpan order. Coba lagi nanti.");
        } finally {
          setIsSaving(false);
        }
      });
    } catch (error) {
      console.error("Error in handleSubmitOrder:", error);
      setIsSaving(false);
    }
  };

  if (userLoading || loadingProducts || loadingCustomers) {
    return <Loading />;
  }

  if (!user || user.role !== "SALES") {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 overflow-x-hidden">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                Buat Order Baru
              </h1>
              {/* <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Form pembuatan order untuk sales lapangan -{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {user.name}
                </span>
              </p> */}
            </div>
            {/* <div className="flex items-center justify-between sm:justify-end">
              <div className="flex items-center space-x-4">
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Sales Representative
                  </p>
                  <p className="font-bold text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-[200px]">
                    {user.email}
                  </p>
                </div>
                <div className="relative">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                </div>
              </div>
            </div> */}
          </div>
        </div>

        {/* Order Form */}
        <div className="w-full">
          <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
            {/* Card Header with Gradient */}
            <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 p-6 sm:p-8">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center">
                  <ShoppingCart className="h-6 w-6 mr-3 text-white/90" />
                  Detail Order
                </h2>
                <p className="mt-2 text-blue-100 text-sm sm:text-base">
                  Isi detail order dan customer untuk diproses
                </p>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
            </div>

            <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
              {/* Customer Information */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl -z-10"></div>
                <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <label className="flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
                    Informasi Customer *
                  </label>

                  {/* Customer Selection Type */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="existing"
                          checked={customerSelectionType === "existing"}
                          onChange={() => handleCustomerTypeChange("existing")}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Customer Yang Sudah Ada
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="new"
                          checked={customerSelectionType === "new"}
                          onChange={() => handleCustomerTypeChange("new")}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Customer Baru
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Customer Selection for Existing Customer */}
                  {customerSelectionType === "existing" && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cari Customer *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={customerSearchTerm}
                          onChange={(e) =>
                            setCustomerSearchTerm(e.target.value)
                          }
                          placeholder="Cari berdasarkan nama, kode, atau telepon"
                          className="block w-full pl-10 pr-4 py-3 text-base border-0 bg-white/80 dark:bg-gray-600/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                        />
                      </div>

                      {/* Customer Dropdown */}
                      {customerSearchTerm && filteredCustomers.length > 0 && (
                        <div className="mt-2 max-h-60 overflow-y-auto bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                          {filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              onClick={() =>
                                handleCustomerSelection(customer.id)
                              }
                              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900 dark:text-white">
                                {customer.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {customer.code} •{" "}
                                {customer.phone || "Tidak ada telepon"} •{" "}
                                {customer.city}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nama Customer *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Masukkan nama customer"
                        disabled={
                          customerSelectionType === "existing" &&
                          selectedCustomerId !== ""
                        }
                        className={`block w-full px-4 py-3 text-base border-0 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-sm transition-all duration-200 hover:shadow-md ${
                          customerSelectionType === "existing" &&
                          selectedCustomerId !== ""
                            ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                            : "bg-white/80 dark:bg-gray-600/80"
                        }`}
                      />
                    </div>

                    {/* Customer Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Alamat Customer
                      </label>
                      <textarea
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Masukkan alamat customer"
                        rows={3}
                        disabled={
                          customerSelectionType === "existing" &&
                          selectedCustomerId !== ""
                        }
                        className={`block w-full px-4 py-3 text-base border-0 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-sm transition-all duration-200 hover:shadow-md resize-none ${
                          customerSelectionType === "existing" &&
                          selectedCustomerId !== ""
                            ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                            : "bg-white/80 dark:bg-gray-600/80"
                        }`}
                      />
                    </div>

                    {/* Customer City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kota Customer
                      </label>
                      <input
                        type="text"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        placeholder="Masukkan kota customer"
                        disabled={
                          customerSelectionType === "existing" &&
                          selectedCustomerId !== ""
                        }
                        className={`block w-full px-4 py-3 text-base border-0 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-sm transition-all duration-200 hover:shadow-md ${
                          customerSelectionType === "existing" &&
                          selectedCustomerId !== ""
                            ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                            : "bg-white/80 dark:bg-gray-600/80"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Contact Information */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-xl -z-10"></div>
                <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="flex items-center text-lg font-bold text-gray-900 dark:text-white">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mr-3"></div>
                      Informasi Kontak Customer
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Email Customer
                        </label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="email@customer.com"
                          disabled={
                            customerSelectionType === "existing" &&
                            selectedCustomerId !== ""
                          }
                          className={`block w-full px-4 py-4 text-sm sm:text-base border-0 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none rounded-xl shadow-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-transparent hover:shadow-xl ${
                            customerSelectionType === "existing" &&
                            selectedCustomerId !== ""
                              ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                              : "bg-white/80 dark:bg-gray-700/80"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Telepon Customer *
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Contoh: 081234567890"
                          disabled={
                            customerSelectionType === "existing" &&
                            selectedCustomerId !== ""
                          }
                          className={`block w-full px-4 py-4 text-sm sm:text-base border-0 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none rounded-xl shadow-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-transparent hover:shadow-xl ${
                            customerSelectionType === "existing" &&
                            selectedCustomerId !== ""
                              ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                              : "bg-white/80 dark:bg-gray-700/80"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery & Payment Information */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl -z-10"></div>
                <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="flex items-center text-lg font-bold text-gray-900 dark:text-white">
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3"></div>
                      Informasi Pengiriman & Pembayaran
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {/* <div className="min-w-0">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Alamat Pengiriman *
                      </label>
                      <textarea
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                        placeholder="Masukkan alamat lengkap pengiriman"
                        rows={3}
                        className="block w-full px-4 py-4 text-sm sm:text-base border-0 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none rounded-xl shadow-lg transition-all duration-200 resize-none bg-white/80 dark:bg-gray-700/80 focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:shadow-xl"
                      />
                    </div> */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Biaya Pengiriman
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={
                              shippingCost > 0 ? formatRupiah(shippingCost) : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value.replace(
                                /[^0-9]/g,
                                ""
                              );
                              setShippingCost(Number(value) || 0);
                            }}
                            placeholder="Rp 0"
                            className="block w-full px-4 py-4 text-sm sm:text-base border-0 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Jenis Pembayaran
                        </label>
                        <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
                          <label
                            className={`flex items-center justify-center px-4 py-3 rounded-md cursor-pointer transition-all duration-200 ${
                              paymentType === "IMMEDIATE"
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-105"
                                : "text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600"
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentType"
                              checked={paymentType === "IMMEDIATE"}
                              onChange={() => setPaymentType("IMMEDIATE")}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">
                              Langsung Bayar
                            </span>
                          </label>
                          <label
                            className={`flex items-center justify-center px-4 py-3 rounded-md cursor-pointer transition-all duration-200 ${
                              paymentType === "DEFERRED"
                                ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg transform scale-105"
                                : "text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600"
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentType"
                              checked={paymentType === "DEFERRED"}
                              onChange={() => setPaymentType("DEFERRED")}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">
                              Dengan Tenggat
                            </span>
                          </label>
                        </div>

                        {paymentType === "DEFERRED" && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Tenggat Pembayaran *
                            </label>
                            <input
                              type="date"
                              value={paymentDeadline}
                              onChange={(e) =>
                                setPaymentDeadline(e.target.value)
                              }
                              min={new Date().toISOString().split("T")[0]}
                              className="block w-full px-4 py-4 text-sm sm:text-base border-0 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                        Diskon Order (Keseluruhan)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={
                              orderDiscountUnit === "PERCENTAGE"
                                ? "number"
                                : "text"
                            }
                            value={
                              orderDiscountUnit === "PERCENTAGE"
                                ? orderDiscount
                                : orderDiscount > 0
                                ? formatRupiah(orderDiscount)
                                : ""
                            }
                            onChange={(e) => {
                              if (orderDiscountUnit === "PERCENTAGE") {
                                setOrderDiscount(Number(e.target.value));
                              } else {
                                const value = e.target.value.replace(
                                  /[^0-9]/g,
                                  ""
                                );
                                setOrderDiscount(Number(value) || 0);
                              }
                            }}
                            placeholder={`Masukkan diskon order ${
                              orderDiscountUnit === "PERCENTAGE"
                                ? "(%)"
                                : "(Rp)"
                            }`}
                            min={
                              orderDiscountUnit === "PERCENTAGE"
                                ? "0"
                                : undefined
                            }
                            max={
                              orderDiscountUnit === "PERCENTAGE"
                                ? "100"
                                : undefined
                            }
                            step={
                              orderDiscountUnit === "PERCENTAGE"
                                ? "1"
                                : undefined
                            }
                            className="block w-full pl-12 pr-28 py-4 text-sm sm:text-base border-0 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                            <span className="text-gray-500 text-sm font-medium">
                              {orderDiscountUnit === "PERCENTAGE" ? "%" : "Rp"}
                            </span>
                          </div>
                        </div>
                        <select
                          value={orderDiscountUnit}
                          onChange={(e) =>
                            setOrderDiscountUnit(e.target.value as any)
                          }
                          className="w-32 py-4 px-3 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white border-0 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 hover:shadow-xl"
                        >
                          <option value="AMOUNT">Rp</option>
                          <option value="PERCENTAGE">%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl -z-10"></div>
                <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h4 className="flex items-center text-lg font-bold text-gray-900 dark:text-white">
                      <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mr-3"></div>
                      Item Order
                    </h4>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={addItem}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="relative bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {/* Mobile and Desktop Layout */}
                        <div className="space-y-4">
                          {/* Product Selection - Full Width */}
                          <div className="w-full">
                            <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                              Produk *
                            </label>
                            <div className="relative">
                              <select
                                value={item.productName}
                                onChange={(e) => {
                                  const selectedProduct = products.find(
                                    (p) => p.name === e.target.value
                                  );
                                  updateItem(
                                    index,
                                    "productName",
                                    e.target.value
                                  );
                                  if (selectedProduct) {
                                    updateItem(
                                      index,
                                      "price",
                                      selectedProduct.sellingPrice || 0
                                    );
                                  }
                                  // Reset crates and quantity when product changes
                                  updateItem(index, "crates", 0);
                                  updateItem(index, "quantity", 1);
                                }}
                                className="block w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-0 bg-white/90 dark:bg-gray-600/90 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent rounded-lg shadow-sm transition-all duration-200 hover:shadow-md appearance-none"
                              >
                                <option value="">Pilih Produk</option>
                                {products
                                  .filter(
                                    (product) =>
                                      product.isActive &&
                                      product.currentStock > 0 &&
                                      // Exclude products already selected in other items
                                      !items.some(
                                        (otherItem, otherIndex) =>
                                          otherIndex !== index &&
                                          otherItem.productName === product.name
                                      )
                                  )
                                  .map((product) => (
                                    <option
                                      key={product.id}
                                      value={product.name}
                                    >
                                      {product.name} - Rp{" "}
                                      {(
                                        product.sellingPrice || 0
                                      ).toLocaleString("id-ID")}{" "}
                                      ({product.unit}) - Stock:{" "}
                                      {product.currentStock}
                                    </option>
                                  ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <div className="w-4 h-4 text-gray-400">
                                  <svg
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quantity and Price Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {/* Krat */}
                            <div className="col-span-1">
                              <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Krat *
                              </label>
                              <input
                                type="number"
                                value={
                                  item.crates === 0 ? "" : item.crates || ""
                                }
                                onChange={(e) =>
                                  updateCrateAndQuantity(
                                    index,
                                    Number(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                                min="0"
                                step="0.1"
                                className="block w-full px-3 py-3 sm:py-4 text-sm sm:text-base border-0 bg-white/90 dark:bg-gray-600/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg shadow-sm transition-all duration-200 hover:shadow-md text-center"
                              />
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                                {getBottlesPerCrate(item.productName)} btl/krat
                              </div>
                            </div>

                            {/* Quantity (Pieces) */}
                            <div className="col-span-1">
                              <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Qty (Pieces)
                              </label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(index, "quantity", e.target.value)
                                }
                                placeholder="1"
                                min="1"
                                disabled={true}
                                className="block w-full px-3 py-3 sm:py-4 text-sm sm:text-base border-0 bg-gray-100 dark:bg-gray-500 text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg shadow-sm text-center cursor-not-allowed"
                              />
                            </div>

                            {/* Price */}
                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Harga
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) =>
                                    updateItem(index, "price", e.target.value)
                                  }
                                  placeholder="0"
                                  min="0"
                                  step="0.01"
                                  disabled={true}
                                  className="block w-full pl-8 pr-3 py-3 sm:py-4 text-sm sm:text-base border-0 bg-gray-100 dark:bg-gray-500 text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg shadow-sm cursor-not-allowed"
                                />
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                  <span className="text-gray-400 text-xs sm:text-sm">
                                    Rp
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Discount */}
                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Diskon Item
                              </label>
                              <div className="flex gap-1">
                                <div className="relative flex-1">
                                  <input
                                    type={
                                      item.discountType === "PERCENTAGE"
                                        ? "number"
                                        : "text"
                                    }
                                    value={
                                      item.discountType === "PERCENTAGE"
                                        ? item.discount || 0
                                        : item.discount && item.discount > 0
                                        ? formatRupiah(item.discount)
                                        : ""
                                    }
                                    onChange={(e) => {
                                      if (item.discountType === "PERCENTAGE") {
                                        updateItem(
                                          index,
                                          "discount",
                                          e.target.value
                                        );
                                      } else {
                                        const value = e.target.value.replace(
                                          /[^0-9]/g,
                                          ""
                                        );
                                        updateItem(
                                          index,
                                          "discount",
                                          Number(value) || 0
                                        );
                                      }
                                    }}
                                    placeholder={
                                      item.discountType === "PERCENTAGE"
                                        ? "0"
                                        : "Rp 0"
                                    }
                                    min={
                                      item.discountType === "PERCENTAGE"
                                        ? "0"
                                        : undefined
                                    }
                                    step={
                                      item.discountType === "PERCENTAGE"
                                        ? "0.1"
                                        : undefined
                                    }
                                    max={
                                      item.discountType === "PERCENTAGE"
                                        ? "100"
                                        : undefined
                                    }
                                    className="block w-full px-2 py-2 sm:py-3 text-xs sm:text-sm border-0 bg-white/90 dark:bg-gray-600/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                                  />
                                </div>
                                <select
                                  value={item.discountType || "AMOUNT"}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "discountType",
                                      e.target.value
                                    )
                                  }
                                  className="w-12 sm:w-14 px-1 py-2 sm:py-3 text-xs sm:text-sm border-0 bg-white/90 dark:bg-gray-600/90 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                                >
                                  <option value="AMOUNT">Rp</option>
                                  <option value="PERCENTAGE">%</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Total and Actions Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-gray-200/50 dark:border-gray-600/50">
                            {/* Total */}
                            <div className="flex-1">
                              <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Total Item
                              </label>
                              <div className="px-4 py-3 sm:py-4 text-lg sm:text-xl font-bold bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-200 rounded-lg text-center">
                                Rp{" "}
                                {(() => {
                                  // Krat dikali harga terlebih dahulu
                                  const itemSubtotal =
                                    (item.crates || 0) * item.price;
                                  let priceAfterDiscount = item.price;

                                  if (item.discount && item.discount > 0) {
                                    if (item.discountType === "PERCENTAGE") {
                                      priceAfterDiscount =
                                        item.price -
                                        (item.price * item.discount) / 100;
                                    } else {
                                      priceAfterDiscount =
                                        item.price - item.discount;
                                    }
                                  }

                                  // Total = crates * harga setelah diskon
                                  const finalTotal =
                                    (item.crates || 0) *
                                    Math.max(0, priceAfterDiscount);
                                  return Math.round(finalTotal).toLocaleString(
                                    "id-ID"
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Remove Button */}
                            <div className="flex-shrink-0 sm:ml-4">
                              <label className="block text-xs sm:text-sm font-medium text-transparent mb-2">
                                Action
                              </label>
                              <Button
                                variant="ghost"
                                size="small"
                                onClick={() => removeItem(index)}
                                disabled={items.length === 1}
                                className="w-full sm:w-auto px-4 py-3 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 font-medium"
                              >
                                <Trash2 className="h-4 w-4 mr-2 sm:mr-0" />
                                <span className="sm:hidden">Hapus Item</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl -z-10"></div>
                    <div className="relative bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
                      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full mr-3"></div>
                        Ringkasan Total
                      </h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                            Subtotal:
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            Rp {calculateSubtotal().toLocaleString("id-ID")}
                          </span>
                        </div>
                        {calculateItemDiscounts() > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">
                              Diskon Item:
                            </span>
                            <span className="font-bold text-red-600">
                              -Rp{" "}
                              {calculateItemDiscounts().toLocaleString("id-ID")}
                            </span>
                          </div>
                        )}
                        {calculateOrderDiscount() > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">
                              Diskon Order{" "}
                              {orderDiscountUnit === "PERCENTAGE"
                                ? `(${orderDiscount}%)`
                                : ""}
                              :
                            </span>
                            <span className="font-bold text-red-600">
                              -Rp{" "}
                              {calculateOrderDiscount().toLocaleString("id-ID")}
                            </span>
                          </div>
                        )}
                        {shippingCost > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">
                              Biaya Pengiriman:
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              Rp {shippingCost.toLocaleString("id-ID")}
                            </span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                              Total Akhir:
                            </span>
                            <div className="text-right">
                              <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                                Rp {calculateTotal().toLocaleString("id-ID")}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Termasuk semua biaya
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 rounded-xl -z-10"></div>
                <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <label className="flex items-center text-lg font-bold text-gray-900 dark:text-white mb-4">
                    <div className="w-2 h-2 bg-gradient-to-r from-slate-500 to-gray-500 rounded-full mr-3"></div>
                    Catatan Order
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="block w-full border-0 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white rounded-xl px-4 py-4 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent shadow-lg transition-all duration-200 hover:shadow-xl resize-none"
                    placeholder="Catatan tambahan untuk order ini (opsional)..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSaving || calculateTotal() === 0}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-2xl shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center space-x-3">
                    <ShoppingCart className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-lg">
                      {isSaving ? "Menyimpan Order..." : "Buat Order Sekarang"}
                    </span>
                  </div>
                  {!isSaving && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-pink-400 to-yellow-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
