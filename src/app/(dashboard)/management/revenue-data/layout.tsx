import React from "react";
import { getRevenueAnalytics } from "@/lib/actions/revenue-analytics";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default async function RevenueDataLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const myStaticData = {
    module: "management",
    subModule: "revenue-data",
    allowedRole: ["OWNER", "ADMIN"],
    data: await getRevenueAnalytics(),
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
