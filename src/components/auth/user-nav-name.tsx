"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function UserNavName() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <Link
      href="/settings"
      className="hidden text-sm text-frost-600 hover:text-frost-800 sm:inline"
    >
      {session.user.name ?? session.user.email}
    </Link>
  );
}
