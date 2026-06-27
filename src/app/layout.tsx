import type { Metadata } from "next";
import Link from "next/link";
import { Snowflake } from "lucide-react";
import { auth, signOut } from "@/auth";
import { SessionProvider } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import "./globals.css";

export const metadata: Metadata = {
  title: "FrostCheck — Yelp for air conditioning",
  description:
    "Find cafes, restaurants, and other places with air conditioning in the Netherlands.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-frost-50 text-frost-900 antialiased">
        <SessionProvider>
          <header className="border-b border-frost-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-bold text-frost-800">
                <Snowflake className="h-6 w-6 text-frost-600" />
                FrostCheck
              </Link>
              <nav className="flex items-center gap-3">
                {session?.user ? (
                  <>
                    <span className="hidden text-sm text-frost-600 sm:inline">
                      {session.user.name ?? session.user.email}
                    </span>
                    <form
                      action={async () => {
                        "use server";
                        await signOut();
                      }}
                    >
                      <Button type="submit" variant="outline" size="sm">
                        Sign out
                      </Button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex h-8 items-center justify-center rounded-md bg-frost-600 px-3 text-xs font-medium text-white hover:bg-frost-700"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
