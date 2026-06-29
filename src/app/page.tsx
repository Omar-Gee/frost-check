"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Map, List, LocateFixed, Snowflake } from "lucide-react";
import { PlaceCard } from "@/components/places/PlaceCard";
import {
  PlaceFilters,
  type PlaceFiltersState,
} from "@/components/places/PlaceFilters";
import { PlaceSearchBar } from "@/components/places/PlaceSearchBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { PlaceWithScore } from "@/lib/places/queries";
import { NL_CITIES } from "@/lib/osm/nl-cities";

const PlacesMap = dynamic(
  () => import("@/components/map/PlacesMap").then((m) => m.PlacesMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl bg-frost-50">
        <Loader2 className="h-8 w-8 animate-spin text-frost-500" />
      </div>
    ),
  }
);

const DEFAULT_CENTER = { lat: 52.3676, lng: 4.9041 };

export default function HomePage() {
  const [places, setPlaces] = useState<PlaceWithScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState(DEFAULT_CENTER);
  const [locationLabel, setLocationLabel] = useState("Amsterdam");
  const [view, setView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<PlaceFiltersState>({
    amenity: "",
    minScore: "",
    radius: "2",
    sort: "ac",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSearchMode = debouncedSearch.length >= 2;
  const selectedCity = NL_CITIES.find((c) => c.name === locationLabel)?.name;

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSearchMode) {
        const params = new URLSearchParams({
          q: debouncedSearch,
          lat: String(location.lat),
          lng: String(location.lng),
        });
        if (selectedCity) params.set("city", selectedCity);
        if (filters.amenity) params.set("amenity", filters.amenity);
        if (filters.minScore) params.set("minScore", filters.minScore);

        const res = await fetch(`/api/places/search?${params}`);
        if (!res.ok) throw new Error("Could not search places");
        const data = await res.json();
        setPlaces(data.places ?? []);
        return;
      }

      const params = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
        radius: filters.radius || "2",
        sort: filters.sort,
      });
      if (selectedCity) params.set("city", selectedCity);
      if (filters.amenity) params.set("amenity", filters.amenity);
      if (filters.minScore) params.set("minScore", filters.minScore);

      const res = await fetch(`/api/places/nearby?${params}`);
      if (!res.ok) throw new Error("Could not load places");
      const data = await res.json();
      setPlaces(data.places ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [location, filters, debouncedSearch, isSearchMode, selectedCity]);

  const fetchPlacesInBounds = useCallback(
    async (bounds: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    }) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        minLat: String(bounds.minLat),
        maxLat: String(bounds.maxLat),
        minLng: String(bounds.minLng),
        maxLng: String(bounds.maxLng),
        sort: filters.sort,
      });
      if (filters.amenity) params.set("amenity", filters.amenity);
      if (filters.minScore) params.set("minScore", filters.minScore);

      try {
        const res = await fetch(`/api/places/bounds?${params}`);
        if (!res.ok) throw new Error("Could not load map places");
        const data = await res.json();
        setPlaces(data.places ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    if (view === "map") return;
    fetchPlaces();
  }, [fetchPlaces, view]);

  function useGeolocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel("Your location");
        setLoading(false);
      },
      () => {
        setError("Could not determine your location");
        setLoading(false);
      }
    );
  }

  function selectCity(slug: string) {
    const city = NL_CITIES.find((c) => c.slug === slug);
    if (city) {
      setLocation({ lat: city.lat, lng: city.lng });
      setLocationLabel(city.name);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-gradient-to-br from-frost-600 to-frost-800 p-6 text-white">
        <div className="flex items-center gap-3">
          <Snowflake className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Find cool places near you</h1>
            <p className="text-frost-100">
              Discover cafes, restaurants, and other spots with air conditioning
              in the Netherlands.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={useGeolocation}>
            <LocateFixed className="h-4 w-4" />
            Use my location
          </Button>
          {NL_CITIES.map((city) => (
            <Button
              key={city.slug}
              variant="outline"
              size="sm"
              onClick={() => selectCity(city.slug)}
            >
              {city.name}
            </Button>
          ))}
        </div>
        <p className="text-sm text-frost-600">
          Current location: <strong>{locationLabel}</strong>
        </p>

        <PlaceSearchBar value={searchQuery} onChange={setSearchQuery} />

        <PlaceFilters filters={filters} onChange={setFilters} />

        <Tabs value={view} onValueChange={(v) => setView(v as "list" | "map")}>
          <TabsList>
            <TabsTrigger value="list">
              <List className="mr-1 h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="map">
              <Map className="mr-1 h-4 w-4" />
              Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-frost-500" />
              </div>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            {!loading && !error && places.length === 0 && (
              <div className="rounded-xl border border-dashed border-frost-300 p-8 text-center">
                <p className="font-medium text-frost-800">No places found</p>
                <p className="mt-2 text-sm text-frost-600">
                  {isSearchMode
                    ? "Try a different search term or clear the search."
                    : "Try a different city, increase the radius, or check back later — place data may still be indexing."}
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  showCity={isSearchMode}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="map">
            <PlacesMap
              places={places}
              center={[location.lat, location.lng]}
              userLocation={location}
              onBoundsChange={fetchPlacesInBounds}
            />
          </TabsContent>
        </Tabs>
      </section>

      <footer className="border-t border-frost-200 pt-4 text-xs text-frost-500">
        Map data ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap
        </a>{" "}
        contributors · Tiles © <a href="https://carto.com/attributions">CARTO</a>
      </footer>
    </div>
  );
}
