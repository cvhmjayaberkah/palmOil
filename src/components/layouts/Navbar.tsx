"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import ThemeToggle from "@/contexts/ThemeToggle"; // Import komponen

interface NavbarProps {
  onSidebarToggle: () => void;
}

export default function Navbar({ onSidebarToggle }: NavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationCount] = useState(3); // Mock notification count

  // Get current user data from session
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/sign-in" });
  };

  // Get user display data
  const getUserDisplayName = () => {
    if (session?.user?.name) return session.user.name;
    if (session?.user?.email) return session.user.email.split("@")[0];
    return "User";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  const getRoleDisplayName = () => {
    const role = session?.user?.role;
    switch (role) {
      case "OWNER":
        return "Owner";
      case "ADMIN":
        return "Administrator";
      case "WAREHOUSE":
        return "Warehouse Staff";
      case "SALES":
        return "Sales Staff";
      default:
        return "User";
    }
  };

  return (
    <nav className="navbar-transition bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 px-2 py-2 md:px-3 md:py-2">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Mobile Sidebar Toggle */}
          <button
            onClick={onSidebarToggle}
            className="p-1 md:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
          >
            <span className="text-base md:text-lg dark:text-white">☰</span>
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Notifications */}
          {/* <button className="cursor-pointer relative p-1 md:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="text-lg md:text-xl">🔔</span>
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button> */}

          {/* Theme Toggle Component */}
          <ThemeToggle />

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="cursor-pointer flex items-center space-x-1 md:space-x-2 p-1 md:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-xs md:text-sm">
                  {getUserInitials()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getRoleDisplayName()}
                </p>
              </div>
              <span className="text-gray-400 text-xs md:text-sm">▼</span>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="py-1">
                  {/* User Info Header */}
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session?.user?.email}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {getRoleDisplayName()}
                    </p>
                  </div>

                  <a
                    href="#"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="mr-3">👤</span>
                    Profil Saya
                  </a>
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="mr-3">⚙️</span>
                    Pengaturan Akun
                  </a>
                  <hr className="my-1 border-gray-200 dark:border-gray-600" />
                  <button
                    className="cursor-pointer w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={handleSignOut}
                  >
                    <span className="mr-3">🚪</span>
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
