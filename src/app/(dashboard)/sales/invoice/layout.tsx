// app/sales/invoice/layout.tsx

import React from "react"; // Essential for JSX in Next.js 13+ App Router

import { getInvoices, InvoiceWithDetails } from "@/lib/actions/invoices";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default async function InvoiceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Data defined or fetched on the server side with error handling
  // let invoicesData: InvoiceWithDetails[] = [];

  // try {
  //   invoicesData = await getInvoices();
  // } catch (error) {
  //   console.error("Failed to fetch invoices:", error);
  //   // Use empty array as fallback during build time
  //   invoicesData = [];
  // }

  const myStaticData = {
    module: "sales",
    subModule: "invoice",
    allowedRole: ["OWNER", "ADMIN"],
    data: await getInvoices(),
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
