"use client";

import { AMENITY_TYPES } from "@/lib/osm/nl-cities";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface PlaceFiltersState {
  amenity: string;
  minScore: string;
  radius: string;
}

interface PlaceFiltersProps {
  filters: PlaceFiltersState;
  onChange: (filters: PlaceFiltersState) => void;
}

const AMENITY_LABELS: Record<string, string> = {
  cafe: "Cafe",
  restaurant: "Restaurant",
  bar: "Bar",
  pub: "Pub",
  fast_food: "Fast food",
  library: "Library",
  cinema: "Cinema",
  theatre: "Theatre",
  community_centre: "Community centre",
  hotel: "Hotel",
  museum: "Museum",
  shop: "Shop",
};

export function PlaceFilters({ filters, onChange }: PlaceFiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <Label htmlFor="amenity">Place type</Label>
        <select
          id="amenity"
          value={filters.amenity}
          onChange={(e) => onChange({ ...filters, amenity: e.target.value })}
          className="mt-1 flex h-10 w-full rounded-lg border border-frost-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-frost-500"
        >
          <option value="">All types</option>
          {AMENITY_TYPES.map((a) => (
            <option key={a} value={a}>
              {AMENITY_LABELS[a] ?? a}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="minScore">Min. AC score</Label>
        <Input
          id="minScore"
          type="number"
          min={0}
          max={100}
          placeholder="e.g. 60"
          value={filters.minScore}
          onChange={(e) =>
            onChange({ ...filters, minScore: e.target.value })
          }
        />
      </div>

      <div>
        <Label htmlFor="radius">Radius (km)</Label>
        <Input
          id="radius"
          type="number"
          min={0.5}
          max={20}
          step={0.5}
          value={filters.radius}
          onChange={(e) => onChange({ ...filters, radius: e.target.value })}
        />
      </div>
    </div>
  );
}
