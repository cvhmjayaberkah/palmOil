import { PrismaClient } from "@prisma/client";
import type {
  Users,
  Customers,
  PurchaseOrders,
  Invoices,
} from "@prisma/client";

export async function seedInvoices(
  prisma: PrismaClient,
  createdUsers: Users[],
  createdCustomers: Customers[],
  createdPurchaseOrders: PurchaseOrders[]
): Promise<Invoices[]> {

  const adminUser = createdUsers.find((user) => user.role === "ADMIN");
  if (!adminUser) {
    throw new Error("Admin user not found");
  }

  // Create Invoices with different statuses
  const invoicesData = [
    {
      invoiceDate: new Date("2025-01-22"),
      dueDate: new Date("2025-02-21"),
      status: "DRAFT" as const,
      code: "INV-2025-001",
      customerId: createdCustomers[0].id,
      createdBy: adminUser.id,
      purchaseOrderId: createdPurchaseOrders[0]?.id || null,
      paymentStatus: "UNPAID" as const,
      type: "PRODUCT" as const,
      statusPreparation: "WAITING_PREPARATION" as const,
      subtotal: 2500000,
      tax: 250000,
      discount: 50000,
      totalAmount: 2700000,
      paidAmount: 0,
      remainingAmount: 2700000,
      // deliveryAddress: createdCustomers[0].address,
      shippingCost: 25000,
      taxPercentage: 10,
      notes: "Invoice draft untuk review",
    },
    {
      invoiceDate: new Date("2025-01-23"),
      dueDate: new Date("2025-02-22"),
      status: "SENT" as const,
      code: "INV-2025-002",
      customerId: createdCustomers[1].id,
      createdBy: adminUser.id,
      purchaseOrderId: createdPurchaseOrders[1]?.id || null,
      paymentStatus: "UNPAID" as const,
      type: "PRODUCT" as const,
      statusPreparation: "PREPARING" as const,
      subtotal: 3750000,
      tax: 375000,
      discount: 75000,
      totalAmount: 4050000,
      paidAmount: 0,
      remainingAmount: 4050000,
      // deliveryAddress: createdCustomers[1].address,
      shippingCost: 35000,
      taxPercentage: 10,
      notes: "Invoice telah dikirim ke customer",
    },
    {
      invoiceDate: new Date("2025-01-27"),
      dueDate: new Date("2025-02-26"),
      status: "SENT" as const,
      code: "INV-2025-003",
      customerId: createdCustomers[2].id,
      createdBy: adminUser.id,
      purchaseOrderId: createdPurchaseOrders[2]?.id || null,
      paymentStatus: "PAID" as const,
      type: "PRODUCT" as const,
      statusPreparation: "READY_FOR_DELIVERY" as const,
      subtotal: 5000000,
      tax: 500000,
      discount: 100000,
      totalAmount: 5400000,
      paidAmount: 5400000,
      remainingAmount: 0,
      // deliveryAddress: createdCustomers[2].address,
      shippingCost: 50000,
      taxPercentage: 10,
      notes: "Invoice lunas dan siap kirim",
    },
    {
      invoiceDate: new Date("2025-02-01"),
      dueDate: new Date("2025-03-01"),
      status: "PAID" as const,
      code: "INV-2025-004",
      customerId: createdCustomers[3].id,
      createdBy: adminUser.id,
      purchaseOrderId: createdPurchaseOrders[3]?.id || null,
      paymentStatus: "PAID" as const,
      type: "PRODUCT" as const,
      statusPreparation: "READY_FOR_DELIVERY" as const,
      subtotal: 1875000,
      tax: 187500,
      discount: 37500,
      totalAmount: 2025000,
      paidAmount: 2025000,
      remainingAmount: 0,
      // deliveryAddress: createdCustomers[3].address,
      shippingCost: 20000,
      taxPercentage: 10,
      notes: "Pembayaran selesai",
    },
    {
      invoiceDate: new Date("2025-02-03"),
      dueDate: new Date("2025-01-03"), // Past due date
      status: "OVERDUE" as const,
      code: "INV-2025-005",
      customerId: createdCustomers[0].id,
      createdBy: adminUser.id,
      purchaseOrderId: null,
      paymentStatus: "PARTIALLY_PAID" as const,
      statusPreparation: "WAITING_PREPARATION" as const,
      subtotal: 1500000,
      tax: 150000,
      discount: 25000,
      totalAmount: 1625000,
      paidAmount: 800000,
      remainingAmount: 825000,
      // deliveryAddress: createdCustomers[0].address,
      shippingCost: 15000,
      taxPercentage: 10,
      notes: "Invoice overdue dengan pembayaran sebagian",
    },
    {
      invoiceDate: new Date("2025-02-06"),
      dueDate: new Date("2025-03-06"),
      status: "CANCELLED" as const,
      code: "INV-2025-006",
      customerId: createdCustomers[1].id,
      createdBy: adminUser.id,
      purchaseOrderId: null,
      paymentStatus: "UNPAID" as const,
      type: "PRODUCT" as const,
      statusPreparation: "CANCELLED_PREPARATION" as const,
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      // deliveryAddress: createdCustomers[1].address,
      shippingCost: 0,
      taxPercentage: 0,
      notes: "Invoice dibatalkan",
    },
  ];

  const createdInvoices = [];
  for (const invoiceData of invoicesData) {
    const {
      customerId,
      createdBy,
      purchaseOrderId,
      statusPreparation,
      ...restData
    } = invoiceData;

    const invoice = await prisma.invoices.create({
      data: {
        ...restData,
        customer: customerId
          ? {
              connect: { id: customerId },
            }
          : undefined,
        creator: createdBy
          ? {
              connect: { id: createdBy },
            }
          : undefined,
        purchaseOrder: purchaseOrderId
          ? {
              connect: { id: purchaseOrderId },
            }
          : undefined,
      },
    });
    createdInvoices.push(invoice);
  }

  return createdInvoices;
}
