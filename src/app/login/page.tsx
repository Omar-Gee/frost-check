import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";

  if (session?.user) {
    redirect(callbackUrl);
  }

  const hasGoogle = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  const hasGitHub = Boolean(
    process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
  );
  const showDevLogin =
    process.env.NODE_ENV === "development" || (!hasGoogle && !hasGitHub);

  return (
    <div className="space-y-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-frost-600 hover:text-frost-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to FrostCheck
      </Link>

      <LoginForm
        callbackUrl={callbackUrl}
        hasGoogle={hasGoogle}
        hasGitHub={hasGitHub}
        showDevLogin={showDevLogin}
        error={params.error ?? null}
      />
    </div>
  );
}
