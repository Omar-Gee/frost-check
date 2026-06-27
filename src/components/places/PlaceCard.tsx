import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AcScoreBadge } from "./AcScoreBadge";
import { formatDistanceKm } from "@/lib/utils";
import type { PlaceWithScore } from "@/lib/places/queries";

interface PlaceCardProps {
  place: PlaceWithScore;
}

export function PlaceCard({ place }: PlaceCardProps) {
  const encodedId = encodeURIComponent(place.id);

  return (
    <Link href={`/place/${encodedId}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">{place.name}</CardTitle>
            <AcScoreBadge
              score={place.score.displayScore}
              label={place.score.label}
              size="sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {place.amenity && (
            <Badge variant="default">{place.amenity}</Badge>
          )}
          {place.address && (
            <p className="flex items-center gap-1 text-sm text-frost-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {place.address}
            </p>
          )}
          {place.distanceKm != null && (
            <p className="text-xs text-frost-500">
              {formatDistanceKm(place.distanceKm)} away
            </p>
          )}
          {place.latestSummary && (
            <p className="line-clamp-2 text-sm text-frost-700">
              {place.latestSummary}
            </p>
          )}
          {place.score.userCount > 0 && (
            <p className="flex items-center gap-1 text-xs text-frost-500">
              <Users className="h-3 w-3" />
              {place.score.userCount} user rating
              {place.score.userCount !== 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
