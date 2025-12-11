import { PrismaClient } from "@prisma/client";
import type { Users, Orders, PurchaseOrders } from "@prisma/client";

export async function seedPurchaseOrders(
  prisma: PrismaClient,
  createdUsers: Users[],
  createdOrders: Orders[]
): Promise<PurchaseOrders[]> {

  const adminUser = createdUsers.find((user) => user.role === "ADMIN");
  const warehouseUser = createdUsers.find((user) => user.role === "WAREHOUSE");

  if (!adminUser || !warehouseUser) {
    throw new Error("Required users (ADMIN, WAREHOUSE) not found");
  }

  // Create Purchase Orders with different statuses
  const purchaseOrdersData = [
    {
      poDate: new Date("2025-01-15"),
      status: "PENDING" as const,
      notes: "Purchase order menunggu konfirmasi",
      creatorId: adminUser.id,
      code: "PO-2025-001",
      totalAmount: 2500000,
      orderId: createdOrders[0].id,
      orderLevelDiscount: 50000,
      paymentDeadline: new Date("2025-02-20"),
      shippingCost: 25000,
      taxPercentage: 10,
      totalDiscount: 50000,
      totalPayment: 2500000,
      totalTax: 250000,
    },
    {
      poDate: new Date("2025-01-20"),
      status: "PROCESSING" as const,
      notes: "Purchase order sedang diproses",
      creatorId: adminUser.id,
      code: "PO-2025-002",
      totalAmount: 3750000,
      orderId: createdOrders[1].id,
      orderLevelDiscount: 75000,
      paymentDeadline: new Date("2025-02-25"),
      shippingCost: 35000,
      taxPercentage: 10,
      totalDiscount: 75000,
      totalPayment: 3750000,
      totalTax: 375000,
    },
    {
      poDate: new Date("2025-01-25"),
      status: "READY_FOR_DELIVERY" as const,
      notes: "Purchase order siap untuk pengiriman",
      creatorId: adminUser.id,
      code: "PO-2025-003",
      totalAmount: 5000000,
      orderId: createdOrders[2].id,
      orderLevelDiscount: 100000,
      paymentDeadline: new Date("2025-03-01"),
      shippingCost: 50000,
      taxPercentage: 10,
      totalDiscount: 100000,
      totalPayment: 5000000,
      totalTax: 500000,
    },
    {
      poDate: new Date("2025-01-30"),
      status: "COMPLETED" as const,
      notes: "Purchase order telah selesai",
      creatorId: adminUser.id,
      code: "PO-2025-004",
      totalAmount: 1875000,
      orderId: createdOrders[3].id,
      orderLevelDiscount: 37500,
      paymentDeadline: new Date("2025-03-05"),
      shippingCost: 20000,
      taxPercentage: 10,
      totalDiscount: 37500,
      totalPayment: 1875000,
      totalTax: 187500,
    },
    {
      poDate: new Date("2025-02-05"),
      status: "CANCELLED" as const,
      notes: "Purchase order dibatalkan karena perubahan kebutuhan",
      creatorId: adminUser.id,
      code: "PO-2025-005",
      totalAmount: 0,
      orderId: createdOrders[4].id,
      orderLevelDiscount: 0,
      paymentDeadline: null,
      shippingCost: 0,
      taxPercentage: 0,
      totalDiscount: 0,
      totalPayment: 0,
      totalTax: 0,
    },
  ];

  const createdPurchaseOrders = [];
  for (const poData of purchaseOrdersData) {
    const purchaseOrder = await prisma.purchaseOrders.create({
      data: poData,
    });
    createdPurchaseOrders.push(purchaseOrder);
  }

  return createdPurchaseOrders;
}
