"use client";

import { CATEGORY_FILTERS } from "@/lib/osm/nl-cities";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface PlaceFiltersState {
  amenity: string;
  minScore: string;
  radius: string;
  sort: "distance" | "ac";
}

interface PlaceFiltersProps {
  filters: PlaceFiltersState;
  onChange: (filters: PlaceFiltersState) => void;
}

const RADIUS_PRESETS = [
  { value: "2", label: "2 km" },
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "15", label: "15 km" },
  { value: "20", label: "20 km" },
];

export function PlaceFilters({ filters, onChange }: PlaceFiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label htmlFor="amenity">Category</Label>
        <select
          id="amenity"
          value={filters.amenity}
          onChange={(e) => onChange({ ...filters, amenity: e.target.value })}
          className="mt-1 flex h-10 w-full rounded-lg border border-frost-300 bg-card px-3 text-sm text-frost-900 focus:outline-none focus:ring-2 focus:ring-frost-500"
        >
          {CATEGORY_FILTERS.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="radius">Radius</Label>
        <select
          id="radius"
          value={filters.radius}
          onChange={(e) => onChange({ ...filters, radius: e.target.value })}
          className="mt-1 flex h-10 w-full rounded-lg border border-frost-300 bg-card px-3 text-sm text-frost-900 focus:outline-none focus:ring-2 focus:ring-frost-500"
        >
          {RADIUS_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="sort">Sort by</Label>
        <select
          id="sort"
          value={filters.sort}
          onChange={(e) =>
            onChange({
              ...filters,
              sort: e.target.value as PlaceFiltersState["sort"],
            })
          }
          className="mt-1 flex h-10 w-full rounded-lg border border-frost-300 bg-card px-3 text-sm text-frost-900 focus:outline-none focus:ring-2 focus:ring-frost-500"
        >
          <option value="ac">Frost Score</option>
          <option value="distance">Distance</option>
        </select>
      </div>

      <div>
        <Label htmlFor="minScore">Min. Frost Score (0–100)</Label>
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
    </div>
  );
}
