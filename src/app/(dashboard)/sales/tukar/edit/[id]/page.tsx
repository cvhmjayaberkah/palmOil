// app/sales/tukar/edit/[id]/page.tsx
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
  updateSwap,
  getSwapById,
  getAvailableInvoices,
  getAvailableProducts,
  getInvoiceById,
  SwapData,
  SwapGroupData,
  getDeliveredItemsByInvoiceId,
  deleteSwap,
} from "@/lib/actions/swaps";
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
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";

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

interface EditSwapPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditSwapPage({ params }: EditSwapPageProps) {
  const { id } = React.use(params);
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [existingSwap, setExistingSwap] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<SwapFormData>({
    code: "",
    swapDate: new Date().toISOString().split("T")[0],
    invoiceId: "",
    notes: "",
    baseTotal: 0,
    deadline: "",
    oldItems: [],
    replacementItems: [],
  });

  const [formErrors, setFormErrors] = useState<SwapFormErrors>({});

  // Get selling price (no tax calculation)
  const getSellingPrice = (product: Product): number => {
    return product.sellingPrice || product.cost;
  };

  // Calculate available quantities for edit swap
  const getAvailableQuantities = () => {
    if (!selectedInvoice || !existingSwap) {
      return { oldItems: {}, replacementItems: {} };
    }

    const availableOldItems: { [itemId: string]: number } = {};
    const availableReplacementItems: { [itemId: string]: number } = {};

    // For old items in EDIT mode:
    // The invoice.quantity already reflects the reduced quantity after the swap
    // To get the original available quantity, we need to add back what was swapped
    selectedInvoice.invoiceItems?.forEach((invoiceItem) => {
      const currentQtyInInvoice = invoiceItem.quantity; // This is already reduced by previous swap

      // Find how much of this item was taken by the current swap being edited
      const qtyTakenByCurrentSwap =
        existingSwap.swapDetails?.reduce((sum: number, detail: any) => {
          return detail.oldItemId === invoiceItem.products.id
            ? sum + detail.oldItemQuantity
            : sum;
        }, 0) || 0;

      // Available quantity = current remaining quantity + what was taken by this swap
      // This gives us the quantity that was available before this swap happened
      availableOldItems[invoiceItem.products.id] =
        currentQtyInInvoice + qtyTakenByCurrentSwap;
    });

    // Handle items that were completely swapped and might not exist in invoice anymore
    existingSwap.swapDetails?.forEach((detail: any) => {
      if (!availableOldItems[detail.oldItemId]) {
        // If item is not in invoice items (completely swapped), make it available for editing
        availableOldItems[detail.oldItemId] = detail.oldItemQuantity;
      }
    });

    // For replacement items: current stock + quantity that was taken for current swap being edited
    availableProducts.forEach((product) => {
      const currentStock = product.currentStock;

      // Find how much of this item was taken for current swap being edited
      const takenForCurrentSwap =
        existingSwap.swapDetails?.reduce((sum: number, detail: any) => {
          return detail.replacementItemId === product.id
            ? sum + detail.replacementItemQuantity
            : sum;
        }, 0) || 0;

      // Available = current stock + what was taken for current swap (since we're editing it)
      availableReplacementItems[product.id] =
        currentStock + takenForCurrentSwap;
    });

    return {
      oldItems: availableOldItems,
      replacementItems: availableReplacementItems,
    };
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

    // Use the actual invoice values (current state after previous swaps)
    const currentInvoiceTotal = selectedInvoice.totalAmount || 0;
    const currentSubtotal = selectedInvoice.subtotal || 0;
    const currentShipping = selectedInvoice.shippingCost || 0;
    const currentDiscount = selectedInvoice.discount || 0;
    const currentDiscountType = selectedInvoice.discountType;

    // For original invoice total, use baseTotal from existing swap (before any swaps)
    const originalInvoiceTotal = existingSwap?.baseTotal || currentInvoiceTotal;

    // Calculate difference in items (replacement - old)
    const itemDifference = newReplacementItemsTotal - originalSwappedItemsTotal;

    // Simple calculation: Original invoice total + item difference
    const newInvoiceTotal = originalInvoiceTotal + itemDifference;

    // Invoice difference is the item difference itself
    const invoiceDifference = itemDifference;
    const isInvoiceImpactPositive = invoiceDifference >= 0;

    return {
      originalInvoiceTotal: originalInvoiceTotal,
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
        // Load basic data first
        const [invoices, products] = await Promise.all([
          getAvailableInvoices(),
          getAvailableProducts(),
        ]);
        setAvailableInvoices(invoices);
        setAvailableProducts(products);

        // Load existing swap data
        if (id) {
          const swapData = await getSwapById(id);
          setExistingSwap(swapData);
          setIsEditMode(true);

          // Load invoice detail for the swap
          const invoice = await getInvoiceById(swapData.invoiceId);
          setSelectedInvoice(invoice);

          // Get delivered items for the invoice
          const deliveredItems = await getDeliveredItemsByInvoiceId(
            swapData.invoiceId
          );

          // Populate form with existing swap data
          setFormData({
            code: swapData.code,
            swapDate: new Date(swapData.swapDate).toISOString().split("T")[0],
            invoiceId: swapData.invoiceId,
            notes: swapData.notes || "",
            baseTotal: swapData.baseTotal,
            deadline: swapData.invoice.dueDate
              ? new Date(swapData.invoice.dueDate).toISOString().split("T")[0]
              : "",
            oldItems: swapData.swapDetails.reduce((acc: any[], detail: any) => {
              // Only add if this oldItemId doesn't already exist
              const existingOldItem = acc.find(
                (item) => item.oldItemId === detail.oldItemId
              );
              if (!existingOldItem) {
                acc.push({
                  oldItemId: detail.oldItemId,
                  quantity: detail.oldItemQuantity,
                  costPerItem: detail.oldItemCogs,
                });
              }
              return acc;
            }, []),
            replacementItems: swapData.swapDetails.reduce(
              (acc: any[], detail: any) => {
                // Only add if this replacementItemId doesn't already exist
                const existingReplacementItem = acc.find(
                  (item) => item.replacementItemId === detail.replacementItemId
                );
                if (!existingReplacementItem) {
                  acc.push({
                    replacementItemId: detail.replacementItemId,
                    quantity: detail.replacementItemQuantity,
                    pricePerItem: detail.replacementItemCogs,
                  });
                }
                return acc;
              },
              []
            ),
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Gagal memuat data swap");
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [id]);

  // Handle invoice selection
  const handleInvoiceSelect = async (invoiceId: string) => {
    // Dalam mode edit, invoice tidak bisa diubah
    if (isEditMode) {
      return;
    }

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

        // Set deadline from invoice dueDate if available
        if (invoice.dueDate) {
          const deadlineDate = new Date(invoice.dueDate)
            .toISOString()
            .split("T")[0];
          setFormData((prev) => ({ ...prev, deadline: deadlineDate }));
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
  const validateForm = (): boolean => {
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
    } else if (hasInvalidReplacementQuantity) {
      errors.validation =
        "Semua item pengganti harus dipilih dan quantity harus lebih dari 0";
    }

    // Validate replacement item stock availability using correct available quantities
    const availableQuantities = getAvailableQuantities();

    for (let i = 0; i < formData.oldItems.length; i++) {
      const oldItem = formData.oldItems[i];
      const replacementItem = formData.replacementItems[i];

      if (oldItem && replacementItem) {
        // Check old item availability (should use original invoice quantity in edit mode)
        const availableOldQty =
          availableQuantities.oldItems[oldItem.oldItemId] || 0;

        if (availableOldQty < oldItem.quantity) {
          const oldProduct = selectedInvoice?.invoiceItems?.find(
            (item) => item.products.id === oldItem.oldItemId
          )?.products;
          const productName =
            oldProduct?.name || `Product ID: ${oldItem.oldItemId}`;
          errors.validation = `Quantity item lama "${productName}" tidak mencukupi. Tersedia untuk tukar: ${availableOldQty}, Diminta: ${oldItem.quantity}`;
          break;
        }

        // Check replacement item availability (current stock + previously taken for swap)
        const availableReplacementQty =
          availableQuantities.replacementItems[
            replacementItem.replacementItemId
          ] || 0;
        if (availableReplacementQty < replacementItem.quantity) {
          const replacementProduct = availableProducts.find(
            (p) => p.id === replacementItem.replacementItemId
          );
          errors.validation = `Stok item pengganti "${replacementProduct?.name}" tidak mencukupi. Tersedia: ${availableReplacementQty}, Dibutuhkan: ${replacementItem.quantity}`;
          break;
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

    if (!validateForm()) {
      toast.error("Mohon perbaiki kesalahan pada form");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get totals untuk kalkulasi selisih
      const totals = calculateTotals();

      // Convert to SwapGroupData format yang dibutuhkan updateSwap
      const swapGroups: SwapGroupData[] = [];

      // Create a single swap group with all old items and all replacement items
      // This handles scenarios like: 1 old item + 2 replacement items, 2 old items + 3 replacement items, etc.
      if (
        formData.oldItems.length > 0 ||
        formData.replacementItems.length > 0
      ) {
        swapGroups.push({
          oldItems: formData.oldItems.map((oldItem) => ({
            itemId: oldItem.oldItemId,
            quantity: oldItem.quantity,
            cogs: oldItem.costPerItem,
          })),
          replacementItems: formData.replacementItems.map(
            (replacementItem) => ({
              itemId: replacementItem.replacementItemId,
              quantity: replacementItem.quantity,
              cogs: replacementItem.pricePerItem,
            })
          ),
        });
      }

      const updateData: Partial<SwapData> = {
        swapDate: new Date(formData.swapDate),
        deadline: formData.deadline,
        notes: formData.notes || "",
        createdBy: user?.id || "",
        difference: totals.difference,
        swapGroups: swapGroups,
      };

      const result = await updateSwap(id, updateData);

      if (result.success) {
        toast.success("Tukar guling berhasil diperbarui.");
        // router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        throw new Error(result.error || "Gagal memperbarui tukar guling");
      }
    } catch (error: any) {
      console.error("Terjadi kesalahan saat memperbarui tukar guling:", error);
      const errorMessage =
        error.message || "Terjadi kesalahan yang tidak terduga.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSwap(id);

      if (result.success) {
        toast.success(
          "Tukar guling berhasil dihapus dan semua perubahan telah dikembalikan."
        );
        router.push(`/${data.module}/${data.subModule.toLowerCase()}`);
      } else {
        const errorMessage = result.error || "Gagal menghapus tukar guling";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error deleting swap:", error);
      toast.error("Terjadi kesalahan saat menghapus tukar guling.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
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
        headerTittle="Edit Tukar Guling"
        mainPageName={`/${data.module}/${data.subModule.toLowerCase()}`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName={data.subModule.toLowerCase()}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleSubmit}
        handleDelete={() => setIsDeleteModalOpen(true)}
        hideDeleteButton={false}
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
              {isEditMode ? (
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {selectedInvoice
                    ? `${selectedInvoice.code} - ${
                        selectedInvoice.customer?.name || "No customer"
                      }`
                    : formData.invoiceId}
                </div>
              ) : (
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
              )}
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
                    // Try to find the selected item in invoice items first
                    let selectedItem = selectedInvoice.invoiceItems?.find(
                      (invoiceItem) =>
                        invoiceItem.products.id === item.oldItemId
                    );

                    // If not found and we have existing swap data, try to find from existing swap details
                    if (
                      !selectedItem &&
                      existingSwap &&
                      existingSwap.swapDetails
                    ) {
                      const existingDetail = existingSwap.swapDetails.find(
                        (detail: any) => detail.oldItemId === item.oldItemId
                      );
                      if (existingDetail && existingDetail.oldItem) {
                        // Create a mock selectedItem structure for display
                        selectedItem = {
                          id: existingDetail.id,
                          quantity: existingDetail.oldItemQuantity,
                          price: existingDetail.oldItemCogs,
                          products: existingDetail.oldItem,
                        };
                      }
                    }

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
                            {/* Show currently selected item even if not in available list */}
                            {item.oldItemId &&
                              !selectedInvoice.invoiceItems?.find(
                                (invoiceItem) =>
                                  invoiceItem.products.id === item.oldItemId
                              ) && (
                                <option value={item.oldItemId}>
                                  {selectedItem?.products?.name ||
                                    `Item ID: ${item.oldItemId} (Tidak ditemukan)`}
                                </option>
                              )}
                            {selectedInvoice.invoiceItems
                              ?.filter((invoiceItem) => {
                                const selectedIds =
                                  getSelectedOldItemIds(index);
                                // Include current item even if it's "selected" elsewhere
                                return (
                                  !selectedIds.includes(
                                    invoiceItem.products.id
                                  ) ||
                                  invoiceItem.products.id === item.oldItemId
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
                            const availableQuantities =
                              getAvailableQuantities();
                            const maxQty =
                              availableQuantities.oldItems[item.oldItemId] ||
                              selectedItem?.quantity ||
                              999;
                            return (
                              <div>
                                <Input
                                  name="jumlah"
                                  type="number"
                                  min="0"
                                  max={maxQty}
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
                                {item.oldItemId && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Max yang bisa ditukar: {maxQty}
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

                              // Use sellingPrice first, fallback to cost - consistent with calculation functions
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
                    // Try to find the selected product in available products first
                    let selectedProduct = availableProducts.find(
                      (product) => product.id === item.replacementItemId
                    );

                    // If not found and we have existing swap data, try to find from existing swap details
                    if (
                      !selectedProduct &&
                      existingSwap &&
                      existingSwap.swapDetails
                    ) {
                      const existingDetail = existingSwap.swapDetails.find(
                        (detail: any) =>
                          detail.replacementItemId === item.replacementItemId
                      );
                      if (existingDetail && existingDetail.replacementItem) {
                        // Use the existing product data
                        selectedProduct = existingDetail.replacementItem;
                      }
                    }

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
                            {/* Show currently selected item even if not in available list */}
                            {item.replacementItemId &&
                              !availableProducts.find(
                                (product) =>
                                  product.id === item.replacementItemId
                              ) && (
                                <option value={item.replacementItemId}>
                                  {selectedProduct?.name ||
                                    `Item ID: ${item.replacementItemId} (Tidak ditemukan/Tidak aktif)`}
                                </option>
                              )}
                            {availableProducts
                              .filter((product) => {
                                // Get available quantities including swap history
                                const availableQuantities =
                                  getAvailableQuantities();
                                const availableQty =
                                  availableQuantities.replacementItems[
                                    product.id
                                  ] || 0;
                                const hasAvailableStock = availableQty > 0;

                                const selectedIds =
                                  getSelectedReplacementItemIds(index);
                                // Include current item even if it's "selected" elsewhere
                                const notAlreadySelected =
                                  !selectedIds.includes(product.id) ||
                                  product.id === item.replacementItemId;

                                return (
                                  (hasAvailableStock ||
                                    product.id === item.replacementItemId) &&
                                  notAlreadySelected
                                );
                              })
                              .map((product) => {
                                const availableQuantities =
                                  getAvailableQuantities();
                                const availableQty =
                                  availableQuantities.replacementItems[
                                    product.id
                                  ] || 0;
                                const isCurrentStock = product.currentStock > 0;
                                const hasHistoryStock =
                                  availableQty > product.currentStock;

                                return (
                                  <option key={product.id} value={product.id}>
                                    {product.name}{" "}
                                    {!isCurrentStock && hasHistoryStock
                                      ? `(Stok 0, Tersedia dari History: ${availableQty})`
                                      : !isCurrentStock &&
                                        product.id === item.replacementItemId
                                      ? "(Stok Habis)"
                                      : ""}
                                  </option>
                                );
                              })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Stok Produk
                          </label>
                          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm dark:text-gray-200">
                            {(() => {
                              const currentStock =
                                selectedProduct?.currentStock || 0;
                              const availableQuantities =
                                getAvailableQuantities();
                              const availableQty =
                                availableQuantities.replacementItems[
                                  item.replacementItemId
                                ] || 0;

                              if (availableQty > currentStock) {
                                return `${currentStock} (+ ${
                                  availableQty - currentStock
                                } dari history) = ${availableQty}`;
                              } else {
                                return currentStock;
                              }
                            })()}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quantity
                          </label>
                          {(() => {
                            const availableQuantities =
                              getAvailableQuantities();
                            const maxQty =
                              availableQuantities.replacementItems[
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
                                  max={maxQty}
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
                                {item.replacementItemId && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Max tersedia untuk tukar: {maxQty}
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
                      {formatRupiah(totals.totalOldValue)}
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
                                Total Invoice Original:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatRupiah(invoiceCalc.originalInvoiceTotal)}
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
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-gray-900 dark:text-white">
                                  Selisih Tukar Guling:
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
                            <div className="border-t pt-2 border-gray-200 dark:border-gray-600">
                              <div className="flex justify-between items-center font-bold text-lg">
                                <span className="text-gray-900 dark:text-white">
                                  Total Invoice Setelah Tukar Guling:
                                </span>
                                <span className="text-blue-600">
                                  {formatRupiah(invoiceCalc.newInvoiceTotal)}
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

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Tukar Guling"
        isLoading={isDeleting}
      >
        <div className="space-y-3">
          <p>
            Apakah Anda yakin ingin menghapus tukar guling "{existingSwap?.code}
            "?
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Operasi ini akan:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Mengembalikan stock barang ke kondisi awal</li>
                  <li>Mengembalikan invoice items seperti sebelum swap</li>
                  <li>Menghapus semua pengiriman terkait swap</li>
                  <li>Menghapus semua stock movements</li>
                  <li>Menghitung ulang total invoice</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      </ConfirmationModal>
    </div>
  );
}
