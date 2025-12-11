// app/inventory/manajemen-stok/create/page.tsx
"use client";
import { ManagementHeader } from "@/components/ui";
import React, { useState, useEffect } from "react";
import {
  Input,
  FormField,
  InputTextArea,
  ManagementForm,
  InputDate,
} from "@/components/ui";
import {
  createManagementStock,
  getAvailableProducts,
  getAvailableUsers,
} from "@/lib/actions/managementStocks";
import {
  getReconciledStockOpnames,
  updateStockOpname,
} from "@/lib/actions/stockOpnames";
import { useRouter } from "next/navigation";
import { useSharedData } from "@/contexts/StaticData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { ManagementStockStatus } from "@prisma/client";
import { generateCodeByTable } from "@/utils/getCode"; // Import fungsi generateCodeByTable

interface ManagementStockItemFormData {
  productId: string;
  quantity: number;
  notes?: string;
  stockOpnameItemId?: string;
}

interface ManagementStockFormData {
  code: string; // Tambahkan kolom code
  managementDate: string;
  status: ManagementStockStatus;
  notes: string;
  producedById: string;
  selectedOpnameId?: string; // For OPNAME_ADJUSTMENT
  items: ManagementStockItemFormData[];
}

interface ManagementStockFormErrors {
  code?: string; // Tambahkan error untuk code
  managementDate?: string;
  status?: string;
  notes?: string;
  producedById?: string;
  selectedOpnameId?: string; // For OPNAME_ADJUSTMENT
  items?: {
    [key: number]: {
      productId?: string;
      quantity?: string;
      notes?: string;
      stockOpnameItemId?: string;
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

interface ReconciledOpname {
  id: string;
  code: string;
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

export default function CreateManagementStockPage() {
  const data = useSharedData();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [reconciledOpnames, setReconciledOpnames] = useState<
    ReconciledOpname[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<ManagementStockFormData>({
    code: "", // Inisialisasi kosong, akan diisi di useEffect
    managementDate: new Date().toISOString().split("T")[0],
    status: ManagementStockStatus.IN,
    notes: "",
    producedById: user?.id || "", // Auto-set from current user
    items: [{ productId: "", quantity: 0, notes: "", stockOpnameItemId: "" }],
  });

  const [formErrors, setFormErrors] = useState<ManagementStockFormErrors>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [products, users, opnames] = await Promise.all([
          getAvailableProducts(),
          getAvailableUsers(),
          getReconciledStockOpnames(),
        ]);
        setAvailableProducts(products);
        setAvailableUsers(users);
        setReconciledOpnames(opnames);

        // Generate code saat data awal dimuat
        const generatedCode = await generateCodeByTable("ManagementStocks"); // Gunakan nama tabel yang relevan untuk manajemen stok
        setFormData(prev => ({
          ...prev,
          code: generatedCode,
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update producedById when user is loaded
  useEffect(() => {
    if (user?.id && !formData.producedById) {
      setFormData(prev => ({
        ...prev,
        producedById: user.id,
      }));
    }
  }, [user, formData.producedById]);

  // Auto-populate items when opname is selected for OPNAME_ADJUSTMENT

  useEffect(() => {
    if (
      formData.status === ManagementStockStatus.OPNAME_ADJUSTMENT &&
      formData.selectedOpnameId
    ) {
      const selectedOpname = reconciledOpnames.find(
        opname => opname.id === formData.selectedOpnameId
      );

      if (selectedOpname) {
        const opnameItems = selectedOpname.stockOpnameItems.map(item => ({
          productId: item.product.id,
          quantity: item.difference, // Use the difference as the adjustment quantity
          notes: item.notes || "",
          stockOpnameItemId: item.id || "",
        }));

        setFormData(prev => ({
          ...prev,
          items: opnameItems,
        }));
      }
    }
  }, [formData.status, formData.selectedOpnameId, reconciledOpnames]);

  const validateForm = (): boolean => {
    const errors: ManagementStockFormErrors = {};

    if (!formData.code) {
      errors.code = "Kode wajib diisi";
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
    } // Skip item validation for OPNAME_ADJUSTMENT since items are auto-populated

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
          } // Check stock for OUT adjustments

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
    } // Perbaikan: Pindahkan baris ini ke luar blok if di atas
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
      const result = await createManagementStock({
        code: formData.code, // Tambahkan code ke payload
        managementDate: new Date(formData.managementDate),
        status: formData.status,
        notes: formData.notes || undefined,
        producedById: formData.producedById,
        selectedOpnameId: formData.selectedOpnameId || undefined,
        items: formData.items,
      });

      if (formData.selectedOpnameId) {
        const updateOpname = await updateStockOpname(
          formData.selectedOpnameId!,
          {
            status: "COMPLETED",
          }
        );

        if (updateOpname.success) {
          // toast.success("Manajemen stok berhasil dibuat!");
          // router.push(`/${data.module}/${data.subModule}`);
        } else {
          toast.error(result.error || "Gagal membuat manajemen stok");
        }
      }

      if (result.success) {
        toast.success("Manajemen stok berhasil dibuat!");
        router.push(`/${data.module}/${data.subModule}`);
      } else {
        toast.error(result.error || "Gagal membuat manajemen stok");
      }
    } catch (error) {
      console.error("Error creating management stock:", error);
      toast.error("Terjadi kesalahan saat membuat manajemen stok");
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Tambah Manajemen Stok"
        mainPageName={`/${data.module}/${data.subModule}`}
        allowedRoles={data.allowedRole}
      />

      <ManagementForm
        subModuleName={data.subModule}
        moduleName={data.module}
        isSubmitting={isSubmitting}
        handleFormSubmit={handleFormSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Code */}
          <FormField label="Kode" htmlFor="code" errorMessage={formErrors.code}>
            <Input
              type="text"
              name="code"
              value={formData.code}
              readOnly
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
            />
          </FormField>

          <FormField
            label="Tanggal Manajemen"
            required
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

          <FormField
            required
            label="Tipe Manajemen"
            errorMessage={formErrors.status}
          >
            <select
              value={formData.status}
              onChange={e =>
                handleInputChange(
                  "status",
                  e.target.value as ManagementStockStatus
                )
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
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

          <Input
            type="hidden"
            name="producedByName"
            value={user?.name || "Loading user..."}
            readOnly
            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
          />
          <input type="hidden" value={formData.producedById} />
        </div>
        {/* Dropdown untuk memilih Stock Opname yang sudah RECONCILED */}
        {formData.status === ManagementStockStatus.OPNAME_ADJUSTMENT && (
          <FormField
            required
            label="Pilih Stok Opname"
            errorMessage={formErrors.selectedOpnameId}
          >
            <select
              value={formData.selectedOpnameId || ""}
              onChange={e =>
                handleInputChange("selectedOpnameId", e.target.value)
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                formErrors.selectedOpnameId
                  ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <option value="">Pilih Stok Opname</option>
              {reconciledOpnames.map(opname => (
                <option key={opname.id} value={opname.id}>
                  {opname.code} - Oleh: {opname.conductedBy.name}
                </option>
              ))}
            </select>
          </FormField>
        )}
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
                ? "Daftar Penyesuaian Stok (Dibuat Otomatis)"
                : "Daftar Produk"}
            </p>
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
            return (
              <div
                key={index}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-md space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Item #{index + 1}
                  </h4>
                  {formData.items.length > 1 &&
                    formData.status !==
                      ManagementStockStatus.OPNAME_ADJUSTMENT && (
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    required
                    label="Produk"
                    errorMessage={formErrors.items?.[index]?.productId}
                  >
                    <select
                      value={item.productId}
                      onChange={e =>
                        handleItemChange(index, "productId", e.target.value)
                      }
                      disabled={
                        formData.status ===
                        ManagementStockStatus.OPNAME_ADJUSTMENT
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                        formData.status ===
                        ManagementStockStatus.OPNAME_ADJUSTMENT
                          ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                          : ""
                      } ${
                        formErrors.items?.[index]?.productId
                          ? "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      <option value="">Pilih Produk</option>
                      {availableProducts
                        .filter(
                          product =>
                            // Filter out already selected products except current selection
                            !formData.items.some(
                              (formItem, formIndex) =>
                                formIndex !== index &&
                                formItem.productId === product.id
                            )
                        )
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                    </select>
                  </FormField>

                  <FormField
                    label="Krat di Gudang"
                    errorMessage={formErrors.items?.[index]?.productId}
                  >
                    <Input
                      type="text"
                      name={`currentStock-${index}`}
                      value={
                        item.productId
                          ? `${
                              availableProducts.find(
                                p => p.id === item.productId
                              )?.currentStock || 0
                            } ${
                              availableProducts.find(
                                p => p.id === item.productId
                              )?.unit || ""
                            }`
                          : "-"
                      }
                      readOnly
                      className="bg-gray-100 dark:bg-gray-700 cursor-default"
                    />
                  </FormField>

                  <FormField
                    required
                    label={`${
                      formData.status ===
                      ManagementStockStatus.OPNAME_ADJUSTMENT
                        ? "Selisih"
                        : "Jumlah (Krat)"
                    }`}
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
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={
                        formData.status ===
                        ManagementStockStatus.OPNAME_ADJUSTMENT
                      }
                      errorMessage={formErrors.items?.[index]?.quantity}
                      placeholder="0"
                    />
                    {/* {selectedProduct && (
                      <span className="text-xs text-gray-500 mt-1">
                        Stok saat ini: {selectedProduct.currentStock}{" "}
                        {selectedProduct.unit}
                      </span>
                    )} */}
                  </FormField>

                  {formData.status ===
                  ManagementStockStatus.OPNAME_ADJUSTMENT ? (
                    <FormField
                      label="Total Barang"
                      errorMessage={formErrors.items?.[index]?.quantity}
                    >
                      <Input
                        type="number"
                        name={`quantity-${index}`}
                        min="0"
                        step="0.01"
                        value={
                          selectedProduct
                            ? (
                                selectedProduct.currentStock + item.quantity
                              ).toString()
                            : ""
                        }
                        onChange={e =>
                          handleItemChange(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={
                          formData.status ===
                          ManagementStockStatus.OPNAME_ADJUSTMENT
                        }
                        errorMessage={formErrors.items?.[index]?.quantity}
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

                  {/* {formData.status !==
                    ManagementStockStatus.OPNAME_ADJUSTMENT && (
                    <FormField
                      label="Catatan Item"
                      errorMessage={formErrors.items?.[index]?.notes}
                    >
                      <Input
                        type="text"
                        name={`notesExtra-${index}`}
                        value={item.notes || ""}
                        onChange={e =>
                          handleItemChange(index, "notes", e.target.value)
                        }
                        errorMessage={formErrors.items?.[index]?.notes}
                        placeholder="Catatan untuk item ini (opsional)"
                      />
                    </FormField>
                  )} */}
                </div>
                {formData.status === ManagementStockStatus.OPNAME_ADJUSTMENT ? (
                  <FormField
                    label="Catatan Item"
                    errorMessage={formErrors.items?.[index]?.notes}
                  >
                    <Input
                      type="hidden"
                      name={`stockOpnameItems-${index}`}
                      value={item.stockOpnameItemId || ""}
                      onChange={e =>
                        handleItemChange(
                          index,
                          "stockOpnameItemId",
                          e.target.value
                        )
                      }
                    />
                    <Input
                      type="text"
                      name={`notes-${index}`}
                      value={item.notes || ""}
                      onChange={e =>
                        handleItemChange(index, "notes", e.target.value)
                      }
                      disabled={
                        formData.status ===
                        ManagementStockStatus.OPNAME_ADJUSTMENT
                      }
                      errorMessage={formErrors.items?.[index]?.notes}
                      placeholder="Catatan untuk item ini (opsional)"
                    />
                  </FormField>
                ) : (
                  ""
                )}
              </div>
            );
          })}
        </div>
      </ManagementForm>
    </div>
  );
}
