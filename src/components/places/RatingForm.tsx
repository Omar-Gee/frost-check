"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { userRatingLabel } from "@/lib/scoring/combined";

interface RatingFormProps {
  placeId: string;
  onRated?: () => void;
}

export function RatingForm({ placeId, onRated }: RatingFormProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function goToLogin() {
    const callbackUrl = encodeURIComponent(pathname);
    router.push(`/login?callbackUrl=${callbackUrl}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!session) {
      goToLogin();
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/places/${encodeURIComponent(placeId)}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Rating failed");
      }

      setMessage("Thanks for your rating!");
      setComment("");
      onRated?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="rating">How cool was it here?</Label>
        <div className="mt-2 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                rating >= n
                  ? "bg-frost-600 text-white"
                  : "bg-frost-100 text-frost-600 hover:bg-frost-200"
              }`}
              aria-label={`${n} stars`}
            >
              {n}
            </button>
          ))}
          <span className="ml-2 text-sm text-frost-600">
            {userRatingLabel(rating)}
          </span>
        </div>
      </div>

      <div>
        <Label htmlFor="comment">Comment (optional)</Label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-lg border border-frost-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-frost-500"
          placeholder="e.g. good AC, but too cold by the window..."
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading
          ? "Saving..."
          : session
            ? "Submit rating"
            : "Sign in to rate"}
      </Button>

      {!session && (
        <p className="text-sm text-frost-500">
          You must be signed in to submit a rating.{" "}
          <button
            type="button"
            onClick={goToLogin}
            className="font-medium text-frost-700 underline"
          >
            Go to sign in
          </button>
        </p>
      )}

      {message && (
        <p className="text-sm text-frost-600">{message}</p>
      )}
    </form>
  );
}
