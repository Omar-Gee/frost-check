import { NextRequest, NextResponse } from "next/server";
import { getCityPlaceCount } from "@/lib/places/queries";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city")?.trim();

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  try {
    const count = await getCityPlaceCount(city);
    return NextResponse.json({ city, count });
  } catch (error) {
    console.error("[GET /api/places/city-count]", error);
    return NextResponse.json(
      { error: "Could not fetch city count" },
      { status: 500 }
    );
  }
}
