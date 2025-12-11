"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getInvoiceTransactionHistory,
  InvoiceTransactionHistoryItem,
} from "@/lib/actions/invoice-transaction-history";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default function TransactionHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, setTransactions] = useState<
    InvoiceTransactionHistoryItem[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    console.log(
      "🔄 fetchTransactions called at:",
      new Date().toLocaleTimeString()
    );
    try {
      setLoading(true);
      const data = await getInvoiceTransactionHistory();
      setTransactions(data || []);
      console.log(
        "✅ Data loaded successfully:",
        data?.length || 0,
        "transactions"
      );
    } catch (error) {
      console.error("❌ Error fetching transaction history:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load data hanya saat pertama kali component mount
    let mounted = true;

    const loadInitialData = async () => {
      if (mounted) {
        await fetchTransactions();
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array untuk mencegah re-run

  const myStaticData = useMemo(
    () => ({
      module: "purchasing",
      subModule: "transaction-history",
      allowedRole: ["OWNER", "ADMIN"],
      data: transactions,
      loading,
      refetch: fetchTransactions,
    }),
    [transactions, loading, fetchTransactions]
  );

  return (
    <DataProvider data={myStaticData}>
      <div>
        {children}
        <Toaster
          duration={2300}
          theme="system"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontSize: "14px",
              padding: "12px 16px",
            },
          }}
        />
      </div>
    </DataProvider>
  );
}
