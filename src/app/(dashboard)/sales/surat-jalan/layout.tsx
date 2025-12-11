import { getDeliveryNotes } from "@/lib/actions/deliveryNotes";
import { DataProvider } from "@/contexts/StaticData";
import { Toaster } from "sonner";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Surat Jalan | Sales Management",
  description: "Kelola surat jalan untuk pengiriman produk",
};

export default async function SuratJalanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const myStaticData = {
    module: "sales",
    subModule: "surat-jalan",
    allowedRole: ["OWNER", "ADMIN"],
    data: await getDeliveryNotes(), // fetch delivery notes data
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
