import type { NlCity } from "./nl-cities";

const COORDINATE_ADDRESS = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;

export function streetFromTags(tags: Record<string, string>): string {
  const street =
    tags["addr:street"]?.trim() ??
    tags["addr:road"]?.trim() ??
    tags["addr:streetname"]?.trim() ??
    tags["contact:street"]?.trim() ??
    "";

  const housenumber =
    tags["addr:housenumber"]?.trim() ??
    tags["addr:house_number"]?.trim() ??
    "";

  if (street && housenumber) return `${street} ${housenumber}`;
  if (street) return street;
  if (housenumber) return housenumber;

  return "";
}

export function parseAddressFromTags(
  tags: Record<string, string>,
  city: NlCity
): string {
  const full = tags["addr:full"]?.trim() || tags.address?.trim();
  if (full) return full;

  const streetLine = streetFromTags(tags);

  const locality =
    tags["addr:city"]?.trim() ??
    tags["addr:place"]?.trim() ??
    tags["addr:suburb"]?.trim();

  const postcode = tags["addr:postcode"]?.trim();

  const parts: string[] = [];
  if (streetLine) parts.push(streetLine);

  if (postcode && locality) {
    parts.push(`${postcode} ${locality}`);
  } else if (postcode) {
    parts.push(postcode);
  } else if (locality) {
    parts.push(locality);
  }

  if (parts.length > 0) {
    const line = parts.join(", ");
    if (streetLine && locality !== city.name && !line.includes(city.name)) {
      return `${line}, ${city.name}`;
    }
    return line;
  }

  return `${city.name}, ${city.country}`;
}

export function formatNominatimAddress(
  address: Record<string, string>,
  city: NlCity
): string | null {
  const road = address.road?.trim() ?? address.pedestrian?.trim() ?? address.footway?.trim();
  const houseNumber = address.house_number?.trim();
  const streetLine = road
    ? houseNumber
      ? `${road} ${houseNumber}`
      : road
    : "";

  if (!streetLine) return null;

  const locality =
    address.city?.trim() ??
    address.town?.trim() ??
    address.village?.trim() ??
    address.municipality?.trim();

  const postcode = address.postcode?.trim();
  const parts = [streetLine];

  if (postcode && locality) {
    parts.push(`${postcode} ${locality}`);
  } else if (locality) {
    parts.push(locality);
  }

  const line = parts.join(", ");
  if (locality && locality !== city.name && !line.includes(city.name)) {
    return `${line}, ${city.name}`;
  }

  return line;
}

export function isCityOnlyAddress(
  address: string | null | undefined,
  city?: string | null,
  country?: string | null
): boolean {
  const trimmed = address?.trim();
  if (!trimmed) return true;
  if (COORDINATE_ADDRESS.test(trimmed)) return true;

  const cityName = city?.trim();
  if (cityName && country && trimmed === `${cityName}, ${country}`) {
    return true;
  }
  if (cityName && trimmed === cityName) return true;

  const firstPart = trimmed.split(",")[0]?.trim() ?? "";
  if (cityName && firstPart.toLowerCase() === cityName.toLowerCase()) {
    return true;
  }

  if (/^\d{4}\s?[A-Z]{2}\b/i.test(trimmed)) {
    const streetPrefix = trimmed.split(/\d{4}\s?[A-Z]{2}/i)[0]?.trim();
    if (!streetPrefix) return true;
  }

  return false;
}

export function addressHasStreet(
  address: string | null | undefined,
  city?: string | null,
  country?: string | null
): boolean {
  if (isCityOnlyAddress(address, city, country)) return false;

  const trimmed = address?.trim();
  if (!trimmed) return false;

  const firstPart = trimmed.split(",")[0]?.trim() ?? "";
  if (!firstPart) return false;

  const cityName = city?.trim();
  if (cityName && firstPart.toLowerCase() === cityName.toLowerCase()) {
    return false;
  }

  return true;
}
