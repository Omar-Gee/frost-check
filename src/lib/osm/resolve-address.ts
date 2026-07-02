import { addressHasStreet } from "@/lib/osm/address";
import type { NlCity } from "@/lib/osm/nl-cities";
import { reverseGeocodeAddress } from "@/lib/osm/nominatim";
import { resolvePlaceAddress } from "@/lib/utils";

export async function resolveIndexedAddress(input: {
  address: string | null;
  lat: number;
  lng: number;
  city: NlCity;
}): Promise<string> {
  const { city, lat, lng } = input;
  const country = city.country;

  if (addressHasStreet(input.address, city.name, country)) {
    return input.address!.trim();
  }

  const fromNominatim = await reverseGeocodeAddress(lat, lng, city);
  if (fromNominatim && addressHasStreet(fromNominatim, city.name, country)) {
    return fromNominatim;
  }

  return resolvePlaceAddress({
    address: input.address,
    city: city.name,
    lat,
    lng,
    country,
  });
}
