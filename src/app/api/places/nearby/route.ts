import { NextRequest, NextResponse } from "next/server";
import { getNearbyPlaces } from "@/lib/places/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radiusKm = parseFloat(searchParams.get("radius") ?? "2");
  const amenity = searchParams.get("amenity") ?? undefined;
  const minScore = searchParams.get("minScore")
    ? parseFloat(searchParams.get("minScore")!)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 50;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  try {
    const places = await getNearbyPlaces(lat, lng, radiusKm, {
      amenity: amenity || undefined,
      minScore,
      limit,
    });

    return NextResponse.json({ places });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : undefined;
    console.error("[GET /api/places/nearby]", error);
    return NextResponse.json(
      {
        error: "Could not fetch places",
        ...(process.env.NODE_ENV === "development"
          ? { message, ...(cause ? { cause } : {}) }
          : {}),
      },
      { status: 500 }
    );
  }
}
