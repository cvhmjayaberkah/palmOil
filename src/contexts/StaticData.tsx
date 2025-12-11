// contexts/data-provider.tsx
"use client"; // This component MUST be a Client Component

import React, { createContext, useContext, ReactNode } from "react";

// 1. Define the type for your shared data
interface MySharedData {
  module: string;
  subModule: string;
  allowedRole: string[];
  data?: any[]; // Optional - for components that still use static data
  salesUsers?: any[]; // Optional sales users for forms
  [key: string]: any; // Allow additional dynamic properties
}

// 2. Create the Context with the defined type
const SharedDataContext = createContext<MySharedData | undefined>(undefined);

// 3. Type for the Provider props
interface SharedDataProviderProps {
  data: MySharedData; // Ensure the data passed conforms to MySharedData
  children: ReactNode;
}

// Rename the exported component to be descriptive (e.g., DataProvider)
export function DataProvider({ data, children }: SharedDataProviderProps) {
  return (
    <SharedDataContext.Provider value={data}>
      {children}
    </SharedDataContext.Provider>
  );
}

// Export alias for backward compatibility
export const StaticDataProvider = DataProvider;

// Rename the hook to be descriptive (e.g., useSharedData)
export function useSharedData(): MySharedData {
  const context = useContext(SharedDataContext);
  if (context === undefined) {
    // Improve the error message for clarity
    throw new Error("useSharedData must be used within a DataProvider");
  }
  return context;
}
