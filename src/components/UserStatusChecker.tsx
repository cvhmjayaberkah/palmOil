"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function UserStatusChecker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const checkUserStatus = async () => {
      try {
        const response = await fetch("/api/check-user-status");
        const data = await response.json();

        if (!data.isActive) {
          // User has been deactivated, force logout
          await signOut({ 
            callbackUrl: "/sign-in?deactivated=true",
            redirect: true 
          });
        }
      } catch (error) {
        console.error("Error checking user status:", error);
        // Don't force logout on network errors
      }
    };

    // Check immediately
    checkUserStatus();

    // Check every 30 seconds
    const interval = setInterval(checkUserStatus, 30000);

    return () => clearInterval(interval);
  }, [session?.user]);

  return null; // This component doesn't render anything
}
