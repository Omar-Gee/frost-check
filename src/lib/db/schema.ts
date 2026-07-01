import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "@auth/core/adapters";

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  displayName: text("display_name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const places = sqliteTable(
  "place",
  {
    id: text("id").primaryKey(),
    osmType: text("osm_type").notNull(),
    osmId: text("osm_id").notNull(),
    name: text("name").notNull(),
    amenity: text("amenity"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    address: text("address"),
    city: text("city"),
    wikipediaSlug: text("wikipedia_slug"),
    website: text("website"),
    phone: text("phone"),
    googleMapsUrl: text("google_maps_url"),
    indexedAt: integer("indexed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    osmIdx: index("place_osm_idx").on(table.osmType, table.osmId),
    cityIdx: index("place_city_idx").on(table.city),
    geoIdx: index("place_geo_idx").on(table.lat, table.lng),
  })
);

export const reviewScores = sqliteTable(
  "review_score",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    summary: text("summary"),
    mentionCount: integer("mention_count").default(0),
    snippets: text("snippets"),
    textSources: text("text_sources"),
    hasAc: integer("has_ac", { mode: "boolean" }).notNull().default(false),
    source: text("source").notNull().default("ai"),
    aiModel: text("ai_model"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    placeIdx: index("review_score_place_idx").on(table.placeId),
  })
);

export const userRatings = sqliteTable(
  "user_rating",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    placeUserIdx: index("user_rating_place_user_idx").on(
      table.placeId,
      table.userId
    ),
    placeUserUnique: index("user_rating_place_user_unique").on(
      table.placeId,
      table.userId
    ),
  })
);

export const indexJobs = sqliteTable("index_job", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  city: text("city").notNull(),
  status: text("status").notNull().default("pending"),
  placesFound: integer("places_found").default(0),
  placesIndexed: integer("places_indexed").default(0),
  lastGeminiCall: integer("last_gemini_call", { mode: "timestamp_ms" }),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  ratings: many(userRatings),
}));

export const placesRelations = relations(places, ({ many }) => ({
  reviewScores: many(reviewScores),
  userRatings: many(userRatings),
}));

export const reviewScoresRelations = relations(reviewScores, ({ one }) => ({
  place: one(places, {
    fields: [reviewScores.placeId],
    references: [places.id],
  }),
}));

export const userRatingsRelations = relations(userRatings, ({ one }) => ({
  place: one(places, {
    fields: [userRatings.placeId],
    references: [places.id],
  }),
  user: one(users, {
    fields: [userRatings.userId],
    references: [users.id],
  }),
}));

export type Place = typeof places.$inferSelect;
export type ReviewScore = typeof reviewScores.$inferSelect;
export type UserRating = typeof userRatings.$inferSelect;
export type IndexJob = typeof indexJobs.$inferSelect;
