"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface AuthContextType {
  userEmail: string | null;
  userRole: string | null;
  userId: string | null;
  userName: string | null;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userEmail: null,
  userRole: null,
  userId: null,
  userName: null,
  isLoading: true,
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (session?.user) {
      // Update state from NextAuth session
      setUserEmail(session.user.email || null);
      setUserRole(session.user.role || null);
      setUserId(session.user.id || null);
      setUserName(session.user.name || null);
    } else {
      // Clear state when no session
      setUserEmail(null);
      setUserRole(null);
      setUserId(null);
      setUserName(null);
    }
  }, [session, status]);

  const refreshUserData = async () => {
    // Force refresh the session from NextAuth
    await update();
  };

  const isLoading = status === "loading";

  return (
    <AuthContext.Provider
      value={{
        userEmail,
        userRole,
        userId,
        userName,
        isLoading,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
