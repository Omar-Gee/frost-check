import { and, desc, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { boundingBox, haversineKm, type BoundingBox } from "@/lib/db/geo";
import { places, reviewScores, userRatings, users } from "@/lib/db/schema";
import {
  averageUserScore,
  computeDisplayScore,
  type CombinedScore,
} from "@/lib/scoring/combined";

export interface PlaceWithScore {
  id: string;
  osmType: string;
  osmId: string;
  name: string;
  amenity: string | null;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  wikipediaSlug: string | null;
  distanceKm?: number;
  score: CombinedScore;
  latestSummary: string | null;
  hasAc: boolean | null;
}

export interface PlaceDetail extends PlaceWithScore {
  userRatings: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    userName: string | null;
  }>;
  aiHistory: Array<{
    score: number;
    confidence: number;
    summary: string | null;
    createdAt: Date;
  }>;
}

async function loadScoresForPlaces(
  placeIds: string[]
): Promise<Map<string, PlaceWithScore["score"] & { summary: string | null; hasAc: boolean | null }>> {
  const db = getDb();
  const result = new Map<
    string,
    PlaceWithScore["score"] & { summary: string | null; hasAc: boolean | null }
  >();

  if (placeIds.length === 0) return result;

  const latestAiScores = await db
    .select()
    .from(reviewScores)
    .where(inArray(reviewScores.placeId, placeIds))
    .orderBy(desc(reviewScores.createdAt));

  const aiByPlace = new Map<string, (typeof latestAiScores)[0]>();
  for (const row of latestAiScores) {
    if (!aiByPlace.has(row.placeId)) aiByPlace.set(row.placeId, row);
  }

  const allUserRatings = await db
    .select()
    .from(userRatings)
    .where(inArray(userRatings.placeId, placeIds));

  const ratingsByPlace = new Map<string, number[]>();
  for (const r of allUserRatings) {
    const list = ratingsByPlace.get(r.placeId) ?? [];
    list.push(r.rating);
    ratingsByPlace.set(r.placeId, list);
  }

  for (const id of placeIds) {
    const ai = aiByPlace.get(id);
    const ratings = ratingsByPlace.get(id) ?? [];
    const userAvg = averageUserScore(ratings);
    const score = computeDisplayScore({
      aiScore: ai?.score ?? null,
      aiConfidence: ai?.confidence ?? null,
      userAverage: userAvg,
      userCount: ratings.length,
    });
    result.set(id, {
      ...score,
      summary: ai?.summary ?? null,
      hasAc: ai?.hasAc ?? null,
    });
  }

  return result;
}

const EMPTY_SCORE_DATA: PlaceWithScore["score"] & {
  summary: string | null;
  hasAc: boolean | null;
} = {
  displayScore: null,
  aiScore: null,
  userAverage: null,
  userCount: 0,
  label: "Unknown",
  summary: null,
  hasAc: null,
};

function enrichPlace(
  place: typeof places.$inferSelect,
  scoreData: PlaceWithScore["score"] & {
    summary: string | null;
    hasAc: boolean | null;
  },
  distanceKm?: number
): PlaceWithScore {
  return {
    id: place.id,
    osmType: place.osmType,
    osmId: place.osmId,
    name: place.name,
    amenity: place.amenity,
    lat: place.lat,
    lng: place.lng,
    address: place.address,
    city: place.city,
    wikipediaSlug: place.wikipediaSlug,
    distanceKm,
    score: {
      displayScore: scoreData.displayScore,
      aiScore: scoreData.aiScore,
      userAverage: scoreData.userAverage,
      userCount: scoreData.userCount,
      label: scoreData.label,
    },
    latestSummary: scoreData.summary,
    hasAc: scoreData.hasAc,
  };
}

export async function getNearbyPlaces(
  lat: number,
  lng: number,
  radiusKm: number,
  options?: { amenity?: string; minScore?: number; limit?: number }
): Promise<PlaceWithScore[]> {
  const db = getDb();
  const box = boundingBox({ lat, lng }, radiusKm);
  const limit = options?.limit ?? 50;

  const rows = await db
    .select()
    .from(places)
    .where(
      and(
        gte(places.lat, box.minLat),
        lte(places.lat, box.maxLat),
        gte(places.lng, box.minLng),
        lte(places.lng, box.maxLng)
      )
    );

  let filtered = rows
    .map((p) => ({
      place: p,
      distanceKm: haversineKm({ lat, lng }, { lat: p.lat, lng: p.lng }),
    }))
    .filter((x) => x.distanceKm <= radiusKm);

  if (options?.amenity) {
    filtered = filtered.filter((x) => x.place.amenity === options.amenity);
  }

  filtered.sort((a, b) => a.distanceKm - b.distanceKm);
  filtered = filtered.slice(0, limit);

  const scoreMap = await loadScoresForPlaces(filtered.map((x) => x.place.id));

  let results = filtered.map(({ place, distanceKm }) => {
    const scoreData = scoreMap.get(place.id) ?? EMPTY_SCORE_DATA;
    return enrichPlace(place, scoreData, distanceKm);
  });

  if (options?.minScore != null) {
    results = results.filter(
      (p) =>
        p.score.displayScore != null &&
        p.score.displayScore >= options.minScore!
    );
  }

  return results;
}

export async function searchPlaces(
  query: string,
  options?: {
    lat?: number;
    lng?: number;
    city?: string;
    amenity?: string;
    minScore?: number;
    limit?: number;
  }
): Promise<PlaceWithScore[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const db = getDb();
  const limit = options?.limit ?? 50;
  const pattern = `%${trimmed}%`;

  const filters = [
    or(
      like(places.name, pattern),
      like(places.address, pattern),
      like(places.city, pattern)
    ),
  ];

  if (options?.city) {
    filters.push(eq(places.city, options.city));
  }

  const rows = await db
    .select()
    .from(places)
    .where(and(...filters))
    .limit(limit * 3);

  let filtered = rows;
  if (options?.amenity) {
    filtered = filtered.filter((p) => p.amenity === options.amenity);
  }

  const scoreMap = await loadScoresForPlaces(filtered.map((p) => p.id));

  let results = filtered.map((place) => {
    const scoreData = scoreMap.get(place.id) ?? EMPTY_SCORE_DATA;
    const distanceKm =
      options?.lat != null && options?.lng != null
        ? haversineKm(
            { lat: options.lat, lng: options.lng },
            { lat: place.lat, lng: place.lng }
          )
        : undefined;
    return enrichPlace(place, scoreData, distanceKm);
  });

  if (options?.minScore != null) {
    results = results.filter(
      (p) =>
        p.score.displayScore != null &&
        p.score.displayScore >= options.minScore!
    );
  }

  const lowerQuery = trimmed.toLowerCase();
  results.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    if (a.distanceKm != null && b.distanceKm != null) {
      return a.distanceKm - b.distanceKm;
    }
    return a.name.localeCompare(b.name);
  });

  return results.slice(0, limit);
}

export async function getPlacesInBounds(
  bounds: BoundingBox,
  options?: { amenity?: string; minScore?: number; limit?: number }
): Promise<PlaceWithScore[]> {
  const db = getDb();
  const limit = options?.limit ?? 100;

  const rows = await db
    .select()
    .from(places)
    .where(
      and(
        gte(places.lat, bounds.minLat),
        lte(places.lat, bounds.maxLat),
        gte(places.lng, bounds.minLng),
        lte(places.lng, bounds.maxLng)
      )
    )
    .limit(limit);

  let filtered = rows;
  if (options?.amenity) {
    filtered = filtered.filter((p) => p.amenity === options.amenity);
  }

  const scoreMap = await loadScoresForPlaces(filtered.map((p) => p.id));

  let results = filtered.map((place) => {
    const scoreData = scoreMap.get(place.id) ?? EMPTY_SCORE_DATA;
    return enrichPlace(place, scoreData);
  });

  if (options?.minScore != null) {
    results = results.filter(
      (p) =>
        p.score.displayScore != null &&
        p.score.displayScore >= options.minScore!
    );
  }

  return results;
}

export async function getPlaceDetail(id: string): Promise<PlaceDetail | null> {
  const db = getDb();

  const [place] = await db.select().from(places).where(eq(places.id, id)).limit(1);
  if (!place) return null;

  const scoreMap = await loadScoresForPlaces([id]);
  const scoreData = scoreMap.get(id) ?? EMPTY_SCORE_DATA;
  const base = enrichPlace(place, scoreData);

  const aiHistory = await db
    .select({
      score: reviewScores.score,
      confidence: reviewScores.confidence,
      summary: reviewScores.summary,
      createdAt: reviewScores.createdAt,
    })
    .from(reviewScores)
    .where(eq(reviewScores.placeId, id))
    .orderBy(desc(reviewScores.createdAt))
    .limit(10);

  const ratings = await db
    .select({
      id: userRatings.id,
      rating: userRatings.rating,
      comment: userRatings.comment,
      createdAt: userRatings.createdAt,
      userName: users.name,
    })
    .from(userRatings)
    .leftJoin(users, eq(userRatings.userId, users.id))
    .where(eq(userRatings.placeId, id))
    .orderBy(desc(userRatings.createdAt));

  return {
    ...base,
    userRatings: ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      userName: r.userName,
    })),
    aiHistory: aiHistory.map((h) => ({
      score: h.score,
      confidence: h.confidence,
      summary: h.summary,
      createdAt: h.createdAt,
    })),
  };
}

export async function upsertUserRating(
  placeId: string,
  userId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(userRatings)
    .where(
      and(
        eq(userRatings.placeId, placeId),
        eq(userRatings.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(userRatings)
      .set({ rating, comment: comment ?? null })
      .where(eq(userRatings.id, existing.id));
  } else {
    await db.insert(userRatings).values({
      placeId,
      userId,
      rating,
      comment: comment ?? null,
    });
  }
}
