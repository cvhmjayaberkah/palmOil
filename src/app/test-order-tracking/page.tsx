"use client";

import { OrderTracking } from "@/components/sales";

export default function TestOrderTrackingPage() {
  // Example order data with different statuses and dates
  const exampleOrders = [
    {
      id: "1",
      status: "NEW",
      orderDate: new Date("2024-10-05T21:09:00"),
      requiresConfirmation: false,
    },
    {
      id: "2",
      status: "PENDING_CONFIRMATION",
      orderDate: new Date("2024-10-05T21:09:00"),
      requiresConfirmation: true,
    },
    {
      id: "3",
      status: "PROCESSING",
      orderDate: new Date("2024-10-05T21:09:00"),
      confirmedAt: new Date("2024-10-05T21:15:00"),
      requiresConfirmation: true,
    },
    {
      id: "4",
      status: "COMPLETED",
      orderDate: new Date("2024-10-05T21:09:00"),
      confirmedAt: new Date("2024-10-05T21:15:00"),
      completedAt: new Date("2024-10-05T22:30:00"),
      requiresConfirmation: true,
    },
    {
      id: "5",
      status: "CANCELLED",
      orderDate: new Date("2024-10-05T21:09:00"),
      canceledAt: new Date("2024-10-05T21:45:00"),
      requiresConfirmation: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Order Tracking Status Examples
        </h1>

        <div className="grid gap-6">
          {exampleOrders.map((order, index) => (
            <div key={order.id} className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Order {index + 1}: Status "{order.status}"
              </h2>
              <OrderTracking
                status={order.status}
                orderDate={order.orderDate}
                confirmedAt={order.confirmedAt || null}
                completedAt={order.completedAt || null}
                canceledAt={order.canceledAt || null}
                requiresConfirmation={order.requiresConfirmation}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
