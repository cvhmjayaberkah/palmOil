import { ReactNode } from "react";
import { StaticDataProvider } from "@/contexts/StaticData";

async function getStaticData() {
  // You can add any static data fetching here if needed
  return {
    module: "management",
    subModule: "detailed-transactions",
    allowedRole: ["OWNER", "ADMIN", "SALES"], // Adjust roles as needed
    data: [], // Add any specific data if needed
  };
}

export default async function DetailedTransactionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const myStaticData = await getStaticData();

  return (
    <StaticDataProvider data={myStaticData}>
      {children}
    </StaticDataProvider>
  );
}
