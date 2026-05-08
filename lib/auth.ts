import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { getServerSession } from "next-auth/next";

export type UserRole = "reader" | "editor" | "admin";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev",
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Here we can read an environment variable for admins, or just make anyone who logs in an 'editor'
        const admins = (process.env.ADMIN_EMAILS || "").split(",");
        (session as any).user.role = admins.includes(session.user.email || "")
          ? "admin"
          : "editor";
      }
      return session;
    },
  },
};

export interface User {
  email: string;
  name: string;
  role: UserRole;
  image?: string;
}

/**
 * Validates if the given user has permission to edit/create articles.
 */
export async function canEdit(user: User | null): Promise<boolean> {
  if (!user) return false;
  return ["editor", "admin"].includes(user.role);
}

/**
 * Replaces the mock with actual NextAuth ServerSession retrieval
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return {
    name: session.user.name || "Unknown",
    email: session.user.email || "",
    image: session.user.image || undefined,
    role: (session as any).user.role || "editor",
  };
}
