import type { PlaceFiltersState } from "@/components/places/PlaceFilters";
import type { LatLng } from "@/lib/db/geo";

export type GeoStatus = "loading" | "granted" | "denied" | "unsupported";

export interface BrowseSessionState {
  userLocation: LatLng | null;
  geoStatus: GeoStatus;
  selectedCitySlug: string | null;
  view: "list" | "map";
  filters: PlaceFiltersState;
  searchQuery: string;
}

const STORAGE_KEY = "frostcheck-browse-state";

export const DEFAULT_FILTERS: PlaceFiltersState = {
  amenity: "",
  minScore: "",
  radius: "2",
  sort: "ac",
};

export function loadBrowseState(): BrowseSessionState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BrowseSessionState>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      userLocation: parsed.userLocation ?? null,
      geoStatus: parsed.geoStatus ?? "loading",
      selectedCitySlug: parsed.selectedCitySlug ?? null,
      view: parsed.view === "map" ? "map" : "list",
      filters: { ...DEFAULT_FILTERS, ...parsed.filters },
      searchQuery: parsed.searchQuery ?? "",
    };
  } catch {
    return null;
  }
}

export function saveBrowseState(state: BrowseSessionState): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or private-mode errors.
  }
}
