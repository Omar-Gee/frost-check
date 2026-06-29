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

### 3. Index places (local)

See [Indexing places](#indexing-places) below. Quick start:

```bash
npm run index:nl -- --skip-ai amsterdam
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Indexing places

The app does **not** load places live from OpenStreetMap on each visit. You must **index** POIs into Turso (or `local.db` locally) using the batch script. Until a city is indexed, the home page shows *"[City] hasn't been indexed yet"*.

### What gets indexed

**Cities:** Arnhem, Tilburg, Amsterdam, Den Haag, Brussels

**Categories:** cafes, restaurants, hotels, offices, supermarkets, clothing stores, malls, department stores, and other retail (via OSM Overpass).

### Commands

```bash
# All cities (slow — many hours)
npm run index:nl

# One city (recommended)
npm run index:nl -- amsterdam
npm run index:nl -- brussels
npm run index:nl -- arnhem
npm run index:nl -- tilburg
npm run index:nl -- den-haag

# Heuristic scoring only — no Gemini API calls (much faster)
npm run index:nl -- --skip-ai amsterdam

# Combine flags: skip AI for one city
npm run index:nl -- --skip-ai brussels
```

City slugs match the buttons on the home page (`amsterdam`, `brussels`, `den-haag`, etc.).

### Local indexing (`local.db`)

1. Leave `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` **unset** in `.env`.
2. Run `npm run db:push`.
3. Run the indexer, e.g. `npm run index:nl -- --skip-ai amsterdam`.

Data is stored in `local.db` in the project root (gitignored).

### Production indexing (Turso)

Run the indexer **locally** with env vars pointing at your **production** Turso database (same values as Vercel):

**PowerShell:**

```powershell
$env:TURSO_DATABASE_URL="libsql://your-db.turso.io"
$env:TURSO_AUTH_TOKEN="your-token"

npm run db:push
npm run index:nl -- --skip-ai amsterdam
npm run index:nl -- --skip-ai brussels
```

**macOS / Linux:**

```bash
export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-token"

npm run db:push
npm run index:nl -- --skip-ai amsterdam
npm run index:nl -- --skip-ai brussels
```

Optional: set `GOOGLE_GENERATIVE_AI_API_KEY` and omit `--skip-ai` for Gemini AC scores (free tier ~1,000 calls/day; script stops near 800/day).

No redeploy is needed after indexing — production reads from Turso immediately.

### Tips

- **Start with one city** before running all cities.
- **Use `--skip-ai` first** to populate places quickly; re-run without it later if you want AI scores.
- **Expect rate limits** from the Overpass API — the script retries and pauses between batches; a large city can take 30+ minutes.
- **Re-index** after schema changes or when new shop/category types are added to the codebase.
- **Verify a city** was indexed:

```bash
curl "https://YOUR-DOMAIN.com/api/places/city-count?city=Brussels"
# → {"city":"Brussels","count":1234}
```

Or locally: `npm run db:studio` and browse the `place` table.

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

### 3. Index production data

Push the schema, then index each city you want live on the site. See [Indexing places](#indexing-places) for full commands.

```bash
npm run db:push
npm run index:nl -- --skip-ai amsterdam
npm run index:nl -- --skip-ai brussels
```

At minimum, index every city button you expose on the home page. A city with `count: 0` from `/api/places/city-count?city=...` will show an empty state to users.

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
- [ ] `/api/places/city-count?city=Brussels` returns `count` > 0 for each live city

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
