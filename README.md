# FrostCheck

**Yelp for air conditioning** — find cafes, shops, offices, and other places with good AC in the Netherlands and Brussels.

## Stack

- **Next.js 16** — App Router
- **Turso / SQLite** — Drizzle ORM (`local.db` fallback when Turso is unset)
- **NextAuth v5** — Google / GitHub OAuth (+ email login in development)
- **OpenStreetMap** — Overpass API for place data
- **Gemini Flash-Lite** — optional AI AC scoring (heuristic fallback)
- **Leaflet + CARTO/OSM** — interactive map

## Local development

### 1. Environment variables

```bash
cp .env.example .env
```

Set at minimum:

```bash
AUTH_SECRET=...   # openssl rand -base64 32
```

Optional:

| Variable | Purpose |
|---|---|
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Production database (omit locally to use `local.db`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | AI scoring |
| `SCORING_MODE=heuristic` | Skip Gemini entirely |
| `AUTH_GOOGLE_*` / `AUTH_GITHUB_*` | OAuth sign-in |

Email sign-in works in development without OAuth.

### 2. Initialize the database

```bash
npm run db:push
```

Run this again after schema changes. If you use `local.db`, make sure Turso vars are **unset** in `.env` (empty strings still count as set).

### 3. Index places

Indexes POIs from OpenStreetMap for **Arnhem, Tilburg, Amsterdam, Den Haag, and Brussels**.

Categories include cafes, restaurants, hotels, offices, supermarkets, clothing stores, malls, department stores, and other retail.

```bash
# All cities
npm run index:nl

# One city
npm run index:nl -- amsterdam
npm run index:nl -- brussels

# Faster run — heuristic scoring only (no Gemini)
npm run index:nl -- --skip-ai amsterdam
```

Indexing is slow due to Overpass rate limits. Re-run after adding new city or category types.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production deployment

### 1. Turso database

1. Create a database at [turso.tech](https://turso.tech)
2. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on your host

Do **not** use `local.db` in production — serverless hosts cannot persist local files.

### 2. Auth

Configure at least one OAuth provider (`AUTH_GOOGLE_*` or `AUTH_GITHUB_*`) plus `AUTH_SECRET`.

Redirect URI example:

```
https://YOUR-DOMAIN.com/api/auth/callback/google
```

### 3. Schema + data

Run against your Turso database before or after deploy:

```bash
npm run db:push
npm run index:nl
```

### 4. Deploy

```bash
npm run build
```

Deploy to Vercel or your preferred host.

### Smoke test

- [ ] Sign in at `/login`
- [ ] Open a place → submit rating and comment
- [ ] Refresh → data persists
- [ ] Home page shows indexed places near a city

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Drizzle Studio |
| `npm run index:nl` | Index places from OpenStreetMap |

## Cities

Arnhem · Tilburg · Amsterdam · Den Haag · Brussels

## Attribution

- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors · [CARTO](https://carto.com/attributions)
- POI data: OpenStreetMap via Overpass API
- Wikipedia extracts: Wikipedia REST API

## License

MIT
