import { NextRequest, NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/places/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radiusKm = parseFloat(searchParams.get("radius") ?? "2");
  const amenity = searchParams.get("amenity") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const sortParam = searchParams.get("sort");
  const sort = sortParam === "ac" ? "ac" : "distance";
  const minScore = searchParams.get("minScore")
    ? parseFloat(searchParams.get("minScore")!)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 50;

  const fromLatParam = searchParams.get("fromLat");
  const fromLngParam = searchParams.get("fromLng");
  const fromLat = fromLatParam ? parseFloat(fromLatParam) : undefined;
  const fromLng = fromLngParam ? parseFloat(fromLngParam) : undefined;
  const distanceFrom =
    fromLat != null &&
    fromLng != null &&
    !Number.isNaN(fromLat) &&
    !Number.isNaN(fromLng)
      ? { lat: fromLat, lng: fromLng }
      : undefined;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  try {
    const places = await getNearbyPlaces(lat, lng, radiusKm, {
      amenity: amenity || undefined,
      city: city || undefined,
      minScore,
      limit,
      sort,
      distanceFrom,
    });

    return NextResponse.json({ places });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    console.error("[GET /api/places/nearby]", error);
    return NextResponse.json(
      {
        error: "Could not fetch places",
        ...(process.env.NODE_ENV === "development" ? { message } : {}),
      },
      { status: 500 }
    );
  }
}
