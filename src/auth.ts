import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { getUserProfile, resolveDisplayName } from "@/lib/users/profile";

function buildProviders() {
  const providers = [];

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      })
    );
  }

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      })
    );
  }

  if (process.env.NODE_ENV === "development") {
    providers.push(
      Credentials({
        id: "credentials",
        name: "Email",
        credentials: {
          email: { label: "Email", type: "email" },
          name: { label: "Name", type: "text" },
        },
        async authorize(credentials) {
          const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
          const name = ((credentials?.name as string | undefined)?.trim() || "User");

          if (!email || !email.includes("@")) {
            return null;
          }

          const db = getDb();
          const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existing) {
            if (name && existing.name !== name) {
              await db
                .update(users)
                .set({ name })
                .where(eq(users.id, existing.id));
            }

            return {
              id: existing.id,
              email: existing.email,
              name: name || existing.name,
              image: existing.image,
            };
          }

          const id = crypto.randomUUID();
          await db.insert(users).values({ id, email, name });

          return { id, email, name, image: null };
        },
      })
    );
  }

  if (providers.length === 0) {
    console.warn(
      "No auth providers configured. Set AUTH_GOOGLE_* or AUTH_GITHUB_* in .env (or use email sign-in in development)."
    );
  }

  return providers;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;

  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error("AUTH_SECRET is required in production");
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "AUTH_SECRET is not set — using a local-only fallback for this build."
    );
  }

  return "dev-secret-local-only";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: buildProviders(),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
      }

      const userId = (token.id as string | undefined) ?? token.sub;
      if (
        userId &&
        (user?.id || trigger === "update" || !("displayName" in token))
      ) {
        const profile = await getUserProfile(userId);
        if (profile) {
          token.displayName = profile.displayName;
          token.name = profile.providerName ?? token.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string) ?? "";

        const providerName =
          (token.name as string | null | undefined)?.trim() || null;
        const displayName =
          (token.displayName as string | null | undefined)?.trim() || null;

        session.user.providerName = providerName;
        session.user.name =
          resolveDisplayName({
            displayName,
            name: providerName,
          }) ??
          session.user.name ??
          session.user.email;
      }
      return session;
    },
  },
  trustHost: true,
  secret: getAuthSecret(),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      providerName?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    displayName?: string | null;
  }
}
