"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ManagementHeader } from "@/components/ui";
import { Button, Input, Card } from "@/components/ui/common";
import { Label } from "@/components/ui/forms";
import { toast } from "sonner";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import {
  getTransactionById,
  updateTransaction,
  type CreateTransactionData,
} from "@/lib/actions/transactions";

const EXPENSE_CATEGORIES = [
  "Operasional",
  "Marketing",
  "Gaji & Tunjangan",
  "Transport",
  "Utilitas",
  "Pemeliharaan",
  "Bahan Baku",
  "Administrasi",
  "Pajak",
  "Lain-lain",
];

interface ExpenseTransaction {
  id: string;
  transactionDate: Date;
  amount: number;
  description: string;
  category: string;
  reference?: string | null;
  user?: {
    id: string;
    name: string;
  } | null;
  transactionItems: {
    id: string;
    description: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }[];
}

interface ExpenseFormData {
  transactionDate: string;
  amount: string;
  description: string;
  category: string;
  reference: string;
  transactionItems: {
    description: string;
    quantity: string;
    price: string;
    totalPrice: number;
  }[];
}

const EditExpensePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [expense, setExpense] = useState<ExpenseTransaction | null>(null);

  const [formData, setFormData] = useState<ExpenseFormData>({
    transactionDate: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
    category: "",
    reference: "",
    transactionItems: [
      {
        description: "",
        quantity: "1",
        price: "",
        totalPrice: 0,
      },
    ],
  });

  // Load expense data
  useEffect(() => {
    const loadExpense = async () => {
      try {
        setIsLoadingData(true);
        const result = await getTransactionById(expenseId);
        
        if (result.success && result.data) {
          const expenseData = result.data as ExpenseTransaction;
          setExpense(expenseData);
          
          // Populate form with existing data
          setFormData({
            transactionDate: expenseData.transactionDate.toISOString().split("T")[0],
            amount: expenseData.amount.toString(),
            description: expenseData.description,
            category: expenseData.category,
            reference: expenseData.reference || "",
            transactionItems: expenseData.transactionItems.length > 0
              ? expenseData.transactionItems.map((item) => ({
                  description: item.description,
                  quantity: item.quantity.toString(),
                  price: item.price.toString(),
                  totalPrice: item.totalPrice,
                }))
              : [
                  {
                    description: "",
                    quantity: "1",
                    price: "",
                    totalPrice: 0,
                  },
                ],
          });
        } else {
          toast.error("Data pengeluaran tidak ditemukan");
          router.push("/management/finance/expenses");
        }
      } catch (error) {
        console.error("Error loading expense:", error);
        toast.error("Terjadi kesalahan saat memuat data");
        router.push("/management/finance/expenses");
      } finally {
        setIsLoadingData(false);
      }
    };

    if (expenseId) {
      loadExpense();
    }
  }, [expenseId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.description || !formData.category) {
      toast.error("Harap lengkapi semua field yang wajib diisi");
      return;
    }

    try {
      setIsLoading(true);
      
      const transactionData: CreateTransactionData = {
        transactionDate: new Date(formData.transactionDate),
        type: "EXPENSE",
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        reference: formData.reference || undefined,
        transactionItems: formData.transactionItems
          .filter((item) => item.description && item.price)
          .map((item) => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            price: parseFloat(item.price),
            totalPrice: parseFloat(item.price) * (parseFloat(item.quantity) || 1),
          })),
      };

      const result = await updateTransaction({
        id: expenseId,
        ...transactionData,
      });

      if (result.success) {
        toast.success("Pengeluaran berhasil diupdate");
        router.push("/management/finance/expenses");
      } else {
        toast.error(result.error || "Gagal mengupdate pengeluaran");
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsLoading(false);
    }
  };

  const addTransactionItem = () => {
    setFormData({
      ...formData,
      transactionItems: [
        ...formData.transactionItems,
        {
          description: "",
          quantity: "1",
          price: "",
          totalPrice: 0,
        },
      ],
    });
  };

  const removeTransactionItem = (index: number) => {
    if (formData.transactionItems.length > 1) {
      const newItems = formData.transactionItems.filter((_, i) => i !== index);
      setFormData({ ...formData, transactionItems: newItems });
      
      // Recalculate total amount
      const totalAmount = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
      setFormData(prev => ({ ...prev, amount: totalAmount.toString(), transactionItems: newItems }));
    }
  };

  const updateTransactionItem = (
    index: number,
    field: keyof (typeof formData.transactionItems)[0],
    value: string
  ) => {
    const newItems = [...formData.transactionItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Calculate total price for the item
    if (field === "quantity" || field === "price") {
      const quantity = parseFloat(field === "quantity" ? value : newItems[index].quantity) || 0;
      const price = parseFloat(field === "price" ? value : newItems[index].price) || 0;
      newItems[index].totalPrice = quantity * price;
    }

    setFormData({ ...formData, transactionItems: newItems });

    // Update total amount
    const totalAmount = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
    setFormData(prev => ({ ...prev, amount: totalAmount.toString(), transactionItems: newItems }));
  };

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <ManagementHeader
          allowedRoles={["OWNER", "ADMIN"]}
          mainPageName="finance/expenses"
          headerTittle="Edit Pengeluaran"
        />
        <Card className="p-6">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Memuat data...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ManagementHeader
        allowedRoles={["OWNER", "ADMIN"]}
        mainPageName="finance/expenses"
        headerTittle="Edit Pengeluaran"
      />

      <Card className="p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <h1 className="text-2xl font-bold">Edit Pengeluaran</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="transactionDate">Tanggal Transaksi *</Label>
              <Input
                id="transactionDate"
                name="transactionDate"
                type="date"
                value={formData.transactionDate}
                onChange={(e) =>
                  setFormData({ ...formData, transactionDate: e.target.value })
                }
                required
              />
            </div>
            
            <div>
              <Label htmlFor="category">Kategori *</Label>
              <select 
                id="category"
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Pilih kategori</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Deskripsi *</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Deskripsi pengeluaran..."
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="amount">Total Jumlah *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0"
                required
                step="0.01"
                min="0"
              />
              <p className="text-sm text-gray-500 mt-1">
                Total akan otomatis dihitung jika ada detail item
              </p>
            </div>
            
            <div>
              <Label htmlFor="reference">Referensi/No. Nota</Label>
              <Input
                id="reference"
                name="reference"
                type="text"
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
                placeholder="No. nota, invoice, dll"
              />
            </div>
          </div>

          {/* Transaction Items Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium">Detail Item (Opsional)</h3>
                <p className="text-sm text-gray-500">
                  Tambahkan detail item untuk pencatatan yang lebih detail
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addTransactionItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.transactionItems.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {formData.transactionItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={() => removeTransactionItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor={`item-description-${index}`}>Deskripsi Item</Label>
                      <Input
                        id={`item-description-${index}`}
                        name={`item-description-${index}`}
                        type="text"
                        placeholder="Deskripsi item"
                        value={item.description}
                        onChange={(e) =>
                          updateTransactionItem(index, "description", e.target.value)
                        }
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`item-quantity-${index}`}>Kuantitas</Label>
                      <Input
                        id={`item-quantity-${index}`}
                        name={`item-quantity-${index}`}
                        type="number"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateTransactionItem(index, "quantity", e.target.value)
                        }
                        step="0.01"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`item-price-${index}`}>Harga Satuan</Label>
                      <Input
                        id={`item-price-${index}`}
                        name={`item-price-${index}`}
                        type="number"
                        placeholder="0"
                        value={item.price}
                        onChange={(e) =>
                          updateTransactionItem(index, "price", e.target.value)
                        }
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 text-right">
                    <span className="text-sm text-gray-600">
                      Total Item: <span className="font-medium">Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Menyimpan..." : "Update Pengeluaran"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditExpensePage;
