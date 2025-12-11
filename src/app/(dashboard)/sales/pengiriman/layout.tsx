import { getDeliveries } from "@/lib/actions/deliveries";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pengiriman | Sales Management",
  description: "Kelola pengiriman untuk invoice yang telah dikirim",
};

export default async function PengirimanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ambil data deliveries dari database
  const deliveriesData = await getDeliveries();
  
  const myStaticData = {
    module: "sales",
    subModule: "pengiriman",
    allowedRole: ["OWNER", "HELPER"],
    data: deliveriesData,
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
