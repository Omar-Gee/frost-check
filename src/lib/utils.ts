import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { addressHasStreet, isCityOnlyAddress } from "@/lib/osm/address";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function placeIdFromOsm(osmType: string, osmId: number | string): string {
  return `${osmType}/${osmId}`;
}

export function parsePlaceId(id: string): { osmType: string; osmId: string } | null {
  const [osmType, osmId] = id.split("/");
  if (!osmType || !osmId) return null;
  return { osmType, osmId };
}

export function buildGoogleMapsUrl(lat: number, lng: number, name?: string): string {
  const query = name ? encodeURIComponent(name) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=&center=${lat}%2C${lng}`;
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function scoreToLabel(score: number | null | undefined): string {
  if (score == null) return "No AC data";
  const frost = scoreToFrost(score);
  if (frost == null) return "No AC data";
  if (frost >= 4.5) return "Excellent";
  if (frost >= 3.5) return "Good";
  if (frost >= 2.5) return "Fair";
  if (frost >= 1.5) return "Poor";
  return "No AC";
}

export function scoreToFrost(score100: number | null | undefined): number | null {
  if (score100 == null) return null;
  return Math.round((1 + (score100 / 100) * 4) * 10) / 10;
}

export function formatFrostScore(frostScore: number | null | undefined): string {
  if (frostScore == null) return "—";
  return frostScore.toFixed(1);
}

export function resolvePlaceAddress(input: {
  address?: string | null;
  city?: string | null;
  lat: number;
  lng: number;
  country?: string | null;
}): string {
  const trimmed = input.address?.trim();
  if (trimmed && addressHasStreet(trimmed, input.city, input.country)) {
    return trimmed;
  }

  const city = input.city?.trim();
  if (city && input.country) return `${city}, ${input.country}`;
  if (city) return city;

  return `${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}`;
}

export { addressHasStreet, isCityOnlyAddress };

export function scoreToColor(score: number | null | undefined): string {
  if (score == null) return "#94a3b8";
  if (score >= 80) return "#059669";
  if (score >= 60) return "#0d9488";
  if (score >= 40) return "#d97706";
  if (score >= 20) return "#ea580c";
  return "#dc2626";
}
