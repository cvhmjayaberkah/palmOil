import { PrismaClient } from "@prisma/client";
import type { Products, PurchaseOrders } from "@prisma/client";

export async function seedPurchaseOrderItems(
  prisma: PrismaClient,
  createdProducts: Products[],
  createdPurchaseOrders: PurchaseOrders[]
) {

  const sampleProducts = createdProducts.slice(0, 5);
  let itemsCreated = 0;

  for (const purchaseOrder of createdPurchaseOrders) {
    // Skip cancelled orders
    if (purchaseOrder.status === "CANCELLED") continue;

    const itemsCount = Math.floor(Math.random() * 3) + 2; // 2-4 items
    for (let i = 0; i < itemsCount; i++) {
      const product = sampleProducts[i % sampleProducts.length];
      const quantity = Math.floor(Math.random() * 10) + 1;
      const price = product.price;
      const discount = Math.floor(Math.random() * 50000);

      await prisma.purchaseOrderItems.create({
        data: {
          quantity,
          purchaseOrderId: purchaseOrder.id,
          productId: product.id,
          price,
          totalPrice: quantity * price - discount,
          discount,
        },
      });
      itemsCreated++;
    }
  }

}
