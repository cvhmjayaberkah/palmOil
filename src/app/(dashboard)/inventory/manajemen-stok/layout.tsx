// app/inventory/manajemen-stok/layout.tsx

import React from "react"; // Essential for JSX in Next.js 13+ App Router

import { getManagementStocks } from "@/lib/actions/managementStocks";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default async function ManajemenStokLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Data defined or fetched on the server side
  const myStaticData = {
    module: "inventory",
    subModule: "manajemen-stok",
    allowedRole: ["OWNER", "WAREHOUSE", "ADMIN"],
    data: await getManagementStocks(), // Await the async function
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
