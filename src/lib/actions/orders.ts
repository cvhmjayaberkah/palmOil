"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateCodeByTable } from "@/utils/getCode";

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  discount?: number; // Diskon per item
  discountType?: "AMOUNT" | "PERCENTAGE"; // Tipe diskon per item
  crates?: number; // Jumlah krat
}

export async function createOrder({
  salesId,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  customerCity,
  items,
  notes,
  deliveryAddress,
  discountType,
  discountUnit,
  discount,
  shippingCost,
  paymentType,
  paymentDeadline,
  requiresConfirmation = false,
}: {
  salesId: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  items: OrderItem[];
  notes?: string;
  deliveryAddress?: string;
  discountType?: string;
  discountUnit?: string;
  discount?: number;
  shippingCost?: number;
  paymentType?: "IMMEDIATE" | "DEFERRED";
  paymentDeadline?: Date;
  requiresConfirmation?: boolean;
}) {
  try {
    // Validate required fields
    if (!salesId || !customerName || !items || items.length === 0) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    // Validate that sales rep exists
    const salesRep = await db.users.findUnique({
      where: { id: salesId },
      select: { id: true, role: true },
    });

    if (!salesRep) {
      return {
        success: false,
        error: "Sales representative not found",
      };
    }

    if (salesRep.role !== "SALES") {
      return {
        success: false,
        error: "User is not a sales representative",
      };
    }

    // Calculate total amount with both order-level and item-level discounts
    let subtotal = 0;
    let totalItemDiscounts = 0;

    // Calculate subtotal and item-level discounts using actual product prices
    for (const item of items) {
      // Find product to get selling price
      const product = await db.products.findFirst({
        where: { name: item.productName },
      });

      if (!product) {
        throw new Error(`Produk ${item.productName} tidak ditemukan`);
      }

      const productPrice = product.sellingPrice || 0;

      // Krat langsung dikali harga, bukan quantity dikali harga
      const itemSubtotal = (item.crates || 0) * productPrice;
      subtotal += itemSubtotal;

      // Calculate item-level discount
      if (item.discount && item.discount > 0) {
        // Diskon item mengurangi harga terlebih dahulu kemudian dikali crates
        let priceAfterDiscount = productPrice;

        if (item.discountType === "PERCENTAGE") {
          priceAfterDiscount =
            productPrice - (productPrice * item.discount) / 100;
        } else {
          // AMOUNT discount type (default)
          priceAfterDiscount = productPrice - item.discount;
        }

        // Hitung selisih dengan harga asli dikali crates
        const originalTotal = (item.crates || 0) * productPrice;
        const discountedTotal =
          (item.crates || 0) * Math.max(0, priceAfterDiscount);

        totalItemDiscounts += originalTotal - discountedTotal;
      }
    }

    // Calculate order-level discount (applied to subtotal after item discounts)
    let orderLevelDiscount = 0;
    if (discountType === "OVERALL" && discount && discount > 0) {
      const subtotalAfterItemDiscounts = subtotal - totalItemDiscounts;
      if (discountUnit === "PERCENTAGE") {
        orderLevelDiscount = (subtotalAfterItemDiscounts * discount) / 100;
      } else {
        orderLevelDiscount = discount;
      }
    }

    const totalDiscount = totalItemDiscounts + orderLevelDiscount;
    const totalAmount = subtotal - totalDiscount + (shippingCost || 0);

    // Handle customer logic
    let finalCustomerId: string;

    if (customerId) {
      // Use existing customer if customerId is provided
      const existingCustomer = await db.customers.findUnique({
        where: { id: customerId },
      });

      if (!existingCustomer) {
        return {
          success: false,
          error: "Customer tidak ditemukan",
        };
      }

      finalCustomerId = existingCustomer.id;
    } else {
      // Create new customer or find by name
      const existingCustomer = await db.customers.findFirst({
        where: {
          name: { equals: customerName, mode: "insensitive" },
        },
      });

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;

        // Update existing customer information if provided
        if (customerEmail || customerPhone || customerAddress || customerCity) {
          await db.customers.update({
            where: { id: existingCustomer.id },
            data: {
              ...(customerEmail && { email: customerEmail }),
              ...(customerPhone && { phone: customerPhone }),
              ...(customerAddress && { address: customerAddress }),
              ...(customerCity && { city: customerCity }),
              updatedAt: new Date(),
            },
          });
        }
      } else {
        // Generate customer code using getCode.ts
        const customerCode = await generateCodeByTable("Customers");

        const newCustomer = await db.customers.create({
          data: {
            id: `cust_${Date.now()}`, // Generate unique ID
            code: customerCode, // Use generated code from getCode.ts
            name: customerName,
            email: customerEmail || null,
            phone: customerPhone || null,
            address:
              customerAddress || deliveryAddress || "Alamat belum diverifikasi",
            city: customerCity || "Unknown",
            updatedAt: new Date(),
          },
        });
        finalCustomerId = newCustomer.id;
      }
    }

    // Generate order number with format ORD-YYYYMM-XXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    // Get the count of orders for this month to generate sequential number
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const monthlyOrderCount = await db.orders.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const sequentialNumber = String(monthlyOrderCount + 1).padStart(3, "0");
    const orderNumber = `ORD-${yearMonth}-${sequentialNumber}`;

    // Create the order
    const order = await db.orders.create({
      data: {
        id: `ord_${Date.now()}`, // Generate unique ID
        orderNumber: orderNumber,
        customerId: finalCustomerId,
        salesId: salesId, // Using salesId as per schema
        totalAmount,
        status: requiresConfirmation ? "PENDING_CONFIRMATION" : "NEW",
        requiresConfirmation,
        notes: notes || null,
        orderDate: new Date(),
        dueDate:
          paymentType === "IMMEDIATE"
            ? new Date()
            : paymentDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Immediate or deadline/7 days default
        deliveryAddress:
          deliveryAddress || customerAddress || "Alamat belum ditentukan",
        discount: discountType === "OVERALL" ? discount || 0 : 0,
        discountType: (discountType as any) || "OVERALL",
        discountUnit: (discountUnit as any) || "AMOUNT",
        shippingCost: shippingCost || 0,
        paymentType: (paymentType as any) || "IMMEDIATE",
        paymentDeadline:
          paymentType === "IMMEDIATE" ? null : paymentDeadline || null,
        subtotal: subtotal,
        totalDiscount: totalDiscount,
        updatedAt: new Date(),
      },
    });

    // Create order items by looking up products by name
    const orderItems = [];
    const notFoundProducts = [];
    const insufficientStockProducts = [];

    for (const item of items) {
      // Find product by name
      const product = await db.products.findFirst({
        where: {
          name: {
            equals: item.productName,
            mode: "insensitive",
          },
          isActive: true,
        },
      });

      if (!product) {
        notFoundProducts.push(item.productName);
        continue;
      }

      // Check if there's enough stock (convert crates to bottles for stock check)
      const requiredBottles = (item.crates || 0) * product.bottlesPerCrate;
      if (product.currentStock < requiredBottles) {
        insufficientStockProducts.push({
          productName: item.productName,
          available: product.currentStock,
          required: requiredBottles,
        });
        // Continue creating the order item but log the issue
      }

      // Get selling price from database, fallback to 0 if null
      const productPrice = product.sellingPrice || 0;

      // Create order item using product selling price from database
      const orderItem = await db.orderItems.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: item.crates || 0, // Simpan krat ke kolom quantity
          price: productPrice, // Use sellingPrice from database
          discount: item.discount || 0,
          discountType: item.discountType || "AMOUNT",
          totalPrice: (item.crates || 0) * productPrice,
        },
      });

      orderItems.push(orderItem);

      // Update product stock only if order doesn't require confirmation
      if (!requiresConfirmation) {
        await db.products.update({
          where: { id: product.id },
          data: {
            currentStock: Math.max(
              0,
              product.currentStock -
                (item.crates || 0) * product.bottlesPerCrate
            ),
          },
        });
      }
    }

    // Check if any critical errors occurred
    if (notFoundProducts.length > 0) {
      console.warn(`Products not found: ${notFoundProducts.join(", ")}`);
    }

    if (insufficientStockProducts.length > 0) {
      console.warn(
        `Insufficient stock for products:`,
        insufficientStockProducts
      );
    }

    // Fetch the complete order with all relations
    const completeOrder = await db.orders.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        sales: true, // This is the sales rep relation
        orderItems: {
          include: {
            products: true, // Include product details
          },
        },
      },
    });

    revalidatePath("/orders");
    revalidatePath("/admin/orders");

    return {
      success: true,
      data: completeOrder,
      message: requiresConfirmation
        ? "Order berhasil dibuat dan menunggu konfirmasi admin!"
        : "Order berhasil dibuat!",
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

export async function getOrders({
  salesId,
  status,
  requiresConfirmation,
}: {
  salesId?: string;
  status?: string;
  requiresConfirmation?: boolean;
} = {}) {
  try {
    const where: Record<string, unknown> = {};

    if (salesId) {
      where.salesId = salesId; // Using salesId as per schema
    }

    if (status) {
      where.status = status;
    }

    if (requiresConfirmation !== undefined) {
      where.requiresConfirmation = requiresConfirmation;
    }

    const orders = await db.orders.findMany({
      where,
      include: {
        customer: true,
        sales: true, // This is the sales rep relation
        orderItems: {
          include: {
            products: true, // Include product details for better display
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to match the expected format
    const transformedOrders = orders.map(order => ({
      ...order,
      order_items: order.orderItems,
    }));


    return {
      success: true,
      data: transformedOrders,
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      success: false,
      error: "Internal server error",
      data: [],
    };
  }
}

// Function specifically for sales dashboard to get latest 5 orders
export async function getLatestOrdersForDashboard({
  salesId,
  limit = 5,
}: {
  salesId?: string;
  limit?: number;
} = {}) {
  try {
    const where: Record<string, unknown> = {};

    if (salesId) {
      where.salesId = salesId; // Using salesId as per schema
    }

    const orders = await db.orders.findMany({
      where,
      include: {
        customer: true,
        sales: true, // This is the sales rep relation
        orderItems: {
          include: {
            products: true, // Include product details for better display
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit, // Limit to latest 5 orders
    });

    // Transform the data to match the expected format
    const transformedOrders = orders.map(order => ({
      ...order,
      order_items: order.orderItems,
    }));

    return {
      success: true,
      data: transformedOrders,
    };
  } catch (error) {
    console.error("Error fetching latest orders for dashboard:", error);
    return {
      success: false,
      error: "Internal server error",
      data: [],
    };
  }
}

export async function confirmOrder({
  orderId,
  approve,
  adminNotes,
  confirmedBy,
}: {
  orderId: string;
  approve: boolean;
  adminNotes?: string;
  confirmedBy: string;
}) {
  try {
    const order = await db.orders.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            products: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    // If approving the order, update product stock
    if (approve) {
      for (const orderItem of order.orderItems) {
        const product = orderItem.products;
        await db.products.update({
          where: { id: product.id },
          data: {
            currentStock: Math.max(
              0,
              product.currentStock - orderItem.quantity
            ),
          },
        });
      }
    }

    const updatedOrder = await db.orders.update({
      where: { id: orderId },
      data: {
        status: approve ? "NEW" : "CANCELED",
        confirmedAt: new Date(),
        confirmedBy,
        adminNotes: adminNotes || null,
      },
      include: {
        customer: true,
        sales: true, // This is the sales rep relation
        orderItems: {
          include: {
            products: true,
          },
        },
      },
    });

    revalidatePath("/admin/orders");
    revalidatePath("/orders");

    return {
      success: true,
      data: updatedOrder,
      message: approve
        ? "Order berhasil dikonfirmasi!"
        : "Order berhasil ditolak!",
    };
  } catch (error) {
    console.error("Error confirming order:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

export async function getOrderById(orderId: string) {
  try {
    const order = await db.orders.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        sales: true,
        orderItems: {
          include: {
            products: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    // Transform the data to match the expected format
    const transformedOrder = {
      ...order,
      order_items: order.orderItems,
    };

    return {
      success: true,
      data: transformedOrder,
    };
  } catch (error) {
    console.error("Error fetching order:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

export async function updateOrder({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  notes,
  deliveryAddress,
  paymentDeadline,
  discountType,
  discountUnit,
  totalDiscount,
  shippingCost,
  paymentType,
  items,
}: {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  deliveryAddress?: string;
  paymentDeadline?: Date;
  discountType?: "OVERALL" | "PER_CRATE";
  discountUnit?: "AMOUNT" | "PERCENTAGE";
  totalDiscount?: number;
  shippingCost?: number;
  paymentType?: "IMMEDIATE" | "DEFERRED";
  items: Array<{
    id?: string;
    productId: string;
    quantity: number;
    crates?: number;
    discount?: number;
    discountType?: "AMOUNT" | "PERCENTAGE";
  }>;
}) {
  try {
    // Check if order exists and can be edited
    const existingOrder = await db.orders.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: true,
      },
    });

    if (!existingOrder) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    // Only allow editing for NEW and PENDING_CONFIRMATION status
    if (!["NEW", "PENDING_CONFIRMATION"].includes(existingOrder.status)) {
      return {
        success: false,
        error: "Order cannot be edited in current status",
      };
    }

    // Calculate new total amount with both order-level and item-level discounts
    let subtotal = 0;
    let totalItemDiscounts = 0;

    // Calculate subtotal and item-level discounts using database prices
    for (const item of items) {
      // Get product to fetch selling price
      const product = await db.products.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
      }

      const productPrice = product.sellingPrice || 0;

      // Krat langsung dikali harga, bukan quantity dikali harga
      const itemSubtotal = (item.crates || 0) * productPrice;
      subtotal += itemSubtotal;

      // Calculate item-level discount
      if (item.discount && item.discount > 0) {
        // Diskon item mengurangi harga terlebih dahulu kemudian dikali crates
        let priceAfterDiscount = productPrice;

        if (item.discountType === "PERCENTAGE") {
          priceAfterDiscount =
            productPrice - (productPrice * item.discount) / 100;
        } else {
          // AMOUNT discount type (default)
          priceAfterDiscount = productPrice - item.discount;
        }

        // Hitung selisih dengan harga asli dikali crates
        const originalTotal = (item.crates || 0) * productPrice;
        const discountedTotal =
          (item.crates || 0) * Math.max(0, priceAfterDiscount);

        totalItemDiscounts += originalTotal - discountedTotal;
      }
    }

    // Calculate order-level discount (applied to subtotal after item discounts)
    let orderLevelDiscount = 0;
    if (discountType === "OVERALL" && totalDiscount && totalDiscount > 0) {
      const subtotalAfterItemDiscounts = subtotal - totalItemDiscounts;
      if (discountUnit === "PERCENTAGE") {
        orderLevelDiscount = (subtotalAfterItemDiscounts * totalDiscount) / 100;
      } else {
        orderLevelDiscount = totalDiscount;
      }
    }

    const finalTotalDiscount = totalItemDiscounts + orderLevelDiscount;
    const totalAmount = subtotal - finalTotalDiscount + (shippingCost || 0);


    // Update customer data if provided
    if (customerName || customerEmail || customerPhone) {
      await db.customers.update({
        where: { id: existingOrder.customerId },
        data: {
          ...(customerName && { name: customerName }),
          ...(customerEmail !== undefined && { email: customerEmail || null }),
          ...(customerPhone !== undefined && { phone: customerPhone || null }),
          ...(deliveryAddress && { address: deliveryAddress }),
        },
      });
    }

    // Update order
    const updatedOrder = await db.orders.update({
      where: { id: orderId },
      data: {
        notes: notes || undefined,
        deliveryAddress: deliveryAddress || undefined,
        paymentDeadline: paymentDeadline || undefined,
        discountType: discountType || undefined,
        discountUnit: discountUnit || undefined,
        totalDiscount: finalTotalDiscount,
        shippingCost: shippingCost || 0,
        paymentType: paymentType || undefined,
        totalAmount,
        updatedAt: new Date(),
      },
    });

    // Handle order items - delete existing and create new ones
    await db.orderItems.deleteMany({
      where: { orderId },
    });

    // Create new order items
    for (const item of items) {
      // Get product to fetch selling price
      const product = await db.products.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
      }

      const productPrice = product.sellingPrice || 0;


      await db.orderItems.create({
        data: {
          orderId,
          productId: item.productId,
          quantity: item.crates || 0, // Simpan krat ke kolom quantity
          price: productPrice, // Use selling price from database
          discount: item.discount || 0,
          discountType: item.discountType || "AMOUNT",
          totalPrice: (item.crates || 0) * productPrice,
        },
      });
    }

    // Fetch updated order with relations
    const completeOrder = await db.orders.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        sales: true,
        orderItems: {
          include: {
            products: true,
          },
        },
      },
    });

    revalidatePath("/sales/orders");
    revalidatePath("/sales/order-history");

    return {
      success: true,
      data: completeOrder,
      message: "Order berhasil diperbarui!",
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

export async function cancelOrder(orderId: string, reason?: string) {
  try {
    const existingOrder = await db.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        orderItems: {
          include: {
            products: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    // Only allow cancellation for certain statuses
    if (
      !["NEW", "PENDING_CONFIRMATION", "IN_PROCESS"].includes(
        existingOrder.status
      )
    ) {
      return {
        success: false,
        error: "Order cannot be cancelled in current status",
      };
    }

    // If order was confirmed and stock was reduced, restore the stock
    if (existingOrder.status === "IN_PROCESS") {
      for (const item of existingOrder.orderItems) {
        await db.products.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    // Update order status to CANCELED
    const cancelledOrder = await db.orders.update({
      where: { id: orderId },
      data: {
        status: "CANCELED",
        notes: reason ? `CANCELLED: ${reason}` : "CANCELLED",
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        sales: true,
        orderItems: {
          include: {
            products: true,
          },
        },
      },
    });

    revalidatePath("/sales/orders");
    revalidatePath("/sales/order-history");
    revalidatePath("/admin/orders");

    return {
      success: true,
      data: cancelledOrder,
      message: "Order berhasil dibatalkan!",
    };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  notes?: string
) {
  try {
    const existingOrder = await db.orders.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            products: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return {
        success: false,
        error: "Order not found",
      };
    }

    // Handle stock changes based on status transitions
    const oldStatus = existingOrder.status;

    // If moving from PENDING_CONFIRMATION to IN_PROCESS, reduce stock
    if (oldStatus === "PENDING_CONFIRMATION" && newStatus === "IN_PROCESS") {
      for (const item of existingOrder.orderItems) {
        const product = await db.products.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return {
            success: false,
            error: `Product with ID ${item.productId} not found`,
          };
        }

        if (product.currentStock < item.quantity) {
          return {
            success: false,
            error: `Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}`,
          };
        }

        await db.products.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    // If moving from IN_PROCESS back to PENDING_CONFIRMATION, restore stock
    if (oldStatus === "IN_PROCESS" && newStatus === "PENDING_CONFIRMATION") {
      for (const item of existingOrder.orderItems) {
        await db.products.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    // Update order status
    const updatedOrder = await db.orders.update({
      where: { id: orderId },
      data: {
        status: newStatus as any,
        notes: notes || existingOrder.notes,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        sales: true,
        orderItems: {
          include: {
            products: true,
          },
        },
      },
    });

    revalidatePath("/sales/orders");
    revalidatePath("/sales/order-history");
    revalidatePath("/admin/orders");

    return {
      success: true,
      data: updatedOrder,
      message: `Order status berhasil diubah ke ${newStatus}!`,
    };
  } catch (error) {
    console.error("Error updating order status:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
}
