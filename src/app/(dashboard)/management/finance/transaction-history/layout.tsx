import { getTransactionHistory } from "./actions";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riwayat Transaksi | Finance Management",
  description: "Kelola riwayat transaksi lengkap dari order hingga pembayaran",
};

export default async function TransactionHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const myStaticData = {
    module: "finance",
    subModule: "transaction-history",
    allowedRole: ["OWNER", "ADMIN"],
    data: await getTransactionHistory(),
  };

  return (
    <DataProvider data={myStaticData}>
      <div>
        {children}
        <Toaster
          duration={2300}
          theme="system"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontSize: "14px",
              padding: "12px 16px",
            },
          }}
        />
      </div>
    </DataProvider>
  );
}
