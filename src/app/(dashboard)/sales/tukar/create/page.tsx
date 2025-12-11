// app/sales/tukar/create/page.tsx
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
} from "@/components/ui";
import {
  createSwap,
  getAvailableInvoices,
  getAvailableProducts,
  getInvoiceById,
  getSwapsByInvoiceId,
  SwapData,
  SwapDetailData,
} from "@/lib/actions/swaps";
import { createSwapLegacy } from "@/lib/actions/swapLegacy";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { formatRupiah } from "@/utils/formatRupiah";
import {
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Calculator,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { generateCodeByTable } from "@/utils/getCode";

interface SwapFormData {
  code: string;
  swapDate: string;
  invoiceId: string;
  baseTotal: number;
  notes: string;
  deadline: string;
  oldItems: OldItemFormData[];
  replacementItems: ReplacementItemFormData[];
}

interface OldItemFormData {
  oldItemId: string;
  quantity: number;
  costPerItem: number;
}

interface ReplacementItemFormData {
  replacementItemId: string;
  quantity: number;
  pricePerItem: number;
}

interface SwapFormErrors {
  code?: string;
  swapDate?: string;
  invoiceId?: string;
  notes?: string;
  oldItems?: {
    [key: number]: {
      oldItemId?: string;
      quantity?: string;
    };
  };
  replacementItems?: {
    [key: number]: {
      replacementItemId?: string;
      quantity?: string;
    };
  };
  validation?: string;
}

interface Invoice {
  id: string;
  code: string;
  dueDate?: Date | null;
  totalAmount: number;
  subtotal: number;
  discount: number;
  discountType: "AMOUNT" | "PERCENTAGE";
  shippingCost: number;
  customer: {
    name: string;
  } | null;
  invoiceItems: Array<{
    id: string;
    quantity: number;
    price: number;
    products: {
      id: string;
      name: string;
      code: string;
      cost: number;
      sellingPrice: number | null;
    };
  }>;
}

interface Product {
  id: string;
  name: string;
  code: string;
  cost: number;
  sellingPrice: number | null;
  currentStock: number;
  category: {
    name: string;
  };
  tax: {
    id: string;
    nominal: string;
  } | null;
}

export default function CreateSwapPage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [availableQuantities, setAvailableQuantities] = useState<{
    oldItems: { [productId: string]: number };
    replacementItems: { [productId: string]: number };
  } | null>(null);

  const [formData, setFormData] = useState<SwapFormData>({
    code: "",
    swapDate: new Date().toISOString().split("T")[0],
    invoiceId: "",
    baseTotal: 0,
    notes: "",
    deadline: "",
    oldItems: [],
    replacementItems: [],
  });

  const [formErrors, setFormErrors] = useState<SwapFormErrors>({});

  // Get selling price (no tax calculation)
  const getSellingPrice = (product: Product): number => {
    return product.sellingPrice || product.cost;
  };

  // Get available quantities considering previous swaps
  const getAvailableQuantities = async () => {
    if (!selectedInvoice) return null;

    try {
      // Get all swaps for this invoice
      const existingSwaps = await getSwapsByInvoiceId(selectedInvoice.id);

      const availableOldItems: { [productId: string]: number } = {};
      const availableReplacementItems: { [productId: string]: number } = {};

      // For old items: calculate available based on invoice quantity + previously swapped back
      selectedInvoice.invoiceItems?.forEach((invoiceItem: any) => {
        const currentQtyInInvoice = invoiceItem.quantity;

        // Find how much of this item was swapped before (outgoing from invoice)
        const totalSwappedOut = existingSwaps.reduce(
          (sum: number, swap: any) => {
            return (
              sum +
              (swap.swapDetails?.reduce((detailSum: number, detail: any) => {
                return detail.oldItemId === invoiceItem.products.id
                  ? detailSum + detail.oldItemQuantity
                  : detailSum;
              }, 0) || 0)
            );
          },
          0
        );

        // Available = current in invoice - already swapped out
        availableOldItems[invoiceItem.products.id] = Math.max(
          0,
          currentQtyInInvoice - totalSwappedOut
        );
      });

      // For replacement items: current stock + quantities that were taken for previous swaps
      availableProducts.forEach((product: any) => {
        const currentStock = product.currentStock;

        // Find how much of this item was taken for previous swaps
        const totalTakenForSwaps = existingSwaps.reduce(
          (sum: number, swap: any) => {
            return (
              sum +
              (swap.swapDetails?.reduce((detailSum: number, detail: any) => {
                return detail.replacementItemId === product.id
                  ? detailSum + detail.replacementItemQuantity
                  : detailSum;
              }, 0) || 0)
            );
          },
          0
        );

        // Available = current stock + what was taken for swaps before (since those items are now in customer's hands)
        availableReplacementItems[product.id] =
          currentStock + totalTakenForSwaps;
      });

      return {
        oldItems: availableOldItems,
        replacementItems: availableReplacementItems,
      };
    } catch (error) {
      console.error("Error calculating available quantities:", error);
      return null;
    }
  };

  // Calculate invoice comparison (original vs after swap)
  const calculateInvoiceComparison = () => {
    if (!selectedInvoice) {
      return {
        originalInvoiceTotal: 0,
        originalSwappedItemsTotal: 0,
        newReplacementItemsTotal: 0,
        newInvoiceTotal: 0,
        invoiceDifference: 0,
        isInvoiceImpactPositive: false,
      };
    }

    // Calculate original invoice total for items being swapped using sellingPrice (consistent with other calculations)
    const originalSwappedItemsTotal = formData.oldItems.reduce(
      (sum, oldItem) => {
        const invoiceItem = selectedInvoice.invoiceItems?.find(
          (item) => item.products.id === oldItem.oldItemId
        );
        if (invoiceItem) {
          // Use sellingPrice first, fallback to cost - consistent with other calculations
          const pricePerUnit =
            invoiceItem.products.sellingPrice || invoiceItem.products.cost || 0;
          return sum + pricePerUnit * oldItem.quantity;
        }
        return sum;
      },
      0
    );

    // Calculate new total for replacement items
    const newReplacementItemsTotal = formData.replacementItems.reduce(
      (sum, item) => sum + item.pricePerItem * item.quantity,
      0
    );

    // Use the actual invoice values
    const currentInvoiceTotal = selectedInvoice.totalAmount || 0;
    const currentSubtotal = selectedInvoice.subtotal || 0;
    const currentShipping = selectedInvoice.shippingCost || 0;
    const currentDiscount = selectedInvoice.discount || 0;
    const currentDiscountType = selectedInvoice.discountType;

    // Calculate difference in items (replacement - old)
    const itemDifference = newReplacementItemsTotal - originalSwappedItemsTotal;

    // Calculate new subtotal: current subtotal + item difference
    const newSubtotal = currentSubtotal + itemDifference;

    // Calculate new discount based on discount type
    let newActualDiscount = 0;
    if (currentDiscountType === "PERCENTAGE") {
      newActualDiscount = (newSubtotal * currentDiscount) / 100;
    } else {
      // AMOUNT type - keep the same discount value
      newActualDiscount = currentDiscount;
    }

    // Calculate new invoice total: new subtotal - new discount + shipping
    const newInvoiceTotal = newSubtotal - newActualDiscount + currentShipping;

    // Invoice difference is simple: new total - current total
    const invoiceDifference = newInvoiceTotal - currentInvoiceTotal;
    const isInvoiceImpactPositive = invoiceDifference >= 0;

    return {
      originalInvoiceTotal: currentInvoiceTotal,
      originalSwappedItemsTotal: originalSwappedItemsTotal,
      newReplacementItemsTotal: newReplacementItemsTotal,
      newInvoiceTotal: newInvoiceTotal,
      invoiceDifference: invoiceDifference,
      isInvoiceImpactPositive: isInvoiceImpactPositive,
    };
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalOldValue = formData.oldItems.reduce((sum, oldItem) => {
      const selectedItem = selectedInvoice?.invoiceItems?.find(
        (item) => item.products.id === oldItem.oldItemId
      );
      if (selectedItem) {
        const pricePerItem =
          selectedItem.products.sellingPrice || selectedItem.products.cost || 0;
        return sum + pricePerItem * oldItem.quantity;
      }
      return sum;
    }, 0);

    const totalReplacementValue = formData.replacementItems.reduce(
      (sum, item) => sum + item.pricePerItem * item.quantity,
      0
    );

    const difference = totalReplacementValue - totalOldValue;
    const isValid = totalReplacementValue >= totalOldValue;

    return {
      totalOldValue,
      totalReplacementValue,
      difference,
      isValid,
    };
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [invoices, products, generatedCode] = await Promise.all([
          getAvailableInvoices(),
          getAvailableProducts(),
          generateCodeByTable("Swaps"),
        ]);
        setAvailableInvoices(invoices);
        setAvailableProducts(products);
        setFormData((prev) => ({ ...prev, code: generatedCode }));
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Gagal memuat data invoice dan produk");
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Handle invoice selection
  const handleInvoiceSelect = async (invoiceId: string) => {
    setFormData((prev) => ({
      ...prev,
      invoiceId,
      oldItems: [],
      replacementItems: [],
      deadline: "",
    }));

    if (invoiceId) {
      try {
        const invoice = await getInvoiceById(invoiceId);

        setSelectedInvoice(invoice);
        const totalAmount = invoice.totalAmount;
        setFormData((prev) => ({ ...prev, baseTotal: totalAmount }));
        // Calculate available quantities for the selected invoice
        const quantities = await getAvailableQuantities();
        setAvailableQuantities(quantities);

        // Set deadline from invoice dueDate if available
        if (invoice.dueDate) {
          const deadlineDate = new Date(invoice.dueDate)
            .toISOString()
            .split("T")[0];
          setFormData((prev) => ({
            ...prev,
            deadline: deadlineDate,
            baseTotal: totalAmount,
          }));
        }

        // Automatically add one row for old items and replacement items
        setFormData((prev) => ({
          ...prev,
          oldItems: [{ oldItemId: "", quantity: 1, costPerItem: 0 }],
          replacementItems: [
            { replacementItemId: "", quantity: 1, pricePerItem: 0 },
          ],
        }));
      } catch (error) {
        console.error("Error loading invoice:", error);
        toast.error("Gagal memuat detail invoice");
        setSelectedInvoice(null);
      }
    } else {
      setSelectedInvoice(null);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof SwapFormData, value: any) => {
    setFormData({ ...formData, [field]: value });

    if (formErrors[field as keyof SwapFormErrors]) {
      setFormErrors((prevErrors) => ({ ...prevErrors, [field]: undefined }));
    }
  };

  // Add old item
  const addOldItem = () => {
    setFormData((prev) => ({
      ...prev,
      oldItems: [
        ...prev.oldItems,
        { oldItemId: "", quantity: 1, costPerItem: 0 },
      ],
    }));
  };

  // Remove old item
  const removeOldItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      oldItems: prev.oldItems.filter((_, i) => i !== index),
    }));
  };

  // Handle old item changes
  const handleOldItemChange = (
    index: number,
    field: keyof OldItemFormData,
    value: any
  ) => {
    const newItems = [...formData.oldItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Update cost when item is selected
    if (field === "oldItemId" && value) {
      const selectedItem = selectedInvoice?.invoiceItems?.find(
        (item) => item.products.id === value
      );
      if (selectedItem) {
        newItems[index].costPerItem = selectedItem.products.cost || 0;
      } else {
        // Fallback: reset to 0 if item not found
        newItems[index].costPerItem = 0;
      }
    }

    setFormData((prev) => ({ ...prev, oldItems: newItems }));
  };

  // Add replacement item
  const addReplacementItem = () => {
    setFormData((prev) => ({
      ...prev,
      replacementItems: [
        ...prev.replacementItems,
        { replacementItemId: "", quantity: 1, pricePerItem: 0 },
      ],
    }));
  };

  // Remove replacement item
  const removeReplacementItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      replacementItems: prev.replacementItems.filter((_, i) => i !== index),
    }));
  };

  // Handle replacement item changes
  const handleReplacementItemChange = (
    index: number,
    field: keyof ReplacementItemFormData,
    value: any
  ) => {
    const newItems = [...formData.replacementItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Update price when item is selected
    if (field === "replacementItemId" && value) {
      const selectedProduct = availableProducts.find(
        (product) => product.id === value
      );
      if (selectedProduct) {
        const sellingPrice = getSellingPrice(selectedProduct);
        newItems[index].pricePerItem = sellingPrice;
      }
    }

    setFormData((prev) => ({ ...prev, replacementItems: newItems }));
  };

  // Get already selected old item IDs (excluding current index)
  const getSelectedOldItemIds = (excludeIndex?: number): string[] => {
    return formData.oldItems
      .map((item, index) => (index !== excludeIndex ? item.oldItemId : null))
      .filter((id) => id && id !== "") as string[];
  };

  // Get already selected replacement item IDs (excluding current index)
  const getSelectedReplacementItemIds = (excludeIndex?: number): string[] => {
    return formData.replacementItems
      .map((item, index) =>
        index !== excludeIndex ? item.replacementItemId : null
      )
      .filter((id) => id && id !== "") as string[];
  };

  // Validate form
  const validateForm = async (): Promise<boolean> => {
    const errors: SwapFormErrors = {};

    if (!formData.code.trim()) {
      errors.code = "Kode tukar guling harus diisi";
    }

    if (!formData.swapDate) {
      errors.swapDate = "Tanggal tukar guling harus diisi";
    }

    if (!formData.invoiceId) {
      errors.invoiceId = "Invoice harus dipilih";
    }

    if (formData.oldItems.length === 0) {
      errors.validation = "Minimal harus ada 1 item lama";
    }

    if (formData.replacementItems.length === 0) {
      errors.validation = "Minimal harus ada 1 item pengganti";
    }

    // Validate quantities are greater than 0
    const hasInvalidOldQuantity = formData.oldItems.some(
      (item) => !item.oldItemId || item.quantity <= 0
    );
    const hasInvalidReplacementQuantity = formData.replacementItems.some(
      (item) => !item.replacementItemId || item.quantity <= 0
    );

    if (hasInvalidOldQuantity) {
      errors.validation =
        "Semua item lama harus dipilih dan quantity harus lebih dari 0";
      setFormErrors(errors);
      return false;
    }

    if (hasInvalidReplacementQuantity) {
      errors.validation =
        "Semua item pengganti harus dipilih dan quantity harus lebih dari 0";
      setFormErrors(errors);
      return false;
    }

    // Get available quantities considering previous swaps
    const availableQuantities = await getAvailableQuantities();

    if (!availableQuantities) {
      errors.validation = "Gagal memuat informasi stok yang tersedia";
      setFormErrors(errors);
      return false;
    }

    // Validate old item and replacement item availability
    for (let i = 0; i < formData.oldItems.length; i++) {
      const oldItem = formData.oldItems[i];
      const replacementItem = formData.replacementItems[i];

      if (oldItem && replacementItem) {
        // Check old item availability from invoice
        const availableOldQty =
          availableQuantities.oldItems[oldItem.oldItemId] || 0;
        if (availableOldQty < oldItem.quantity) {
          const oldProduct = selectedInvoice?.invoiceItems?.find(
            (item) => item.products.id === oldItem.oldItemId
          )?.products;
          errors.validation = `Quantity item lama "${oldProduct?.name}" tidak mencukupi. Tersedia untuk tukar: ${availableOldQty}, Diminta: ${oldItem.quantity}`;
          setFormErrors(errors);
          return false;
        }

        // Check replacement item availability (current stock + previously taken)
        const availableReplacementQty =
          availableQuantities.replacementItems[
            replacementItem.replacementItemId
          ] || 0;
        if (availableReplacementQty < replacementItem.quantity) {
          const replacementProduct = availableProducts.find(
            (p) => p.id === replacementItem.replacementItemId
          );
          errors.validation = `Stok item pengganti "${replacementProduct?.name}" tidak mencukupi. Tersedia: ${availableReplacementQty}, Dibutuhkan: ${replacementItem.quantity}`;
          setFormErrors(errors);
          return false;
        }
      }
    }

    const totals = calculateTotals();
    if (!totals.isValid) {
      errors.validation =
        "Total nilai item pengganti harus sama atau lebih besar dari item lama";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) {
      toast.error("Mohon perbaiki kesalahan pada form");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get totals untuk kalkulasi selisih
      const totals = calculateTotals();

      // Prepare old items and replacement items for legacy function
      const oldItems = formData.oldItems.map((item) => ({
        oldItemId: item.oldItemId,
        quantity: item.quantity,
        costPerItem: item.costPerItem,
      }));

      const replacementItems = formData.replacementItems.map((item) => ({
        replacementItemId: item.replacementItemId,
        quantity: item.quantity,
        pricePerItem: item.pricePerItem,
      }));

      const swapData = {
        code: formData.code,
        invoiceId: formData.invoiceId,
        swapDate: new Date(formData.swapDate),
        baseTotal: formData.baseTotal,
        deadline: formData.deadline,
        notes: formData.notes || "",
        createdBy: user?.id || "",
        difference: totals.difference, // Simpan nilai selisih ke database
      };

      console.log("Submitting swap data:", {
        oldItems,
        replacementItems,
        swapData,
      });

      const result = await createSwapLegacy(
        oldItems,
        replacementItems,
        swapData
      );
      console.log("Create swap result:", result);

      if (result.success) {
        toast.success("Tukar guling berhasil dibuat.");
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        throw new Error(result.error || "Gagal menyimpan tukar guling");
      }
    } catch (error: any) {
      console.error("Terjadi kesalahan saat membuat tukar guling:", error);
      const errorMessage =
        error.message || "Terjadi kesalahan yang tidak terduga.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center p-8 bg-white dark:bg-gray-950 rounded-lg shadow-sm">
        <div className="text-gray-500 dark:text-gray-400">Memuat data...</div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Tambah Tukar Guling"
        mainPageName={`/${data.module}/${data.subModule.toLowerCase()}`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName={data.subModule.toLowerCase()}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleSubmit}
      >
        {/* Basic Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            Informasi Tukar Guling
          </h3>

          {/* Code dan Tanggal - Grid 2 kolom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Kode Tukar Guling"
              errorMessage={formErrors.code}
              required
            >
              <Input
                type="text"
                name="code"
                readOnly
                placeholder="Masukkan kode tukar guling"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value)}
                disabled={isSubmitting}
                className={formErrors.code ? "border-red-500" : ""}
              />
            </FormField>

            <FormField
              label="Tanggal Tukar Guling"
              errorMessage={formErrors.swapDate}
              required
            >
              <InputDate
                value={formData.swapDate ? new Date(formData.swapDate) : null}
                onChange={(date) => {
                  const dateString = date
                    ? date.toISOString().split("T")[0]
                    : "";
                  handleInputChange("swapDate", dateString);
                }}
                placeholder="Pilih tanggal"
              />
            </FormField>
          </div>

          {/* Invoice dan Deadline - Grid 2 kolom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Pilih Invoice"
              errorMessage={formErrors.invoiceId}
              required
            >
              <Select
                value={formData.invoiceId}
                onChange={handleInvoiceSelect}
                placeholder="-- Pilih Invoice --"
                searchable={true}
                searchPlaceholder="Cari invoice atau customer..."
                options={availableInvoices.map((invoice) => ({
                  value: invoice.id,
                  label: `${invoice.code} - ${
                    invoice.customer?.name || "No customer"
                  }`,
                }))}
              />
            </FormField>

            <FormField label="Deadline Invoice">
              <InputDate
                value={formData.deadline ? new Date(formData.deadline) : null}
                onChange={(value) =>
                  handleInputChange(
                    "deadline",
                    value ? value.toISOString().split("T")[0] : ""
                  )
                }
                showNullAsText="Bayar Langsung"
                allowClearToNull={true}
                isOptional={true}
                showClearButton={true}
                placeholder="Pilih deadline"
              />
            </FormField>
          </div>

          <FormField label="Catatan">
            <InputTextArea
              name="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Catatan tambahan (opsional)"
              rows={3}
            />
          </FormField>
        </div>

        {/* Items Selection */}
        {selectedInvoice && (
          <div className="space-y-8">
            {/* Old Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  Item yang Akan Ditukar (dari Invoice)
                </h3>
                <button
                  type="button"
                  onClick={addOldItem}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </button>
              </div>

              {formData.oldItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  Belum ada item yang dipilih
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.oldItems.map((item, index) => {
                    const selectedItem = selectedInvoice.invoiceItems?.find(
                      (invoiceItem) =>
                        invoiceItem.products.id === item.oldItemId
                    );

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Item
                          </label>
                          <select
                            value={item.oldItemId}
                            onChange={(e) =>
                              handleOldItemChange(
                                index,
                                "oldItemId",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200"
                          >
                            <option value="">-- Pilih Item --</option>
                            {selectedInvoice.invoiceItems
                              ?.filter((invoiceItem) => {
                                const selectedIds =
                                  getSelectedOldItemIds(index);
                                return !selectedIds.includes(
                                  invoiceItem.products.id
                                );
                              })
                              .map((invoiceItem) => (
                                <option
                                  key={invoiceItem.id}
                                  value={invoiceItem.products.id}
                                >
                                  {invoiceItem.products.name}
                                </option>
                              )) || []}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Qty Invoice
                          </label>
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm dark:text-gray-200">
                            {selectedItem?.quantity || 0}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quantity
                          </label>
                          {(() => {
                            const availableOldQty =
                              availableQuantities?.oldItems[item.oldItemId] ||
                              selectedItem?.quantity ||
                              999;
                            return (
                              <div>
                                <Input
                                  name="jumlah"
                                  type="number"
                                  min="0"
                                  max={availableOldQty}
                                  value={item.quantity.toString()}
                                  onChange={(e) =>
                                    handleOldItemChange(
                                      index,
                                      "quantity",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-full"
                                />
                                {item.oldItemId && availableQuantities && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Max yang bisa ditukar: {availableOldQty}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Total Harga
                          </label>
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm dark:text-gray-200">
                            {(() => {
                              const selectedItem =
                                selectedInvoice?.invoiceItems?.find(
                                  (invoiceItem) =>
                                    invoiceItem.products.id === item.oldItemId
                                );
                              const pricePerItem =
                                selectedItem?.products?.sellingPrice ||
                                selectedItem?.products?.cost ||
                                item.costPerItem ||
                                0;
                              return formatRupiah(pricePerItem * item.quantity);
                            })()}
                          </div>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeOldItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Replacement Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  Item Pengganti
                </h3>
                <button
                  type="button"
                  onClick={addReplacementItem}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </button>
              </div>

              {formData.replacementItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  Belum ada item pengganti yang dipilih
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.replacementItems.map((item, index) => {
                    const selectedProduct = availableProducts.find(
                      (product) => product.id === item.replacementItemId
                    );

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ">
                            Item
                          </label>
                          <select
                            value={item.replacementItemId}
                            onChange={(e) =>
                              handleReplacementItemChange(
                                index,
                                "replacementItemId",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200"
                          >
                            <option value="">-- Pilih Item --</option>
                            {availableProducts
                              .filter((product) => {
                                const hasStock = product.currentStock > 0;
                                const selectedIds =
                                  getSelectedReplacementItemIds(index);
                                const notAlreadySelected =
                                  !selectedIds.includes(product.id);
                                return hasStock && notAlreadySelected;
                              })
                              .map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Stok Produk
                          </label>
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm dark:text-gray-200">
                            {selectedProduct?.currentStock || 0}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quantity
                          </label>
                          {(() => {
                            const availableReplacementQty =
                              availableQuantities?.replacementItems[
                                item.replacementItemId
                              ] ||
                              selectedProduct?.currentStock ||
                              999;
                            return (
                              <div>
                                <Input
                                  name="stok"
                                  type="number"
                                  min="0"
                                  max={availableReplacementQty}
                                  value={item.quantity.toString()}
                                  onChange={(e) =>
                                    handleReplacementItemChange(
                                      index,
                                      "quantity",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-full"
                                />
                                {item.replacementItemId &&
                                  availableQuantities && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Stok tersedia: {availableReplacementQty}
                                    </div>
                                  )}
                              </div>
                            );
                          })()}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Total Harga Jual + Pajak
                          </label>
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm dark:text-gray-200">
                            {formatRupiah(item.pricePerItem * item.quantity)}
                          </div>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeReplacementItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calculation Summary */}
            {(formData.oldItems.length > 0 ||
              formData.replacementItems.length > 0) && (
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Ringkasan Kalkulasi
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Total Nilai Item Lama
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      {formatRupiah(
                        (() => {
                          return formData.oldItems.reduce((sum, oldItem) => {
                            const selectedItem =
                              selectedInvoice?.invoiceItems?.find(
                                (item) => item.products.id === oldItem.oldItemId
                              );
                            if (selectedItem) {
                              const pricePerItem =
                                selectedItem.products.sellingPrice ||
                                selectedItem.products.cost ||
                                0;
                              return sum + pricePerItem * oldItem.quantity;
                            }
                            return sum;
                          }, 0);
                        })()
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Total Nilai Item Pengganti
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {formatRupiah(totals.totalReplacementValue)}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Selisih
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        totals.difference >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {totals.difference >= 0 ? "+" : ""}
                      {formatRupiah(totals.difference)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  {totals.isValid ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">
                        Tukar guling valid - dapat diproses
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">
                        Nilai item pengganti harus lebih besar atau sama
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Impact Calculation */}
            {selectedInvoice &&
              formData.oldItems.length > 0 &&
              formData.replacementItems.length > 0 && (
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Dampak ke Invoice
                    </h3>
                  </div>

                  {(() => {
                    const invoiceCalc = calculateInvoiceComparison();
                    return (
                      <div className="space-y-4">
                        {/* Invoice Totals Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Total Invoice Saat Ini
                            </div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatRupiah(invoiceCalc.originalInvoiceTotal)}
                            </div>
                          </div>

                          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Total Invoice Setelah Tukar Guling
                            </div>
                            <div className="text-lg font-bold text-blue-600">
                              {formatRupiah(invoiceCalc.newInvoiceTotal)}
                            </div>
                          </div>

                          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Perubahan Invoice
                            </div>
                            <div
                              className={`text-lg font-bold ${
                                invoiceCalc.invoiceDifference >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {invoiceCalc.invoiceDifference >= 0 ? "+" : ""}
                              {formatRupiah(invoiceCalc.invoiceDifference)}
                            </div>
                          </div>
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Detail Perhitungan:
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">
                                Subtotal saat ini:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatRupiah(selectedInvoice.subtotal)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">
                                Nilai item yang ditukar:
                              </span>
                              <span className="font-medium text-red-600">
                                -
                                {formatRupiah(
                                  invoiceCalc.originalSwappedItemsTotal
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">
                                Nilai item pengganti:
                              </span>
                              <span className="font-medium text-green-600">
                                +
                                {formatRupiah(
                                  invoiceCalc.newReplacementItemsTotal
                                )}
                              </span>
                            </div>
                            <div className="border-t pt-2 border-gray-200 dark:border-gray-600">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Subtotal baru:
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatRupiah(
                                    selectedInvoice.subtotal +
                                      (invoiceCalc.newReplacementItemsTotal -
                                        invoiceCalc.originalSwappedItemsTotal)
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">
                                Diskon (
                                {selectedInvoice.discountType === "PERCENTAGE"
                                  ? `${selectedInvoice.discount}%`
                                  : "Nominal"}
                                ):
                              </span>
                              <span className="font-medium text-orange-600">
                                -
                                {formatRupiah(
                                  (() => {
                                    const newSubtotal =
                                      selectedInvoice.subtotal +
                                      (invoiceCalc.newReplacementItemsTotal -
                                        invoiceCalc.originalSwappedItemsTotal);
                                    if (
                                      selectedInvoice.discountType ===
                                      "PERCENTAGE"
                                    ) {
                                      return (
                                        (newSubtotal *
                                          selectedInvoice.discount) /
                                        100
                                      );
                                    } else {
                                      return selectedInvoice.discount;
                                    }
                                  })()
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">
                                Ongkos kirim:
                              </span>
                              <span className="font-medium text-blue-600">
                                +{formatRupiah(selectedInvoice.shippingCost)}
                              </span>
                            </div>
                            <div className="border-t pt-2 border-gray-200 dark:border-gray-600">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-gray-900 dark:text-white">
                                  Selisih Total Invoice:
                                </span>
                                <span
                                  className={
                                    invoiceCalc.invoiceDifference >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {invoiceCalc.invoiceDifference >= 0
                                    ? "+"
                                    : ""}
                                  {formatRupiah(invoiceCalc.invoiceDifference)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Impact Summary */}
                        <div className="text-center">
                          {invoiceCalc.invoiceDifference > 0 ? (
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="font-medium">
                                Invoice akan bertambah{" "}
                                {formatRupiah(invoiceCalc.invoiceDifference)}
                                (Customer perlu bayar tambahan)
                              </span>
                            </div>
                          ) : invoiceCalc.invoiceDifference < 0 ? (
                            <div className="flex items-center justify-center gap-2 text-blue-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="font-medium">
                                Invoice akan berkurang{" "}
                                {formatRupiah(
                                  Math.abs(invoiceCalc.invoiceDifference)
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-gray-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="font-medium">
                                Tidak ada perubahan pada total invoice
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            {/* Validation Error */}
            {formErrors.validation && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{formErrors.validation}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ManagementForm>
    </div>
  );
}
