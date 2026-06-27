import { NextRequest, NextResponse } from "next/server";
import { getPlacesInBounds } from "@/lib/places/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const minLat = parseFloat(searchParams.get("minLat") ?? "");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
  const minLng = parseFloat(searchParams.get("minLng") ?? "");
  const maxLng = parseFloat(searchParams.get("maxLng") ?? "");
  const amenity = searchParams.get("amenity") ?? undefined;
  const minScore = searchParams.get("minScore")
    ? parseFloat(searchParams.get("minScore")!)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 100;

  if (
    [minLat, maxLat, minLng, maxLng].some((v) => Number.isNaN(v))
  ) {
    return NextResponse.json(
      { error: "minLat, maxLat, minLng, and maxLng are required" },
      { status: 400 }
    );
  }

  try {
    const places = await getPlacesInBounds(
      { minLat, maxLat, minLng, maxLng },
      { amenity: amenity || undefined, minScore, limit }
    );

    return NextResponse.json({ places });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : undefined;
    console.error("[GET /api/places/bounds]", error);
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
