// app/management/profil/layout.tsx

import React from "react"; // Essential for JSX in Next.js 13+ App Router

import { getCompanyProfiles } from "@/lib/actions/company-profiles";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";

export default async function ProfilLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Data defined or fetched on the server side
  const myStaticData = {
    module: "management",
    subModule: "Profil",
    allowedRole: ["OWNER", "ADMIN"],
    data: await getCompanyProfiles(), // Await the async function
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
