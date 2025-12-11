"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function SessionHandler() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.user) {
    }
  }, [session, status]);

  return null;
}
