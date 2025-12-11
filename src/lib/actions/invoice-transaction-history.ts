"use server";

import db from "@/lib/db";

// Type untuk data transaksi berbasis invoice
export type InvoiceTransactionHistoryItem = {
  id: string;
  invoiceCode: string;
  invoiceDate: Date;
  dueDate?: Date | null;
  customerName: string;
  customerCode?: string;
  customerPhone: string | null;
  customerAddress: string;
  salesName?: string;
  invoiceStatus: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  // Purchase Order Data (optional)
  purchaseOrder?: {
    id: string;
    code: string;
    status: string;
    orderDate: Date;
  };

  // Delivery Data
  deliveries?: Array<{
    id: string;
    code: string;
    status: string;
    deliveryDate: Date;
  }>;

  // Payment Data
  payments?: Array<{
    id: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: string;
  }>;
};

export async function getInvoiceTransactionHistory(): Promise<
  InvoiceTransactionHistoryItem[]
> {
  try {
    const invoices = await db.invoices.findMany({
      include: {
        customer: {
          select: {
            name: true,
            code: true,
            phone: true,
            address: true,
          },
        },
        purchaseOrder: {
          include: {
            order: {
              include: {
                sales: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            method: true,
          },
          orderBy: {
            paymentDate: "desc",
          },
        },
        deliveries: {
          select: {
            id: true,
            code: true,
            status: true,
            deliveryDate: true,
          },
          orderBy: {
            deliveryDate: "desc",
          },
        },
      },
      orderBy: {
        invoiceDate: "desc",
      },
    });

    // Transform data menjadi format yang sesuai untuk transaction history
    const transformedData: InvoiceTransactionHistoryItem[] = invoices.map(
      invoice => {
        // Calculate paid amount from payments
        const paidAmount =
          invoice.payments?.reduce((total, payment) => {
            return total + payment.amount;
          }, 0) || 0;

        return {
          id: invoice.id,
          invoiceCode: invoice.code,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          customerName: invoice.customer?.name || "Unknown Customer",
          customerCode: invoice.customer?.code || "",
          customerPhone: invoice.customer?.phone || null,
          customerAddress: invoice.customer?.address || "",
          salesName: invoice.purchaseOrder?.order?.sales?.name || "N/A",
          invoiceStatus: invoice.status,
          paymentStatus: invoice.paymentStatus,
          totalAmount: invoice.totalAmount,
          paidAmount: paidAmount,
          remainingAmount: invoice.totalAmount - paidAmount,

          // Purchase Order Data
          purchaseOrder: invoice.purchaseOrder
            ? {
                id: invoice.purchaseOrder.id,
                code: invoice.purchaseOrder.code,
                status: invoice.purchaseOrder.status,
                orderDate: invoice.purchaseOrder.order?.orderDate || new Date(),
              }
            : undefined,

          // Delivery Data
          deliveries: invoice.deliveries?.map(delivery => ({
            id: delivery.id,
            code: delivery.code,
            status: delivery.status,
            deliveryDate: delivery.deliveryDate,
          })),

          // Payment Data
          payments: invoice.payments?.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            paymentMethod: payment.method,
          })),
        };
      }
    );

    return transformedData;
  } catch (error) {
    console.error("Error fetching invoice transaction history:", error);
    throw new Error("Failed to fetch invoice transaction history");
  }
}
