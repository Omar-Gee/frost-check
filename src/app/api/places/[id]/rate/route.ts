import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { upsertUserRating } from "@/lib/places/queries";

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be signed in to rate" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const placeId = decodeURIComponent(id);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ratingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid rating (1-5)" },
      { status: 400 }
    );
  }

  await upsertUserRating(
    placeId,
    session.user.id,
    parsed.data.rating,
    parsed.data.comment
  );

  return NextResponse.json({ success: true });
}
