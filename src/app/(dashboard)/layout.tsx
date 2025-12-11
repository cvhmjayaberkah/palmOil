"use client";

import { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/layouts/Navbar";
import SideBar from "@/components/layouts/SideBar";
import { SessionHandler } from "@/components/auth/SessionHandler";
import UserStatusChecker from "@/components/UserStatusChecker";
import { useIsMobile } from "@/hooks/useIsMobile"; // Adjust path as necessary

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // Default to collapsed for mobile
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(true); // Always collapsed on mobile
    } else {
      const savedState = localStorage.getItem("sidebarCollapsed");
      setIsSidebarCollapsed(savedState === "true");
    }
  }, [isMobile]); // Dependency array includes isMobile for re-triggering

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);

    // Save state only for desktop
    if (!isMobile) {
      localStorage.setItem("sidebarCollapsed", newState.toString());
    }
  };

  // Calculate main content margin based on sidebar state
  const getMainContentMargin = () => {
    return isMobile ? "ml-0" : isSidebarCollapsed ? "ml-20" : "ml-64";
  };

  return (
    <SessionProvider>
      <SessionHandler />
      <UserStatusChecker />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex">
          {/* Mobile Overlay */}
          {isMobile && !isSidebarCollapsed && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={toggleSidebar}
            />
          )}

          {/* Sidebar for Desktop */}
          {!isMobile && (
            <div
              className={`
                fixed left-0 top-0 bottom-0 z-30 
                transition-all duration-300 
                ${isSidebarCollapsed ? "w-20" : "w-64"}
              `}
            >
              <SideBar
                isCollapsed={isSidebarCollapsed}
                onToggle={toggleSidebar}
                isMobile={false}
              />
            </div>
          )}

          {/* Mobile Sidebar */}
          {isMobile && (
            <SideBar
              isCollapsed={isSidebarCollapsed}
              onToggle={toggleSidebar}
              isMobile={true}
            />
          )}

          {/* Main Content Area - Fully Responsive */}
          <div
            className={`
              flex-1 transition-all duration-300 
              ${getMainContentMargin()} 
              w-[calc(100% - theme(spacing.64))] 
              max-w-full overflow-x-hidden
            `}
          >
            {/* Sticky Navbar */}
            <div className="sticky top-0 z-20 navbar-transition">
              <Navbar onSidebarToggle={toggleSidebar} />
            </div>

            {/* Main Content with Full Width */}
            <main className="">{children}</main>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
