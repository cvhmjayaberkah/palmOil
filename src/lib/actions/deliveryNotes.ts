"use server";

import db from "@/lib/db";
import { DeliveryNotes, PaymentStatus, InvoiceType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateCodeByTable } from "@/utils/getCode";

export type DeliveryNoteFormData = {
  code: string;
  deliveryDate: Date;
  driverName: string;
  vehicleNumber: string;
  notes?: string;
  invoiceId: string;
  warehouseUserId: string;
};

export type DeliveryNoteWithDetails = DeliveryNotes & {
  customers: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
  };
  invoices: {
    id: string;
    code: string;
    subtotal: number;
    tax: number;
    taxPercentage: number;
    discount: number;
    discountType: string;
    totalAmount: number;
    shippingCost: number;
    invoiceItems?: {
      id: string;
      quantity: number;
      price: number;
      discount: number;
      discountType: string;
      totalPrice: number;
      productId: string;
      products: {
        id: string;
        code: string;
        name: string;
        unit: string;
        price: number;
        bottlesPerCrate: number;
      };
    }[];
  };
  users: {
    id: string;
    name: string;
    role: string;
  };
  userPreparation?: {
    id: string;
    name: string;
  } | null;
};

export type EligibleInvoice = {
  id: string;
  code: string;
  invoiceDate: Date;
  subtotal: number;
  tax: number;
  taxPercentage: number;
  discount: number;
  discountType: string;
  totalAmount: number;
  shippingCost: number;
  customer: {
    id: string;
    name: string;
    address: string;
  };
  purchaseOrder: {
    id: string;
    code: string;
    order: {
      id: string;
      orderNumber: string;
    };
  } | null;
  invoiceItems?: {
    id: string;
    quantity: number;
    price: number;
    discount: number;
    discountType: string;
    totalPrice: number;
    productId: string;
    products: {
      id: string;
      code: string;
      name: string;
      unit: string;
      price: number;
      bottlesPerCrate: number; // Add bottlesPerCrate field
    };
  }[];
};

// Get all delivery notes
export async function getDeliveryNotes(): Promise<DeliveryNoteWithDetails[]> {
  try {
    const deliveryNotes = await db.deliveryNotes.findMany({
      include: {
        customers: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        invoices: {
          select: {
            id: true,
            code: true,
            subtotal: true,
            tax: true,
            taxPercentage: true,
            discount: true,
            discountType: true,
            totalAmount: true,
            shippingCost: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        code: "desc",
      },
    });

    return deliveryNotes as DeliveryNoteWithDetails[];
  } catch (error) {
    console.error("Error fetching delivery notes:", error);
    throw new Error("Failed to fetch delivery notes");
  }
}

// Get delivery note by ID
export async function getDeliveryNoteById(
  id: string
): Promise<DeliveryNoteWithDetails | null> {
  try {
    const deliveryNote = await db.deliveryNotes.findUnique({
      where: { id },
      include: {
        customers: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        invoices: {
          select: {
            id: true,
            code: true,
            subtotal: true,
            tax: true,
            taxPercentage: true,
            discount: true,
            discountType: true,
            totalAmount: true,
            shippingCost: true,
            invoiceItems: {
              include: {
                products: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    unit: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return deliveryNote as DeliveryNoteWithDetails | null;
  } catch (error) {
    console.error("Error fetching delivery note:", error);
    throw new Error("Failed to fetch delivery note");
  }
}

// Get eligible invoices for delivery note creation
export async function getEligibleInvoices(): Promise<EligibleInvoice[]> {
  try {
    const invoices = await db.invoices.findMany({
      where: {
        type: InvoiceType.PRODUCT,
        useDeliveryNote: true,
        status: "SENT",
      },
      select: {
        id: true,
        code: true,
        invoiceDate: true,
        subtotal: true,
        tax: true,
        taxPercentage: true,
        discount: true,
        discountType: true,
        totalAmount: true,
        shippingCost: true,
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            code: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
              },
            },
          },
        },
        invoiceItems: {
          include: {
            products: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
                price: true,
                bottlesPerCrate: true, // Add bottlesPerCrate from database
              },
            },
          },
        },
      },
      orderBy: {
        invoiceDate: "desc",
      },
    });

    // Filter out invoices that already have delivery notes
    const existingDeliveryNotes = await db.deliveryNotes.findMany({
      select: {
        invoiceId: true,
      },
    });

    const existingInvoiceIds = new Set(
      existingDeliveryNotes.map(dn => dn.invoiceId)
    );

    return invoices.filter(
      invoice => !existingInvoiceIds.has(invoice.id)
    ) as EligibleInvoice[];
  } catch (error) {
    console.error("Error fetching eligible invoices:", error);
    throw new Error("Failed to fetch eligible invoices");
  }
}

// Create new delivery note
export async function createDeliveryNote(data: DeliveryNoteFormData) {
  try {
    const result = await db.$transaction(async tx => {
      // Get invoice details with all related data
      const invoice = await tx.invoices.findUnique({
        where: { id: data.invoiceId },
        include: {
          customer: true,
          invoiceItems: {
            include: {
              products: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (!invoice.invoiceItems || invoice.invoiceItems.length === 0) {
        throw new Error("No items found for this invoice");
      }

      // Validate invoice eligibility
      if (invoice.type !== InvoiceType.PRODUCT) {
        throw new Error("Only PRODUCT type invoices can have delivery notes");
      }

      if (!invoice.useDeliveryNote) {
        throw new Error("This invoice is not marked for delivery note usage");
      }

      // statusPreparation validation removed - all paid invoices are ready for delivery

      // Check if delivery note already exists for this invoice
      const existingDeliveryNote = await tx.deliveryNotes.findFirst({
        where: { invoiceId: invoice.id },
      });

      if (existingDeliveryNote) {
        throw new Error("Delivery note already exists for this invoice");
      }

      // Create delivery note
      const deliveryNote = await tx.deliveryNotes.create({
        data: {
          code: data.code,
          deliveryDate: data.deliveryDate,
          driverName: data.driverName,
          vehicleNumber: data.vehicleNumber,
          notes: data.notes || null,
          customerId: invoice.customer!.id,
          invoiceId: invoice.id,
          warehouseUserId: data.warehouseUserId,
        },
      });

      return deliveryNote;
    });

    revalidatePath("/sales/surat-jalan");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating delivery note:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create delivery note",
    };
  }
}

// Update delivery note
export async function updateDeliveryNote(
  id: string,
  data: Partial<DeliveryNoteFormData>
) {
  try {
    const updatedDeliveryNote = await db.deliveryNotes.update({
      where: { id },
      data: {
        ...(data.deliveryDate && { deliveryDate: data.deliveryDate }),
        ...(data.driverName && { driverName: data.driverName }),
        ...(data.vehicleNumber && { vehicleNumber: data.vehicleNumber }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date(),
      },
    });

    revalidatePath("/sales/surat-jalan");
    revalidatePath(`/sales/surat-jalan/edit/${id}`);
    return { success: true, data: updatedDeliveryNote };
  } catch (error) {
    console.error("Error updating delivery note:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update delivery note",
    };
  }
}

// Delete delivery note (with stock reversal)
export async function deleteDeliveryNote(id: string) {
  try {
    const result = await db.$transaction(async tx => {
      // Get delivery note
      const deliveryNote = await tx.deliveryNotes.findUnique({
        where: { id },
      });

      if (!deliveryNote) {
        throw new Error("Delivery note not found");
      }

      // Delete delivery note
      await tx.deliveryNotes.delete({
        where: { id },
      });
    });

    revalidatePath("/sales/surat-jalan");
    return { success: true };
  } catch (error) {
    console.error("Error deleting delivery note:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete delivery note",
    };
  }
}

// Get available warehouse users
export async function getWarehouseUsers() {
  try {
    const users = await db.users.findMany({
      where: {
        isActive: true,
        role: { in: ["WAREHOUSE", "ADMIN", "OWNER"] },
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return users;
  } catch (error) {
    console.error("Error fetching warehouse users:", error);
    throw new Error("Failed to fetch warehouse users");
  }
}

// Generate delivery note code
export async function generateDeliveryNumber(): Promise<string> {
  try {
    return await generateCodeByTable("DeliveryNotes");
  } catch (error) {
    console.error("Error generating delivery note code:", error);
    throw new Error("Failed to generate delivery note code");
  }
}
