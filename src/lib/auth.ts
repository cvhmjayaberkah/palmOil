// lib/auth.ts
import db from "./db";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { schema } from "./schema"; // Your validation schema

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async credentials => {
        const validatedCredentials = schema.parse(credentials);

        const user = await db.users.findFirst({
          where: {
            email: validatedCredentials.email,
          },
        });

        if (!user || user.password !== validatedCredentials.password) {
          throw new Error("Invalid credentials.");
        }

        // Check if user account is active
        if (!user.isActive) {
          throw new Error("Account has been deactivated. Please contact your administrator.");
        }


        // User object from Prisma query
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // Prisma provides this directly
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
