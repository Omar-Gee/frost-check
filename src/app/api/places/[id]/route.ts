import { NextRequest, NextResponse } from "next/server";
import { getPlaceDetail } from "@/lib/places/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const place = await getPlaceDetail(decodedId);
  if (!place) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  return NextResponse.json({ place });
}
