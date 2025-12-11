// app/(dashboard)/management/field-visits/layout.tsx

import React from "react";

export default async function FieldVisitsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {children}
    </div>
  );
}
