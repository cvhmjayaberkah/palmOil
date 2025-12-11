import { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Sales Orders - Indana Oil",
  description: "Sales order management and creation",
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        expand={false}
        duration={4000}
        toastOptions={{
          style: {
            background: "white",
            border: "1px solid #e5e7eb",
            color: "#374151",
          },
        }}
      />
    </>
  );
}
