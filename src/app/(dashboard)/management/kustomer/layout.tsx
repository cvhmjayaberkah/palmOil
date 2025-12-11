// app/management/kustomer/layout.tsx
"use client";

import React, { useState, useEffect } from "react";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default function KustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/customers?includeInactive=true");
      const data = await response.json();
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();

    // Listen for focus event to refresh data when user comes back to the page
    const handleFocus = () => {
      fetchCustomers();
    };

    // Listen for storage events to refresh data when customer is added
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "customer_updated") {
        fetchCustomers();
        // Clear the flag
        localStorage.removeItem("customer_updated");
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorageChange);

    // Also check for storage on mount in case user is on the same tab
    const customerUpdated = localStorage.getItem("customer_updated");
    if (customerUpdated) {
      fetchCustomers();
      localStorage.removeItem("customer_updated");
    }

    // Set up interval to refresh data every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchCustomers();
    }, 30000); // 30 seconds

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, []);

  // Data defined or fetched on the client side
  const myStaticData = {
    module: "management",
    subModule: "kustomer",
    allowedRole: ["OWNER", "ADMIN"],
    data: customers,
    loading,
    refetch: fetchCustomers,
  };

  return (
    // Wrap children with your DataProvider
    <DataProvider data={myStaticData}>
      <div>
        {children}
        <Toaster
          duration={2300}
          theme="system"
          position="top-right"
          offset={{ top: "135px" }}
          swipeDirections={["right"]}
          closeButton
          richColors
        />
      </div>
    </DataProvider>
  );
}
