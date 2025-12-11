import { PrismaClient } from "@prisma/client";
import type { Products, Invoices } from "@prisma/client";

export async function seedInvoiceItems(
  prisma: PrismaClient,
  createdProducts: Products[],
  createdInvoices: Invoices[]
) {

  const sampleProducts = createdProducts.slice(0, 5);
  let itemsCreated = 0;

  for (const invoice of createdInvoices) {
    // Skip cancelled invoices
    if (invoice.status === "CANCELLED" || invoice.subtotal <= 0) continue;

    const itemsCount = Math.floor(Math.random() * 3) + 2; // 2-4 items

    for (let i = 0; i < itemsCount; i++) {
      const product = sampleProducts[i % sampleProducts.length];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const price = product.price;
      const discount = Math.floor(Math.random() * 30000);
      const totalPrice = quantity * price - discount;

      await prisma.invoiceItems.create({
        data: {
          quantity,
          price,
          totalPrice,
          invoiceId: invoice.id,
          productId: product.id,
          discount,
        },
      });
      itemsCreated++;
    }
  }

}
