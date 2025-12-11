import { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Sales Fields - Indana Oil",
  description: "Sales field visit check-in form",
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
