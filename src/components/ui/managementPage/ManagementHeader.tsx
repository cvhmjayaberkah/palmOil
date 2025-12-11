// ManagementHeader.tsx
"use client";
import React from "react";
import { Button } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface ManagementHeaderProps {
  allowedRoles: string[]; // List of roles allowed to see the "Add New" button
  mainPageName: string; // The base path for the main page
  headerTittle: string; // The base path for the main page
  isAddHidden?: boolean; // Optional prop to manually hide the "Add New" button
  onRefresh?: () => void; // Optional refresh callback
}

const ManagementHeader: React.FC<ManagementHeaderProps> = ({
  allowedRoles,
  mainPageName,
  headerTittle,
  isAddHidden = false, // Default value is false (show button)
  onRefresh, // Optional refresh callback
}) => {
  const { user, loading } = useCurrentUser(); // Get user details
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const mainPage = mainPageName.toLocaleLowerCase();
  const Tittle = headerTittle.split(" ");

  // Current route checks
  const isOnCreatePage = pathname.endsWith("/create");
  const isOnMainPage = pathname === mainPage && !isOnCreatePage;
  const isOnEditPage = pathname.startsWith(`${mainPage}/edit`);

  const handleListClick = () => {
    if (isOnCreatePage || isOnEditPage) {
      router.push(`${mainPage}`);
    }
  };

  const handleAddNewClick = () => {
    if (isOnMainPage || isOnEditPage) {
      router.push(`${mainPage}/create`); // Navigasi ke '/me/create'
    }
  };

  // Check if the user's role is allowed to see the "Add New" button
  const canAddNewUser = user && allowedRoles.includes(user.role || "");

  // Show add button only if user has permission AND isAddHidden is false
  const showAddButton = canAddNewUser && !isAddHidden;

  return (
    <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-3 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-xl md:text-3xl font-semibold text-gray-900 dark:text-white">
        {headerTittle}
      </h3>
      <div className="flex space-x-2">
        {onRefresh && isOnMainPage && (
          <Button
            size={isMobile ? "small" : "medium"}
            variant="secondary"
            className="text-xs md:text-sm"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        )}
        <Button
          size={isMobile ? "small" : "medium"}
          variant={isOnCreatePage ? "primary" : "secondary"}
          className={`text-xs md:text-sm ${
            isOnCreatePage ? "bg-blue-500" : ""
          }`}
          onClick={handleListClick}
        >
          Daftar
        </Button>
        {showAddButton && (
          <Button
            size={isMobile ? "small" : "medium"}
            variant={isOnCreatePage ? "secondary" : "primary"}
            className="text-xs md:text-sm"
            onClick={handleAddNewClick}
          >
            Tambah {Tittle[1]}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ManagementHeader;
