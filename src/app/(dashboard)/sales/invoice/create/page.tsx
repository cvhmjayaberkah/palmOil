// app/sales/invoice/create/page.tsx
"use client";
import { ManagementForm, ManagementHeader, FormField } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Input,
  InputTextArea,
  InputDate,
  CustomerInfo,
  Select,
  TaxSelect,
} from "@/components/ui";
import {
  createInvoice,
  getAvailableCustomers,
  getAvailablePurchaseOrders,
  getAvailableProducts,
  getAvailableUsers,
  getPurchaseOrderForInvoice,
  markInvoiceAsSent,
} from "@/lib/actions/invoices";
import { getCompanyProfiles } from "@/lib/actions/company-profiles";
import { getActiveTax } from "@/lib/actions/taxes";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { generateCodeByTable } from "@/utils/getCode";
import { formatRupiah } from "@/utils/formatRupiah";
import { formatInputRupiah, parseInputRupiah } from "@/utils/formatInput";
import { formatDate } from "@/utils/formatDate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { InvoiceType } from "@prisma/client";
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
  taxPercentage: number; // Always has a value, default 0
  taxAmount: number; // Nominal pajak yang akan disimpan ke database
  discount: number;
  discountType: "AMOUNT" | "PERCENTAGE";
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
  createdBy?: string;
  taxPercentage?: string;
  items?:
    | string
    | Array<{
        productId?: string;
        description?: string;
        quantity?: string;
        price?: string;
        discount?: string;
      }>;
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

export default function CreateInvoicePage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [availablePurchaseOrders, setAvailablePurchaseOrders] = useState<any[]>(
    []
  );
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false); // Start with false, will be set to true only when needed
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Flag to prevent re-loading
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const [formData, setFormData] = useState<InvoiceFormData>({
    code: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: null, // Default to null for "Bayar Langsung"
    status: "DRAFT",
    type: InvoiceType.PRODUCT, // Always PRODUCT type
    subtotal: 0,
    tax: 0,
    taxPercentage: 0, // Default to 0 instead of undefined
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

  useEffect(() => {
    // Only fetch data if not already loaded and user is available
    if (isDataLoaded || !user?.id) {
      return;
    }

    const fetchDataAndCode = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        const [customers, orders, products, users, newCode, activeTax] =
          await Promise.all([
            getAvailableCustomers(),
            getAvailablePurchaseOrders(),
            getAvailableProducts(),
            getAvailableUsers(),
            generateCodeByTable("Invoices"),
            getActiveTax(),
          ]);

        setAvailableCustomers(customers);
        setAvailablePurchaseOrders(orders);
        setAvailableProducts(products);
        setAvailableUsers(users);
        setFormData(prevData => ({
          ...prevData,
          code: newCode,
          createdBy: user?.id || "",
          taxPercentage: activeTax ? parseFloat(activeTax.nominal) : 0, // Default to 0 if no active tax
          taxAmount: activeTax ? parseFloat(activeTax.nominal) : 0,
        }));
        setIsDataLoaded(true); // Mark data as loaded
      } catch (error: any) {
        console.error(
          "Kesalahan mengambil data awal atau menghasilkan kode:",
          error
        );
        setErrorLoadingData(
          error.message || "Gagal memuat data awal atau menghasilkan kode."
        );
        toast.error(
          error.message || "Gagal memuat data awal atau menghasilkan kode."
        );
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDataAndCode();
  }, [user?.id, isDataLoaded]); // Only depend on user ID, not the entire user object

  // Separate useEffect to update createdBy when user is available (without reloading all data)
  useEffect(() => {
    if (user?.id && isDataLoaded && formData.createdBy !== user.id) {
      setFormData(prevData => ({
        ...prevData,
        createdBy: user.id,
      }));
    }
  }, [user?.id, isDataLoaded, formData.createdBy]);

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

  // Auto-fill customer and items when purchase order is selected
  useEffect(() => {
    if (formData.purchaseOrderId) {
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
          console.error("Kesalahan mengambil detail purchase order:", error);
          toast.error("Gagal memuat detail purchase order");
        }
      };
      fetchPurchaseOrderDetails();
    } else {
      // Don't clear selected customer if it was manually selected
      if (!formData.customerId) {
        setSelectedCustomer(null);
      }
    }
  }, [formData.purchaseOrderId]);

  // Recalculate totals when items change
  useEffect(() => {
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
    formData.taxPercentage,
    formData.shippingCost,
    formData.discount,
    formData.discountType,
  ]);

  const validateForm = (): boolean => {
    const errors: InvoiceFormErrors = {};

    if (!formData.code.trim()) {
      errors.code = "Kode invoice wajib diisi.";
    }

    if (!formData.invoiceDate) {
      errors.invoiceDate = "Tanggal invoice wajib diisi";
    }

    // if (!formData.dueDate) {
    //   errors.dueDate = "Tanggal jatuh tempo wajib diisi";
    // }

    if (!formData.customerId) {
      errors.customerId = "Customer wajib dipilih";
    }

    // Tax percentage validation - 0 is now a valid value (no tax)
    if (formData.taxPercentage < 0) {
      errors.taxPercentage = "Pajak tidak boleh bernilai negatif";
    }

    if (!formData.createdBy) {
      errors.createdBy = "User pembuat wajib dipilih";
    }

    if (
      formData.items.length === 0
      // formData.items.every(item => !item.productId)
    ) {
      errors.items = "Minimal harus ada satu item";
    }

    // Validate stock availability for each item
    const itemErrors: any[] = [];
    formData.items.forEach((item, index) => {
      const itemError: any = {};

      if (!item.productId) {
        itemError.productId = "Produk wajib dipilih";
      }

      if (item.quantity <= 0) {
        itemError.quantity = "Quantity harus lebih dari 0";
      }

      if (item.price <= 0) {
        itemError.price = "Harga harus lebih dari 0";
      }

      // Check stock availability
      if (item.productId) {
        const product = availableProducts.find(p => p.id === item.productId);
        if (product && item.quantity > product.currentStock) {
          itemError.quantity = `Stok tidak mencukupi. Tersedia: ${product.currentStock}`;
        }
      }

      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      }
    });

    if (itemErrors.length > 0) {
      errors.items = itemErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof InvoiceFormData, value: any) => {
    setFormData({ ...formData, [field]: value });

    // Update selected customer when customer is manually selected
    if (field === "customerId" && value && !formData.purchaseOrderId) {
      const customer = availableCustomers.find(c => c.id === value);
      setSelectedCustomer(customer || null);
    }

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission

    if (!validateForm()) {
      toast.error("Mohon periksa kembali form yang diisi");
      return "error";
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
        taxPercentage: formData.taxPercentage, // Always has value now
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

      const result = await createInvoice(invoiceData);

      if (result.success) {
        toast.success("Invoice berhasil dibuat!");
        router.push("/sales/invoice");
      }
    } catch (error: any) {
      console.error("Kesalahan membuat invoice:", error);
      toast.error(error.message || "Gagal membuat invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!selectedCustomer) {
      toast.error("Pilih customer terlebih dahulu");
      return;
    }

    if (!validateForm()) {
      toast.error("Mohon periksa kembali form yang diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      // Get company profile data
      const companyProfiles = await getCompanyProfiles();
      const companyProfile =
        companyProfiles.length > 0 ? companyProfiles[0] : null;

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

      // First, save the invoice data
      const invoiceData = {
        code: formData.code,
        invoiceDate: new Date(formData.invoiceDate),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        status: formData.status as any,
        type: formData.type,
        subtotal: formData.subtotal,
        tax: formData.tax,
        taxPercentage: formData.taxPercentage, // Always has value now
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

      const result = await createInvoice(invoiceData);

      if (result.success) {
        // Update invoice status to SENT when printing
        const statusUpdate = await markInvoiceAsSent(result.data.invoice.id);
        if (!statusUpdate.success) {
          console.warn(
            "Failed to update invoice status to SENT:",
            statusUpdate.error
          );
        }

        // After successful save, generate PDF
        const items: InvoiceItem[] = formData.items
          .filter(item => item.productId && item.quantity > 0)
          .map(item => {
            const product = availableProducts.find(
              p => p.id === item.productId
            );
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
          customerName: selectedCustomer.name,
          customerAddress: selectedCustomer.address,

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
        toast.success(
          "Invoice berhasil dibuat, status diubah ke SENT, dan PDF berhasil di-generate"
        );
        router.push("/sales/invoice");
      }
    } catch (error: any) {
      console.error("Kesalahan membuat invoice dan menghasilkan PDF:", error);
      toast.error(error.message || "Gagal membuat invoice dan PDF");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading if we're actually loading data OR if user is not available yet
  if ((isLoadingData && !isDataLoaded) || (!user?.id && !isDataLoaded)) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Buat Invoice Baru"
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
          headerTittle="Buat Invoice Baru"
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
        headerTittle="Buat Invoice Baru"
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementForm
        subModuleName={data.subModule.toLowerCase()}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleSubmit}
        handlePrint={handlePrintPdf}
        hidePrintButton={
          !selectedCustomer ||
          formData.items.filter(item => item.productId && item.quantity > 0)
            .length === 0
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kode Invoice */}
          <FormField label="Kode Invoice" errorMessage={formErrors.code}>
            <Input
              type="text"
              name="code"
              value={formData.code}
              onChange={e => handleInputChange("code", e.target.value)}
              placeholder="Masukkan kode invoice"
              readOnly
              className="cursor-default"
            />
          </FormField>

          {/* Purchase Order (Optional) */}
          <FormField label="Pesanan Pembelian (Opsional)">
            <Select
              searchable={true}
              searchPlaceholder="Cari pesanan..."
              value={formData.purchaseOrderId}
              onChange={(value: string) =>
                handleInputChange("purchaseOrderId", value)
              }
              options={[
                {
                  value: "",
                  label: "Pilih Pesanan Pembelian",
                },
                ...availablePurchaseOrders.map(purchaseOrder => ({
                  value: purchaseOrder.id,
                  label: `${purchaseOrder.code} - ${purchaseOrder.order.customer.name}`,
                })),
              ]}
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

          {/* Customer */}
          <FormField
            label="Customer"
            required
            errorMessage={formErrors.customerId}
          >
            {!!formData.purchaseOrderId ? (
              <Input
                required
                type="text"
                name="customerDisplay"
                value={
                  availableCustomers.find(c => c.id === formData.customerId)
                    ?.name || ""
                }
                readOnly
                className="cursor-default text-lg font-normal bg-gray-100 dark:bg-gray-700"
              />
            ) : (
              <Select
                value={formData.customerId || ""}
                onChange={(value: string) =>
                  handleInputChange("customerId", value)
                }
                placeholder="Pilih Customer"
                options={[
                  { value: "", label: "Pilih Customer" },
                  ...availableCustomers.map(customer => ({
                    value: customer.id,
                    label: customer.name,
                  })),
                ]}
              />
            )}
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
              ]}
            />
          </FormField>

          {/* Show Customer Info when customer is selected (either from PO or manual selection) */}
          {(selectedCustomer || formData.customerId) && (
            <div className="md:col-span-2">
              <CustomerInfo
                customerId={selectedCustomer?.id || formData.customerId || ""}
                orderNumber={formData.purchaseOrderId}
              />
            </div>
          )}

          {/* Created By - Hidden input using session */}
          <input type="hidden" name="createdBy" value={formData.createdBy} />

          {/* Tax Percentage - Hidden input with auto-loaded active tax */}
          <input
            type="hidden"
            name="taxPercentage"
            value={formData.taxPercentage}
          />
          <input type="hidden" name="taxAmount" value={formData.taxAmount} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="flex items-center space-x-2">
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

        {/* Notes */}
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
                          {/* Product */}
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
                              <div className="text-center">
                                <div className="text-m text-gray-700 dark:text-gray-300">
                                  {product.currentStock}
                                </div>
                                {item.quantity > product.currentStock && (
                                  <div className="text-xs text-red-500 mt-1">
                                    Stok tidak mencukupi
                                  </div>
                                )}
                              </div>
                            )}
                            {formErrors.items?.[index] &&
                              typeof formErrors.items[index] === "object" &&
                              "quantity" in formErrors.items[index] && (
                                <div className="text-xs text-red-500 mt-1">
                                  {(formErrors.items[index] as any).quantity}
                                </div>
                              )}
                          </td>

                          {/* Quantity */}
                          <td className="border border-gray-200 dark:border-gray-600 px-2 py-2">
                            <Input
                              type="number"
                              min="1"
                              name={`quantity_${index}`}
                              value={item.quantity.toString()}
                              onChange={e => {
                                const newQuantity =
                                  parseFloat(e.target.value) || 0;
                                handleItemChange(
                                  index,
                                  "quantity",
                                  newQuantity
                                );

                                // Show toast warning if quantity exceeds stock
                                if (
                                  product &&
                                  newQuantity > product.currentStock
                                ) {
                                  toast.warning(
                                    `Stok ${product.name} tidak mencukupi. Tersedia: ${product.currentStock}`
                                  );
                                }
                              }}
                              placeholder="0"
                              className={`w-full text-m px-2 py-1 ${
                                product && item.quantity > product.currentStock
                                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                  : ""
                              }`}
                              max={product ? product.currentStock : undefined}
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
                            {formErrors.items?.[index] &&
                              typeof formErrors.items[index] === "object" &&
                              "price" in formErrors.items[index] && (
                                <div className="text-xs text-red-500 mt-1">
                                  {(formErrors.items[index] as any).price}
                                </div>
                              )}
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
                            {formErrors.items?.[index] &&
                              typeof formErrors.items[index] === "object" &&
                              "discount" in formErrors.items[index] && (
                                <div className="text-xs text-red-500 mt-1">
                                  {(formErrors.items[index] as any).discount}
                                </div>
                              )}
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
                    formData.subtotal -
                      calculateOrderLevelDiscount(
                        formData.subtotal,
                        formData.discount,
                        formData.discountType
                      )
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
    </div>
  );
}
