"use server";

import db from "@/lib/db";

// Function untuk debug - cek data yang ada di database
export async function debugTransactionData() {
  try {
    // Cek jumlah orders
    const ordersCount = await db.orders.count();

    // Cek jumlah purchase orders
    const poCount = await db.purchaseOrders.count();

    // Cek jumlah invoices
    const invoicesCount = await db.invoices.count();

    // Ambil beberapa sample orders
    const sampleOrders = await db.orders.findMany({
      take: 3,
      include: {
        customer: {
          select: {
            name: true,
            code: true,
          },
        },
        sales: {
          select: {
            name: true,
          },
        },
      },
    });


    // Ambil beberapa sample invoices
    const sampleInvoices = await db.invoices.findMany({
      take: 3,
      include: {
        customer: {
          select: {
            name: true,
            code: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });


    return {
      ordersCount,
      poCount,
      invoicesCount,
      sampleOrders,
      sampleInvoices,
    };
  } catch (error) {
    console.error("❌ Debug error:", error);
    return null;
  }
}
