// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client"; // Ensure this import path is correct for your enum

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }

  interface User extends DefaultUser {
    // Keep DefaultUser here for image, etc. if needed
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }
}
