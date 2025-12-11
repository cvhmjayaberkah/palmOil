
"use client";

import React from "react";

export default function OrdersPage() {
  const orders = [
    {
      id: '10001',
      details: 'Kring New Fit office chair, mesh + PU, black',
      status: 'Delivered',
      statusColor: 'green',
      date: '16/10/2021',
      total: '$200.00'
    },
    {
      id: '10002',
      details: 'Ergonomic Desk Chair with Lumbar Support',
      status: 'Shipped',
      statusColor: 'yellow',
      date: '20/10/2021',
      total: '$250.00'
    },
    {
      id: '10003',
      details: 'Modern Standing Desk Converter',
      status: 'Processing',
      statusColor: 'blue',
      date: '25/10/2021',
      total: '$300.00'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Your Orders</h1>
      
      {/* Container dengan scroll horizontal */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                No.
              </th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Details
              </th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr 
                key={order.id} 
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="p-3 whitespace-nowrap">
                  <a 
                    href="#" 
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {order.id}
                  </a>
                </td>
                <td className="p-3">
                  <div className="max-w-[250px] truncate text-sm">
                    {order.details}
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <span 
                    className={`
                      inline-flex items-center px-2.5 py-0.5 
                      rounded-full text-xs font-medium
                      ${
                        order.statusColor === 'green' 
                          ? 'bg-green-100 text-green-800'
                          : order.statusColor === 'yellow'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }
                    `}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap text-sm">
                  {order.date}
                </td>
                <td className="p-3 whitespace-nowrap text-sm">
                  {order.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
