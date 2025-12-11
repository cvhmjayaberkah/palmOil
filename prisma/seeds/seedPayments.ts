import { PrismaClient } from "@prisma/client";
import type { Users, Invoices } from "@prisma/client";

export async function seedPayments(
  prisma: PrismaClient,
  createdUsers: Users[],
  createdInvoices: Invoices[]
) {

  const salesUser = createdUsers.find(user => user.role === "SALES");
  const adminUser = createdUsers.find(user => user.role === "ADMIN");

  if (!salesUser || !adminUser) {
    throw new Error("Required users (SALES, ADMIN) not found");
  }

  let paymentsCreated = 0;

  for (const invoice of createdInvoices) {
    // Create payments for invoices that have been paid or partially paid
    if (invoice.paymentStatus === "PAID") {
      // Full payment
      await prisma.payments.create({
        data: {
          paymentDate: new Date(
            invoice.invoiceDate.getTime() +
              Math.random() * 7 * 24 * 60 * 60 * 1000
          ), // Random date within 7 days
          amount: invoice.paidAmount,
          notes: "Pembayaran lunas via transfer bank",
          invoiceId: invoice.id,
          method: "BANK_TRANSFER",
          reference: `TRF-${invoice.code.replace("INV", "REF")}`,
          paymentCode: `PAY-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 5)
            .toUpperCase()}`,
          proofUrl: `https://example.com/payment-proof/${invoice.code}.jpg`,
          status: "CLEARED" as const,
          userId: salesUser.id,
        },
      });
      paymentsCreated++;
    } else if (invoice.paymentStatus === "PARTIALLY_PAID") {
      // Partial payment 1
      const firstPaymentAmount = Math.floor(invoice.paidAmount * 0.6);
      await prisma.payments.create({
        data: {
          paymentDate: new Date(
            invoice.invoiceDate.getTime() +
              Math.random() * 3 * 24 * 60 * 60 * 1000
          ), // Within 3 days
          amount: firstPaymentAmount,
          notes: "Pembayaran pertama via cash",
          invoiceId: invoice.id,
          method: "CASH",
          reference: `CASH-${invoice.code.replace("INV", "REF")}-1`,
          paymentCode: `PAY-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 5)
            .toUpperCase()}`,
          status: "CLEARED" as const,
          userId: adminUser.id,
        },
      });
      paymentsCreated++;

      // Partial payment 2
      const secondPaymentAmount = invoice.paidAmount - firstPaymentAmount;
      if (secondPaymentAmount > 0) {
        await prisma.payments.create({
          data: {
            paymentDate: new Date(
              invoice.invoiceDate.getTime() +
                Math.random() * 7 * 24 * 60 * 60 * 1000
            ), // Within 7 days
            amount: secondPaymentAmount,
            notes: "Pembayaran kedua via kartu kredit",
            invoiceId: invoice.id,
            method: "CREDIT_CARD",
            reference: `CC-${invoice.code.replace("INV", "REF")}-2`,
            paymentCode: `PAY-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 5)
              .toUpperCase()}`,
            proofUrl: `https://example.com/payment-proof/${invoice.code}-2.jpg`,
            status: "CLEARED" as const,
            userId: salesUser.id,
          },
        });
        paymentsCreated++;
      }
    } else if (invoice.paymentStatus === "UNPAID" && Math.random() > 0.5) {
      // Some unpaid invoices might have pending payments
      await prisma.payments.create({
        data: {
          paymentDate: new Date(), // Recent date
          amount: Math.floor(invoice.totalAmount * 0.3), // 30% of total
          notes: "Pembayaran pending - menunggu konfirmasi",
          invoiceId: invoice.id,
          method: "BANK_TRANSFER",
          reference: `PEND-${invoice.code.replace("INV", "REF")}`,
          paymentCode: `PAY-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 5)
            .toUpperCase()}`,
          proofUrl: `https://example.com/payment-proof/${invoice.code}-pending.jpg`,
          status: "PENDING" as const,
          userId: salesUser.id,
        },
      });
      paymentsCreated++;
    }
  }

  // Create some additional sample payments with different statuses
  const samplePaymentsData = [
    {
      paymentDate: new Date("2025-02-08"),
      amount: 500000,
      notes: "Pembayaran dibatalkan karena kesalahan transfer",
      invoiceId: createdInvoices[0].id,
      method: "BANK_TRANSFER",
      reference: "CANCEL-REF-001",
      paymentCode: "PAY-CANCEL-001",
      status: "CANCELED" as const,
      userId: adminUser.id,
    },
    {
      paymentDate: new Date("2025-02-09"),
      amount: 750000,
      notes: "Pembayaran berhasil dikonfirmasi",
      invoiceId: createdInvoices[1].id,
      method: "E_WALLET",
      reference: "EWALLET-REF-002",
      paymentCode: "PAY-EWALLET-002",
      proofUrl: "https://example.com/payment-proof/ewallet-002.jpg",
      status: "CLEARED" as const,
      userId: salesUser.id,
    },
  ];

  for (const paymentData of samplePaymentsData) {
    await prisma.payments.create({
      data: paymentData,
    });
    paymentsCreated++;
  }
}
