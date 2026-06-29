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
  const sortParam = searchParams.get("sort");
  const sort = sortParam === "distance" ? "distance" : "ac";
  const minScore = searchParams.get("minScore")
    ? parseFloat(searchParams.get("minScore")!)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 100;

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
      { amenity: amenity || undefined, minScore, limit, sort }
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
