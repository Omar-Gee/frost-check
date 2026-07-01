"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, MapPin } from "lucide-react";
import { AcScoreBadge } from "@/components/places/AcScoreBadge";
import { RatingForm } from "@/components/places/RatingForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AMENITY_LABELS } from "@/lib/osm/nl-cities";
import { buildGoogleMapsUrl } from "@/lib/utils";
import type { PlaceDetail } from "@/lib/places/queries";

export default function PlaceDetailPage() {
  const params = useParams();
  const placeId = params.id ? decodeURIComponent(params.id as string) : null;
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlace = useCallback(async () => {
    if (!placeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/places/${encodeURIComponent(placeId)}`);
      if (!res.ok) throw new Error("Place not found");
      const data = await res.json();
      setPlace(data.place);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    loadPlace();
  }, [loadPlace]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-frost-500" />
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-red-600 dark:text-red-400">
          {error ?? "Place not found"}
        </p>
        <Link href="/" className="text-frost-600 underline">
          Back to overview
        </Link>
      </div>
    );
  }

  const mapsUrl =
    place.googleMapsUrl ?? buildGoogleMapsUrl(place.lat, place.lng, place.name);
  const wikiUrl = place.wikipediaSlug
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(place.wikipediaSlug)}`
    : null;
  const userAverage = place.score.userAverage;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-frost-600 hover:text-frost-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-frost-900">{place.name}</h1>
          {place.amenity && (
            <Badge className="mt-2">
              {AMENITY_LABELS[place.amenity] ?? place.amenity}
            </Badge>
          )}
        </div>
        <AcScoreBadge
          score={place.score.displayScore}
          frostScore={place.score.frostScore}
          label={place.score.label}
          size="lg"
        />
      </div>

      <p className="flex items-center gap-2 text-frost-600">
        <MapPin className="h-4 w-4" />
        {place.address}
      </p>

      {place.latestSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              What reviews say about the AC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-frost-700">{place.latestSummary}</p>
            {place.confidence != null && (
              <p className="text-sm text-frost-500">
                Confidence: {Math.round(place.confidence * 100)}%
              </p>
            )}
            {place.hasAc != null && (
              <p className="text-sm text-frost-500">
                AC likely present: {place.hasAc ? "Yes" : "No"}
              </p>
            )}
            {place.snippets.length > 0 && (
              <ul className="space-y-2 border-t border-frost-100 pt-3">
                {place.snippets.map((snippet, index) => (
                  <li
                    key={`${snippet.source}-${index}`}
                    className="rounded-lg bg-frost-50 px-3 py-2 text-sm text-frost-700"
                  >
                    <span className="mr-2 text-xs uppercase text-frost-500">
                      {snippet.source}
                    </span>
                    {snippet.text}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your rating</CardTitle>
          </CardHeader>
          <CardContent>
            <RatingForm placeId={place.id} onRated={loadPlace} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              User ratings ({place.userRatings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {userAverage != null && place.score.userCount > 0 && (
              <p className="text-sm text-frost-600">
                Average: <strong>{userAverage.toFixed(1)}/5</strong> (
                {place.score.userCount} rating
                {place.score.userCount !== 1 ? "s" : ""})
              </p>
            )}
            {place.userRatings.length === 0 && (
              <p className="text-sm text-frost-500">
                No ratings yet. Be the first!
              </p>
            )}
            {place.userRatings.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-frost-100 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {r.userName ?? "Anonymous"}
                  </span>
                  <span className="text-sm text-frost-600">{r.rating}/5</span>
                </div>
                {r.comment && (
                  <p className="mt-1 text-sm text-frost-700">{r.comment}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-frost-600 underline"
        >
          View reviews on Google Maps
          <ExternalLink className="h-4 w-4" />
        </a>
        {wikiUrl && (
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-frost-600 underline"
          >
            Wikipedia
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <p className="text-xs text-frost-500">© OpenStreetMap contributors</p>
    </div>
  );
}
