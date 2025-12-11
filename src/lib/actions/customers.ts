"use server";

import db from "@/lib/db";
import { Customers } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type CustomerFormData = {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  isActive: boolean;
};

// Get all customers
export async function getCustomers(): Promise<Customers[]> {
  try {
    const customers = await db.customers.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return customers;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw new Error("Failed to fetch customers");
  }
}

// Get customer by ID
export async function getCustomerById(id: string): Promise<Customers | null> {
  try {
    const customer = await db.customers.findUnique({
      where: { id },
    });

    return customer;
  } catch (error) {
    console.error("Error fetching customer:", error);
    throw new Error("Failed to fetch customer");
  }
}

// Get active customers only
export async function getActiveCustomers(): Promise<Customers[]> {
  try {
    const customers = await db.customers.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return customers;
  } catch (error) {
    console.error("Error fetching active customers:", error);
    throw new Error("Failed to fetch active customers");
  }
}

// Create new customer
export async function createCustomer(data: CustomerFormData) {
  try {
    const customer = await db.customers.create({
      data: {
        code: data.code,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        city: data.city,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/kustomer");
    return { success: true, data: customer };
  } catch (error) {
    console.error("Error creating customer:", error);

    // Handle unique constraint error for code
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        success: false,
        error: "Kode customer sudah digunakan",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create customer",
    };
  }
}

// Update customer
export async function updateCustomer(id: string, data: CustomerFormData) {
  try {
    const customer = await db.customers.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        city: data.city,
        isActive: data.isActive,
      },
    });

    revalidatePath("/management/kustomer");
    revalidatePath(`/management/kustomer/edit/${id}`);
    return { success: true, data: customer };
  } catch (error) {
    console.error("Error updating customer:", error);

    // Handle unique constraint error for code
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        success: false,
        error: "Kode customer sudah digunakan",
      };
    }

    return { success: false, error: "Failed to update customer" };
  }
}

// Delete customer
export async function deleteCustomer(id: string) {
  try {
    // Check if customer has related records
    const customerWithRelations = await db.customers.findUnique({
      where: { id },
      include: {
        orders: true,
        invoices: true,
        deliveryNotes: true,
        customerVisits: true,
      },
    });

    if (
      customerWithRelations &&
      (customerWithRelations.orders.length > 0 ||
        customerWithRelations.invoices.length > 0 ||
        customerWithRelations.deliveryNotes.length > 0 ||
        customerWithRelations.customerVisits.length > 0)
    ) {
      return {
        success: false,
        error:
          "Tidak dapat menghapus customer yang memiliki transaksi. Harap hapus semua data terkait terlebih dahulu.",
      };
    }

    await db.customers.delete({
      where: { id },
    });

    revalidatePath("/management/kustomer");
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer:", error);
    return { success: false, error: "Gagal Menghapus kustomer" };
  }
}

// Toggle customer active status
export async function toggleCustomerStatus(id: string) {
  try {
    const customer = await db.customers.findUnique({
      where: { id },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const updatedCustomer = await db.customers.update({
      where: { id },
      data: {
        isActive: !customer.isActive,
      },
    });

    revalidatePath("/management/kustomer");
    return { success: true, data: updatedCustomer };
  } catch (error) {
    console.error("Error toggling customer status:", error);
    return { success: false, error: "Failed to toggle customer status" };
  }
}
