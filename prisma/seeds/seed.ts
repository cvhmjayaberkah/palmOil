/**
 * Master Seed File
 *
 * This file orchestrates the seeding of all database tables by calling
 * individual seed functions from the seeds/ folder in the correct order.
 *
 * Usage:
 * npm run db:seed
 *
 * The seeding process follows this order:
 * 1. Basic data: Users, Categories, Products, Customers, Stores, Taxes
 * 2. Business flow: Orders → Purchase Orders → Purchase Order Items → Invoices → Invoice Items
 * 3. Operational data: Delivery Notes → Delivery Note Items → Payments → Productions
 * 4. Financial data: Expenses
 */

import { PrismaClient } from "@prisma/client";
import { seedUsers } from "./seedUsers";
import { seedCategoriesAndProducts } from "./seedCategoriesAndProducts";
import { seedCustomers } from "./seedCustomers";
import { seedStores } from "./seedStores";
import { seedTaxes } from "./seedTax";
import { seedCompanyProfiles } from "./seedCompanyProfiles";
import { seedOrders } from "./seedOrders";
import { seedPurchaseOrders } from "./seedPurchaseOrders";
import { seedPurchaseOrderItems } from "./seedPurchaseOrderItems";
import { seedInvoices } from "./seedInvoices";
import { seedInvoiceItems } from "./seedInvoiceItems";
import { seedPayments } from "./seedPayments";
import { seedProductions } from "./seedProductions";
import { seedExpenses } from "./expenses";

const prisma = new PrismaClient();

async function main() {

  try {
    // 1. Seed basic data first (users, categories, products)
    const users = await seedUsers(prisma);
    const products = await seedCategoriesAndProducts(prisma);
    const customers = await seedCustomers(prisma);
    const stores = await seedStores(prisma);
    await seedTaxes();
    await seedCompanyProfiles(prisma);

    // Extract specific users for seeding dependent data
    const salesUser = users.find(user => user.role === "SALES") || users[0];
    const ownerUser = users.find(user => user.role === "OWNER") || users[0];

    // 2. Seed business flow data (orders -> purchase orders -> invoices)
    const orders = await seedOrders(prisma, customers, products, salesUser);

    // blockk=======================================

    const purchaseOrders = await seedPurchaseOrders(prisma, users, orders);
    await seedPurchaseOrderItems(prisma, products, purchaseOrders);
    const invoices = await seedInvoices(
      prisma,
      users,
      customers,
      purchaseOrders
    );
    await seedInvoiceItems(prisma, products, invoices);

    // 3. Seed operational data (delivery notes, payments, productions)

    await seedPayments(prisma, users, invoices);

    await seedProductions();

    // 4. Seed financial data (expenses)
    await seedExpenses();
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
