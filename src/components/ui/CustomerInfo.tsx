"use client";

import React, { useState, useEffect } from "react";
import { getCustomerById } from "@/lib/actions/customers";
import { Customers } from "@prisma/client";

interface CustomerInfoProps {
  customerId: string;
  orderNumber?: string;
  className?: string;
}

export default function CustomerInfo({
  customerId,
  orderNumber,
  className = "",
}: CustomerInfoProps) {
  const [customer, setCustomer] = useState<Customers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const customerData = await getCustomerById(customerId);
        setCustomer(customerData);
      } catch (err) {
        console.error("Error fetching customer:", err);
        setError("Gagal memuat informasi pelanggan");
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  if (!customerId) return null;

  if (error) {
    return (
      <div
        className={`mt-4 border rounded-lg border-red-300 dark:border-red-600 p-4 ${className}`}
      >
        <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div
      className={`mt-4 border rounded-lg border-gray-300 dark:border-gray-600 overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={() => setShowInfo(!showInfo)}
        className="w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center transition-colors duration-200"
      >
        <span className="font-medium text-gray-700 dark:text-gray-100">
          Informasi Pelanggan
        </span>
        <span
          className={`text-gray-500 transform transition-transform duration-300 ease-in-out ${
            showInfo ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>

      {/* Customer Info with Inline Style Animation */}
      <div
        style={{
          maxHeight: showInfo ? "1000px" : "0px",
          opacity: showInfo ? 1 : 0,
          transition: "max-height 0.5s ease-in-out, opacity 0.5s ease-in-out",
          overflow: "hidden",
        }}
      >
        <div className="overflow-hidden">
          <div className="p-4 border-t border-gray-300 dark:border-gray-600">
            {isLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : customer ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Pelanggan
                  </label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {customer.name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kode Pelanggan
                  </label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {customer.code}
                  </div>
                </div>
                {/* {orderNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nomor Order
                    </label>
                    <div className="mt-1 text-gray-900 dark:text-gray-100">
                      {orderNumber}
                    </div>
                  </div>
                )} */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {customer.email || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telepon
                  </label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {customer.phone || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Alamat
                  </label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {customer.address}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kota
                  </label>
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {customer.city}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                Informasi pelanggan tidak ditemukan
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
