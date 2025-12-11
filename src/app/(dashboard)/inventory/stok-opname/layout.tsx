// app/inventory/stok-opname/layout.tsx

import React from "react"; // Essential for JSX in Next.js 13+ App Router

import { getStockOpnames } from "@/lib/actions/stockOpnames";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default async function StokOpnameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Data defined or fetched on the server side
  const myStaticData = {
    module: "inventory",
    subModule: "stok-opname",
    allowedRole: ["OWNER", "WAREHOUSE", "ADMIN"],
    data: await getStockOpnames(), // Await the async function
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
