// app/layout.tsx

import React from "react"; // Essential for JSX in Next.js 13+ App Router

import { getProducts } from "@/lib/actions/products";
import { DataProvider } from "@/contexts/StaticData"; // <-- Corrected import
import { Toaster } from "sonner";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Data defined or fetched on the server side
  const myStaticData = {
    module: "inventory",
    subModule: "Produk",
    allowedRole: ["OWNER", "ADMIN"],
    data: await getProducts(), // Await the async function
  };

  return (
    // Wrap children with your DataProvider
    <DataProvider data={myStaticData}>
      <div>
        {children}{" "}
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
