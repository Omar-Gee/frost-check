import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
  if (score == null) return "Unknown";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Poor";
  return "No AC";
}

export function scoreToColor(score: number | null | undefined): string {
  if (score == null) return "#94a3b8";
  if (score >= 80) return "#059669";
  if (score >= 60) return "#0d9488";
  if (score >= 40) return "#d97706";
  if (score >= 20) return "#ea580c";
  return "#dc2626";
}
