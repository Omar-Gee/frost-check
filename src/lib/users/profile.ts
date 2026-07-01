import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export interface UserProfile {
  id: string;
  email: string | null;
  providerName: string | null;
  displayName: string | null;
  resolvedName: string | null;
  image: string | null;
}

export function resolveDisplayName(user: {
  displayName: string | null;
  name: string | null;
}): string | null {
  const custom = user.displayName?.trim();
  if (custom) return custom;

  const provider = user.name?.trim();
  return provider || null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      displayName: users.displayName,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    providerName: user.name,
    displayName: user.displayName,
    resolvedName: resolveDisplayName(user),
    image: user.image,
  };
}

export async function updateUserDisplayName(
  userId: string,
  displayName: string | null
): Promise<UserProfile | null> {
  const db = getDb();
  await db
    .update(users)
    .set({ displayName })
    .where(eq(users.id, userId));

  return getUserProfile(userId);
}
