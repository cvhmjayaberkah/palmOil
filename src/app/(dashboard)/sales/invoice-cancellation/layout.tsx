// app/(dashboard)/sales/invoice-cancellation/layout.tsx

import React from "react"; // Essential for JSX in Next.js 13+ App Router

import { getCancelableInvoices } from "@/lib/actions/invoices";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default async function InvoiceCancellationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Data defined or fetched on the server side with error handling
  let cancelableInvoicesData: any[] = [];

  try {
    cancelableInvoicesData = await getCancelableInvoices();
  } catch (error) {
    console.error("Failed to fetch cancelable invoices:", error);
    // Use empty array as fallback during build time
    cancelableInvoicesData = [];
  }

  const myStaticData = {
    module: "sales",
    subModule: "invoice-cancellation",
    allowedRole: ["OWNER", "ADMIN"],
    data: cancelableInvoicesData,
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
