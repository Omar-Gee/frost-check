import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { ProfileForm } from "@/components/auth/profile-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/settings");
  }

  return (
    <div className="space-y-6 py-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-frost-600 hover:text-frost-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to FrostCheck
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-frost-900">Profile settings</h1>
        <p className="mt-2 text-sm text-frost-600">
          Choose how your name appears on FrostCheck. Your Google or GitHub name
          stays on your account but you can override it here.
        </p>
      </div>

      <ProfileForm />
    </div>
  );
}
