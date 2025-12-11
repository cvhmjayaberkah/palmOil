// app/purchasing/layout.tsx
import React from "react";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default async function PurchasingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const myStaticData = {
    module: "purchasing",
    subModule: "",
    allowedRole: ["OWNER", "ADMIN"],
  };

  return (
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
