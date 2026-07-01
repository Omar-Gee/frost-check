import { NextRequest, NextResponse } from "next/server";
import { getPlacesInBounds } from "@/lib/places/queries";

function parseBounds(searchParams: URLSearchParams) {
  const minLat = parseFloat(
    searchParams.get("minLat") ??
      searchParams.get("swLat") ??
      ""
  );
  const maxLat = parseFloat(
    searchParams.get("maxLat") ??
      searchParams.get("neLat") ??
      ""
  );
  const minLng = parseFloat(
    searchParams.get("minLng") ??
      searchParams.get("swLng") ??
      ""
  );
  const maxLng = parseFloat(
    searchParams.get("maxLng") ??
      searchParams.get("neLng") ??
      ""
  );

  return { minLat, maxLat, minLng, maxLng };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const { minLat, maxLat, minLng, maxLng } = parseBounds(searchParams);
  const amenity = searchParams.get("amenity") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const sortParam = searchParams.get("sort");
  const sort = sortParam === "distance" ? "distance" : "ac";
  const minScore = searchParams.get("minScore")
    ? parseFloat(searchParams.get("minScore")!)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 100;

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

  if ([minLat, maxLat, minLng, maxLng].some((v) => Number.isNaN(v))) {
    return NextResponse.json(
      {
        error:
          "Bounds required: minLat/maxLat/minLng/maxLng or neLat/neLng/swLat/swLng",
      },
      { status: 400 }
    );
  }

  try {
    const places = await getPlacesInBounds(
      { minLat, maxLat, minLng, maxLng },
      {
        amenity: amenity || undefined,
        city: city || undefined,
        minScore,
        limit,
        sort,
        distanceFrom,
      }
    );

    return NextResponse.json({ places });
  } catch (error) {
    console.error("[GET /api/places/bounds]", error);
    return NextResponse.json(
      { error: "Could not fetch places" },
      { status: 500 }
    );
  }
}
