// app/sales/invoice/edit/[id]/page.tsx
"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
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
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";
import {
  updateInvoice,
  getInvoiceById,
  getAvailableCustomers,
  getAvailablePurchaseOrdersForEdit,
  getAvailableProducts,
  getPurchaseOrderForInvoice,
  deleteInvoice,
  markInvoiceAsSent,
} from "@/lib/actions/invoices";
import { getCompanyProfiles } from "@/lib/actions/company-profiles";
import { getActiveTax } from "@/lib/actions/taxes";
import {
  approveRedelivery,
  revokeRedeliveryApproval,
} from "@/lib/actions/deliveries";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { formatRupiah } from "@/utils/formatRupiah";
import { formatInputRupiah, parseInputRupiah } from "@/utils/formatInput";
import { formatDate } from "@/utils/formatDate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DiscountType, InvoiceType } from "@prisma/client";
import { Plus, Trash2, Eye, Truck } from "lucide-react";
import {
  generateInvoicePdf,
  type InvoiceData,
  type InvoiceItem,
} from "@/utils/generateInvoicePdf";

interface InvoiceItemFormData {
  productId: string;
  description?: string;
  quantity: number;
  price: number;
  discount: number;
  discountType: "AMOUNT" | "PERCENTAGE";
  totalPrice: number;
  finalPrice?: number; // harga setelah diskon per 1 unit
}

interface InvoiceFormData {
  code: string;
  invoiceDate: string;
  dueDate: Date | null;
  status: string;
  type: InvoiceType;
  subtotal: number;
  tax: number;
  taxPercentage: number | undefined; // Allow undefined for initial state
  taxAmount: number; // Nominal pajak yang akan disimpan
  discount: number;
  discountType: "AMOUNT" | "PERCENTAGE";
  discountDetail?: string;
  actualDiscount?: number; // nilai diskon yang sesungguhnya
  shippingCost: number;
  totalAmount: number;
  notes: string;
  customerId: string | null;
  purchaseOrderId: string;
  createdBy: string;
  useDeliveryNote: boolean;
  items: InvoiceItemFormData[];
}

interface InvoiceFormErrors {
  code?: string;
  invoiceDate?: string;
  dueDate?: string;
  status?: string;
  customerId?: string;
  taxPercentage?: string;
  items?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  sellingPrice?: number | null;
  currentStock: number;
  bottlesPerCrate: number; // Add bottlesPerCrate field
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function EditInvoicePage() {
  const data = useSharedData();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [availablePurchaseOrders, setAvailablePurchaseOrders] = useState<any[]>(
    []
  );
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Flag untuk menandai data sudah di-load
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [hasFailedDeliveries, setHasFailedDeliveries] = useState(false);
  const [isApprovingRedelivery, setIsApprovingRedelivery] = useState(false);

  // Function to translate payment status to Indonesian
  const getPaymentStatusIndonesian = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "Dikonfirmasi";
      case "PENDING":
        return "Menunggu";
      case "REJECTED":
        return "Ditolak";
      default:
        return status;
    }
  };

  // Function to translate delivery status to Indonesian
  const getDeliveryStatusIndonesian = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "Terkirim";
      case "RETURNED":
        return "Dikembalikan";
      case "CANCELLED":
        return "Dibatalkan";
      case "PENDING":
        return "Menunggu";
      case "IN_TRANSIT":
        return "Dalam Perjalanan";
      default:
        return status;
    }
  };

  const [formData, setFormData] = useState<InvoiceFormData>({
    code: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: null,
    status: "DRAFT",
    type: InvoiceType.PRODUCT, // Always PRODUCT type
    subtotal: 0,
    tax: 0,
    taxPercentage: undefined,
    taxAmount: 0, // Nominal pajak yang akan disimpan
    discount: 0,
    discountType: "AMOUNT",
    shippingCost: 0,
    totalAmount: 0,
    notes: "",
    customerId: "",
    purchaseOrderId: "",
    createdBy: "",
    useDeliveryNote: false,
    items: [
      {
        productId: "",
        quantity: 0,
        price: 0,
        discount: 0,
        discountType: "AMOUNT",
        totalPrice: 0,
      },
    ],
  });

  const [formErrors, setFormErrors] = useState<InvoiceFormErrors>({});

  // Fungsi untuk menghitung potongan keseluruhan - sama dengan PO
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

  // Fungsi untuk menghitung potongan item - sama dengan PO
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

  // Fungsi untuk menghitung final price per satuan (bukan per quantity)
  const calculateFinalPrice = React.useCallback(
    (
      price: number,
      discount: number,
      discountType: "AMOUNT" | "PERCENTAGE"
    ) => {
      if (discountType === "PERCENTAGE") {
        const discountAmount = (price * discount) / 100;
        return Math.round(price - discountAmount);
      } else {
        // AMOUNT discount per unit
        return Math.round(price - discount);
      }
    },
    []
  );

  // Recalculate totals when items change
  useEffect(() => {
    // Skip calculation jika data baru saja di-load dari database
    if (!isDataLoaded) {
      return;
    }

    const subtotal = formData.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    // Calculate total discount from items (untuk tampilan saja)
    const totalItemDiscount = formData.items.reduce((sum, item) => {
      const itemDiscountAmount = calculateItemDiscount(
        item.price || 0,
        item.discount || 0,
        item.discountType || "AMOUNT"
      );
      return sum + itemDiscountAmount * (item.quantity || 0);
    }, 0);

    // Calculate order level discount berdasarkan subtotal (yang sudah dikurangi diskon item)
    const orderLevelDiscountAmount = calculateOrderLevelDiscount(
      subtotal,
      formData.discount,
      formData.discountType
    );

    // Pajak hanya ditampilkan sebagai informasi, tidak dihitung dalam total
    const tax = 0; // Hapus kalkulasi pajak

    // Total amount: subtotal - order level discount + shipping (tanpa pajak)
    // (diskon item sudah dikurangi di subtotal)
    const totalAmount = Math.round(
      subtotal - orderLevelDiscountAmount + formData.shippingCost
    );

    setFormData(prev => ({
      ...prev,
      subtotal,
      tax,
      totalAmount,
    }));
  }, [
    formData.items,
    formData.discount,
    formData.discountType,
    formData.taxPercentage,
    formData.shippingCost,
    calculateOrderLevelDiscount,
    isDataLoaded, // Tambahkan dependency
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        const [invoice, customers, orders, products, activeTax] =
          await Promise.all([
            getInvoiceById(invoiceId),
            getAvailableCustomers(),
            getAvailablePurchaseOrdersForEdit(invoiceId),
            getAvailableProducts(),
            getActiveTax(),
          ]);

        if (!invoice) {
          setErrorLoadingData("Invoice tidak ditemukan");
          return;
        }

        setAvailableCustomers(customers);
        setAvailablePurchaseOrders(orders);
        setAvailableProducts(products);
        setInvoiceData(invoice);

        // Check if invoice has failed deliveries
        if (invoice.deliveries && invoice.deliveries.length > 0) {
          const failedDeliveries = invoice.deliveries.filter(
            (delivery: any) =>
              delivery.status === "CANCELLED" || delivery.status === "RETURNED"
          );
          setHasFailedDeliveries(failedDeliveries.length > 0);
        }

        // Fill form data with existing invoice data
        setFormData(prev => ({
          ...prev,
          code: invoice.code,
          invoiceDate: new Date(invoice.invoiceDate)
            .toISOString()
            .split("T")[0],
          dueDate: invoice.dueDate,
          status: invoice.status,
          type: invoice.type || InvoiceType.PRODUCT,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          taxPercentage:
            invoice.taxPercentage ??
            (activeTax ? parseFloat(activeTax.nominal) : 0),
          taxAmount:
            invoice.taxAmount ??
            (activeTax ? parseFloat(activeTax.nominal) : 0), // Load dari database atau use active tax
          discount: invoice.discount,
          shippingCost: invoice.shippingCost || 0,
          totalAmount: invoice.totalAmount,
          notes: invoice.notes || "",
          customerId: invoice.customerId || null,
          purchaseOrderId: invoice.purchaseOrderId || "",
          createdBy: invoice.createdBy || "",
          useDeliveryNote: invoice.useDeliveryNote || false,
          discountType: invoice.discountType || "AMOUNT",
          items: invoice.invoiceItems.map((item: any) => {
            const discountAmount = calculateItemDiscount(
              item.price,
              item.discount || 0,
              item.discountType || "AMOUNT"
            );
            return {
              productId: item.productId || "",
              quantity: item.quantity,
              price: item.price,
              discount: item.discount || 0,
              discountType: item.discountType || "AMOUNT",
              totalPrice: (item.price - discountAmount) * item.quantity,
            };
          }),
        }));

        const customer = customers.find(
          (c: Customer) => c.id === invoice.customerId
        );
        setSelectedCustomer(customer || null);

        // Set flag bahwa data sudah di-load untuk mencegah override totalAmount
        setIsDataLoaded(true);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setErrorLoadingData(error.message || "Gagal memuat data invoice.");
        toast.error(error.message || "Gagal memuat data invoice.");
      } finally {
        setIsLoadingData(false);
      }
    };

    if (invoiceId) {
      fetchData();
    }
  }, [invoiceId]); // Remove calculateItemDiscount dependency

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
      formData.discount || 0,
      formData.discountType || "AMOUNT"
    );

    // Total diskon keseluruhan (item + order level) - untuk tampilan saja
    const totalDiscount = totalItemDiscount + orderLevelDiscountAmount;

    // Pajak hanya ditampilkan sebagai informasi, tidak dihitung dalam total
    const totalTax = 0; // Hapus kalkulasi pajak

    // Total pembayaran: subtotal - order level discount + shipping (tanpa pajak)
    // (diskon item sudah dikurangi di subtotal)
    const totalAmount =
      subtotal - orderLevelDiscountAmount + (formData.shippingCost || 0);

    return {
      subtotal,
      totalItemDiscount,
      orderLevelDiscountAmount,
      totalDiscount,
      totalTax,
      totalAmount,
    };
  }, [
    formData.items,
    formData.discount,
    formData.discountType,
    formData.taxPercentage,
    formData.shippingCost,
    calculateItemDiscount,
    calculateOrderLevelDiscount,
  ]);

  // Update formData when calculations change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      // totalAmount: calculations.subtotal,
      totalDiscount: calculations.totalDiscount,
      totalTax: calculations.totalTax,
      totalAmount: calculations.totalAmount,
    }));
  }, [calculations]);

  const validateForm = (): boolean => {
    const errors: InvoiceFormErrors = {};

    if (!formData.code.trim()) {
      errors.code = "Kode invoice wajib diisi.";
    }

    if (!formData.invoiceDate) {
      errors.invoiceDate = "Tanggal invoice wajib diisi";
    }

    if (!formData.customerId) {
      errors.customerId = "Customer wajib dipilih";
    }

    // Tax percentage validation - allow 0 as valid value
    if (
      formData.taxPercentage === undefined ||
      formData.taxPercentage === null
    ) {
      errors.taxPercentage = "Pajak wajib dipilih";
    }

    if (
      formData.items.length === 0
      // formData.items.every(item => !item.productId)
    ) {
      errors.items = "Minimal harus ada satu item";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error("Mohon periksa kembali form yang diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate actual discount
      const actualDiscount = Math.round(
        calculateOrderLevelDiscount(
          formData.subtotal,
          formData.discount,
          formData.discountType
        )
      );

      // Process items to include finalPrice per unit
      const processedItems = formData.items.map(item => ({
        ...item,
        finalPrice: calculateFinalPrice(
          item.price,
          item.discount,
          item.discountType
        ),
      }));

      const invoiceData = {
        code: formData.code,
        invoiceDate: new Date(formData.invoiceDate),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        status: formData.status as any,
        type: formData.type,
        subtotal: formData.subtotal,
        tax: formData.tax,
        taxPercentage: formData.taxPercentage ?? 0, // Use 0 if undefined
        taxAmount: formData.taxAmount, // Nominal pajak yang akan disimpan
        discount: formData.discount,
        discountType: formData.discountType,
        actualDiscount, // nilai diskon yang sesungguhnya
        shippingCost: formData.shippingCost,
        totalAmount: formData.totalAmount,
        notes: formData.notes || undefined,
        customerId: formData.customerId || null,
        purchaseOrderId: formData.purchaseOrderId || undefined,
        createdBy: formData.createdBy,
        useDeliveryNote: formData.useDeliveryNote,
        items: processedItems,
      };

      const result = await updateInvoice(
        invoiceId,
        invoiceData,
        user?.id || "system"
      );

      if (result.success) {
        toast.success("Invoice berhasil diperbarui!");
        router.push("/sales/invoice");
      }
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast.error(error.message || "Gagal memperbarui invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteInvoice(invoiceId, user?.id || "system");
      toast.success("Invoice berhasil dihapus!");
      router.push("/sales/invoice");
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast.error(error.message || "Gagal menghapus invoice");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleApproveRedelivery = async () => {
    if (!invoiceData?.id || !user?.id) return;

    setIsApprovingRedelivery(true);
    try {
      const result = await approveRedelivery(invoiceData.id, user.id);
      if (result.success) {
        toast.success(result.message || "Pengiriman ulang berhasil disetujui!");
        // Reload invoice data to update allowRedelivery status
        setInvoiceData((prev: any) => ({ ...prev, allowRedelivery: true }));
      } else {
        toast.error(result.error || "Gagal menyetujui Pengiriman ulang");
      }
    } catch (error: any) {
      console.error("Error approving Pengiriman ulang:", error);
      toast.error("Gagal menyetujui Pengiriman ulang");
    } finally {
      setIsApprovingRedelivery(false);
    }
  };

  const handleRevokeRedeliveryApproval = async () => {
    if (!invoiceData?.id) return;

    setIsApprovingRedelivery(true);
    try {
      const result = await revokeRedeliveryApproval(
        invoiceData.id,
        user?.id || "system"
      );
      if (result.success) {
        toast.success(
          result.message || "Persetujuan Pengiriman ulang berhasil dicabut!"
        );
        // Reload invoice data to update allowRedelivery status
        setInvoiceData((prev: any) => ({ ...prev, allowRedelivery: false }));
      } else {
        toast.error(
          result.error || "Gagal mencabut persetujuan Pengiriman ulang"
        );
      }
    } catch (error: any) {
      console.error("Error revoking Pengiriman ulang approval:", error);
      toast.error("Gagal mencabut persetujuan Pengiriman ulang");
    } finally {
      setIsApprovingRedelivery(false);
    }
  };

  const handlePrintPdf = async () => {
    // Find customer from selectedCustomer or fallback to availableCustomers
    let customerData = selectedCustomer;
    if (!customerData && formData.customerId) {
      customerData =
        availableCustomers.find(
          (c: Customer) => c.id === formData.customerId
        ) || null;
    }

    if (!customerData) {
      toast.error(
        "Data customer tidak ditemukan. Pastikan customer sudah dipilih."
      );
      return;
    }

    try {
      // Get company profile data
      const companyProfiles = await getCompanyProfiles();
      const companyProfile =
        companyProfiles.length > 0 ? companyProfiles[0] : null;

      // Update invoice status to SENT when printing (only if status is DRAFT)
      const statusUpdate = await markInvoiceAsSent(invoiceId);
      if (statusUpdate.success) {
        // Check if status was actually changed
        if (statusUpdate.message?.includes("status updated")) {
          // Status was changed from DRAFT to SENT
          setFormData(prev => ({ ...prev, status: "SENT" }));
          // Update invoice data if it exists
          if (invoiceData) {
            setInvoiceData((prev: any) => ({ ...prev, status: "SENT" }));
          }
        }
        // If status wasn't changed, no need to update local state
      } else {
        console.warn(
          "Failed to update invoice status to SENT:",
          statusUpdate.error
        );
      }

      // Convert form items to PDF items
      const items: InvoiceItem[] = formData.items
        .filter(item => item.productId && item.quantity > 0)
        .map(item => {
          const product = availableProducts.find(p => p.id === item.productId);
          const bottlesPerCrate = product?.bottlesPerCrate || 24; // Use from database, fallback to 24
          const crates = item.quantity; // Quantity in form represents number of crates
          const totalBottles = crates * bottlesPerCrate; // Calculate total bottles
          return {
            description: product?.name || "Unknown Product",
            bottlesPerCrate: bottlesPerCrate,
            crates: crates,
            totalBottles: totalBottles,
            pricePerCrate: item.price,
            discount: item.discount || 0,
            discountType: item.discountType || "AMOUNT",
            total: item.totalPrice,
          };
        });

      const pdfData: InvoiceData = {
        // Company Information from profile
        companyName: companyProfile?.name || "CV HM JAYA BERKAH",
        companyAddress: companyProfile?.address || undefined,
        companyPhone: companyProfile?.phone || undefined,

        // Invoice Information
        invoiceNo: formData.code,
        invoiceDate: formatDate(new Date(formData.invoiceDate)),
        dueDate: formData.dueDate
          ? formatDate(new Date(formData.dueDate))
          : undefined,
        poNo: formData.purchaseOrderId
          ? availablePurchaseOrders.find(
              po => po.id === formData.purchaseOrderId
            )?.code || formData.purchaseOrderId
          : undefined,
        quotationNo: undefined,

        // Customer Information
        customerName: customerData.name,
        customerAddress: customerData.address,

        // Items
        items: items,

        // Totals
        subtotal: formData.subtotal,
        discount: formData.discount,
        discountType: formData.discountType,
        tax: formData.tax,
        taxPercentage: formData.taxPercentage,
        shippingCost: formData.shippingCost,
        totalAmount: formData.totalAmount,

        // Bank Info & Terms
        bankInfo: companyProfile?.bankAccountNumber || "1855999911",
        bankInfo2: companyProfile?.bankAccountNumber2 || undefined,
        accountType1: companyProfile?.accountType1 || "BCA",
        accountType2: companyProfile?.accountType2 || undefined,
        accountHolderName1:
          companyProfile?.accountHolderName1 ||
          companyProfile?.name ||
          "CV HM Jaya Berkah",
        accountHolderName2: companyProfile?.accountHolderName2 || undefined,

        // Representative
        representative: companyProfile?.owner || "LAILATUL QAMARIYAH",
      };

      generateInvoicePdf(pdfData);

      // Show appropriate toast message based on status update result
      if (statusUpdate.success) {
        if (statusUpdate.message?.includes("status updated")) {
          toast.success(
            "Status invoice diubah ke SENT dan PDF berhasil dibuat"
          );
        } else {
          toast.success("PDF berhasil dibuat");
        }
      } else {
        toast.success("PDF berhasil dibuat");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF");
    }
  };

  const handleInputChange = (field: keyof InvoiceFormData, value: any) => {
    setFormData({ ...formData, [field]: value });

    if (formErrors[field as keyof InvoiceFormErrors]) {
      setFormErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItemFormData,
    value: any
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate totalPrice for this item menggunakan fungsi discount yang benar
    if (
      field === "quantity" ||
      field === "price" ||
      field === "discount" ||
      field === "discountType"
    ) {
      const item = newItems[index];
      const discountAmount = calculateItemDiscount(
        item.price,
        item.discount,
        item.discountType
      );
      item.totalPrice = (item.price - discountAmount) * item.quantity;
    }

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: "",
          quantity: 0,
          price: 0,
          discount: 0,
          discountType: "AMOUNT",
          totalPrice: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleCancel = () => {
    router.push("/sales/invoice");
  };

  // Auto-fill customer and items when purchase order is selected
  // BUT ONLY if data is not already loaded from existing invoice
  useEffect(() => {
    if (formData.purchaseOrderId && !isDataLoaded) {
      const fetchPurchaseOrderDetails = async () => {
        try {
          const purchaseOrderDetails = await getPurchaseOrderForInvoice(
            formData.purchaseOrderId
          );
          if (purchaseOrderDetails) {
            setFormData(prev => ({
              ...prev,
              customerId: purchaseOrderDetails.order?.customerId || "",
              taxPercentage: purchaseOrderDetails.taxPercentage || 0,
              shippingCost: purchaseOrderDetails.shippingCost || 0,
              discount: purchaseOrderDetails.orderLevelDiscount || 0,
              discountType:
                purchaseOrderDetails.orderLevelDiscountType || "AMOUNT",
              dueDate: purchaseOrderDetails.paymentDeadline || null,
              items: purchaseOrderDetails.items.map(item => {
                const price = item.price || 0;
                const discount = item.discount || 0;
                const discountType = item.discountType || "AMOUNT";
                const discountAmount = calculateItemDiscount(
                  price,
                  discount,
                  discountType
                );
                const totalPrice = (price - discountAmount) * item.quantity;

                return {
                  productId: item.product.id,
                  quantity: item.quantity,
                  price: price,
                  discount: discount,
                  discountType: discountType,
                  totalPrice: totalPrice,
                };
              }),
            }));

            // Set selected customer for CustomerInfo component
            if (purchaseOrderDetails.order?.customer) {
              setSelectedCustomer(purchaseOrderDetails.order.customer);
            }
          }
        } catch (error) {
          console.error("Error fetching purchase order details:", error);
          toast.error("Gagal memuat detail purchase order");
        }
      };
      fetchPurchaseOrderDetails();
    } else if (!formData.purchaseOrderId) {
      // Clear selected customer when PO is cleared
      setSelectedCustomer(null);
    }
  }, [formData.purchaseOrderId, isDataLoaded]);

  // Ensure selectedCustomer is always in sync with formData.customerId
  useEffect(() => {
    if (formData.customerId && availableCustomers.length > 0) {
      const customer = availableCustomers.find(
        (c: Customer) => c.id === formData.customerId
      );
      if (
        customer &&
        (!selectedCustomer || selectedCustomer.id !== customer.id)
      ) {
        setSelectedCustomer(customer);
      }
    } else if (!formData.customerId) {
      setSelectedCustomer(null);
    }
  }, [formData.customerId, availableCustomers, selectedCustomer]);

  if (isLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit Invoice"
          mainPageName={`/${data.module}/${data.subModule}`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500 dark:text-gray-400">
              Memuat data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit Invoice"
          mainPageName={`/${data.module}/${data.subModule}`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex justify-center items-center h-32">
            <div className="text-red-500 dark:text-red-400">
              {errorLoadingData}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Edit Invoice"
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementForm
        subModuleName={data.subModule.toLowerCase()}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleSubmit}
        handleDelete={() => setShowDeleteModal(true)}
        hideDeleteButton={[
          "PAID",
          "DELIVERED",
          "COMPLETED",
          "CANCELLED",
          "RETURNED",
        ].includes(formData.status)}
        handlePrint={handlePrintPdf}
        hidePrintButton={false}
        disableSubmit={[
          "PAID",
          "DELIVERED",
          "COMPLETED",
          "CANCELLED",
          "RETURNED",
        ].includes(formData.status)}
      >
        {/* Banner untuk Invoice yang tidak dapat diedit */}
        {["PAID", "DELIVERED", "COMPLETED", "CANCELLED", "RETURNED"].includes(
          formData.status
        ) && (
          <div className="mt-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
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
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Invoice Tidak Dapat Diedit
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    Invoice dengan status "
                    {formData.status === "PAID"
                      ? "Dibayar"
                      : formData.status === "DELIVERED"
                      ? "Terkirim"
                      : formData.status === "COMPLETED"
                      ? "Selesai"
                      : formData.status === "CANCELLED"
                      ? "Dibatalkan"
                      : formData.status === "RETURNED"
                      ? "Diretur"
                      : formData.status}
                    " tidak dapat diedit atau dihapus.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner untuk Invoice yang memiliki data pembayaran atau pengiriman */}
        {invoiceData &&
          (invoiceData.payments?.length > 0 ||
            invoiceData.deliveries?.length > 0) &&
          !["PAID", "DELIVERED", "COMPLETED", "CANCELLED", "RETURNED"].includes(
            formData.status
          ) && (
            <div className="mt-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Invoice dengan Data Terkait
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <p>
                      Invoice ini memiliki{" "}
                      {invoiceData.payments?.length > 0 && "data pembayaran"}
                      {invoiceData.payments?.length > 0 &&
                        invoiceData.deliveries?.length > 0 &&
                        " dan "}
                      {invoiceData.deliveries?.length > 0 && "data pengiriman"}{" "}
                      yang sudah tercatat. Perubahan pada invoice dapat
                      memengaruhi data terkait.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kode Invoice */}
          <FormField
            label="Kode Invoice"
            required
            errorMessage={formErrors.code}
          >
            <Input
              type="text"
              name="code"
              value={formData.code}
              onChange={e => handleInputChange("code", e.target.value)}
              placeholder="Masukkan kode invoice"
            />
          </FormField>

          {/* Purchase Order - Read Only */}
          <FormField label="Pesanan Pembelian">
            <Input
              type="text"
              name="purchaseOrderDisplay"
              value={
                availablePurchaseOrders.find(
                  po => po.id === formData.purchaseOrderId
                )?.code || "Tidak ada"
              }
              readOnly
              className="cursor-default bg-gray-100 dark:bg-gray-700"
            />
          </FormField>

          {/* Tanggal Invoice */}
          <FormField
            label="Tanggal Invoice"
            required
            errorMessage={formErrors.invoiceDate}
          >
            <InputDate
              value={new Date(formData.invoiceDate)}
              onChange={value =>
                handleInputChange(
                  "invoiceDate",
                  value?.toISOString().split("T")[0] || ""
                )
              }
            />
          </FormField>

          {/* Tenggat Pembayaran */}
          <FormField label="Net" errorMessage={formErrors.dueDate}>
            <InputDate
              value={formData.dueDate ? new Date(formData.dueDate) : null}
              onChange={value =>
                handleInputChange(
                  "dueDate",
                  value ? value.toISOString().split("T")[0] : null
                )
              }
              showNullAsText="Bayar Langsung"
              allowClearToNull={true}
              isOptional={true}
              showClearButton={true}
              placeholder="Pilih tanggal pembayaran"
            />
          </FormField>

          {/* Status */}
          <FormField label="Status" required errorMessage={formErrors.status}>
            <Select
              value={formData.status}
              onChange={(value: string) => handleInputChange("status", value)}
              placeholder="Pilih Status"
              options={[
                { value: "DRAFT", label: "Draft" },
                { value: "SENT", label: "Tercetak" },
                { value: "PAID", label: "Dibayar" },
                { value: "DELIVERED", label: "Terkirim" },
                { value: "OVERDUE", label: "Jatuh Tempo" },
                { value: "CANCELLED", label: "Dibatalkan" },
                { value: "COMPLETED", label: "Selesai" },
              ]}
            />
          </FormField>

          {/* Customer - Read Only */}
          <FormField label="Customer" errorMessage={formErrors.customerId}>
            <Input
              type="text"
              name="customerDisplay"
              value={
                availableCustomers.find(c => c.id === formData.customerId)
                  ?.name || "Tidak ada"
              }
              readOnly
              className="cursor-default bg-gray-100 dark:bg-gray-700"
            />
          </FormField>

          {/* Biaya Pengiriman */}
          <FormField label="Biaya Pengiriman">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                Rp
              </span>
              <Input
                type="text"
                name="shippingCost"
                value={formatInputRupiah(formData.shippingCost)}
                onChange={e => {
                  const value = parseInputRupiah(e.target.value);
                  handleInputChange("shippingCost", value);
                }}
                placeholder="0"
                className="pl-10"
              />
            </div>
          </FormField>

          {/* Use Delivery Note */}
          <FormField label="Gunakan Surat Jalan">
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="useDeliveryNote"
                checked={formData.useDeliveryNote}
                onChange={e =>
                  handleInputChange("useDeliveryNote", e.target.checked)
                }
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label
                htmlFor="useDeliveryNote"
                className="text-sm font-medium text-gray-900 dark:text-gray-300"
              >
                Gunakan Surat Jalan
              </label>
            </div>
          </FormField>
        </div>

        {/* Show Customer Info when customer is selected */}
        {selectedCustomer && (
          <div className="mt-6">
            <CustomerInfo
              customerId={selectedCustomer.id}
              orderNumber={formData.purchaseOrderId}
            />
          </div>
        )}

        {/* Kumpulan Pembayaran - Simple Design - Only show if payments exist */}
        {invoiceData &&
          invoiceData.payments &&
          invoiceData.payments.length > 0 && (
            <div className="mt-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 0h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2"
                      />
                    </svg>
                    Riwayat Pembayaran
                  </h3>
                </div>

                <div className="space-y-2">
                  {invoiceData.payments
                    .slice(0, 3)
                    .map((payment: any, index: number) => (
                      <div
                        key={payment.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border gap-2"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {payment.paymentCode}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                              payment.status === "CONFIRMED"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                : payment.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                            }`}
                          >
                            {getPaymentStatusIndonesian(payment.status)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatRupiah(payment.amount)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(payment.paymentDate).toLocaleDateString(
                                "id-ID"
                              )}
                            </p>
                          </div>
                          <Link
                            href={`/purchasing/pembayaran/edit/${payment.id}`}
                            className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Detail
                          </Link>
                        </div>
                      </div>
                    ))}
                  {invoiceData.payments.length > 3 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                      Dan {invoiceData.payments.length - 3} pembayaran
                      lainnya...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Riwayat Pengiriman - Only show if there are deliveries */}
        {invoiceData &&
          invoiceData.deliveries &&
          Array.isArray(invoiceData.deliveries) &&
          invoiceData.deliveries.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800/50 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-blue-600" />
                  Riwayat Pengiriman
                </h3>
              </div>

              <div className="space-y-2">
                {invoiceData.deliveries?.map((delivery: any, index: number) => (
                  <div
                    key={delivery.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border gap-2"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {delivery.code}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          delivery.status === "CANCELLED"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                            : delivery.status === "RETURNED"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
                            : delivery.status === "DELIVERED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                        }`}
                      >
                        {getDeliveryStatusIndonesian(delivery.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Helper: {delivery.helper?.name || "N/A"}
                        </p>
                        {delivery.returnReason && (
                          <p className="text-xs text-red-600 dark:text-red-400 truncate">
                            Alasan: {delivery.returnReason}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/sales/pengiriman/edit/${delivery.id}`}
                        className="inline-flex items-center px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 whitespace-nowrap"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Detail
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Admin Actions untuk Failed Deliveries - Separate section */}
        {invoiceData &&
          invoiceData.deliveries &&
          Array.isArray(invoiceData.deliveries) &&
          invoiceData.deliveries.length > 0 &&
          invoiceData.deliveries.some((delivery: any) =>
            ["CANCELLED", "RETURNED"].includes(delivery.status)
          ) &&
          !invoiceData.deliveries.some(
            (delivery: any) => delivery.status === "DELIVERED"
          ) &&
          formData.status !== "COMPLETE" && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  Pengiriman Bermasalah
                </h3>
              </div>

              {/* Admin Actions - Only show for ADMIN or OWNER, when invoice is not COMPLETE, and no DELIVERED deliveries */}
              {(user?.role === "ADMIN" || user?.role === "OWNER") &&
                formData.status !== "COMPLETE" &&
                !invoiceData.deliveries?.some(
                  (delivery: any) => delivery.status === "DELIVERED"
                ) && (
                  <div className="mt-4 flex gap-3">
                    {!invoiceData.allowRedelivery ? (
                      <button
                        type="button"
                        onClick={handleApproveRedelivery}
                        disabled={isApprovingRedelivery}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-700 dark:hover:bg-green-600"
                      >
                        {isApprovingRedelivery
                          ? "Memproses..."
                          : "Setujui Pengiriman ulang"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ✓ Pengiriman ulang sudah disetujui
                        </span>
                        <button
                          type="button"
                          onClick={handleRevokeRedeliveryApproval}
                          disabled={isApprovingRedelivery}
                          className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-700 dark:hover:bg-red-600"
                        >
                          {isApprovingRedelivery
                            ? "Memproses..."
                            : "Cabut Persetujuan"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              {/* Info message - Only show when invoice is not COMPLETE and no DELIVERED deliveries */}
              {formData.status !== "COMPLETE" &&
                !invoiceData.deliveries?.some(
                  (delivery: any) => delivery.status === "DELIVERED"
                ) && (
                  <div className="mt-3 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      💡 <strong>Info:</strong> Invoice ini memiliki riwayat
                      pengiriman yang gagal. Admin dapat menyetujui Pengiriman
                      ulang untuk memungkinkan pengiriman ulang.
                    </p>
                  </div>
                )}
            </div>
          )}

        {/* Catatan */}
        <div className="mt-6">
          <FormField label="Catatan">
            <InputTextArea
              name="notes"
              value={formData.notes}
              onChange={e => handleInputChange("notes", e.target.value)}
              placeholder="Catatan tambahan..."
              rows={3}
            />
          </FormField>
        </div>

        {/* Invoice Items */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300">
              Item Invoice
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah Item
            </button>
          </div>

          {formErrors.items && typeof formErrors.items === "string" && (
            <div className="text-red-500 dark:text-red-400 text-sm mb-4">
              {formErrors.items}
            </div>
          )}

          {formData.items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada item. Klik 'Tambah Item' untuk menambah item.
            </div>
          ) : (
            <div className="overflow-x-auto shadow-sm">
              <div className="min-w-[1000px]">
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
                          {/* Product - Only product dropdown, no manual input */}
                          <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                            <div>
                              <select
                                value={item.productId || ""}
                                onChange={e => {
                                  const selectedProductId = e.target.value;
                                  const selectedProduct =
                                    availableProducts.find(
                                      p => p.id === selectedProductId
                                    );

                                  const newItems = [...formData.items];
                                  newItems[index] = {
                                    ...newItems[index],
                                    productId: selectedProductId,
                                    price: selectedProduct
                                      ? selectedProduct.sellingPrice || 0
                                      : newItems[index].price,
                                  };

                                  // Recalculate totalPrice
                                  const item = newItems[index];
                                  const discountAmount = calculateItemDiscount(
                                    item.price,
                                    item.discount,
                                    item.discountType
                                  );
                                  item.totalPrice =
                                    (item.price - discountAmount) *
                                    item.quantity;

                                  setFormData({
                                    ...formData,
                                    items: newItems,
                                  });
                                }}
                                className={`w-full px-2 py-1 text-m border rounded dark:bg-gray-900 dark:text-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  formErrors.items?.[index] &&
                                  typeof formErrors.items[index] === "object" &&
                                  "productId" in formErrors.items[index]
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
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
                              {formErrors.items?.[index] &&
                                typeof formErrors.items[index] === "object" &&
                                "productId" in formErrors.items[index] && (
                                  <div className="text-xs text-red-500 mt-1">
                                    {(formErrors.items[index] as any).productId}
                                  </div>
                                )}
                            </div>
                          </td>

                          <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                            {product && (
                              <div className="text-m text-center text-gray-700 dark:text-gray-300">
                                {product.currentStock}
                              </div>
                            )}
                          </td>

                          {/* Quantity */}
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

                          {/* Price */}
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
                                title={`Rp ${item.price.toLocaleString(
                                  "id-ID"
                                )}`}
                              />
                            </div>
                          </td>

                          {/* Discount */}
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
                                    item.discountType === "PERCENTAGE"
                                      ? "%"
                                      : ""
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
                                className="w-11 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              >
                                <option value="AMOUNT">Rp</option>
                                <option value="PERCENTAGE">%</option>
                              </select>
                            </div>
                          </td>

                          {/* Total Price */}
                          <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                            <div
                              className="font-medium text-gray-900 dark:text-gray-100 text-right text-m truncate"
                              title={formatRupiah(item.totalPrice)}
                            >
                              {formatRupiah(item.totalPrice)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className=" cursor-pointer flex items-center justify-center w-6 h-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
                                title="Hapus item"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
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
                        {formatRupiah(formData.subtotal)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 border-t pt-4 border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* <FormField label="Potongan Keseluruhan">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      {formData.discountType === "PERCENTAGE" ? "%" : "Rp"}
                    </span>
                    <Input
                      type="text"
                      name="discount"
                      value={formData.discount.toLocaleString("id-ID")}
                      onChange={e => {
                        const value =
                          parseFloat(e.target.value.replace(/\D/g, "")) || 0;
                        handleInputChange("discount", value);
                      }}
                      className="pl-10"
                      placeholder="0"
                    />
                  </div>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={e =>
                      handleInputChange(
                        "discountType",
                        e.target.value as "AMOUNT" | "PERCENTAGE"
                      )
                    }
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AMOUNT">Rp</option>
                    <option value="PERCENTAGE">%</option>
                  </select>
                </div>
              </FormField> */}
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
                      {formData.items
                        .reduce((sum, item) => {
                          const discountAmount = calculateItemDiscount(
                            item.price,
                            item.discount,
                            item.discountType
                          );
                          return sum + discountAmount * item.quantity;
                        }, 0)
                        .toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Potongan Keseluruhan:
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -
                      {formatRupiah(
                        calculateOrderLevelDiscount(
                          formData.subtotal,
                          formData.discount,
                          formData.discountType
                        )
                      )}
                    </span>
                  </div>
                  {/* Hidden input untuk actual discount */}
                  <input
                    type="hidden"
                    name="actualDiscount"
                    value={Math.round(
                      calculateOrderLevelDiscount(
                        formData.subtotal,
                        formData.discount,
                        formData.discountType
                      )
                    )}
                  />
                  <div className="flex justify-between text-sm border-t pt-2 border-gray-200 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Total Potongan:
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -
                      {formatRupiah(
                        formData.items.reduce((sum, item) => {
                          const discountAmount = calculateItemDiscount(
                            item.price,
                            item.discount,
                            item.discountType
                          );
                          return sum + discountAmount * item.quantity;
                        }, 0) +
                          calculateOrderLevelDiscount(
                            formData.subtotal,
                            formData.discount,
                            formData.discountType
                          )
                      )}
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
                    name="discountType"
                    value={formData.discountType}
                    onChange={e =>
                      handleInputChange(
                        "discountType",
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
                      name="discount"
                      value={formData.discount.toLocaleString("id-ID")}
                      onChange={e => {
                        const value =
                          parseFloat(e.target.value.replace(/\D/g, "")) || 0;
                        handleInputChange("discount", value);
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
                  Total Setelah potongan:
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
                  {formatRupiah(formData.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ManagementForm>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Hapus Invoice"
        isLoading={isDeleting}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Apakah Anda yakin ingin menghapus invoice ini? Tindakan ini tidak
          dapat dibatalkan.
        </p>
      </ConfirmationModal>
    </div>
  );
}
