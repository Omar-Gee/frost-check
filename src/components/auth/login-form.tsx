"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  callbackUrl: string;
  hasGoogle: boolean;
  hasGitHub: boolean;
  showDevLogin: boolean;
  error?: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid credentials. Check your email address.",
  OAuthSignin: "Sign-in failed. Please try again.",
  OAuthAccountNotLinked:
    "This email is already linked to a different sign-in method.",
  Default: "Something went wrong while signing in.",
};

export function LoginForm({
  callbackUrl,
  hasGoogle,
  hasGitHub,
  showDevLogin,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
    : null;

  async function handleOAuth(provider: "google" | "github") {
    setLoading(provider);
    await signIn(provider, { callbackUrl });
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading("credentials");

    await signIn("credentials", {
      email,
      name: name || "User",
      callbackUrl,
      redirect: true,
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-frost-900">Sign in</h1>
        <p className="mt-2 text-sm text-frost-600">
          Sign in to rate air conditioning at places near you.
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="space-y-3">
        {hasGoogle && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading != null}
            onClick={() => handleOAuth("google")}
          >
            {loading === "google" ? "Signing in..." : "Continue with Google"}
          </Button>
        )}

        {hasGitHub && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading != null}
            onClick={() => handleOAuth("github")}
          >
            {loading === "github" ? "Signing in..." : "Continue with GitHub"}
          </Button>
        )}
      </div>

      {showDevLogin && (hasGoogle || hasGitHub) && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-frost-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-frost-50 px-2 text-frost-500">or</span>
          </div>
        </div>
      )}

      {showDevLogin && (
        <form
          onSubmit={handleCredentials}
          className="space-y-4 rounded-xl border border-frost-200 bg-white p-6"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-frost-700">
            <Mail className="h-4 w-4" />
            Email sign-in
          </div>

          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading != null}>
            {loading === "credentials" ? "Signing in..." : "Sign in with email"}
          </Button>

          {process.env.NODE_ENV === "development" && (
            <p className="text-xs text-frost-500">
              Development mode: no password required. Your account is created on
              first sign-in.
            </p>
          )}
        </form>
      )}

      {!showDevLogin && !hasGoogle && !hasGitHub && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No sign-in method configured. Add OAuth keys in{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code>.
        </p>
      )}
    </div>
  );
}
