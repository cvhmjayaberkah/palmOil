"use client";
import { ManagementHeader, ManagementForm } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  InputDate,
  Button,
  Select,
} from "@/components/ui";
import {
  getDeliveryById,
  deleteDelivery,
  updateDelivery,
} from "@/lib/actions/deliveries";
import { createPaymentFromDelivery } from "@/lib/actions/payments";
import {
  createCreditNote,
  getCreditNotesByInvoice,
  deleteCreditNote,
} from "@/lib/actions/creditNotes";
import { useRouter, useParams } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";
import { formatRupiah } from "@/utils/formatRupiah";
import { formatInputRupiah, parseInputRupiah } from "@/utils/formatInput";
import { updateDeliveryStatus } from "@/lib/actions/deliveries";
import { PaymentMethod } from "@prisma/client";

interface DeliveryFormData {
  deliveryDate: string;
  notes: string;
}

interface PaymentFormData {
  amount: number;
  method: PaymentMethod | "";
  notes: string;
  // Transfer Bank fields
  rekeningPenerima: string;
  namaPenerima: string;
  rekeningPengirim: string;
  namaPengirim: string;
  // Cek fields
  nomorCek: string;
  namaBankPenerbit: string;
  tanggalCek: string;
  tanggalJatuhTempo: string;
}

interface DeliveryFormErrors {
  deliveryDate?: string;
}

interface ReturnItem {
  invoiceItemId: string;
  productId: string;
  productName: string;
  unit: string;
  invoiceQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  discount: number;
  discountType: string;
}

interface ReturnFormData {
  returnDate: Date;
  notes: string;
  returnItems: ReturnItem[];
}

export default function EditDeliveryPage() {
  const data = useSharedData();
  const router = useRouter();
  const params = useParams();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false);
  const [returnFormData, setReturnFormData] = useState<ReturnFormData>({
    returnDate: new Date(),
    notes: "",
    returnItems: [],
  });
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    status: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    status: "",
    title: "",
    message: "",
  });
  const [delivery, setDelivery] = useState<any | null>(null);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [deletingCreditNoteId, setDeletingCreditNoteId] = useState<
    string | null
  >(null);
  const [isDeleteCreditNoteModalOpen, setIsDeleteCreditNoteModalOpen] =
    useState(false);
  const [creditNoteToDelete, setCreditNoteToDelete] = useState<any | null>(
    null
  );
  const [isInvoiceDetailModalOpen, setIsInvoiceDetailModalOpen] =
    useState(false);

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    amount: 0,
    method: "",
    notes: "",
    rekeningPenerima: "",
    namaPenerima: "",
    rekeningPengirim: "",
    namaPengirim: "",
    nomorCek: "",
    namaBankPenerbit: "",
    tanggalCek: "",
    tanggalJatuhTempo: "",
  });

  const [formData, setFormData] = useState<DeliveryFormData>({
    deliveryDate: "",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState<DeliveryFormErrors>({});

  // Helper function to check payment status
  const getPaymentStatus = () => {
    if (
      !delivery?.invoice?.payments ||
      delivery.invoice.payments.length === 0
    ) {
      return { status: "UNPAID", message: "Belum Ada Pembayaran" };
    }

    const totalPaid = delivery.invoice.payments
      .filter((payment: any) => payment.status === "CONFIRMED")
      .reduce((sum: number, payment: any) => sum + payment.amount, 0);

    const totalAmount = delivery.invoice.totalAmount;

    if (totalPaid >= totalAmount) {
      return { status: "PAID", message: "Lunas" };
    } else if (totalPaid > 0) {
      return { status: "PARTIAL", message: "Sebagian Lunas" };
    }

    return { status: "UNPAID", message: "Belum Lunas" };
  };

  // Helper function to handle payment form changes
  const handlePaymentInputChange = (
    field: keyof PaymentFormData,
    value: string | number
  ) => {
    setPaymentFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setIsLoadingData(true);
        setErrorLoadingData(null);

        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (!id) {
          throw new Error("ID tidak ditemukan");
        }

        const data = await getDeliveryById(id);
        if (!data) {
          throw new Error("Pengiriman tidak ditemukan");
        }

        setDelivery(data);
        setFormData({
          deliveryDate: data.deliveryDate
            ? new Date(data.deliveryDate).toISOString().split("T")[0]
            : "",
          notes: data.notes || "",
        });

        // Fetch credit notes for this invoice
        const creditNotesResult = await getCreditNotesByInvoice(
          data.invoice.id
        );
        if (creditNotesResult.success) {
          setCreditNotes(creditNotesResult.data || []);
        }
      } catch (error) {
        console.error("Kesalahan mengambil pengiriman:", error);
        setErrorLoadingData("Gagal memuat data pengiriman.");
        toast.error("Gagal memuat data pengiriman");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDelivery();
  }, [params.id]);

  const handleInputChange = (field: keyof DeliveryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field as keyof DeliveryFormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: DeliveryFormErrors = {};

    if (!formData.deliveryDate) {
      newErrors.deliveryDate = "Tanggal pengiriman harus diisi";
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Harap lengkapi semua field yang wajib diisi");
      return;
    }

    if (!delivery || !user) return;

    try {
      setIsSubmitting(true);

      // Update delivery data
      const deliveryUpdateData = {
        deliveryDate: new Date(formData.deliveryDate),
        notes: formData.notes || undefined,
      };

      const deliveryResult = await updateDelivery(
        delivery.id,
        deliveryUpdateData
      );
      if (!deliveryResult.success) {
        toast.error(deliveryResult.error || "Gagal memperbarui pengiriman");
        return;
      }

      // Create payment if form is filled
      if (
        showPaymentForm &&
        paymentFormData.method &&
        paymentFormData.amount > 0
      ) {
        // Validate payment form
        if (!paymentFormData.method) {
          toast.error("Metode pembayaran harus dipilih");
          return;
        }

        if (paymentFormData.method === "TRANSFER_BANK") {
          if (
            !paymentFormData.rekeningPenerima ||
            !paymentFormData.namaPenerima ||
            !paymentFormData.rekeningPengirim ||
            !paymentFormData.namaPengirim
          ) {
            toast.error("Semua field Transfer Bank harus diisi");
            return;
          }
        }

        if (paymentFormData.method === "CHECK") {
          if (
            !paymentFormData.nomorCek ||
            !paymentFormData.namaBankPenerbit ||
            !paymentFormData.tanggalCek ||
            !paymentFormData.tanggalJatuhTempo
          ) {
            toast.error("Semua field Cek harus diisi");
            return;
          }
        }

        const paymentResult = await createPaymentFromDelivery({
          amount: paymentFormData.amount,
          method: paymentFormData.method as PaymentMethod,
          notes: paymentFormData.notes,
          invoiceId: delivery.invoice.id,
          userId: user.id,
          // Transfer Bank fields
          rekeningPenerima: paymentFormData.rekeningPenerima,
          namaPenerima: paymentFormData.namaPenerima,
          rekeningPengirim: paymentFormData.rekeningPengirim,
          namaPengirim: paymentFormData.namaPengirim,
          // Cek fields
          nomorCek: paymentFormData.nomorCek,
          namaBankPenerbit: paymentFormData.namaBankPenerbit,
          tanggalCek: paymentFormData.tanggalCek,
          tanggalJatuhTempo: paymentFormData.tanggalJatuhTempo,
        });

        if (!paymentResult.success) {
          toast.error(paymentResult.error || "Gagal membuat pembayaran");
          return;
        }

        toast.success(
          "Pengiriman diperbarui dan pembayaran berhasil dibuat dengan status menunggu konfirmasi"
        );
      } else {
        toast.success("Pengiriman berhasil diperbarui");
      }

      router.push("/sales/pengiriman");
    } catch (error) {
      console.error("Error updating delivery:", error);
      toast.error("Terjadi kesalahan saat memperbarui pengiriman");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!delivery || !user?.id) return;

    try {
      setIsDeleting(true);

      // First, delete all credit notes related to this delivery/invoice
      if (creditNotes && creditNotes.length > 0) {
        for (const creditNote of creditNotes) {
          const creditNoteResult = await deleteCreditNote(
            creditNote.id,
            user.id
          );

          if (!creditNoteResult.success) {
            toast.error(
              `Gagal menghapus credit note ${creditNote.creditNoteNo}: ${creditNoteResult.error}`
            );
            return;
          }
        }

        toast.success(
          `Berhasil menghapus ${creditNotes.length} credit note(s)`
        );
      }

      // After all credit notes are deleted, delete the delivery
      const result = await deleteDelivery(delivery.id);
      if (result.success) {
        toast.success(
          "Pengiriman dan semua credit note terkait berhasil dihapus"
        );
        router.push("/sales/pengiriman");
      } else {
        toast.error(result.error || "Gagal menghapus pengiriman");
      }
    } catch (error) {
      console.error("Error deleting delivery:", error);
      toast.error("Terjadi kesalahan saat menghapus pengiriman");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleStatusUpdate = async (
    status: "DELIVERED" | "RETURNED" | "CANCELLED" | "IN_TRANSIT"
  ) => {
    if (
      (status === "RETURNED" || status === "CANCELLED") &&
      !returnReason.trim()
    ) {
      toast.error("Alasan pengembalian/pembatalan harus diisi");
      return;
    }

    // Show confirmation for sensitive status changes
    if (
      delivery.status === "DELIVERED" &&
      (status === "RETURNED" || status === "CANCELLED")
    ) {
      const actionText = status === "RETURNED" ? "dikembalikan" : "dibatalkan";
      setConfirmationModal({
        isOpen: true,
        status: status,
        title: `Konfirmasi ${
          status === "RETURNED" ? "Pengembalian" : "Pembatalan"
        }`,
        message: `Apakah Anda yakin ingin mengubah status dari "Berhasil Dikirim" menjadi "${actionText}"? 

Stock produk akan dikembalikan ke inventory dan tercatat dalam stock movement. 

Alasan: ${returnReason}`,
      });
      return;
    }

    // Execute status update
    await executeStatusUpdate(status);
  };

  const executeStatusUpdate = async (
    status: "DELIVERED" | "RETURNED" | "CANCELLED" | "IN_TRANSIT"
  ) => {
    setIsUpdatingStatus(true);
    try {
      const result = await updateDeliveryStatus(
        delivery.id,
        status,
        "",
        status === "RETURNED" || status === "CANCELLED" ? returnReason : "",
        user?.id
      );

      if (result.success) {
        const successMessage =
          status === "DELIVERED"
            ? "Status pengiriman berhasil diubah menjadi 'Berhasil Dikirim'"
            : status === "RETURNED"
            ? "Status pengiriman berhasil diubah menjadi 'Dikembalikan'"
            : status === "CANCELLED"
            ? "Status pengiriman berhasil diubah menjadi 'Dibatalkan'"
            : "Status pengiriman berhasil diubah menjadi 'Dalam Perjalanan'";

        toast.success(successMessage);

        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (id) {
          try {
            const updatedData = await getDeliveryById(id);
            if (updatedData) {
              setDelivery(updatedData);

              // Also refresh credit notes if status change affects them
              const creditNotesResult = await getCreditNotesByInvoice(
                updatedData.invoice.id
              );
              if (creditNotesResult.success) {
                setCreditNotes(creditNotesResult.data || []);
              }

              // if (status === "DELIVERED") {
              //   toast.success("Data pengiriman berhasil diperbarui", {
              //     id: "refresh-delivery",
              //   });
              // }
            }
          } catch (error) {
            console.error("Error refreshing delivery data:", error);
            if (status === "DELIVERED") {
              toast.error("Gagal memperbarui data pengiriman", {
                id: "refresh-delivery",
              });
            }

            // Fallback: Update local state only if we can't fetch fresh data
            setDelivery((prev: any) => ({
              ...prev,
              status: status,
              returnReason:
                status === "RETURNED" || status === "CANCELLED"
                  ? returnReason
                  : "",
            }));
          }
        } else {
          // Fallback: Update local state only if we can't fetch fresh data
          setDelivery((prev: any) => ({
            ...prev,
            status: status,
            returnReason:
              status === "RETURNED" || status === "CANCELLED"
                ? returnReason
                : "",
          }));
        }

        // Clear return reason after successful update
        if (status === "RETURNED" || status === "CANCELLED") {
          setReturnReason("");
        }
      } else {
        toast.error(result.error || "Gagal mengubah status pengiriman");
      }
    } catch (error) {
      toast.error("Gagal mengubah status pengiriman");
      console.error("Error updating delivery status:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Return handling functions
  const handleReturnQuantityChange = (
    invoiceItemId: string,
    quantity: number,
    item: any
  ) => {
    setReturnFormData(prev => {
      const existingItemIndex = prev.returnItems.findIndex(
        ri => ri.invoiceItemId === invoiceItemId
      );

      if (quantity === 0) {
        // Remove item if quantity is 0
        return {
          ...prev,
          returnItems: prev.returnItems.filter(
            ri => ri.invoiceItemId !== invoiceItemId
          ),
        };
      }

      const finalPrice = item.finalPrice || item.price; // Use finalPrice if available

      const returnItem: ReturnItem = {
        invoiceItemId: invoiceItemId,
        productId: item.products.id,
        productName: item.products.name,
        unit: item.products.unit,
        invoiceQuantity: item.quantity,
        returnQuantity: quantity,
        unitPrice: finalPrice, // Use finalPrice instead of original price
        discount: item.discount,
        discountType: item.discountType,
      };

      if (existingItemIndex >= 0) {
        // Update existing item
        const newReturnItems = [...prev.returnItems];
        newReturnItems[existingItemIndex] = returnItem;
        return {
          ...prev,
          returnItems: newReturnItems,
        };
      } else {
        // Add new item
        return {
          ...prev,
          returnItems: [...prev.returnItems, returnItem],
        };
      }
    });
  };

  const handleProcessReturn = async () => {
    if (returnFormData.returnItems.length === 0) {
      toast.error("Pilih minimal satu item untuk dikembalikan");
      return;
    }

    // Validate quantities
    const invalidItems = returnFormData.returnItems.filter(
      item =>
        item.returnQuantity <= 0 || item.returnQuantity > item.invoiceQuantity
    );

    if (invalidItems.length > 0) {
      toast.error(
        "Pastikan quantity pengembalian valid (lebih dari 0 dan tidak melebihi quantity invoice)"
      );
      return;
    }

    if (!delivery.invoice.customer?.id) {
      toast.error("Data customer tidak ditemukan");
      return;
    }

    if (!user?.id) {
      toast.error("Session user tidak ditemukan");
      return;
    }

    setIsProcessingReturn(true);
    try {
      // Prepare data for credit note creation
      const creditNoteData = {
        deliveryId: delivery.id,
        invoiceId: delivery.invoice.id,
        customerId: delivery.invoice.customer.id,
        returnDate: returnFormData.returnDate,
        notes: returnFormData.notes,
        userId: user.id, // Pass actual user ID from session
        returnItems: returnFormData.returnItems.map(item => ({
          invoiceItemId: item.invoiceItemId,
          productId: item.productId,
          quantity: item.returnQuantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          taxRate: 0, // You can calculate tax rate if needed
        })),
      };

      const result = await createCreditNote(creditNoteData);

      if (result.success) {
        toast.success(result.message || "Pengembalian berhasil diproses");

        // Refresh delivery data to show updated information
        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (id) {
          const updatedData = await getDeliveryById(id);
          if (updatedData) {
            setDelivery(updatedData);

            // Also refresh credit notes
            const creditNotesResult = await getCreditNotesByInvoice(
              updatedData.invoice.id
            );
            if (creditNotesResult.success) {
              setCreditNotes(creditNotesResult.data || []);
            }
          }
        }

        // Close both modals
        setIsReturnConfirmOpen(false);
        setIsReturnModalOpen(false);

        // Reset form
        setReturnFormData({
          returnDate: new Date(),
          notes: "",
          returnItems: [],
        });
      } else {
        toast.error(result.error || "Gagal memproses pengembalian");
      }
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error("Gagal memproses pengembalian");
    } finally {
      setIsProcessingReturn(false);
    }
  };

  const handleDeleteCreditNote = async () => {
    if (!creditNoteToDelete || !user?.id) {
      toast.error("Data tidak lengkap untuk menghapus credit note");
      return;
    }

    setDeletingCreditNoteId(creditNoteToDelete.id);
    try {
      const result = await deleteCreditNote(creditNoteToDelete.id, user.id);

      if (result.success) {
        toast.success(result.message || "Credit note berhasil dihapus");

        // Refresh delivery data to show updated information
        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (id) {
          const updatedData = await getDeliveryById(id);
          if (updatedData) {
            setDelivery(updatedData);

            // Also refresh credit notes
            const creditNotesResult = await getCreditNotesByInvoice(
              updatedData.invoice.id
            );
            if (creditNotesResult.success) {
              setCreditNotes(creditNotesResult.data || []);
            }
          }
        }

        // Close modal and reset state
        setIsDeleteCreditNoteModalOpen(false);
        setCreditNoteToDelete(null);
      } else {
        toast.error(result.error || "Gagal menghapus credit note");
      }
    } catch (error) {
      console.error("Error deleting credit note:", error);
      toast.error("Gagal menghapus credit note");
    } finally {
      setDeletingCreditNoteId(null);
    }
  };

  if (isLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit Pengiriman"
          mainPageName={`/sales/pengiriman`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Memuat data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (errorLoadingData) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit Pengiriman"
          mainPageName={`/sales/pengiriman`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">{errorLoadingData}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <ManagementHeader
          headerTittle="Edit Pengiriman"
          mainPageName={`/sales/pengiriman`}
          allowedRoles={data.allowedRole}
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">Data pengiriman tidak ditemukan</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle={`Edit Pengiriman`}
        mainPageName={`/sales/pengiriman`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName="pengiriman"
        moduleName="sales"
        isSubmitting={isSubmitting}
        handleFormSubmit={handleSubmit}
        hideDeleteButton={false}
        handleDelete={() => setIsDeleteModalOpen(true)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Kode Pengiriman">
            <Input
              name="code"
              type="text"
              value={delivery.code}
              readOnly
              className="mt-1 block w-full bg-gray-100 cursor-default dark:bg-gray-800"
            />
          </FormField>

          <FormField
            label="Tanggal Pengiriman"
            errorMessage={formErrors.deliveryDate}
            required
          >
            <InputDate
              value={new Date(formData.deliveryDate)}
              onChange={value =>
                value &&
                handleInputChange(
                  "deliveryDate",
                  value.toISOString().split("T")[0]
                )
              }
            />
          </FormField>
        </div>

        {/* Invoice Information */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg dark:text-gray-300">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">
              Informasi Invoice
            </h3>
            <Button
              type="button"
              variant="outline"
              size="small"
              className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900/20"
              onClick={() => setIsInvoiceDetailModalOpen(true)}
            >
              📄 Lihat Detail Invoice
            </Button>
          </div>
        </div>

        {/* Item Pengiriman */}
        {delivery.deliveryItems && delivery.deliveryItems.length > 0 ? (
          // <div className="mt-4">
          //   <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
          //     Detail Item Pengiriman
          //   </h3>

          //   <div className="block md:hidden space-y-3">
          //     {delivery.deliveryItems.map((item: any, index: number) => (
          //       <div
          //         key={index}
          //         className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
          //       >
          //         {/* Product Header */}
          //         <div className="flex justify-between items-start mb-3">
          //           <div className="flex-1">
          //             <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
          //               {item.invoiceItem?.products?.name ||
          //                 "Produk tidak ditemukan"}
          //             </h5>
          //             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          //               Kode: {item.invoiceItem?.products?.code || "-"}
          //             </p>
          //           </div>
          //           <div className="text-right ml-3">
          //             <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          //               {formatRupiah(
          //                 item.invoiceItem?.finalPrice ||
          //                   item.invoiceItem?.price ||
          //                   0
          //               )}
          //             </span>
          //             <p className="text-xs text-gray-500 dark:text-gray-400">
          //               Harga Final
          //             </p>
          //           </div>
          //         </div>

          //         {/* Quantities Grid */}
          //         <div className="grid grid-cols-3 gap-2 mb-3">
          //           <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-center">
          //             <p className="text-xs text-blue-600 dark:text-blue-400">
          //               Qty Kirim
          //             </p>
          //             <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm">
          //               {item.quantityToDeliver}
          //             </p>
          //             <p className="text-xs text-gray-500 dark:text-gray-400">
          //               {item.invoiceItem?.products?.unit || "pcs"}
          //             </p>
          //           </div>
          //           <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-center">
          //             <p className="text-xs text-green-600 dark:text-green-400">
          //               Qty Dikirim
          //             </p>
          //             <p className="font-semibold text-green-700 dark:text-green-300 text-sm">
          //               {item.quantityDelivered}
          //             </p>
          //             <p className="text-xs text-gray-500 dark:text-gray-400">
          //               {item.invoiceItem?.products?.unit || "pcs"}
          //             </p>
          //           </div>
          //           <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-center">
          //             <p className="text-xs text-red-600 dark:text-red-400">
          //               Qty Return
          //             </p>
          //             <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
          //               {item.quantityReturned || 0}
          //             </p>
          //             <p className="text-xs text-gray-500 dark:text-gray-400">
          //               {item.invoiceItem?.products?.unit || "pcs"}
          //             </p>
          //           </div>
          //         </div>
          //       </div>
          //     ))}
          //   </div>

          //   {/* Desktop Table View */}
          //   <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          //     <table className="w-full min-w-[800px] table-auto bg-white dark:bg-gray-900">
          //       <thead>
          //         <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          //           <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
          //             Produk
          //           </th>
          //           <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
          //             Qty Kirim
          //           </th>
          //           <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
          //             Qty Dikirim
          //           </th>
          //           <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
          //             Qty Return
          //           </th>
          //           <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 w-28">
          //             Harga Final
          //           </th>
          //           {/* <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-24">
          //             Status
          //           </th> */}
          //         </tr>
          //       </thead>
          //       <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          //         {delivery.deliveryItems.map((item: any, index: number) => (
          //           <tr
          //             key={index}
          //             className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          //           >
          //             {/* Product */}
          //             <td className="px-4 py-3">
          //               <div className="flex flex-col">
          //                 <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          //                   {item.invoiceItem?.products?.name ||
          //                     "Produk tidak ditemukan"}
          //                 </span>
          //                 <span className="text-xs text-gray-500 dark:text-gray-400">
          //                   Kode: {item.invoiceItem?.products?.code || "-"}
          //                 </span>
          //               </div>
          //             </td>

          //             {/* Quantity To Deliver */}
          //             <td className="px-4 py-3 text-center">
          //               <div className="text-sm text-gray-700 dark:text-gray-300">
          //                 <span className="font-medium">
          //                   {item.quantityToDeliver}
          //                 </span>
          //                 <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
          //                   {item.invoiceItem?.products?.unit || "pcs"}
          //                 </span>
          //               </div>
          //             </td>

          //             {/* Quantity Delivered */}
          //             <td className="px-4 py-3 text-center">
          //               <div className="text-sm text-green-700 dark:text-green-300">
          //                 <span className="font-medium">
          //                   {item.quantityDelivered}
          //                 </span>
          //                 <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
          //                   {item.invoiceItem?.products?.unit || "pcs"}
          //                 </span>
          //               </div>
          //             </td>

          //             {/* Quantity Returned */}
          //             <td className="px-4 py-3 text-center">
          //               <div className="text-sm text-red-700 dark:text-red-300">
          //                 <span className="font-medium">
          //                   {item.quantityReturned || 0}
          //                 </span>
          //                 <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
          //                   {item.invoiceItem?.products?.unit || "pcs"}
          //                 </span>
          //               </div>
          //             </td>

          //             {/* Price */}
          //             <td className="px-4 py-3 text-right">
          //               <div className="flex flex-col items-end">
          //                 <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          //                   {formatRupiah(
          //                     item.invoiceItem?.finalPrice ||
          //                       item.invoiceItem?.price ||
          //                       0
          //                   )}
          //                 </span>
          //                 {item.invoiceItem?.finalPrice &&
          //                   item.invoiceItem?.finalPrice !==
          //                     item.invoiceItem?.price && (
          //                     <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
          //                       {formatRupiah(item.invoiceItem?.price || 0)}
          //                     </span>
          //                   )}
          //               </div>
          //             </td>

          //             {/* Status */}
          //             {/* <td className="px-4 py-3 text-center">
          //               <span
          //                 className={`px-2 py-1 rounded-full text-xs font-medium ${
          //                   item.status === "DELIVERED"
          //                     ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
          //                     : item.status === "PENDING"
          //                     ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
          //                     : item.status === "RETURNED"
          //                     ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
          //                     : item.status === "PARTIALLY_RETURNED"
          //                     ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
          //                     : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
          //                 }`}
          //               >
          //                 {item.status === "DELIVERED"
          //                   ? "Dikirim"
          //                   : item.status === "PENDING"
          //                   ? "Menunggu"
          //                   : item.status === "RETURNED"
          //                   ? "Dikembalikan"
          //                   : item.status === "PARTIALLY_RETURNED"
          //                   ? "Sebagian Return"
          //                   : item.status === "CANCELLED"
          //                   ? "Dibatalkan"
          //                   : item.status}
          //               </span>
          //             </td> */}
          //           </tr>
          //         ))}
          //       </tbody>
          //     </table>
          //   </div>

          //   {/* Ringkasan Item Pengiriman */}
          //   <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          //     <h5 className="font-medium text-sm mb-3 text-blue-800 dark:text-blue-200">
          //       📊 Ringkasan Item Pengiriman:
          //     </h5>
          //     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          //       <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          //         <p className="font-bold text-lg text-blue-600 dark:text-blue-400">
          //           {delivery.deliveryItems?.length || 0}
          //         </p>
          //         <p className="text-xs text-gray-600 dark:text-gray-400">
          //           Jenis Barang
          //         </p>
          //       </div>
          //       <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          //         <p className="font-bold text-lg text-green-600 dark:text-green-400">
          //           {delivery.deliveryItems?.filter(
          //             (item: any) => item.quantityDelivered > 0
          //           ).length || 0}
          //         </p>
          //         <p className="text-xs text-gray-600 dark:text-gray-400">
          //           Barang Dikirim
          //         </p>
          //       </div>
          //       <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          //         <p className="font-bold text-lg text-orange-600 dark:text-orange-400">
          //           {delivery.deliveryItems?.filter(
          //             (item: any) => item.quantityReturned > 0
          //           ).length || 0}
          //         </p>
          //         <p className="text-xs text-gray-600 dark:text-gray-400">
          //           Barang Return
          //         </p>
          //       </div>
          //       <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          //         <p className="font-bold text-lg text-purple-600 dark:text-purple-400">
          //           {delivery.deliveryItems?.reduce(
          //             (sum: number, item: any) => sum + item.quantityDelivered,
          //             0
          //           ) || 0}
          //         </p>
          //         <p className="text-xs text-gray-600 dark:text-gray-400">
          //           Total Qty Dikirim
          //         </p>
          //       </div>
          //     </div>
          //   </div>

          //   {/* Financial Summary */}
          //   <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          //     <h4 className="font-semibold text-lg mb-4 text-blue-800 dark:text-blue-200 flex items-center">
          //       <svg
          //         className="w-5 h-5 mr-2"
          //         fill="currentColor"
          //         viewBox="0 0 20 20"
          //       >
          //         <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
          //       </svg>
          //       Ringkasan Keuangan
          //     </h4>
          //     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          //       <div className="space-y-3">
          //         <div className="flex justify-between items-center py-2 border-b border-blue-200/50 dark:border-blue-700/50">
          //           <span className="text-gray-700 dark:text-gray-300 font-medium">
          //             Subtotal:
          //           </span>
          //           <span className="font-semibold text-gray-900 dark:text-gray-100">
          //             {formatRupiah(delivery.invoice.subtotal)}
          //           </span>
          //         </div>
          //         <div className="flex justify-between items-center py-2">
          //           <span className="text-gray-700 dark:text-gray-300 font-medium">
          //             Diskon:
          //           </span>
          //           <span className="font-semibold text-red-600 dark:text-red-400">
          //             -{formatRupiah(delivery.invoice.discount)}
          //             {delivery.invoice.discountType === "PERCENTAGE" && (
          //               <span className="text-xs ml-1">
          //                 ({delivery.invoice.discount}%)
          //               </span>
          //             )}
          //           </span>
          //         </div>
          //       </div>
          //       <div className="space-y-3">
          //         <div className="flex justify-between items-center py-2">
          //           <span className="text-gray-700 dark:text-gray-300 font-medium">
          //             Biaya Pengiriman:
          //           </span>
          //           <span className="font-semibold text-gray-900 dark:text-gray-100">
          //             {formatRupiah(delivery.invoice.shippingCost || 0)}
          //           </span>
          //         </div>
          //         {creditNotes.length > 0 && (
          //           <div className="flex justify-between items-center py-2 border-t border-blue-200/50 dark:border-blue-700/50 pt-2">
          //             <span className="text-gray-700 dark:text-gray-300 font-medium">
          //               Total Pengembalian:
          //             </span>
          //             <span className="font-semibold text-red-600 dark:text-red-400">
          //               -
          //               {formatRupiah(
          //                 creditNotes.reduce((sum, cn) => sum + cn.total, 0)
          //               )}
          //             </span>
          //           </div>
          //         )}
          //       </div>
          //     </div>

          //     {/* Total Amount Section - Full Width */}
          //     <div className="mt-6">
          //       <div className="flex justify-between items-center py-3 px-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-300 dark:border-blue-600">
          //         <span className="font-bold text-sm sm:text-base md:text-lg text-blue-800 dark:text-blue-200">
          //           Total Amount{" "}
          //           {creditNotes.length > 0 ? "(Setelah Return)" : ""}:
          //         </span>
          //         <div className="text-right">
          //           <span className="font-bold text-base sm:text-lg md:text-xl text-blue-600 dark:text-blue-400">
          //             {formatRupiah(delivery.invoice.totalAmount)}
          //           </span>
          //           {/* {creditNotes.length > 0 && (
          //               <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          //                 Original:{" "}
          //                 {formatRupiah(
          //                   delivery.invoice.totalAmount +
          //                     creditNotes.reduce((sum, cn) => sum + cn.total, 0)
          //                 )}
          //               </div>
          //             )} */}
          //         </div>
          //       </div>
          //     </div>
          //   </div>
          // </div>
          <></>
        ) : (
          // <div className="mt-4">
          //   <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
          //     Detail Item Invoice
          //   </h3>
          //   <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          //     <div className="flex items-center">
          //       <svg
          //         className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2"
          //         fill="currentColor"
          //         viewBox="0 0 20 20"
          //       >
          //         <path
          //           fillRule="evenodd"
          //           d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          //           clipRule="evenodd"
          //         />
          //       </svg>
          //       <span className="text-sm text-yellow-800 dark:text-yellow-200">
          //         Tidak ada item invoice yang ditemukan untuk pengiriman ini.
          //       </span>
          //     </div>
          //   </div>
          // </div>
          <></>
        )}

        {/* Payment Status and Form */}
        <div className="mt-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-lg mb-3 text-blue-800 dark:text-blue-200 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              Status Pembayaran
            </h3>

            {/* Payment Existence Information */}
            <div className="mb-4 p-3 rounded-lg border">
              {delivery.invoice.payments &&
              delivery.invoice.payments.length > 0 ? (
                <div className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-600 dark:text-green-400 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✓ Invoice ini sudah memiliki pembayaran
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        ✗ Invoice ini belum memiliki pembayaran
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-0 md:mb-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400"></p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <strong>Total Invoice:</strong>{" "}
                  {formatRupiah(delivery.invoice.totalAmount)}
                </p>
              </div>
              <div>
                {delivery.invoice.payments &&
                  delivery.invoice.payments.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Total Terbayar:</strong>{" "}
                        {(() => {
                          const payment = delivery.invoice.payments[0]; // Hanya satu pembayaran
                          if (payment.status === "PENDING") {
                            return (
                              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                Menunggu
                              </span>
                            );
                          } else if (payment.status === "CLEARED") {
                            return formatRupiah(payment.amount);
                          } else if (payment.status === "CANCELED") {
                            return (
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                Dibatalkan
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-gray-600 dark:text-gray-400 font-medium">
                                {payment.status}
                              </span>
                            );
                          }
                        })()}
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* Payment History */}
            {delivery.invoice.payments &&
              delivery.invoice.payments.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
                    Riwayat Pembayaran:
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {delivery.invoice.payments.map(
                      (payment: any, index: number) => (
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-800 p-3 rounded border text-sm dark:text-gray-200"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p>
                                <strong>{payment.paymentCode}</strong>
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(
                                  payment.paymentDate
                                ).toLocaleDateString("id-ID")}{" "}
                                • {payment.method}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatRupiah(payment.amount)}
                              </p>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  payment.status === "CLEARED"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                    : payment.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                                }`}
                              >
                                {payment.status === "CLEARED"
                                  ? "Berhasil"
                                  : payment.status === "PENDING"
                                  ? "Menunggu"
                                  : "Dibatalkan"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Add Payment Button - Only show if no payments exist */}
            {(!delivery.invoice.payments ||
              delivery.invoice.payments.length === 0) && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900/20"
                  onClick={() => {
                    setShowPaymentForm(!showPaymentForm);
                    if (!showPaymentForm) {
                      // Initialize payment amount with full invoice amount
                      setPaymentFormData(prev => ({
                        ...prev,
                        amount: delivery.invoice.totalAmount,
                      }));
                    }
                  }}
                >
                  {showPaymentForm
                    ? "Tutup Form Pembayaran"
                    : "Tambah Pembayaran"}
                </Button>
              </div>
            )}

            {/* Payment Pending Info - Show when payment is pending */}
            {delivery.invoice.payments &&
              delivery.invoice.payments.length > 0 &&
              delivery.invoice.payments[0].status === "PENDING" && (
                <div className="mt-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          ⏳ Pembayaran menunggu konfirmasi
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                          Pembayaran sebesar{" "}
                          {formatRupiah(delivery.invoice.payments[0].amount)}{" "}
                          telah disubmit dan menunggu konfirmasi.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Payment Canceled Info - Show when payment is canceled */}
            {delivery.invoice.payments &&
              delivery.invoice.payments.length > 0 &&
              delivery.invoice.payments[0].status === "CANCELED" && (
                <div className="mt-4">
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          ❌ Pembayaran dibatalkan
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                          Pembayaran sebesar{" "}
                          {formatRupiah(delivery.invoice.payments[0].amount)}{" "}
                          telah dibatalkan. Silakan hubungi admin untuk
                          informasi lebih lanjut.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Payment Form */}
            {showPaymentForm && (
              <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-sm mb-4 text-gray-700 dark:text-gray-300">
                  Form Pembayaran Baru:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Jumlah Pembayaran" required>
                    <Input
                      name="amount"
                      type="text"
                      value={formatInputRupiah(paymentFormData.amount)}
                      onChange={e =>
                        handlePaymentInputChange(
                          "amount",
                          parseInputRupiah(e.target.value)
                        )
                      }
                      placeholder="0"
                    />
                  </FormField>

                  <FormField label="Metode Pembayaran" required>
                    <Select
                      options={[
                        { value: "CASH", label: "Tunai" },
                        { value: "TRANSFER_BANK", label: "Transfer Bank" },
                        { value: "CHECK", label: "Cek" },
                      ]}
                      value={paymentFormData.method}
                      onChange={value =>
                        handlePaymentInputChange("method", value)
                      }
                      placeholder="Pilih Metode Pembayaran"
                    />
                  </FormField>
                </div>

                {/* Transfer Bank Fields */}
                {paymentFormData.method === "TRANSFER_BANK" && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h5 className="font-medium text-sm mb-3 text-blue-800 dark:text-blue-200">
                      Informasi Transfer Bank:
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Rekening Penerima" required>
                        <Input
                          name="rekeningPenerima"
                          type="text"
                          value={paymentFormData.rekeningPenerima}
                          onChange={e =>
                            handlePaymentInputChange(
                              "rekeningPenerima",
                              e.target.value
                            )
                          }
                          placeholder="Nomor rekening penerima"
                        />
                      </FormField>
                      <FormField label="Nama Penerima" required>
                        <Input
                          name="namaPenerima"
                          type="text"
                          value={paymentFormData.namaPenerima}
                          onChange={e =>
                            handlePaymentInputChange(
                              "namaPenerima",
                              e.target.value
                            )
                          }
                          placeholder="Nama penerima"
                        />
                      </FormField>
                      <FormField label="Rekening Pengirim" required>
                        <Input
                          name="rekeningPengirim"
                          type="text"
                          value={paymentFormData.rekeningPengirim}
                          onChange={e =>
                            handlePaymentInputChange(
                              "rekeningPengirim",
                              e.target.value
                            )
                          }
                          placeholder="Nomor rekening pengirim"
                        />
                      </FormField>
                      <FormField label="Nama Pengirim" required>
                        <Input
                          name="namaPengirim"
                          type="text"
                          value={paymentFormData.namaPengirim}
                          onChange={e =>
                            handlePaymentInputChange(
                              "namaPengirim",
                              e.target.value
                            )
                          }
                          placeholder="Nama pengirim"
                        />
                      </FormField>
                    </div>
                  </div>
                )}

                {/* Cek Fields */}
                {paymentFormData.method === "CHECK" && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-700">
                    <h5 className="font-medium text-sm mb-3 text-green-800 dark:text-green-200">
                      Informasi Cek:
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Nomor Cek" required>
                        <Input
                          name="nomorCek"
                          type="text"
                          value={paymentFormData.nomorCek}
                          onChange={e =>
                            handlePaymentInputChange("nomorCek", e.target.value)
                          }
                          placeholder="Nomor cek"
                        />
                      </FormField>
                      <FormField label="Nama Bank Penerbit" required>
                        <Input
                          name="namaBankPenerbit"
                          type="text"
                          value={paymentFormData.namaBankPenerbit}
                          onChange={e =>
                            handlePaymentInputChange(
                              "namaBankPenerbit",
                              e.target.value
                            )
                          }
                          placeholder="Nama bank penerbit"
                        />
                      </FormField>
                      <FormField label="Tanggal Cek" required>
                        <Input
                          name="tanggalCek"
                          type="date"
                          value={paymentFormData.tanggalCek}
                          onChange={e =>
                            handlePaymentInputChange(
                              "tanggalCek",
                              e.target.value
                            )
                          }
                        />
                      </FormField>
                      <FormField label="Tanggal Jatuh Tempo" required>
                        <Input
                          name="tanggalJatuhTempo"
                          type="date"
                          value={paymentFormData.tanggalJatuhTempo}
                          onChange={e =>
                            handlePaymentInputChange(
                              "tanggalJatuhTempo",
                              e.target.value
                            )
                          }
                        />
                      </FormField>
                    </div>
                  </div>
                )}

                <FormField label="Catatan Pembayaran">
                  <InputTextArea
                    name="paymentNotes"
                    value={paymentFormData.notes}
                    onChange={e =>
                      handlePaymentInputChange("notes", e.target.value)
                    }
                    placeholder="Catatan pembayaran (opsional)"
                    rows={2}
                  />
                </FormField>

                <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ℹ️ <strong>Informasi:</strong> Pembayaran yang dibuat dari
                    modul pengiriman akan memiliki status "Menunggu Konfirmasi"
                    dan perlu dikonfirmasi oleh admin.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Input
          name="helper"
          type="hidden"
          value={delivery.helper.name}
          readOnly
          className="mt-1 block w-full bg-gray-100 cursor-default dark:bg-gray-800"
        />

        <FormField label="Status">
          <Input
            name="status"
            type="text"
            value={
              delivery.status === "PENDING"
                ? "Menunggu"
                : delivery.status === "IN_TRANSIT"
                ? "Dalam Perjalanan"
                : delivery.status === "DELIVERED"
                ? "Berhasil Dikirim"
                : delivery.status === "RETURNED"
                ? "Dikembalikan"
                : delivery.status === "CANCELLED"
                ? "Dibatalkan"
                : delivery.status
            }
            readOnly
            className="mt-1 block w-full bg-gray-100 cursor-default dark:bg-gray-800"
          />
        </FormField>

        {/* Status Actions - Show if status allows changes */}
        {(delivery.status === "PENDING" ||
          delivery.status === "IN_TRANSIT" ||
          delivery.status === "DELIVERED") && (
          <FormField label="Aksi Status Pengiriman">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3 flex-wrap">
                  {/* {delivery.status === "PENDING" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900/20"
                      onClick={() => handleStatusUpdate("IN_TRANSIT")}
                      disabled={isUpdatingStatus}
                    >
                      🚚 Dalam Perjalanan
                    </Button>
                  )} */}
                  {(delivery.status === "PENDING" ||
                    delivery.status === "IN_TRANSIT") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-900/20"
                      onClick={() => handleStatusUpdate("DELIVERED")}
                      disabled={isUpdatingStatus}
                    >
                      ✓ Berhasil Dikirim
                    </Button>
                  )}
                  {delivery.status === "DELIVERED" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-600 dark:hover:bg-orange-900/20 text-xs sm:text-sm"
                      onClick={() => setIsReturnModalOpen(true)}
                      disabled={isUpdatingStatus}
                    >
                      📦 Pengembalian Barang
                    </Button>
                  )}

                  {/* Only show Cancel button if no credit notes exist */}
                  {creditNotes.length === 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
                      onClick={() => handleStatusUpdate("RETURNED")}
                      disabled={isUpdatingStatus || !returnReason.trim()}
                    >
                      ❌ Dibatalkan
                    </Button>
                  )}
                </div>

                {/* Info text based on current status */}
                <div className="mt-3 text-sm">
                  {delivery.status === "PENDING" && (
                    <p className="text-blue-600 dark:text-blue-400">
                      💡 Pilih "Berhasil Dikirim" jika sudah pengiriman.
                    </p>
                  )}
                  {delivery.status === "IN_TRANSIT" && (
                    <p className="text-blue-600 dark:text-blue-400">
                      💡 Ubah ke "Berhasil Dikirim" jika pengiriman berhasil,
                      atau "Dikembalikan/Dibatalkan" jika ada masalah.
                    </p>
                  )}
                  {delivery.status === "DELIVERED" && (
                    <div>
                      <p className="text-amber-600 dark:text-amber-400 mb-3">
                        ⚠️ masih bisa dibatalkan jika diperlukan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Return/Cancel Reason Field - Only show if no credit notes */}
              {creditNotes.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Alasan Pengembalian/Pembatalan
                    <span className="text-red-500">*</span>
                  </label>
                  <InputTextArea
                    name="returnReason"
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    placeholder="Alamat tidak ditemukan, customer tidak ada di lokasi, barang rusak/cacat."
                    className="w-full"
                    rows={3}
                  />
                  {/* <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <strong>Contoh alasan pengembalian/Pembatalan:</strong>{" "}
                      Alamat tidak ditemukan, customer tidak ada di lokasi,
                      barang rusak/cacat, salah pencet "Berhasil Dikirim",
                      customer komplain setelah terima barang.
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      💡 <strong>Tips:</strong> Untuk status "Berhasil Dikirim",
                      Anda tidak perlu mengisi alasan.
                    </p>
                  </div> */}
                </div>
              )}
            </div>
          </FormField>
        )}

        {/* Pengembalian Detail Section - Show if credit notes exist */}
        {creditNotes.length > 0 && (
          <div className="mt-6">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <h3 className="font-semibold text-lg mb-3 text-orange-800 dark:text-orange-200 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pengembalian
              </h3>

              {/* <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  📝 <strong>Informasi:</strong> Invoice ini memiliki{" "}
                  {creditNotes.length} credit note(s) yang sudah diproses.
                  Pengembalian barang sudah dilakukan melalui sistem
                  pengembalian.
                </p>
              </div> */}

              <div className="space-y-4">
                {creditNotes.map((creditNote, index) => (
                  <div
                    key={creditNote.id}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700"
                  >
                    {/* Pengembalian Header */}
                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex-1 pr-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {creditNote.creditNoteNo}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Tanggal:{" "}
                          {new Date(
                            creditNote.creditNoteDate
                          ).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="small"
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 whitespace-nowrap"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCreditNoteToDelete(creditNote);
                            setIsDeleteCreditNoteModalOpen(true);
                          }}
                          disabled={deletingCreditNoteId === creditNote.id}
                        >
                          {deletingCreditNoteId === creditNote.id
                            ? "Menghapus..."
                            : "Hapus"}
                        </Button>
                      </div>
                    </div>

                    {/* Pengembalian Items */}
                    {creditNote.credit_note_lines &&
                      creditNote.credit_note_lines.length > 0 && (
                        <div className="mb-3">
                          <h5 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
                            Item yang Dikembalikan:
                          </h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                  <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                                    Produk
                                  </th>
                                  <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                                    Jumlah
                                  </th>
                                  <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                                    Harga
                                  </th>
                                  <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                                    Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {creditNote.credit_note_lines.map(
                                  (line: any, lineIndex: number) => (
                                    <tr
                                      key={lineIndex}
                                      className="border-b border-gray-100 dark:border-gray-600"
                                    >
                                      <td className="px-3 py-2">
                                        <div className="flex flex-col">
                                          <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {line.products?.name ||
                                              "Unknown Product"}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <span className="font-medium dark:text-gray-200">
                                          {line.qty}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1">
                                          {line.products?.unit || "pcs"}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-right dark:text-gray-200">
                                        {formatRupiah(line.unitPrice)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium dark:text-gray-200">
                                        {formatRupiah(line.lineTotal)}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {/* Pengembalian Notes */}
                    {creditNote.notes && creditNote.notes.trim() !== "" && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Catatan:</strong> {creditNote.notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Total Pengembalian:
                      </p>
                      <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
                        -{formatRupiah(creditNote.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pengembalian Summary */}
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className="text-sm sm:text-base font-semibold text-red-800 dark:text-red-200">
                    Total Keseluruhan Pengembalian:
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                    -
                    {formatRupiah(
                      creditNotes.reduce((sum, cn) => sum + cn.total, 0)
                    )}
                  </span>
                </div>
                {/* <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Jumlah ini sudah dikurangkan dari total invoice
                </p> */}
              </div>

              {/* Information about credit note deletion */}
              {/* <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Informasi Penghapusan Pengembalian:</strong>
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                  <li>
                    Menghapus credit note akan mengembalikan stock produk yang
                    dikurangi
                  </li>
                  <li>
                    Total invoice akan dikembalikan ke nilai sebelum
                    pengembalian
                  </li>
                  <li>Delivery items akan dikembalikan ke status semula</li>
                  <li>
                    Stock movement akan ditambahkan untuk mengembalikan stok
                  </li>
                  <li>Aksi ini tidak dapat dibatalkan setelah dikonfirmasi</li>
                </ul>
              </div> */}
            </div>
          </div>
        )}

        {/* Display return reason if status is RETURNED or CANCELLED */}
        {(delivery.status === "RETURNED" || delivery.status === "CANCELLED") &&
          delivery.returnReason && (
            <FormField
              label={
                delivery.status === "RETURNED"
                  ? "Alasan Pengembalian"
                  : "Alasan Pembatalan"
              }
            >
              <Input
                name="returnReason"
                type="text"
                value={delivery.returnReason}
                readOnly
                className="mt-1 block w-full bg-gray-100 cursor-default dark:bg-gray-800"
              />
            </FormField>
          )}

        <FormField label="Catatan">
          <InputTextArea
            name="notes"
            value={formData.notes}
            onChange={e => handleInputChange("notes", e.target.value)}
            placeholder="Tambahkan catatan (opsional)"
          />
        </FormField>
      </ManagementForm>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Konfirmasi Hapus Pengiriman"
      >
        <div className="space-y-3">
          <p>
            Apakah Anda yakin ingin menghapus Pengiriman{" "}
            <strong>{delivery.code}</strong>?
          </p>

          {creditNotes && creditNotes.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                ⚠️ <strong>Perhatian:</strong> Pengiriman ini memiliki{" "}
                {creditNotes.length} credit note(s)
              </p>
              <div className="mt-2 text-xs text-orange-700 dark:text-orange-300">
                <p className="font-medium">Credit notes yang akan dihapus:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {creditNotes.map((cn, index) => (
                    <li key={index}>
                      {cn.creditNoteNo} - {formatRupiah(cn.total)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Proses penghapusan akan:</strong>
            </p>
            <ul className="text-xs text-red-700 dark:text-red-300 mt-1 ml-4 list-disc space-y-1">
              {creditNotes && creditNotes.length > 0 && (
                <>
                  <li>
                    Menghapus semua {creditNotes.length} credit note(s) terkait
                  </li>
                  <li>
                    Mengembalikan stok produk yang telah dikurangi dari
                    pengembalian
                  </li>
                  <li>
                    Mengembalikan total invoice ke nilai sebelum ada
                    pengembalian
                  </li>
                  <li>Menghapus semua stock movement terkait credit note</li>
                </>
              )}
              <li>Menghapus data pengiriman dan semua item pengiriman</li>
              <li>Tindakan ini tidak dapat dibatalkan setelah dikonfirmasi</li>
            </ul>
          </div>
        </div>
      </ConfirmationModal>

      {/* Status Change Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() =>
          setConfirmationModal(prev => ({ ...prev, isOpen: false }))
        }
        onConfirm={() => {
          executeStatusUpdate(confirmationModal.status as any);
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        }}
        isLoading={isUpdatingStatus}
        title={confirmationModal.title}
      >
        <div className="space-y-3">
          <p className="whitespace-pre-line">{confirmationModal.message}</p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Perhatian:</strong> Perubahan status ini akan
              mempengaruhi stock inventory dan tercatat dalam stock movement
              history.
            </p>
          </div>
        </div>
      </ConfirmationModal>

      {/* Return Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full h-[95vh] sm:max-h-[90vh] sm:h-auto overflow-hidden flex flex-col">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Pengembalian Barang - {delivery.code}
                </h3>
                <button
                  onClick={() => setIsReturnModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  disabled={isProcessingReturn}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
              {/* Return Information */}
              {/* <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Informasi Pengembalian
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <p>
                      <strong>Invoice:</strong> {delivery.invoice.code}
                    </p>
                    <p>
                      <strong>Customer:</strong>{" "}
                      {delivery.invoice.customer?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Tanggal Pengembalian:</strong>{" "}
                      {new Date().toLocaleDateString("id-ID")}
                    </p>
                    <p>
                      <strong>Status Delivery:</strong> {delivery.status}
                    </p>
                  </div>
                </div>
              </div> */}

              {/* Return Items Table */}
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
                  Pilih Item yang Akan Dikembalikan
                </h4>
                {/* 
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 <strong>Petunjuk:</strong> Masukkan quantity yang ingin
                    dikembalikan untuk setiap produk. Quantity tidak boleh
                    melebihi quantity yang tersedia untuk dikembalikan (quantity
                    dikirim dikurangi quantity yang sudah dikembalikan).
                  </p>
                </div> */}

                {/* Action Buttons */}
                {/* <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allItems =
                        delivery.deliveryItems
                          ?.filter(
                            (item: any) =>
                              item.invoiceItem && item.quantityDelivered > 0
                          )
                          .map((item: any) => {
                            return {
                              invoiceItemId: item.invoiceItem.id,
                              productId: item.invoiceItem.products.id,
                              productName: item.invoiceItem.products.name,
                              unit: item.invoiceItem.products.unit,
                              invoiceQuantity: item.quantityDelivered, // Use delivered quantity
                              returnQuantity:
                                item.quantityDelivered - item.quantityReturned, // Available to return
                              unitPrice:
                                item.invoiceItem.finalPrice ||
                                item.invoiceItem.price, // Use finalPrice if available
                              discount: item.invoiceItem.discount || 0,
                              discountType:
                                item.invoiceItem.discountType || "FIXED",
                            };
                          }) || [];

                      setReturnFormData(prev => ({
                        ...prev,
                        returnItems: allItems,
                      }));
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    disabled={isProcessingReturn}
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReturnFormData(prev => ({ ...prev, returnItems: [] }))
                    }
                    className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    disabled={isProcessingReturn}
                  >
                    Reset
                  </button>
                </div> */}

                {delivery.deliveryItems && delivery.deliveryItems.length > 0 ? (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full min-w-[800px] table-auto bg-white dark:bg-gray-900">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Produk
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-24">
                              Jumlah Dikirim
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-24">
                              Jumlah Sudah Return
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-24">
                              Tersedia Return
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">
                              Jumlah Dikembalikan
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 w-28">
                              Harga Final
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">
                              Total Pengembalian
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {delivery.deliveryItems
                            .filter(
                              (deliveryItem: any) =>
                                deliveryItem.invoiceItem &&
                                deliveryItem.quantityDelivered > 0
                            )
                            .map((deliveryItem: any, index: number) => {
                              const availableToReturn =
                                deliveryItem.quantityDelivered -
                                deliveryItem.quantityReturned;
                              const returnItem =
                                returnFormData.returnItems.find(
                                  ri =>
                                    ri.invoiceItemId ===
                                    deliveryItem.invoiceItem.id
                                );
                              const returnQty = returnItem?.returnQuantity || 0;
                              const finalPrice =
                                deliveryItem.invoiceItem.finalPrice ||
                                deliveryItem.invoiceItem.price;
                              const totalReturn = returnQty * finalPrice;

                              return (
                                <tr
                                  key={index}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {deliveryItem.invoiceItem.products.name}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Kode:{" "}
                                        {deliveryItem.invoiceItem.products
                                          .code || "-"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="text-sm text-green-700 dark:text-green-300">
                                      <span className="font-medium">
                                        {deliveryItem.quantityDelivered}
                                      </span>
                                      <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
                                        {deliveryItem.invoiceItem.products.unit}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                      <span className="font-medium">
                                        {deliveryItem.quantityReturned || 0}
                                      </span>
                                      <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
                                        {deliveryItem.invoiceItem.products.unit}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="text-sm text-blue-600 dark:text-blue-400">
                                      <span className="font-medium">
                                        {availableToReturn}
                                      </span>
                                      <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
                                        {deliveryItem.invoiceItem.products.unit}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={returnQty.toString()}
                                      onChange={e => {
                                        const inputValue = e.target.value;

                                        // Only allow digits
                                        if (!/^\d*$/.test(inputValue)) {
                                          return; // Don't update if non-digits
                                        }

                                        // Handle empty input
                                        if (inputValue === "") {
                                          handleReturnQuantityChange(
                                            deliveryItem.invoiceItem.id,
                                            0,
                                            deliveryItem.invoiceItem
                                          );
                                          return;
                                        }

                                        // Convert to integer and validate
                                        const numValue = parseInt(
                                          inputValue,
                                          10
                                        );
                                        if (isNaN(numValue) || numValue < 0) {
                                          handleReturnQuantityChange(
                                            deliveryItem.invoiceItem.id,
                                            0,
                                            deliveryItem.invoiceItem
                                          );
                                        } else if (
                                          numValue > availableToReturn
                                        ) {
                                          handleReturnQuantityChange(
                                            deliveryItem.invoiceItem.id,
                                            availableToReturn,
                                            deliveryItem.invoiceItem
                                          );
                                        } else {
                                          handleReturnQuantityChange(
                                            deliveryItem.invoiceItem.id,
                                            numValue,
                                            deliveryItem.invoiceItem
                                          );
                                        }
                                      }}
                                      onBlur={e => {
                                        // Clean up the input on blur to ensure it shows clean number
                                        const numValue = parseInt(
                                          e.target.value,
                                          10
                                        );
                                        if (!isNaN(numValue) && numValue >= 0) {
                                          handleReturnQuantityChange(
                                            deliveryItem.invoiceItem.id,
                                            Math.min(
                                              numValue,
                                              availableToReturn
                                            ),
                                            deliveryItem.invoiceItem
                                          );
                                        }
                                      }}
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                      disabled={
                                        isProcessingReturn ||
                                        availableToReturn <= 0
                                      }
                                      placeholder="0"
                                      max={availableToReturn}
                                    />
                                    {availableToReturn <= 0 && (
                                      <p className="text-xs text-red-500 mt-1">
                                        Sudah dikembalikan semua
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {formatRupiah(finalPrice)}
                                      </span>
                                      {finalPrice !==
                                        deliveryItem.invoiceItem.price && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                          {formatRupiah(
                                            deliveryItem.invoiceItem.price
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                      {formatRupiah(totalReturn)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-4">
                      {delivery.deliveryItems
                        .filter(
                          (deliveryItem: any) =>
                            deliveryItem.invoiceItem &&
                            deliveryItem.quantityDelivered > 0
                        )
                        .map((deliveryItem: any, index: number) => {
                          const availableToReturn =
                            deliveryItem.quantityDelivered -
                            deliveryItem.quantityReturned;
                          const returnItem = returnFormData.returnItems.find(
                            ri =>
                              ri.invoiceItemId === deliveryItem.invoiceItem.id
                          );
                          const returnQty = returnItem?.returnQuantity || 0;
                          const finalPrice =
                            deliveryItem.invoiceItem.finalPrice ||
                            deliveryItem.invoiceItem.price;
                          const totalReturn = returnQty * finalPrice;

                          return (
                            <div
                              key={index}
                              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                            >
                              {/* Product Info */}
                              <div className="border-b border-gray-100 dark:border-gray-700 pb-3">
                                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {deliveryItem.invoiceItem.products.name}
                                </h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Kode:{" "}
                                  {deliveryItem.invoiceItem.products.code ||
                                    "-"}
                                </p>
                              </div>

                              {/* Quantities */}
                              <div className="grid grid-cols-2 gap-3 text-center">
                                {/* <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Qty Dikirim
                                  </p>
                                  <div className="text-sm text-green-700 dark:text-green-300">
                                    <span className="font-medium">
                                      {deliveryItem.quantityDelivered}
                                    </span>
                                    <span className="text-xs ml-1">
                                      {deliveryItem.invoiceItem.products.unit}
                                    </span>
                                  </div>
                                </div> */}
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Sudah Return
                                  </p>
                                  <div className="text-sm text-red-600 dark:text-red-400">
                                    <span className="font-medium">
                                      {deliveryItem.quantityReturned || 0}
                                    </span>
                                    <span className="text-xs ml-1">
                                      {deliveryItem.invoiceItem.products.unit}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Tersedia Return
                                  </p>
                                  <div className="text-sm text-blue-600 dark:text-blue-400">
                                    <span className="font-medium">
                                      {availableToReturn}
                                    </span>
                                    <span className="text-xs ml-1">
                                      {deliveryItem.invoiceItem.products.unit}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Return Quantity Input */}
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Jumlah Dikembalikan
                                </label>
                                <div className="flex justify-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={returnQty.toString()}
                                    onChange={e => {
                                      const inputValue = e.target.value;

                                      // Only allow digits
                                      if (!/^\d*$/.test(inputValue)) {
                                        return; // Don't update if non-digits
                                      }

                                      // Handle empty input
                                      if (inputValue === "") {
                                        handleReturnQuantityChange(
                                          deliveryItem.invoiceItem.id,
                                          0,
                                          deliveryItem.invoiceItem
                                        );
                                        return;
                                      }

                                      // Convert to integer and validate
                                      const numValue = parseInt(inputValue, 10);
                                      if (isNaN(numValue) || numValue < 0) {
                                        handleReturnQuantityChange(
                                          deliveryItem.invoiceItem.id,
                                          0,
                                          deliveryItem.invoiceItem
                                        );
                                      } else if (numValue > availableToReturn) {
                                        handleReturnQuantityChange(
                                          deliveryItem.invoiceItem.id,
                                          availableToReturn,
                                          deliveryItem.invoiceItem
                                        );
                                      } else {
                                        handleReturnQuantityChange(
                                          deliveryItem.invoiceItem.id,
                                          numValue,
                                          deliveryItem.invoiceItem
                                        );
                                      }
                                    }}
                                    onBlur={e => {
                                      // Clean up the input on blur to ensure it shows clean number
                                      const numValue = parseInt(
                                        e.target.value,
                                        10
                                      );
                                      if (!isNaN(numValue) && numValue >= 0) {
                                        handleReturnQuantityChange(
                                          deliveryItem.invoiceItem.id,
                                          Math.min(numValue, availableToReturn),
                                          deliveryItem.invoiceItem
                                        );
                                      }
                                    }}
                                    className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={
                                      isProcessingReturn ||
                                      availableToReturn <= 0
                                    }
                                    placeholder="0"
                                    max={availableToReturn}
                                  />
                                </div>
                                {availableToReturn <= 0 && (
                                  <p className="text-xs text-red-500 mt-2 text-center">
                                    Sudah dikembalikan semua
                                  </p>
                                )}
                              </div>

                              {/* Price and Total */}
                              <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Harga Final
                                  </p>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {formatRupiah(finalPrice)}
                                    </span>
                                    {finalPrice !==
                                      deliveryItem.invoiceItem.price && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                        {formatRupiah(
                                          deliveryItem.invoiceItem.price
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Total Pengembalian
                                  </p>
                                  <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                    {formatRupiah(totalReturn)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <svg
                        className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-8 8-4-4"
                        />
                      </svg>
                      <p className="text-sm">
                        Tidak ada item yang tersedia untuk dikembalikan
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Kemungkinan semua item sudah dikembalikan atau belum ada
                        item yang dikirim
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Return Summary */}
              {returnFormData.returnItems.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                    Ringkasan Pengembalian
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm dark:text-gray-300">
                    <div>
                      <p>
                        <strong>Total Item Dikembalikan:</strong>{" "}
                        {returnFormData.returnItems.length} item
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Total Nilai Pengembalian:</strong>{" "}
                        {formatRupiah(
                          returnFormData.returnItems.reduce(
                            (sum, item) =>
                              sum + item.returnQuantity * item.unitPrice,
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Return Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catatan Pengembalian (Opsional)
                </label>
                <textarea
                  value={returnFormData.notes}
                  onChange={e =>
                    setReturnFormData(prev => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                  rows={3}
                  placeholder="Masukkan alasan atau catatan pengembalian..."
                  disabled={isProcessingReturn}
                />
              </div>
            </div>

            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsReturnModalOpen(false)}
                  className="flex-1 px-4 py-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  disabled={isProcessingReturn}
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (returnFormData.returnItems.length === 0) {
                      toast.error("Pilih minimal satu item untuk dikembalikan");
                      return;
                    }
                    setIsReturnConfirmOpen(true);
                  }}
                  className="flex-1 px-4 py-3 sm:py-2 text-xs sm:text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={
                    isProcessingReturn ||
                    returnFormData.returnItems.length === 0
                  }
                >
                  {isProcessingReturn ? "Memproses..." : "Proses Pengembalian"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      <ConfirmationModal
        isOpen={isReturnConfirmOpen}
        onClose={() => setIsReturnConfirmOpen(false)}
        onConfirm={handleProcessReturn}
        isLoading={isProcessingReturn}
        title="Konfirmasi Pengembalian"
      >
        <div className="space-y-3">
          <p>Apakah Anda yakin ingin memproses pengembalian barang ini?</p>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Ringkasan Pengembalian:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {returnFormData.returnItems.map((item, index) => (
                <li key={index}>
                  • {item.productName}: {item.returnQuantity} {item.unit}
                </li>
              ))}
            </ul>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              <strong>Total Nilai:</strong>{" "}
              {formatRupiah(
                returnFormData.returnItems.reduce(
                  (sum, item) => sum + item.returnQuantity * item.unitPrice,
                  0
                )
              )}
            </p>
          </div>

          {/* <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Perhatian:</strong> Setelah diproses:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 ml-4 list-disc">
              <li>Stock produk akan dikembalikan ke inventory</li>
              <li>Tindakan ini tidak dapat dibatalkan</li>
            </ul>
          </div> */}
        </div>
      </ConfirmationModal>

      {/* Delete Pengembalian Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteCreditNoteModalOpen}
        onClose={() => {
          setIsDeleteCreditNoteModalOpen(false);
          setCreditNoteToDelete(null);
        }}
        onConfirm={() => {
          handleDeleteCreditNote();
        }}
        isLoading={deletingCreditNoteId !== null}
        title="Konfirmasi Hapus Pengembalian"
      >
        <div className="space-y-3">
          <p>Apakah Anda yakin ingin menghapus credit note ini?</p>

          {creditNoteToDelete && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                Detail Pengembalian:
              </h4>
              <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                <p>
                  <strong>No:</strong> {creditNoteToDelete.creditNoteNo}
                </p>
                <p>
                  <strong>Tanggal:</strong>{" "}
                  {new Date(
                    creditNoteToDelete.creditNoteDate
                  ).toLocaleDateString("id-ID")}
                </p>
                <p>
                  <strong>Total:</strong>{" "}
                  {formatRupiah(creditNoteToDelete.total)}
                </p>
                {creditNoteToDelete.notes && (
                  <p>
                    <strong>Catatan:</strong> {creditNoteToDelete.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              ⚠️ <strong>Perhatian:</strong> Setelah dihapus:
            </p>
            <ul className="text-xs text-red-700 dark:text-red-300 mt-1 ml-4 list-disc">
              <li>
                Stok produk akan dikurangi kembali (reverse dari pengembalian)
              </li>
              <li>Total invoice akan bertambah kembali ke nilai sebelumnya</li>
              <li>
                Data pengiriman akan dikembalikan ke kondisi sebelum
                pengembalian
              </li>
              <li>Tindakan ini tidak dapat dibatalkan</li>
            </ul>
          </div>
        </div>
      </ConfirmationModal>

      {/* Invoice Detail Modal */}
      {isInvoiceDetailModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-4">
                  Detail Invoice - {delivery.invoice.code}
                </h3>
                <button
                  onClick={() => setIsInvoiceDetailModalOpen(false)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Invoice Header Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Informasi Invoice
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <p>
                      <strong>Kode Invoice:</strong> {delivery.invoice.code}
                    </p>
                    <p>
                      <strong>Tanggal Invoice:</strong>{" "}
                      {new Date(
                        delivery.invoice.invoiceDate
                      ).toLocaleDateString("id-ID")}
                    </p>
                    {/* <p>
                      <strong>Status:</strong> {delivery.invoice.status}
                    </p> */}
                  </div>
                  <div>
                    <p>
                      <strong>Customer:</strong>{" "}
                      {delivery.invoice.customer?.name || "N/A"}
                    </p>
                    <p className="break-words">
                      <strong>Alamat:</strong>{" "}
                      {delivery.invoice.customer?.address || "N/A"}
                    </p>
                    <p>
                      <strong>Telepon:</strong>{" "}
                      {delivery.invoice.customer?.phone || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
                  Detail Item Invoice
                </h4>

                {delivery.invoice.invoiceItems &&
                delivery.invoice.invoiceItems.length > 0 ? (
                  <>
                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-3">
                      {delivery.invoice.invoiceItems.map(
                        (item: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                          >
                            {/* Product Name */}
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                  {item.products.name}
                                </h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Kode: {item.products.code || "-"}
                                </p>
                              </div>
                              <div className="text-right ml-3">
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  {formatRupiah(item.totalPrice)}
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Total
                                </p>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <p className="text-gray-600 dark:text-gray-400">
                                  Quantity
                                </p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {item.quantity} {item.products.unit}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <p className="text-gray-600 dark:text-gray-400">
                                  Harga Satuan
                                </p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatRupiah(item.price)}
                                </p>
                              </div>
                              {item.discount > 0 && (
                                <>
                                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                    <p className="text-red-600 dark:text-red-400">
                                      Diskon
                                    </p>
                                    <p className="font-medium text-red-700 dark:text-red-300">
                                      {item.discountType === "PERCENTAGE"
                                        ? `${item.discount}%`
                                        : formatRupiah(item.discount)}
                                    </p>
                                  </div>
                                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                    <p className="text-green-600 dark:text-green-400">
                                      Harga Final
                                    </p>
                                    <p className="font-medium text-green-700 dark:text-green-300">
                                      {formatRupiah(
                                        item.finalPrice || item.price
                                      )}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full table-auto bg-white dark:bg-gray-900">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Produk
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">
                              Harga Satuan
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {delivery.invoice.invoiceItems.map(
                            (item: any, index: number) => (
                              <tr
                                key={index}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                {/* Product */}
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {item.products.name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Kode: {item.products.code || "-"}
                                    </span>
                                    {/* Show discount info */}
                                    {item.discount > 0 && (
                                      <div className="mt-1 text-xs text-red-500 dark:text-red-400">
                                        Diskon:{" "}
                                        {item.discountType === "PERCENTAGE"
                                          ? `${item.discount}%`
                                          : formatRupiah(item.discount)}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Quantity */}
                                <td className="px-4 py-3 text-center">
                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">
                                      {item.quantity}
                                    </span>
                                    <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
                                      {item.products.unit}
                                    </span>
                                  </div>
                                </td>

                                {/* Price */}
                                <td className="px-4 py-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {formatRupiah(item.price)}
                                    </span>
                                    {item.discount > 0 && (
                                      <span className="text-xs text-green-600 dark:text-green-400">
                                        Final:{" "}
                                        {formatRupiah(
                                          item.finalPrice || item.price
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Total Price */}
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    {formatRupiah(item.totalPrice)}
                                  </span>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Tidak ada item ditemukan
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsInvoiceDetailModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
