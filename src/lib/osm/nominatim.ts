import { formatNominatimAddress } from "@/lib/osm/address";
import type { NlCity } from "@/lib/osm/nl-cities";

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "FrostCheck/1.0 (https://github.com/Omar-Gee/frost-check; contact: dev@frostcheck.local)",
};

const MIN_REQUEST_INTERVAL_MS = 1100;

let lastRequestAt = 0;

async function waitForRateLimit() {
  const elapsed = Date.now() - lastRequestAt;
  const wait = MIN_REQUEST_INTERVAL_MS - elapsed;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

export async function reverseGeocodeAddress(
  lat: number,
  lng: number,
  city: NlCity
): Promise<string | null> {
  await waitForRateLimit();

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  try {
    const response = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      address?: Record<string, string>;
    };

    if (!data.address) return null;
    return formatNominatimAddress(data.address, city);
  } catch {
    return null;
  }
}
