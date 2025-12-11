"use server";

import db from "@/lib/db";
import { generateCodeByTable } from "@/utils/getCode";
import { revalidatePath } from "next/cache";
import { StockMovementType } from "@prisma/client";

// Interface untuk data swap
export interface SwapData {
  code: string;
  invoiceId: string;
  swapDate: Date;
  deadline?: string;
  baseTotal: number;
  notes?: string;
  createdBy?: string;
  difference: number; // Selisih nilai antara item lama dan pengganti
  swapGroups: SwapGroupData[]; // Changed from swapDetails to swapGroups
}

// New interface for grouping multiple old items with multiple replacement items
export interface SwapGroupData {
  id?: string; // Optional for new groups
  oldItems: OldItemData[];
  replacementItems: ReplacementItemData[];
  groupNotes?: string;
}

export interface OldItemData {
  itemId: string;
  quantity: number;
  cogs: number;
  name?: string; // For display purposes
}

export interface ReplacementItemData {
  itemId: string;
  quantity: number;
  cogs: number;
  name?: string; // For display purposes
}

// Keep the original interface for backward compatibility and database operations
export interface SwapDetailData {
  oldItemId: string;
  replacementItemId: string;
  oldItemCogs: number;
  replacementItemCogs: number;
  oldItemQuantity: number;
  replacementItemQuantity: number;
}

// Helper function to convert SwapGroupData to SwapDetailData array
function convertSwapGroupsToDetails(
  swapGroups: SwapGroupData[]
): SwapDetailData[] {
  const swapDetails: SwapDetailData[] = [];

  for (const group of swapGroups) {
    const totalOldValue = group.oldItems.reduce(
      (sum, item) => sum + item.cogs * item.quantity,
      0
    );
    const totalReplacementValue = group.replacementItems.reduce(
      (sum, item) => sum + item.cogs * item.quantity,
      0
    );

    // For now, create one-to-one mappings where possible
    // More complex logic can be added later for many-to-many scenarios

    if (group.oldItems.length === 1 && group.replacementItems.length === 1) {
      // Simple 1:1 case
      const oldItem = group.oldItems[0];
      const replacementItem = group.replacementItems[0];

      swapDetails.push({
        oldItemId: oldItem.itemId,
        replacementItemId: replacementItem.itemId,
        oldItemCogs: oldItem.cogs,
        replacementItemCogs: replacementItem.cogs,
        oldItemQuantity: oldItem.quantity,
        replacementItemQuantity: replacementItem.quantity,
      });
    } else {
      // For many-to-many cases, we need to distribute replacement quantities properly
      // to avoid duplicate counting of replacement items

      // Case 1: Many old items → One replacement item (N:1)
      if (group.replacementItems.length === 1) {
        const replacementItem = group.replacementItems[0];

        // Distribute replacement quantity across all old items
        // Only the first old item gets the replacement quantity, others get 0
        for (let i = 0; i < group.oldItems.length; i++) {
          const oldItem = group.oldItems[i];

          swapDetails.push({
            oldItemId: oldItem.itemId,
            replacementItemId: replacementItem.itemId,
            oldItemCogs: oldItem.cogs,
            replacementItemCogs: replacementItem.cogs,
            oldItemQuantity: oldItem.quantity,
            replacementItemQuantity: i === 0 ? replacementItem.quantity : 0, // Only first gets replacement qty
          });
        }
      }
      // Case 2: One old item → Many replacement items (1:N)
      else if (group.oldItems.length === 1) {
        const oldItem = group.oldItems[0];

        // Create detail for each replacement item
        // Only the first replacement gets old item quantity, others get 0
        for (let i = 0; i < group.replacementItems.length; i++) {
          const replacementItem = group.replacementItems[i];

          swapDetails.push({
            oldItemId: oldItem.itemId,
            replacementItemId: replacementItem.itemId,
            oldItemCogs: oldItem.cogs,
            replacementItemCogs: replacementItem.cogs,
            oldItemQuantity: i === 0 ? oldItem.quantity : 0, // Only first gets old qty
            replacementItemQuantity: replacementItem.quantity,
          });
        }
      }
      // Case 3: Many old items → Many replacement items (N:N)
      else {
        // Create cross-product but distribute quantities to avoid double counting
        let oldItemProcessed = false;
        let replacementItemProcessed = false;

        for (
          let i = 0;
          i < Math.max(group.oldItems.length, group.replacementItems.length);
          i++
        ) {
          const oldItem = group.oldItems[i] || group.oldItems[0]; // Use first if not enough
          const replacementItem =
            group.replacementItems[i] || group.replacementItems[0]; // Use first if not enough

          swapDetails.push({
            oldItemId: oldItem.itemId,
            replacementItemId: replacementItem.itemId,
            oldItemCogs: oldItem.cogs,
            replacementItemCogs: replacementItem.cogs,
            oldItemQuantity: group.oldItems[i] ? oldItem.quantity : 0, // Only if this old item exists
            replacementItemQuantity: group.replacementItems[i]
              ? replacementItem.quantity
              : 0, // Only if this replacement exists
          });
        }
      }
    }
  }

  return swapDetails;
}

// Helper function to convert SwapDetailData array back to SwapGroupData
function convertDetailsToSwapGroups(
  swapDetails: SwapDetailData[]
): SwapGroupData[] {
  // This is a reverse mapping - group details by similar characteristics
  // For now, we'll create individual groups for each detail
  // More sophisticated grouping logic can be added later

  return swapDetails.map(detail => ({
    oldItems: [
      {
        itemId: detail.oldItemId,
        quantity: detail.oldItemQuantity,
        cogs: detail.oldItemCogs,
      },
    ],
    replacementItems: [
      {
        itemId: detail.replacementItemId,
        quantity: detail.replacementItemQuantity,
        cogs: detail.replacementItemCogs,
      },
    ],
  }));
}

// Get all swaps with related data
export async function getSwaps() {
  try {
    const swaps = await db.swaps.findMany({
      include: {
        invoice: {
          include: {
            customer: true,
            invoiceItems: {
              include: {
                products: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        swapDetails: {
          include: {
            oldItem: true,
            replacementItem: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return swaps;
  } catch (error) {
    console.error("Error fetching swaps:", error);
    throw new Error("Gagal mengambil data tukar guling");
  }
}

// Get swap by ID
export async function getSwapById(id: string) {
  try {
    const swap = await db.swaps.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            customer: true,
            invoiceItems: {
              include: {
                products: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        swapDetails: {
          include: {
            oldItem: true,
            replacementItem: true,
          },
        },
      },
    });

    if (!swap) {
      throw new Error("Data tukar guling tidak ditemukan");
    }

    return swap;
  } catch (error) {
    console.error("Error fetching swap by ID:", error);
    throw new Error("Gagal mengambil data tukar guling");
  }
}

// Get available invoices for swap (only completed invoices with deliveries)
export async function getAvailableInvoices(searchQuery?: string) {
  try {
    const whereClause: any = {
      status: {
        in: ["DELIVERED"],
      },
      isCanceled: false,
      // Only invoices that have deliveries
      deliveries: {
        some: {
          status: "DELIVERED",
        },
      },
    };

    if (searchQuery) {
      whereClause.OR = [
        {
          code: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
        {
          customer: {
            name: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const invoices = await db.invoices.findMany({
      where: whereClause,
      include: {
        customer: true,
        invoiceItems: {
          include: {
            products: true,
          },
        },
        deliveries: {
          where: {
            status: "DELIVERED",
          },
          include: {
            deliveryItems: {
              where: {
                status: "DELIVERED",
                quantityDelivered: {
                  gt: 0,
                },
              },
              include: {
                invoiceItem: {
                  include: {
                    products: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // Limit to 20 invoices for performance
    });

    return invoices;
  } catch (error) {
    console.error("Error fetching available invoices:", error);
    throw new Error("Gagal mengambil data invoice");
  }
}

// Get delivered items for a specific invoice (items that have been delivered to customer)
export async function getDeliveredItemsByInvoiceId(invoiceId: string) {
  try {
    const deliveredItems = await db.deliveryItems.findMany({
      where: {
        delivery: {
          invoiceId: invoiceId,
          status: "DELIVERED",
        },
        status: "DELIVERED",
        quantityDelivered: {
          gt: 0,
        },
      },
      include: {
        invoiceItem: {
          include: {
            products: true,
          },
        },
      },
    });

    // Transform to match the format expected by UI
    return deliveredItems
      .filter(item => item.invoiceItem !== null) // Filter out null invoice items
      .map(item => ({
        id: item.invoiceItem!.id,
        productId: item.invoiceItem!.productId,
        quantity: item.quantityDelivered, // Use delivered quantity, not original quantity
        price: item.invoiceItem!.price,
        totalPrice: item.invoiceItem!.price * item.quantityDelivered,
        products: item.invoiceItem!.products,
      }));
  } catch (error) {
    console.error("Error fetching delivered items:", error);
    throw new Error("Gagal mengambil data barang yang sudah dikirim");
  }
}

// Get available products for replacement
export async function getAvailableProducts() {
  try {
    const products = await db.products.findMany({
      where: {
        isActive: true,
        currentStock: {
          gt: 0, // Only products with stock
        },
      },
      include: {
        category: true,
        tax: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return products;
  } catch (error) {
    console.error("Error fetching available products:", error);
    throw new Error("Gagal mengambil data produk");
  }
}

// Validate COGS comparison for individual items
export async function validateCOGS(
  oldItemId: string,
  replacementItemId: string
) {
  try {
    const [oldItem, replacementItem] = await Promise.all([
      db.products.findUnique({
        where: { id: oldItemId },
        select: { cost: true, name: true },
      }),
      db.products.findUnique({
        where: { id: replacementItemId },
        select: {
          cost: true,
          name: true,
          sellingPrice: true,
          tax: {
            select: {
              nominal: true,
            },
          },
        },
      }),
    ]);

    if (!oldItem || !replacementItem) {
      throw new Error("Produk tidak ditemukan");
    }

    // Calculate selling price after tax for replacement item
    const basePrice = replacementItem.sellingPrice || replacementItem.cost;
    let replacementItemPrice = basePrice;

    if (replacementItem.tax) {
      const taxPercentage = parseFloat(replacementItem.tax.nominal) || 0;
      replacementItemPrice = basePrice + (basePrice * taxPercentage) / 100;
    }

    const isValid = replacementItemPrice >= oldItem.cost;

    return {
      isValid,
      oldItemCost: oldItem.cost,
      replacementItemCost: replacementItemPrice,
      oldItemName: oldItem.name,
      replacementItemName: replacementItem.name,
      difference: replacementItemPrice - oldItem.cost,
    };
  } catch (error) {
    console.error("Error validating COGS:", error);
    throw new Error("Gagal validasi COGS");
  }
}

// Validate COGS for swap groups (many-to-many validation)
export async function validateSwapGroups(swapGroups: SwapGroupData[]) {
  try {
    const validationResults = [];

    for (const group of swapGroups) {
      // Calculate total value of old items
      const oldItemsTotal = await Promise.all(
        group.oldItems.map(async oldItem => {
          const product = await db.products.findUnique({
            where: { id: oldItem.itemId },
            select: { cost: true, name: true },
          });
          if (!product) {
            throw new Error(`Produk lama tidak ditemukan: ${oldItem.itemId}`);
          }
          return {
            id: oldItem.itemId,
            name: product.name,
            cost: product.cost,
            quantity: oldItem.quantity,
            totalValue: product.cost * oldItem.quantity,
          };
        })
      );

      // Calculate total value of replacement items
      const replacementItemsTotal = await Promise.all(
        group.replacementItems.map(async replacementItem => {
          const product = await db.products.findUnique({
            where: { id: replacementItem.itemId },
            select: {
              cost: true,
              name: true,
              sellingPrice: true,
              tax: {
                select: {
                  nominal: true,
                },
              },
            },
          });
          if (!product) {
            throw new Error(
              `Produk pengganti tidak ditemukan: ${replacementItem.itemId}`
            );
          }

          // Calculate selling price after tax for replacement item
          const basePrice = product.sellingPrice || product.cost;
          let replacementItemPrice = basePrice;

          if (product.tax) {
            const taxPercentage = parseFloat(product.tax.nominal) || 0;
            replacementItemPrice =
              basePrice + (basePrice * taxPercentage) / 100;
          }

          return {
            id: replacementItem.itemId,
            name: product.name,
            cost: product.cost,
            sellingPrice: replacementItemPrice,
            quantity: replacementItem.quantity,
            totalValue: replacementItemPrice * replacementItem.quantity,
          };
        })
      );

      const totalOldValue = oldItemsTotal.reduce(
        (sum, item) => sum + item.totalValue,
        0
      );
      const totalReplacementValue = replacementItemsTotal.reduce(
        (sum, item) => sum + item.totalValue,
        0
      );
      const difference = totalReplacementValue - totalOldValue;

      const groupValidation = {
        isValid: totalReplacementValue >= totalOldValue,
        oldItems: oldItemsTotal,
        replacementItems: replacementItemsTotal,
        totalOldValue,
        totalReplacementValue,
        difference,
        groupNotes: group.groupNotes,
      };

      validationResults.push(groupValidation);

      // If any group is invalid, return early with error
      if (!groupValidation.isValid) {
        throw new Error(
          `Nilai total item pengganti (${totalReplacementValue.toLocaleString()}) harus sama atau lebih besar dari nilai total item lama (${totalOldValue.toLocaleString()})`
        );
      }
    }

    return {
      isValid: true,
      groups: validationResults,
      totalDifference: validationResults.reduce(
        (sum, group) => sum + group.difference,
        0
      ),
    };
  } catch (error) {
    console.error("Error validating swap groups:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error("Gagal validasi tukar guling: " + errorMessage);
  }
}

// Create new swap
export async function createSwap(data: SwapData) {
  try {
    // Validate swap groups before processing
    await validateSwapGroups(data.swapGroups);

    // Convert swapGroups to swapDetails for database operations
    const swapDetails = convertSwapGroupsToDetails(data.swapGroups);

    // Start transaction
    const result = await db.$transaction(async tx => {
      // Update invoice deadline if provided
      if (data.deadline) {
        await tx.invoices.update({
          where: { id: data.invoiceId },
          data: { dueDate: new Date(data.deadline) },
        });
      }

      // Create swap record - always set to COMPLETED
      const swap = await tx.swaps.create({
        data: {
          code: data.code,
          invoiceId: data.invoiceId,
          swapDate: data.swapDate,
          status: "COMPLETED", // Always set to completed
          baseTotal: data.baseTotal,
          notes: data.notes,
          createdBy: data.createdBy,
          difference: data.difference, // Simpan nilai selisih
          swapDetails: {
            create: swapDetails,
          },
        },
        include: {
          swapDetails: {
            include: {
              oldItem: true,
              replacementItem: true,
            },
          },
        },
      });

      // 1. Update invoice items with replacement items
      await updateInvoiceItemsWithReplacements(tx, data.invoiceId, swapDetails);

      // 2. Create delivery note for replacement items (not old items)
      await createSwapDeliveries(
        tx,
        data.invoiceId,
        swapDetails,
        data.createdBy || "",
        swap.id
      );

      // 3. Create stock movements for the swap
      await createSwapStockMovements(
        tx,
        swap.id,
        swapDetails,
        data.createdBy || ""
      );

      // 4. Recalculate invoice totals after item updates
      await recalculateInvoiceTotals(tx, data.invoiceId);

      // 3. Jika ingin benar-benar menghentikan eksekusi dengan error yang jelas

      return swap;
    });

    revalidatePath("/sales/tukar");
    revalidatePath("/sales/invoice");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating swap:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Update existing swap
export async function updateSwap(id: string, data: Partial<SwapData>) {
  try {
    const existingSwap = await db.swaps.findUnique({
      where: { id },
      include: { swapDetails: true },
    });

    if (!existingSwap) {
      throw new Error("Data tukar guling tidak ditemukan");
    }

    // Allow editing even if completed since we always work with COMPLETED status
    let swapDetails: SwapDetailData[] | undefined;

    // Validate swap groups if being updated
    if (data.swapGroups) {
      await validateSwapGroups(data.swapGroups);
      swapDetails = convertSwapGroupsToDetails(data.swapGroups);
    }

    const result = await db.$transaction(async tx => {
      // Update invoice deadline if provided
      if (data.deadline) {
        await tx.invoices.update({
          where: { id: existingSwap.invoiceId },
          data: { dueDate: new Date(data.deadline) },
        });
      }

      // Update swap record - always keep status as COMPLETED
      const updatedSwap = await tx.swaps.update({
        where: { id },
        data: {
          swapDate: data.swapDate,
          status: "COMPLETED", // Always keep as completed
          notes: data.notes,
          difference: data.difference, // Update nilai selisih
          ...(swapDetails && {
            swapDetails: {
              deleteMany: { swapId: id },
              create: swapDetails,
            },
          }),
        },
        include: {
          swapDetails: {
            include: {
              oldItem: true,
              replacementItem: true,
            },
          },
        },
      });

      // If swap details are being updated, perform all operations like createSwap
      if (swapDetails) {
        // 1. FIRST: Reverse existing stock movements to restore original stock state
        await reverseExistingSwapStockMovements(tx, id);

        // 2. Restore invoice items to original state before applying new swap
        await restoreInvoiceItemsFromSwap(
          tx,
          existingSwap.invoiceId,
          existingSwap.swapDetails
        );

        // 3. Update invoice items with NEW replacement items
        await updateInvoiceItemsWithReplacements(
          tx,
          existingSwap.invoiceId,
          swapDetails
        );

        // 4. Delete existing deliveries for this swap and create new ones
        await tx.deliveries.deleteMany({
          where: {
            swapId: id,
          },
        });

        await createSwapDeliveries(
          tx,
          existingSwap.invoiceId,
          swapDetails,
          data.createdBy || "",
          id
        );

        // 5. Delete existing stock movements records after reversal
        await tx.stockMovements.deleteMany({
          where: { swapId: id },
        });

        // 6. Create new stock movements with updated quantities
        await createSwapStockMovements(
          tx,
          id,
          swapDetails,
          data.createdBy || ""
        );
      }

      // 7. Recalculate invoice totals after all updates
      await recalculateInvoiceTotals(tx, existingSwap.invoiceId);

      return updatedSwap;
    });

    revalidatePath("/sales/tukar");
    revalidatePath(`/sales/tukar/edit/${id}`);
    revalidatePath("/sales/invoice");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/inventory/produk");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating swap:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Delete swap
export async function deleteSwap(id: string) {
  try {
    const existingSwap = await db.swaps.findUnique({
      where: { id },
      include: {
        swapDetails: {
          include: {
            oldItem: true,
            replacementItem: true,
          },
        },
      },
    });

    if (!existingSwap) {
      throw new Error("Data tukar guling tidak ditemukan");
    }

    // Allow deletion of completed swaps for rollback purposes
    // Remove the status check to allow deletion of completed swaps

    // Start transaction to reverse all swap operations
    const result = await db.$transaction(async tx => {
      // 1. Reverse stock movements to restore original stock state
      await reverseExistingSwapStockMovements(tx, id);

      // 2. Restore invoice items to original state before swap
      await restoreInvoiceItemsFromSwap(
        tx,
        existingSwap.invoiceId,
        existingSwap.swapDetails
      );

      // 3. Delete all deliveries related to this swap
      await tx.deliveries.deleteMany({
        where: {
          swapId: id,
        },
      });

      // 4. Delete all stock movement records for this swap
      await tx.stockMovements.deleteMany({
        where: { swapId: id },
      });

      // 5. Delete swap details first (foreign key constraint)
      await tx.swapDetails.deleteMany({
        where: { swapId: id },
      });

      // 6. Delete the swap record itself
      await tx.swaps.delete({
        where: { id },
      });

      // 7. Recalculate invoice totals after restoration
      await recalculateInvoiceTotals(tx, existingSwap.invoiceId);

      return { success: true };
    });

    revalidatePath("/sales/tukar");
    revalidatePath("/sales/invoice");
    revalidatePath("/sales/pengiriman");
    revalidatePath("/inventory/produk");
    return { success: true };
  } catch (error) {
    console.error("Error deleting swap:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Helper function to restore invoice items to state before swap (for edit purposes)
async function restoreInvoiceItemsFromSwap(
  tx: any,
  invoiceId: string,
  existingSwapDetails: any[]
) {
  // Group existing swap details by oldItemId to handle multiple replacements for same old item
  const oldItemGroups = new Map<string, any[]>();

  for (const detail of existingSwapDetails) {
    if (!oldItemGroups.has(detail.oldItemId)) {
      oldItemGroups.set(detail.oldItemId, []);
    }
    oldItemGroups.get(detail.oldItemId)!.push(detail);
  }

  // Restore each old item to original quantity
  for (const [oldItemId, detailsForOldItem] of oldItemGroups) {
    const totalOldItemQuantitySwapped = detailsForOldItem.reduce(
      (sum: number, detail: any) => sum + detail.oldItemQuantity,
      0
    );

    if (totalOldItemQuantitySwapped <= 0) continue;

    // Find existing invoice item for old item
    const existingOldItem = await tx.invoiceItems.findFirst({
      where: {
        invoiceId: invoiceId,
        productId: oldItemId,
      },
    });

    if (existingOldItem) {
      // Get product pricing for old item
      const oldProduct = await tx.products.findUnique({
        where: { id: oldItemId },
        select: { sellingPrice: true },
      });

      if (!oldProduct) continue;

      // Restore original quantity and price
      const restoredQuantity =
        existingOldItem.quantity + totalOldItemQuantitySwapped;
      const restoredTotalPrice = oldProduct.sellingPrice * restoredQuantity;

      await tx.invoiceItems.update({
        where: { id: existingOldItem.id },
        data: {
          quantity: restoredQuantity,
          totalPrice: restoredTotalPrice,
        },
      });
    } else {
      // If old item doesn't exist in invoice anymore, recreate it
      const oldProduct = await tx.products.findUnique({
        where: { id: oldItemId },
        select: { sellingPrice: true },
      });

      if (!oldProduct) continue;

      await tx.invoiceItems.create({
        data: {
          invoiceId: invoiceId,
          productId: oldItemId,
          quantity: totalOldItemQuantitySwapped,
          price: oldProduct.sellingPrice,
          totalPrice: oldProduct.sellingPrice * totalOldItemQuantitySwapped,
        },
      });
    }
  }

  // Remove or reduce replacement items from previous swap
  const replacementItemGroups = new Map<string, number>();

  for (const detail of existingSwapDetails) {
    if (!replacementItemGroups.has(detail.replacementItemId)) {
      replacementItemGroups.set(detail.replacementItemId, 0);
    }
    replacementItemGroups.set(
      detail.replacementItemId,
      replacementItemGroups.get(detail.replacementItemId)! +
        detail.replacementItemQuantity
    );
  }

  // Remove replacement quantities from invoice
  for (const [
    replacementItemId,
    totalQuantityToRemove,
  ] of replacementItemGroups) {
    if (totalQuantityToRemove <= 0) continue;

    const existingReplacementItem = await tx.invoiceItems.findFirst({
      where: {
        invoiceId: invoiceId,
        productId: replacementItemId,
      },
    });

    if (existingReplacementItem) {
      const newQuantity =
        existingReplacementItem.quantity - totalQuantityToRemove;

      if (newQuantity <= 0) {
        // Remove the item completely if quantity becomes 0 or negative
        await tx.invoiceItems.delete({
          where: { id: existingReplacementItem.id },
        });
      } else {
        // Update with reduced quantity
        const newTotalPrice = existingReplacementItem.price * newQuantity;
        await tx.invoiceItems.update({
          where: { id: existingReplacementItem.id },
          data: {
            quantity: newQuantity,
            totalPrice: newTotalPrice,
          },
        });
      }
    }
  }
}

// Helper function to update invoice items with replacement items
async function updateInvoiceItemsWithReplacements(
  tx: any,
  invoiceId: string,
  swapDetails: SwapDetailData[]
) {
  // Group swap details by oldItemId to handle multiple replacements for same old item
  const oldItemGroups = new Map<string, SwapDetailData[]>();

  for (const detail of swapDetails) {
    if (!oldItemGroups.has(detail.oldItemId)) {
      oldItemGroups.set(detail.oldItemId, []);
    }
    oldItemGroups.get(detail.oldItemId)!.push(detail);
  }

  // Process each old item group
  for (const [oldItemId, detailsForOldItem] of oldItemGroups) {
    // Find the original invoice item
    const originalInvoiceItem = await tx.invoiceItems.findFirst({
      where: {
        invoiceId: invoiceId,
        productId: oldItemId,
      },
    });

    if (!originalInvoiceItem) {
      // Skip if old item not found in invoice (might be zero quantity swap)
      console.warn(`Invoice item not found for old product: ${oldItemId}`);
      continue;
    }

    // Calculate total old quantity being swapped
    const totalOldQuantitySwapped = detailsForOldItem.reduce(
      (sum, detail) => sum + detail.oldItemQuantity,
      0
    );

    // Update or delete the original invoice item based on quantity
    if (totalOldQuantitySwapped >= originalInvoiceItem.quantity) {
      // Replace entire item - delete the old item completely
      await tx.invoiceItems.delete({
        where: { id: originalInvoiceItem.id },
      });
    } else if (totalOldQuantitySwapped > 0) {
      // Partial replacement: reduce original item quantity
      const remainingOldQuantity =
        originalInvoiceItem.quantity - totalOldQuantitySwapped;

      // Gunakan finalPrice jika tersedia, fallback ke price
      const unitPrice =
        originalInvoiceItem.finalPrice || originalInvoiceItem.price;

      await tx.invoiceItems.update({
        where: { id: originalInvoiceItem.id },
        data: {
          quantity: remainingOldQuantity,
          totalPrice: unitPrice * remainingOldQuantity,
        },
      });
    }
  }

  // Group replacement items by replacementItemId to consolidate quantities
  const replacementItemGroups = new Map<
    string,
    { totalQuantity: number; details: SwapDetailData[] }
  >();

  for (const detail of swapDetails) {
    if (detail.replacementItemQuantity > 0) {
      // Only process if replacement quantity > 0
      if (!replacementItemGroups.has(detail.replacementItemId)) {
        replacementItemGroups.set(detail.replacementItemId, {
          totalQuantity: 0,
          details: [],
        });
      }
      const group = replacementItemGroups.get(detail.replacementItemId)!;
      group.totalQuantity += detail.replacementItemQuantity;
      group.details.push(detail);
    }
  }

  // Create new invoice items for replacement products
  for (const [replacementItemId, group] of replacementItemGroups) {
    // Get replacement product details for pricing
    const replacementProduct = await tx.products.findUnique({
      where: { id: replacementItemId },
      select: {
        sellingPrice: true,
        tax: {
          select: {
            nominal: true,
          },
        },
      },
    });

    if (!replacementProduct) {
      throw new Error(`Replacement product not found: ${replacementItemId}`);
    }

    // Check if this replacement item already exists in the invoice
    const existingReplacementItem = await tx.invoiceItems.findFirst({
      where: {
        invoiceId: invoiceId,
        productId: replacementItemId,
      },
    });

    const newTotalPrice = replacementProduct.sellingPrice * group.totalQuantity;

    if (existingReplacementItem) {
      // Update existing item by adding the swapped quantity
      await tx.invoiceItems.update({
        where: { id: existingReplacementItem.id },
        data: {
          quantity: existingReplacementItem.quantity + group.totalQuantity,
          totalPrice: existingReplacementItem.totalPrice + newTotalPrice,
        },
      });
    } else {
      // Create new invoice item for replacement product
      await tx.invoiceItems.create({
        data: {
          invoiceId: invoiceId,
          productId: replacementItemId,
          quantity: group.totalQuantity,
          price: replacementProduct.sellingPrice,
          totalPrice: newTotalPrice,
        },
      });
    }
  }
}

// Helper function to create delivery note for replacement items
async function createSwapDeliveries(
  tx: any,
  invoiceId: string,
  swapDetails: SwapDetailData[],
  userId: string,
  swapId: string
) {
  // Get original invoice data
  const invoice = await tx.invoices.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      invoiceItems: true,
      deliveries: {
        where: { status: "DELIVERED" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found for delivery note creation");
  }

  // Get the latest delivered delivery for reference
  const lastDelivery = invoice.deliveries[0];
  if (!lastDelivery) {
    throw new Error("No previous delivery found for this invoice");
  }

  // Generate code for new delivery
  const deliveryCode = await generateCodeByTable("Deliveries");

  // Create new delivery note for replacement items
  const newDelivery = await tx.deliveries.create({
    data: {
      code: deliveryCode,
      invoiceId: invoiceId,
      helperId: userId, // Use the user who created the swap as helper
      deliveryDate: new Date(),
      status: "DELIVERED",
      notes: `Pengiriman barang pengganti - Tukar Guling`,
      swapId: swapId, // Link delivery to swap
    },
  });

  // Create delivery items for each replacement item (grouped by replacementItemId)
  const replacementItemGroups = new Map<
    string,
    { totalQuantity: number; details: SwapDetailData[] }
  >();

  for (const detail of swapDetails) {
    if (detail.replacementItemQuantity > 0) {
      // Only process if replacement quantity > 0
      if (!replacementItemGroups.has(detail.replacementItemId)) {
        replacementItemGroups.set(detail.replacementItemId, {
          totalQuantity: 0,
          details: [],
        });
      }
      const group = replacementItemGroups.get(detail.replacementItemId)!;
      group.totalQuantity += detail.replacementItemQuantity;
      group.details.push(detail);
    }
  }

  // 5. Menggunakan debugger statement (jika menggunakan debugger)
  debugger; // Akan menghentikan eksekusi jika developer tools terbuka

  // Create delivery items for each unique replacement product
  for (const [replacementItemId, group] of replacementItemGroups) {
    // Find the invoice item for replacement product
    // Could be either updated existing item or newly created item
    const replacementInvoiceItem = await tx.invoiceItems.findFirst({
      where: {
        invoiceId: invoiceId,
        productId: replacementItemId,
      },
    });

    if (!replacementInvoiceItem) {
      throw new Error(
        `Invoice item not found for replacement product: ${replacementItemId}`
      );
    }

    // Create single delivery item for the grouped quantity
    await tx.deliveryItems.create({
      data: {
        deliveryId: newDelivery.id,
        invoiceItemId: replacementInvoiceItem.id,
        quantityToDeliver: group.totalQuantity,
        quantityDelivered: group.totalQuantity, // Delivered immediately
        status: "DELIVERED",
        notes: `Barang pengganti - Tukar Guling (Total Qty: ${group.totalQuantity})`,
      },
    });
  }

  return newDelivery;
}

// Helper function to recalculate invoice totals after items update
async function recalculateInvoiceTotals(tx: any, invoiceId: string) {
  // Get current invoice data
  const invoice = await tx.invoices.findUnique({
    where: { id: invoiceId },
    include: {
      invoiceItems: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found for total recalculation");
  }

  // Calculate new subtotal from all invoice items
  const newSubtotal = invoice.invoiceItems.reduce(
    (sum: number, item: any) => sum + item.totalPrice,
    0
  );

  // Gunakan discount dan discountType untuk menghitung diskon yang benar dari subtotal baru
  const discountValue = invoice.discount || 0;
  const discountType = invoice.discountType || "AMOUNT";

  // Hitung ulang actualDiscount berdasarkan subtotal baru
  let newActualDiscount = 0;
  if (discountType === "PERCENTAGE") {
    newActualDiscount = (newSubtotal * discountValue) / 100;
  } else {
    newActualDiscount = discountValue; // AMOUNT discount tetap sama
  }

  // Calculate total amount using new actualDiscount
  const totalAmount = newSubtotal - newActualDiscount + invoice.shippingCost;

  // Calculate remaining amount
  const remainingAmount = totalAmount - invoice.paidAmount;

  // Update invoice totals
  await tx.invoices.update({
    where: { id: invoiceId },
    data: {
      subtotal: newSubtotal,
      actualDiscount: newActualDiscount, // Update actualDiscount dengan nilai yang baru
      totalAmount: totalAmount,
      remainingAmount: remainingAmount,
    },
  });
}

// Helper function to reverse existing swap stock movements before update
async function reverseExistingSwapStockMovements(tx: any, swapId: string) {
  // Get existing stock movements for this swap
  const existingMovements = await tx.stockMovements.findMany({
    where: { swapId: swapId },
    include: {
      products: {
        select: { id: true, name: true, currentStock: true },
      },
    },
  });

  // Reverse each stock movement to restore original state
  for (const movement of existingMovements) {
    const product = movement.products;
    let restoredStock: number;
    let notes: string;
    let reverseType: StockMovementType;

    if (movement.type === "SWAP_IN") {
      // If it was SWAP_IN (barang dikembalikan), reverse it by reducing stock
      restoredStock = product.currentStock - movement.quantity;
      notes = `Reversal: Mengembalikan perubahan SWAP_IN untuk ${product.name} (${movement.quantity})`;
      reverseType = StockMovementType.SWAP_OUT;
    } else if (movement.type === "SWAP_OUT") {
      // If it was SWAP_OUT (barang diambil), reverse it by adding stock back
      restoredStock = product.currentStock + movement.quantity;
      notes = `Reversal: Mengembalikan perubahan SWAP_OUT untuk ${product.name} (${movement.quantity})`;
      reverseType = StockMovementType.SWAP_IN;
    } else {
      continue; // Skip unknown movement types
    }

    // Validate stock after reversal
    if (restoredStock < 0) {
      throw new Error(
        `Tidak dapat mengembalikan stock untuk ${product.name}. Stock saat ini: ${product.currentStock}, perlu dikurangi: ${movement.quantity}`
      );
    }

    // Create reversal stock movement record for audit trail
    await tx.stockMovements.create({
      data: {
        type: reverseType,
        quantity: movement.quantity,
        previousStock: product.currentStock,
        newStock: restoredStock,
        reference: `Reversal Tukar Guling #${swapId} - Edit Mode`,
        notes: notes,
        productId: product.id,
        userId: movement.userId,
        swapId: null, // Don't link reversal movements to swap
      },
    });

    // Update product stock to restored value
    await tx.products.update({
      where: { id: product.id },
      data: { currentStock: restoredStock },
    });
  }
}

// Helper function to create stock movements for swap
async function createSwapStockMovements(
  tx: any,
  swapId: string,
  swapDetails: SwapDetailData[],
  userId: string
) {
  // Group stock movements by product to consolidate multiple movements on same product
  const stockMovementGroups = new Map<
    string,
    {
      type: "SWAP_IN" | "SWAP_OUT";
      totalQuantity: number;
      productName: string;
      details: SwapDetailData[];
    }
  >();

  // Group old items (SWAP_IN)
  for (const detail of swapDetails) {
    if (detail.oldItemQuantity > 0) {
      const key = `${detail.oldItemId}_IN`;
      if (!stockMovementGroups.has(key)) {
        const oldProduct = await tx.products.findUnique({
          where: { id: detail.oldItemId },
          select: { name: true },
        });
        stockMovementGroups.set(key, {
          type: "SWAP_IN",
          totalQuantity: 0,
          productName: oldProduct?.name || "Unknown Product",
          details: [],
        });
      }
      const group = stockMovementGroups.get(key)!;
      group.totalQuantity += detail.oldItemQuantity;
      group.details.push(detail);
    }
  }

  // Group replacement items (SWAP_OUT)
  for (const detail of swapDetails) {
    if (detail.replacementItemQuantity > 0) {
      const key = `${detail.replacementItemId}_OUT`;
      if (!stockMovementGroups.has(key)) {
        const replacementProduct = await tx.products.findUnique({
          where: { id: detail.replacementItemId },
          select: { name: true },
        });
        stockMovementGroups.set(key, {
          type: "SWAP_OUT",
          totalQuantity: 0,
          productName: replacementProduct?.name || "Unknown Product",
          details: [],
        });
      }
      const group = stockMovementGroups.get(key)!;
      group.totalQuantity += detail.replacementItemQuantity;
      group.details.push(detail);
    }
  }

  // Process grouped stock movements
  for (const [key, group] of stockMovementGroups) {
    const productId = key.split("_")[0];
    const movementType = group.type;

    // Get current stock
    const product = await tx.products.findUnique({
      where: { id: productId },
      select: { currentStock: true, name: true },
    });

    if (!product) {
      throw new Error(`Product not found for stock movement: ${productId}`);
    }

    let newStock: number;
    let reference: string;
    let notes: string;

    if (movementType === "SWAP_IN") {
      // Old item return
      newStock = product.currentStock + group.totalQuantity;
      reference = `Tukar Guling #${swapId} - Barang Dikembalikan`;
      notes = `Pengembalian: ${group.productName} (Total: ${group.totalQuantity})`;
    } else {
      // Replacement item out
      newStock = product.currentStock - group.totalQuantity;
      reference = `Tukar Guling #${swapId} - Barang Pengganti`;
      notes = `Penggantian: ${group.productName} (Total: ${group.totalQuantity})`;

      if (newStock < 0) {
        throw new Error(
          `Stok tidak mencukupi untuk item pengganti: ${group.productName}. Stok saat ini: ${product.currentStock}, diminta: ${group.totalQuantity}`
        );
      }
    }

    // Create stock movement record
    await tx.stockMovements.create({
      data: {
        type: movementType as StockMovementType,
        quantity: group.totalQuantity,
        previousStock: product.currentStock,
        newStock: newStock,
        reference: reference,
        notes: notes,
        productId: productId,
        userId: userId,
        swapId: swapId,
      },
    });

    // Update product stock
    await tx.products.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });
  }
}

// Get swaps by invoice ID
export async function getSwapsByInvoiceId(invoiceId: string) {
  try {
    const swaps = await db.swaps.findMany({
      where: { invoiceId: invoiceId },
      include: {
        swapDetails: {
          include: {
            oldItem: true,
            replacementItem: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return swaps;
  } catch (error) {
    console.error("Error fetching swaps by invoice ID:", error);
    throw new Error("Gagal mengambil data tukar guling");
  }
}

// Get invoice details by ID
export async function getInvoiceById(id: string) {
  try {
    const invoice = await db.invoices.findUnique({
      where: { id },
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
      throw new Error("Invoice tidak ditemukan");
    }

    return invoice;
  } catch (error) {
    console.error("Error fetching invoice by ID:", error);
    throw new Error("Gagal mengambil data invoice");
  }
}
