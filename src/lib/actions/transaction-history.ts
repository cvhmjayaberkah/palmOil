"use server";

import db from "@/lib/db";
import { Prisma } from "@prisma/client";

// Type untuk data transaksi lengkap
export type TransactionHistoryItem = {
  id: string;
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  customerCode: string;
  customerPhone: string | null;
  customerAddress: string;
  salesName: string;
  orderStatus: string;
  totalAmount: number;

  // PO Data
  purchaseOrder?: {
    id: string;
    code: string;
    status: string;
    totalAmount: number;
    poDate: Date;
  };

  // Invoice Data
  invoice?: {
    id: string;
    code: string;
    status: string;
    totalAmount: number;
    invoiceDate: Date;
    dueDate?: Date | null;
    paymentStatus: string;
  };

  // Delivery Data
  deliveries?: Array<{
    id: string;
    status: string;
    createdAt: Date;
  }>;

  // Delivery Notes Data
  deliveryNotes?: Array<{
    id: string;
    code: string;
    deliveryDate: Date;
    driverName: string;
    vehicleNumber: string;
  }>;

  // Payment Data
  payments?: Array<{
    id: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
  }>;
};

export async function getTransactionHistory(): Promise<
  TransactionHistoryItem[]
> {
  try {
    // Ambil semua orders dengan include yang opsional
    const transactions = await db.orders.findMany({
      include: {
        customer: {
          select: {
            name: true,
            code: true,
            phone: true,
            address: true,
          },
        },
        sales: {
          select: {
            name: true,
          },
        },
        purchaseOrders: {
          include: {
            invoices: {
              include: {
                payments: {
                  select: {
                    id: true,
                    amount: true,
                    paymentDate: true,
                    method: true,
                  },
                },
                delivery_notes: {
                  select: {
                    id: true,
                    code: true,
                    deliveryDate: true,
                    driverName: true,
                    vehicleNumber: true,
                  },
                },
                deliveries: {
                  select: {
                    id: true,
                    status: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        orderDate: "desc",
      },
    });

    // Transform data sesuai dengan flow aplikasi
    const transformedData: TransactionHistoryItem[] = transactions.map(
      order => {
        const purchaseOrder = order.purchaseOrders[0]; // Ambil PO pertama
        const invoice = purchaseOrder?.invoices;

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          customerName: order.customer.name,
          customerCode: order.customer.code,
          customerPhone: order.customer.phone,
          customerAddress: order.customer.address,
          salesName: order.sales.name,
          orderStatus: order.status,
          totalAmount: order.totalAmount,

          // PO Data
          purchaseOrder: purchaseOrder
            ? {
                id: purchaseOrder.id,
                code: purchaseOrder.code,
                status: purchaseOrder.status,
                totalAmount: purchaseOrder.totalAmount,
                poDate: purchaseOrder.poDate,
              }
            : undefined,

          // Invoice Data
          invoice: invoice
            ? {
                id: invoice.id,
                code: invoice.code,
                status: invoice.status,
                totalAmount: invoice.totalAmount,
                invoiceDate: invoice.invoiceDate,
                dueDate: invoice.dueDate,
                paymentStatus: invoice.paymentStatus,
              }
            : undefined,

          // Delivery Data
          deliveries: invoice?.deliveries
            ? [
                {
                  id: invoice.deliveries.id,
                  status: invoice.deliveries.status,
                  createdAt: invoice.deliveries.createdAt,
                },
              ]
            : undefined,

          // Delivery Notes Data
          deliveryNotes: invoice?.delivery_notes
            ? [
                {
                  id: invoice.delivery_notes.id,
                  code: invoice.delivery_notes.code,
                  deliveryDate: invoice.delivery_notes.deliveryDate,
                  driverName: invoice.delivery_notes.driverName,
                  vehicleNumber: invoice.delivery_notes.vehicleNumber,
                },
              ]
            : undefined,

          // Payment Data
          payments:
            invoice?.payments?.map(payment => ({
              id: payment.id,
              amount: payment.amount,
              paymentDate: payment.paymentDate,
              paymentMethod: payment.method,
            })) || undefined,
        };
      }
    );

    return transformedData;
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    throw new Error("Failed to fetch transaction history");
  }
}

// Function untuk update status invoice (untuk modul pengiriman)
export async function updateInvoiceDeliveryStatus(
  invoiceId: string,
  status: "SENT" | "PAID" | "OVERDUE"
) {
  try {
    const updatedInvoice = await db.invoices.update({
      where: { id: invoiceId },
      data: {
        status: status,
        updatedAt: new Date(),
      },
    });

    return { success: true, data: updatedInvoice };
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return { success: false, error: "Failed to update invoice status" };
  }
}
