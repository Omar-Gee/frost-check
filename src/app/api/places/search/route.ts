import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json(
      { error: "Search query must be at least 2 characters" },
      { status: 400 }
    );
  }

  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const lat = latParam ? parseFloat(latParam) : undefined;
  const lng = lngParam ? parseFloat(lngParam) : undefined;
  const city = searchParams.get("city") ?? undefined;
  const amenity = searchParams.get("amenity") ?? undefined;
  const minScore = searchParams.get("minScore")
    ? parseFloat(searchParams.get("minScore")!)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 50;

  if (
    (latParam && Number.isNaN(lat!)) ||
    (lngParam && Number.isNaN(lng!))
  ) {
    return NextResponse.json(
      { error: "Invalid lat or lng" },
      { status: 400 }
    );
  }

  try {
    const places = await searchPlaces(q, {
      lat,
      lng,
      city: city || undefined,
      amenity: amenity || undefined,
      minScore,
      limit,
    });

    return NextResponse.json({ places, query: q });
  } catch (error) {
    console.error("[GET /api/places/search]", error);
    return NextResponse.json(
      { error: "Could not search places" },
      { status: 500 }
    );
  }
}
