"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/lib/users/profile";

export function ProfileForm() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [providerName, setProviderName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error("Could not load profile");

        const data = (await res.json()) as { profile: UserProfile };
        if (cancelled) return;

        setDisplayName(data.profile.displayName ?? "");
        setProviderName(data.profile.providerName);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() ? displayName.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not save profile");
      }

      const profile = data.profile as UserProfile;
      setDisplayName(profile.displayName ?? "");
      setProviderName(profile.providerName);
      await update();
      router.refresh();
      setSuccess("Display name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-frost-600">Loading profile…</p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-frost-200 bg-card p-6"
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={session?.user?.email ?? ""}
          disabled
          className="mt-1"
        />
      </div>

      {providerName && (
        <div>
          <Label htmlFor="providerName">Name from sign-in provider</Label>
          <Input
            id="providerName"
            type="text"
            value={providerName}
            disabled
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          type="text"
          maxLength={50}
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={providerName ?? "Your name"}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-frost-500">
          This is shown in the header and across FrostCheck. Leave blank to use
          your sign-in name{providerName ? ` (${providerName})` : ""}.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
          {success}
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save display name"}
      </Button>
    </form>
  );
}
