// app/purchasing/pengeluaran/layout.tsx

import React from "react"; // Essential for JSX in Next.js 13+ App Router

import { getExpenses, ExpenseWithDetails } from "@/lib/actions/expenses";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default async function ExpenseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const myStaticData = {
    module: "purchasing",
    subModule: "pengeluaran",
    allowedRole: ["OWNER", "ADMIN"],
    data: await getExpenses(),
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
