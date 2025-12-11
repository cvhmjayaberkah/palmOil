// app/inventory/manajemen-stok/edit/[id]/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  ManagementForm,
  InputDate,
  ManagementHeader,
} from "@/components/ui";
import {
  updateManagementStock,
  getManagementStockById,
  getAvailableProducts,
  getAvailableUsers,
  deleteManagementStock,
} from "@/lib/actions/managementStocks";
import { useRouter, useParams } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/common/ConfirmationModal";
import { ManagementStockStatus } from "@prisma/client";
import { getStockOpnameById } from "@/lib/actions/stockOpnames";

// INTERFACE DIPERBARUI agar sesuai dengan form create
interface ManagementStockItemFormData {
  productId: string;
  quantity: number;
  notes?: string;
  StockOpnameItemsId?: string; // Ditambahkan
}

interface ManagementStockFormData {
  code: string; // Tambahkan kolom code
  managementDate: string;
  status: ManagementStockStatus;
  notes: string;
  producedById: string;
  selectedOpnameId?: string; // Ditambahkan
  items: ManagementStockItemFormData[];
}

interface ManagementStockFormErrors {
  code?: string; // Tambahkan error untuk code
  managementDate?: string;
  status?: string;
  notes?: string;
  producedById?: string;
  selectedOpnameId?: string; // Ditambahkan
  items?: {
    [key: number]: {
      productId?: string;
      quantity?: string;
      notes?: string;
      StockOpnameItemsId?: string;
    };
  };
}

interface Product {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface User {
  id: string;
  name: string;
  role: string;
}

// Interface ReconciledOpname ditambahkan
interface ReconciledOpname {
  id: string;
  opnameDate: Date;
  notes: string | null;
  conductedBy: {
    id: string;
    name: string;
    email: string;
  };
  stockOpnameItems: {
    id: string;
    difference: number;
    notes: string | null;
    product: {
      id: string;
      name: string;
      unit: string;
      currentStock: number;
    };
  }[];
}

export default function EditManagementStockPage() {
  const data = useSharedData();
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  // State untuk reconciledOpnames ditambahkan
  const [reconciledOpnames, setReconciledOpnames] = useState<
    ReconciledOpname[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Original status untuk menentukan apakah field bisa diedit
  const [originalStatus, setOriginalStatus] =
    useState<ManagementStockStatus | null>(null);

  // Initial state formData diperbarui
  const [formData, setFormData] = useState<ManagementStockFormData>({
    code: "", // Tambahkan inisialisasi code
    managementDate: new Date().toISOString().split("T")[0],
    status: ManagementStockStatus.IN,
    notes: "",
    producedById: "",
    selectedOpnameId: "",
    items: [{ productId: "", quantity: 0, notes: "", StockOpnameItemsId: "" }],
  });

  const [formErrors, setFormErrors] = useState<ManagementStockFormErrors>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Ambil data utama (stock) dan data independen (products, users) terlebih dahulu.
        const [stock, products, users] = await Promise.all([
          getManagementStockById(params.id as string),
          getAvailableProducts(),
          getAvailableUsers(),
        ]);

        // Langsung atur state untuk data yang tidak memiliki ketergantungan.
        setAvailableProducts(products);
        setAvailableUsers(users);

        // 2. Lanjutkan hanya jika data 'stock' berhasil diambil.
        if (stock) {
          // 3. Jika ini adalah OPNAME_ADJUSTMENT, ambil data opname secara terpisah.
          if (
            stock.status === ManagementStockStatus.OPNAME_ADJUSTMENT &&
            stock.stockOpnameId
          ) {
            const opnameData = await getStockOpnameById(stock.stockOpnameId);
            // State reconciledOpnames mengharapkan sebuah array, jadi kita bungkus hasilnya.
            setReconciledOpnames(opnameData ? [opnameData] : []);
          }

          // 4. Setelah semua data terkumpul, atur state untuk form.
          setOriginalStatus(stock.status);
          setFormData({
            code: stock.code, // Set nilai code dari data yang diambil
            managementDate: new Date(stock.managementDate)
              .toISOString()
              .split("T")[0],
            status: stock.status,
            notes: stock.notes || "",
            producedById: stock.producedById,
            selectedOpnameId: stock.stockOpnameId || "",
            items: stock.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              notes: item.notes || "",
              // Pastikan properti ini sesuai dengan skema Anda (stockOpnamesId atau stockOpnameItemId)
              StockOpnameItemsId: item.stockOpnamesId || "",
            })),
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  // VALIDASI FORM DI-COPY DARI CREATE UNTUK KONSISTENSI
  const validateForm = (): boolean => {
    const errors: ManagementStockFormErrors = {};
    if (!formData.code) {
      // Tambahkan validasi untuk code
      errors.code = "Kode manajemen wajib diisi";
    }
    if (!formData.managementDate) {
      errors.managementDate = "Tanggal manajemen wajib diisi";
    }
    if (!formData.status) {
      errors.status = "Status manajemen wajib dipilih";
    }
    if (!formData.producedById) {
      errors.producedById = "User yang melakukan manajemen wajib dipilih";
    }
    if (
      formData.status === ManagementStockStatus.OPNAME_ADJUSTMENT &&
      !formData.selectedOpnameId
    ) {
      errors.selectedOpnameId =
        "Stok opname wajib dipilih untuk tipe OPNAME_ADJUSTMENT";
    }

    if (formData.status !== ManagementStockStatus.OPNAME_ADJUSTMENT) {
      if (formData.items.length === 0) {
        errors.items = { 0: { productId: "Minimal harus ada satu item" } };
      } else {
        const itemErrors: {
          [key: number]: {
            productId?: string;
            quantity?: string;
            notes?: string;
          };
        } = {};
        formData.items.forEach((item, index) => {
          const itemError: {
            productId?: string;
            quantity?: string;
            notes?: string;
          } = {};
          if (!item.productId) {
            itemError.productId = "Produk wajib dipilih";
          }
          if (!item.quantity || item.quantity <= 0) {
            itemError.quantity = "Quantity harus lebih dari 0";
          }
          if (formData.status === ManagementStockStatus.OUT && item.productId) {
            const product = availableProducts.find(
              p => p.id === item.productId
            );
            if (product && item.quantity > product.currentStock) {
              itemError.quantity = `Stok tidak mencukupi (tersedia: ${product.currentStock})`;
            }
          }
          if (Object.keys(itemError).length > 0) {
            itemErrors[index] = itemError;
          }
        });
        if (Object.keys(itemErrors).length > 0) {
          errors.items = itemErrors;
        }
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    field: keyof ManagementStockFormData,
    value: any
  ) => {
    setFormData({ ...formData, [field]: value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof ManagementStockItemFormData,
    value: any
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
    if (formErrors.items?.[index]?.[field]) {
      const newErrors = { ...formErrors };
      if (newErrors.items) {
        delete newErrors.items[index][field];
        if (Object.keys(newErrors.items[index]).length === 0) {
          delete newErrors.items[index];
        }
      }
      setFormErrors(newErrors);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: "", quantity: 0, notes: "" }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.warning("Harap periksa kembali data yang Anda masukkan.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Payload diperbarui sesuai dengan schema
      const result = await updateManagementStock(params.id as string, {
        code: formData.code, // Tambahkan code ke payload
        managementDate: new Date(formData.managementDate),
        status: formData.status,
        notes: formData.notes || undefined,
        producedById: formData.producedById,
        selectedOpnameId: formData.selectedOpnameId || undefined,
        items: formData.items,
      });

      if (result.success) {
        toast.success("Manajemen stok berhasil diperbarui!");
        router.push(`/${data.module}/${data.subModule}`);
      } else {
        toast.error(result.error || "Gagal memperbarui manajemen stok");
      }
    } catch (error) {
      console.error("Error updating management stock:", error);
      toast.error("Terjadi kesalahan saat memperbarui manajemen stok");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteManagementStock(params.id as string);
      if (result.success) {
        toast.success("Manajemen stok berhasil dihapus!");
        router.push(`/${data.module}/${data.subModule}`);
      } else {
        toast.error(result.error || "Gagal menghapus manajemen stok");
      }
    } catch (error) {
      console.error("Error deleting management stock:", error);
      toast.error("Terjadi kesalahan saat menghapus manajemen stok");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getSelectedProduct = (productId: string): Product | undefined => {
    return availableProducts.find(p => p.id === productId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  // RENDER JSX DI-COPY DARI CREATE DAN DISESUAIKAN UNTUK EDIT
  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Edit Manajemen Stok"
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />
      <ManagementForm
        subModuleName={data.subModule}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
        handleDelete={() => setShowDeleteModal(true)}
        hideDeleteButton={
          originalStatus === ManagementStockStatus.OPNAME_ADJUSTMENT
        } // Tombol delete disembunyikan jika tipe opname
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tambahkan FormField untuk Kode Manajemen */}
          <FormField label="Kode Manajemen" errorMessage={formErrors.code}>
            <Input
              type="text"
              name="code"
              value={formData.code}
              onChange={e => handleInputChange("code", e.target.value)}
              errorMessage={formErrors.code}
              placeholder="Kode manajemen"
              disabled // Kode harusnya tidak bisa diubah di halaman edit
            />
          </FormField>

          <FormField
            label="Tanggal Manajemen"
            errorMessage={formErrors.managementDate}
          >
            <InputDate
              value={
                formData.managementDate
                  ? new Date(formData.managementDate)
                  : null
              }
              onChange={date => {
                const dateString = date ? date.toISOString().split("T")[0] : "";
                handleInputChange("managementDate", dateString);
              }}
              errorMessage={formErrors.managementDate}
              placeholder="Pilih tanggal manajemen"
            />
          </FormField>
          <FormField label="Tipe Manajemen" errorMessage={formErrors.status}>
            <select
              value={formData.status}
              // Tipe manajemen dinonaktifkan saat edit untuk menjaga integritas data
              disabled
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white bg-gray-100 cursor-not-allowed ${
                formErrors.status
                  ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <option value="">Pilih Tipe</option>
              <option value={ManagementStockStatus.IN}>
                Adjustment In (Menambah Stok)
              </option>
              <option value={ManagementStockStatus.OUT}>
                Adjustment Out (Mengurangi Stok)
              </option>
            </select>
          </FormField>

          {/* Dropdown untuk Stock Opname (hanya tampil, tidak bisa diubah) */}
          {formData.status === ManagementStockStatus.OPNAME_ADJUSTMENT && (
            <FormField
              label="Pilih Stok Opname"
              errorMessage={formErrors.selectedOpnameId}
            >
              <select
                value={formData.selectedOpnameId || ""}
                disabled // Selalu nonaktif saat edit
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white bg-gray-100 cursor-not-allowed ${
                  formErrors.selectedOpnameId
                    ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <option value="">Pilih Stok Opname</option>
                {reconciledOpnames.map(opname => (
                  <option key={opname.id} value={opname.id}>
                    {new Date(opname.opnameDate).toLocaleDateString("id-ID")} -
                    Oleh: {opname.conductedBy.name} -{" "}
                    {opname.stockOpnameItems.length} item dengan selisih
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField
            label="User yang Melakukan"
            errorMessage={formErrors.producedById}
          >
            <select
              value={formData.producedById}
              onChange={e => handleInputChange("producedById", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white  ${
                formErrors.producedById
                  ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <option value="">Pilih User</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Catatan dipindah ke luar grid utama agar full-width */}
        <FormField label="Catatan" errorMessage={formErrors.notes}>
          <InputTextArea
            name="notes"
            height="45px"
            placeholder="Catatan manajemen stok (opsional)"
            value={formData.notes}
            onChange={e => handleInputChange("notes", e.target.value)}
            errorMessage={formErrors.notes}
            rows={3}
          />
        </FormField>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="block text-xl font-bold text-gray-700 dark:text-gray-300">
              {formData.status === ManagementStockStatus.OPNAME_ADJUSTMENT
                ? "Daftar Penyesuaian Stok (Read-Only)"
                : "Daftar Produk"}
            </p>
            {/* Tombol tambah item disembunyikan jika opname */}
            {formData.status !== ManagementStockStatus.OPNAME_ADJUSTMENT && (
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <Plus size={16} />
                Tambah Item
              </button>
            )}
          </div>

          {formData.items.map((item, index) => {
            const selectedProduct = getSelectedProduct(item.productId);
            const isOpnameAdjustment =
              formData.status === ManagementStockStatus.OPNAME_ADJUSTMENT;
            return (
              <div
                key={index}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-md space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Item #{index + 1}
                  </h4>
                  {formData.items.length > 1 && !isOpnameAdjustment && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                      Hapus
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    label="Produk"
                    errorMessage={formErrors.items?.[index]?.productId}
                  >
                    <select
                      value={item.productId}
                      onChange={e =>
                        handleItemChange(index, "productId", e.target.value)
                      }
                      disabled={isOpnameAdjustment} // Selalu nonaktif saat edit opname
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                        isOpnameAdjustment
                          ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                          : ""
                      } ${
                        formErrors.items?.[index]?.productId
                          ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      <option value="">Pilih Produk</option>
                      {availableProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    label={isOpnameAdjustment ? "Selisih" : "Quantity"}
                    errorMessage={formErrors.items?.[index]?.quantity}
                  >
                    <Input
                      type="number"
                      name={`quantity-${index}`}
                      min="0"
                      step="0.01"
                      value={item.quantity.toString()}
                      onChange={e =>
                        handleItemChange(
                          index,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={isOpnameAdjustment} // Selalu nonaktif saat edit opname
                      errorMessage={formErrors.items?.[index]?.quantity}
                      placeholder="0"
                    />
                    {selectedProduct && !isOpnameAdjustment && (
                      <span className="text-xs text-gray-500 mt-1">
                        Stok saat ini: {selectedProduct.currentStock}{" "}
                        {selectedProduct.unit}
                      </span>
                    )}
                  </FormField>

                  {isOpnameAdjustment ? (
                    <FormField
                      label="Total Barang"
                      errorMessage={formErrors.items?.[index]?.quantity}
                    >
                      <Input
                        name="Selisih"
                        type="number"
                        value={
                          selectedProduct
                            ? (
                                selectedProduct.currentStock + item.quantity
                              ).toString()
                            : ""
                        }
                        disabled
                        placeholder="0"
                      />
                      {selectedProduct && (
                        <span className="text-xs text-gray-500 mt-1">
                          Perhitungan: {selectedProduct.currentStock} {"+ ("}{" "}
                          {item.quantity} {") = "}{" "}
                          {selectedProduct.currentStock + item.quantity}
                        </span>
                      )}
                    </FormField>
                  ) : (
                    <FormField
                      label="Catatan Item"
                      errorMessage={formErrors.items?.[index]?.notes}
                    >
                      <Input
                        type="text"
                        name={`notes-${index}`}
                        value={item.notes || ""}
                        onChange={e =>
                          handleItemChange(index, "notes", e.target.value)
                        }
                        errorMessage={formErrors.items?.[index]?.notes}
                        placeholder="Catatan untuk item ini (opsional)"
                      />
                    </FormField>
                  )}
                </div>

                {isOpnameAdjustment && (
                  <FormField
                    label="Catatan Item"
                    errorMessage={formErrors.items?.[index]?.notes}
                  >
                    <Input
                      type="hidden"
                      name={`stockOpnameItems-${index}`}
                      value={item.StockOpnameItemsId || ""}
                    />
                    <Input
                      type="text"
                      name={`notes-${index}`}
                      value={item.notes || ""}
                      onChange={e =>
                        handleItemChange(index, "notes", e.target.value)
                      }
                      disabled
                      errorMessage={formErrors.items?.[index]?.notes}
                      placeholder="Catatan untuk item ini (opsional)"
                    />
                  </FormField>
                )}
              </div>
            );
          })}
        </div>
      </ManagementForm>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Hapus Manajemen Stok"
        isLoading={isDeleting}
      >
        <p>
          Apakah Anda yakin ingin menghapus data manajemen stok ini? Tindakan
          ini akan membalikkan perubahan stok dan tidak dapat dibatalkan.
        </p>
      </ConfirmationModal>
    </div>
  );
}
