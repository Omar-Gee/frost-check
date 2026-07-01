"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Map, List, LocateFixed, Snowflake } from "lucide-react";
import { PlaceCard } from "@/components/places/PlaceCard";
import {
  PlaceFilters,
  type PlaceFiltersState,
} from "@/components/places/PlaceFilters";
import { PlaceSearchBar } from "@/components/places/PlaceSearchBar";
import { EmptyPlacesState } from "@/components/places/EmptyPlacesState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { PlaceWithScore } from "@/lib/places/queries";
import { NL_CITIES } from "@/lib/osm/nl-cities";
import type { LatLng } from "@/lib/db/geo";
import {
  DEFAULT_FILTERS,
  loadBrowseState,
  saveBrowseState,
  type GeoStatus,
} from "@/lib/browse/session-state";

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

const DEFAULT_CENTER: LatLng = { lat: 52.3676, lng: 4.9041 };

function appendDistanceFrom(params: URLSearchParams, origin: LatLng | null) {
  if (origin) {
    params.set("fromLat", String(origin.lat));
    params.set("fromLng", String(origin.lng));
  }
}

export default function HomePage() {
  const [places, setPlaces] = useState<PlaceWithScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("loading");
  const [selectedCitySlug, setSelectedCitySlug] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<PlaceFiltersState>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cityIndexedCount, setCityIndexedCount] = useState<number | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const browseCity = useMemo(
    () => NL_CITIES.find((c) => c.slug === selectedCitySlug) ?? null,
    [selectedCitySlug]
  );

  const queryCenter = browseCity ?? userLocation ?? DEFAULT_CENTER;
  const queryRadius = browseCity
    ? String(browseCity.radiusKm)
    : filters.radius || "2";
  const distanceOrigin = userLocation;
  const mapCenter: [number, number] = [queryCenter.lat, queryCenter.lng];
  const mapUserLocation = userLocation ?? queryCenter;

  useEffect(() => {
    const saved = loadBrowseState();

    if (saved) {
      setUserLocation(saved.userLocation);
      setGeoStatus(saved.geoStatus);
      setSelectedCitySlug(saved.selectedCitySlug);
      setView(saved.view);
      setFilters(saved.filters);
      setSearchQuery(saved.searchQuery);
      setDebouncedSearch(saved.searchQuery.trim());
      setSessionReady(true);
      return;
    }

    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      setSessionReady(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoStatus("granted");
        setSessionReady(true);
      },
      () => {
        setGeoStatus("denied");
        setSessionReady(true);
      }
    );
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    saveBrowseState({
      userLocation,
      geoStatus,
      selectedCitySlug,
      view,
      filters,
      searchQuery,
    });
  }, [
    sessionReady,
    userLocation,
    geoStatus,
    selectedCitySlug,
    view,
    filters,
    searchQuery,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSearchMode = debouncedSearch.length >= 2;
  const selectedCity = browseCity?.name;

  useEffect(() => {
    if (!selectedCity) {
      setCityIndexedCount(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/places/city-count?city=${encodeURIComponent(selectedCity)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.count === "number") {
          setCityIndexedCount(data.count);
        }
      })
      .catch(() => {
        if (!cancelled) setCityIndexedCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSearchMode) {
        const params = new URLSearchParams({
          q: debouncedSearch,
          lat: String(queryCenter.lat),
          lng: String(queryCenter.lng),
        });
        appendDistanceFrom(params, distanceOrigin);
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
        lat: String(queryCenter.lat),
        lng: String(queryCenter.lng),
        radius: queryRadius,
        sort: filters.sort,
      });
      appendDistanceFrom(params, distanceOrigin);
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
  }, [
    queryCenter,
    queryRadius,
    distanceOrigin,
    filters,
    debouncedSearch,
    isSearchMode,
    selectedCity,
  ]);

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
      appendDistanceFrom(params, distanceOrigin);
      if (selectedCity) params.set("city", selectedCity);
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
    [filters, distanceOrigin, selectedCity]
  );

  useEffect(() => {
    if (!sessionReady) return;
    if (view === "map" && !isSearchMode) return;
    fetchPlaces();
  }, [fetchPlaces, view, isSearchMode, sessionReady]);

  function useGeolocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setGeoStatus("unsupported");
      return;
    }

    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setSelectedCitySlug(null);
        setGeoStatus("granted");
      },
      () => {
        setGeoStatus("denied");
        setError("Could not determine your location");
      }
    );
  }

  function selectCity(slug: string) {
    setSelectedCitySlug((current) => (current === slug ? null : slug));
  }

  const locationSummary = browseCity
    ? `Browsing ${browseCity.name}${
        userLocation ? " · distances from your location" : ""
      }`
    : geoStatus === "loading"
      ? "Detecting your location…"
      : userLocation
        ? "Showing places near you"
        : geoStatus === "denied"
          ? "Location unavailable — enable in browser or pick a city"
          : "Showing places near Amsterdam";

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
          <Button
            variant={!browseCity ? "secondary" : "outline"}
            size="sm"
            onClick={useGeolocation}
          >
            <LocateFixed className="h-4 w-4" />
            Use my location
          </Button>
          {NL_CITIES.map((city) => (
            <Button
              key={city.slug}
              variant={selectedCitySlug === city.slug ? "secondary" : "outline"}
              size="sm"
              onClick={() => selectCity(city.slug)}
            >
              {city.name}
            </Button>
          ))}
        </div>
        <p className="text-sm text-frost-600">{locationSummary}</p>

        <PlaceSearchBar value={searchQuery} onChange={setSearchQuery} />

        <PlaceFilters
          filters={filters}
          onChange={setFilters}
          hideRadius={Boolean(browseCity)}
        />

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
              <EmptyPlacesState
                isSearchMode={isSearchMode}
                selectedCity={selectedCity}
                cityIndexedCount={cityIndexedCount}
                radius={queryRadius}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="map">
            {loading && (
              <div className="mb-2 flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-frost-500" />
              </div>
            )}
            {error && (
              <p className="mb-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            {!loading && !error && places.length === 0 && (
              <EmptyPlacesState
                className="mb-4 rounded-xl border border-dashed border-frost-300 p-6 text-center"
                isSearchMode={isSearchMode}
                selectedCity={selectedCity}
                cityIndexedCount={cityIndexedCount}
                radius={queryRadius}
              />
            )}
            <PlacesMap
              places={places}
              center={mapCenter}
              userLocation={mapUserLocation}
              fitToPlaces={isSearchMode}
              onBoundsChange={isSearchMode ? undefined : fetchPlacesInBounds}
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
