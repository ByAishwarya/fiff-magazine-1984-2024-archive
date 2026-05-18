# Global Search Autocomplete — Implementation Notes

**Date:** 2026-05-17 / 2026-05-18  
**Branch:** `aisha-redesign`  
**Author:** Aishwarya  

This document covers every change made to implement the real-time multi-category
search autocomplete feature on the FifF Kommunikation archive website. 

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Architecture Decision](#2-architecture-decision)
3. [Stack Overview](#3-stack-overview)
4. [Every File That Was Changed](#4-every-file-that-was-changed)
5. [Database Changes](#5-database-changes)
6. [Backend API Changes](#6-backend-api-changes)
7. [Frontend Changes](#7-frontend-changes)
8. [Infrastructure Changes](#8-infrastructure-changes)
9. [Bugs Encountered and Fixed](#9-bugs-encountered-and-fixed)
10. [Known Quirks in the Data](#10-known-quirks-in-the-data)
11. [How to Verify Everything Works](#11-how-to-verify-everything-works)
12. [How to Run Locally](#12-how-to-run-locally)

---

## 1. What Was Built

The site previously had a non-functional search input in the navbar that only
redirected on Enter. It has been replaced with a fully working real-time
autocomplete search that:

- Shows results grouped into **Articles**, **Authors**, and **Tags** sections
- Displays article metadata (issue reference `2/23` and topic tag as subtitle)
- Debounces input by **150 ms** and cancels stale requests with `AbortController`
- Sorts authors by number of articles written (most prolific first)
- On selecting a result, **replaces the landing page content** with a filtered
  view showing only the relevant magazine issues
- The filtered view groups results by **decade tabs** and **year sidebar**,
  matching the existing browse UI exactly
- A **"← Back to Archive"** button restores the full landing page and clears
  the search bar

---

## 2. Architecture Decision

Three options were considered:

| Option | Decision | Reason |
|--------|----------|--------|
| **Elasticsearch** | ❌ Rejected | Needs a separate JVM container (~512 MB RAM minimum). University VM has a fixed RAM budget. Overkill for 10,000 records. |
| **Client-side search (FlexSearch / Fuse.js)** | ❌ Rejected | Requires downloading ~300–500 KB of JSON upfront. On unstable university Wi-Fi this causes a broken search experience until the download finishes. |
| **PostgreSQL `pg_trgm` + GIN indexes** | ✅ Chosen | Zero new infrastructure. PostgreSQL is already running. With GIN indexes, `ILIKE '%query%'` on 4,000 rows takes < 5 ms. Each API response is ~500–1000 bytes. |

**Query strategy — hybrid `icontains` + `TrigramSimilarity`:**

- `icontains` alone: fast (uses GIN index) but returns results in arbitrary
  disk order — no relevance ranking.
- `TrigramSimilarity` alone with a threshold: short queries like "AI" (2 chars)
  produce low similarity scores even for perfectly relevant results, causing
  valid matches to be discarded.
- **Hybrid chosen**: filter with `icontains` (catches all substring positions,
  index-accelerated), annotate with `TrigramSimilarity` for a relevance score,
  sort by score descending. For authors, add a secondary sort by article count
  descending so prolific authors surface first.

---

## 3. Stack Overview

```
Frontend:  Astro 4.16 + React 18 + TypeScript + Tailwind CSS + MUI v6
Backend:   Django 5 + Django REST Framework + PostgreSQL 17 (dev) / 15 (prod)
Search DB: PostgreSQL pg_trgm extension (version 1.6), GIN indexes
Proxy:     Nginx 1.25 (production only)
Deploy:    Docker Compose
```

The entire React application is mounted as a **single island** in `index.astro`:
```astro
<App client:load />
```
This means every React component inside `App` is automatically interactive —
no individual `client:` directives are needed on child components.

---

## 4. Every File That Was Changed

### New files created

| File | Purpose |
|------|---------|
| `app/catalog/search_views.py` | Django APIView for the `/search/` endpoint |
| `app/catalog/migrations/0004_search_indexes.py` | Adds GIN trigram indexes |
| `app/catalog/migrations/0006_restore_search_indexes.py` | Re-adds indexes after auto-generated 0005 removed them (see §9) |
| `astro/src/components/GlobalSearch.jsx` | The autocomplete search component |
| `astro/src/components/SearchResultsView.jsx` | Filtered results view (replaces landing page on selection) |

### Existing files modified

| File | What changed |
|------|-------------|
| `app/catalog/models.py` | Added `Meta.indexes` with GIN index declarations to `MagazineArticle`, `Author`, `Tag` |
| `app/catalog/views.py` | Added `by_entity` action to `MagazineIssueViewSet` |
| `app/hello_django/urls.py` | Registered `GET /search/` route |
| `astro/src/Astro.jsx` | Added `activeFilter` + `searchResetKey` state, `handleSearchSelect`, `handleClearFilter` |
| `astro/src/components/Navbar.jsx` | Replaced static input with `GlobalSearch`, added `SearchPlaceholder`, threaded `onSearchSelect` + `searchResetKey` props, widened to `w-80` |
| `astro/src/env.d.ts` | Declared `PUBLIC_API_URL` type to fix TypeScript error |
| `astro/astro.config.mjs` | Added `vite.ssr.noExternal` for MUI packages (SSR fix — see §9) |
| `nginx/nginx.conf` | Added `proxy_cache_path` zone + `/search/` location block with 1h cache |
| `docker-compose.yml` | Changed frontend port from `4321:4321` to `3000:4321` (see §9) |

---

## 5. Database Changes

### One-time prerequisite (run as superuser, already done in dev)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**For production:** the `hello_django` app user does NOT have superuser privileges
on the university server. Ask the university DBA to run the command above once
on the production cluster before deploying.

### GIN Trigram Indexes (migration `0006_restore_search_indexes`)

Three GIN indexes were added — one per searchable column:

```
article_title_gin_trgm_idx  →  catalog_magazinearticle(title)  using gin_trgm_ops
author_name_gin_trgm_idx    →  catalog_author(name)             using gin_trgm_ops
tag_name_gin_trgm_idx       →  catalog_tag(name)                using gin_trgm_ops
```

**What these do:** convert `LIKE '%query%'` from a full table scan (`O(n)`) into
an index lookup (`O(log n)`). For 4,000 rows per table this brings each query
from ~20 ms to < 2 ms.

**Verify they exist:**
```bash
docker compose exec db psql -U hello_django -d hello_django_dev \
  -c "SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE '%gin%';"
```

Expected output:
```
article_title_gin_trgm_idx  | catalog_magazinearticle
author_name_gin_trgm_idx    | catalog_author
tag_name_gin_trgm_idx       | catalog_tag
```

### Why indexes are in `models.py` Meta

Django auto-generates migrations based on what it sees in `models.py`. If the
indexes are not declared in `Meta.indexes`, running `python manage.py makemigrations`
will generate a migration to **remove** them (this is exactly what happened with
migration `0005` — see §9). They are now declared in all three model classes so
this cannot happen again.

---

## 6. Backend API Changes

### New endpoint: `GET /search/?q=<query>`

**File:** `app/catalog/search_views.py`  
**Class:** `GlobalSearchView(APIView)`

**Behaviour:**
- Returns empty arrays if `len(q) < 2` (single characters are too noisy)
- Runs 3 DB queries + 1 prefetch = 4 total queries per request
- Articles: `icontains` filter → `TrigramSimilarity` annotation → sort by `-sim` → limit 4
- Authors: `icontains` filter → `TrigramSimilarity` + `Count("authorarticle")` annotations → sort by `-article_count, -sim` → limit 4
- Tags: `icontains` filter → `TrigramSimilarity` → sort by `-sim` → limit 4
- Cache-Control header set to `max-age=3600` in **production only** (disabled in dev via `DEBUG` check)

**Response shape:**
```json
{
  "articles": [
    {
      "id": 42,
      "title": "Die sechs größten Probleme im AI Act",
      "issue_ref": "2/23",
      "topic": "Künstliche Intelligenz",
      "issue_id": 17
    }
  ],
  "authors": [
    { "id": 7, "name": "Hügel, Stefan" }
  ],
  "tags": [
    { "id": 3, "name": "AI" }
  ]
}
```

**Why `issue_id` is included:** the frontend passes it to the `by_entity` endpoint
when the user clicks an article result, so the correct magazine issue can be shown.

**Why authors sort by `article_count` first:** prolific authors (e.g. "Hügel, Stefan"
with 214 articles) should appear before less active authors with the same name
fragment. Pure trigram similarity doesn't know about contribution volume.

### New endpoint: `GET /magazine_issue/by_entity/?type=<type>&id=<id>`

**File:** `app/catalog/views.py` — added as `@action` on `MagazineIssueViewSet`

**Parameters:**
- `type`: `author` | `tag` | `article`
- `id`: integer primary key of the entity

**Behaviour:** returns all magazine issues related to that entity, grouped by
year in the same format as the existing list endpoint:
```json
{
  "1988": [ { ...issue... } ],
  "2001": [ { ...issue... }, { ...issue... } ]
}
```

**URL registration** in `app/hello_django/urls.py`:
```python
from catalog.search_views import GlobalSearchView
path("search/", GlobalSearchView.as_view(), name="global-search"),
```

The `by_entity` action is auto-routed by DRF's `DefaultRouter` at:
`GET /magazine_issue/by_entity/?type=author&id=7`

---

## 7. Frontend Changes

### `GlobalSearch.jsx` (new file)

**Location:** `astro/src/components/GlobalSearch.jsx`

**Key implementation decisions:**

**MUI `Autocomplete` instead of custom keyboard nav:**  
Writing an accessible combobox from scratch (scroll management, aria-activedescendant,
mouse/keyboard handoffs, screen reader announcements) is a well-known rabbit hole.
MUI v6 is already in the project's dependencies, so `@mui/material/Autocomplete`
was used — it handles all ARIA and keyboard navigation out of the box. Styled
entirely with Tailwind via `slotProps` and `renderGroup`/`renderOption` — no
MUI ThemeProvider or `sx` props anywhere.

**`filterOptions={(x) => x}`:**  
Disables MUI's built-in client-side filter. The server already filtered and
ranked results — allowing MUI to re-filter would discard valid options.

**`freeSolo`:**  
Without this, MUI clears the input if the typed text doesn't exactly match an
option string. `freeSolo` treats the field as a free-text search input.

**Debounce + AbortController:**
```javascript
// On every keystroke:
clearTimeout(debounceTimer.current);          // reset the 150ms window
abortController.current.abort();              // cancel previous in-flight request
abortController.current = new AbortController();
debounceTimer.current = setTimeout(() => fetchResults(value), 150);
```
Both are stored in `useRef` (not `useState`) because changing them must not
trigger a re-render.

**`onSelect` callback (not `window.location.href`):**  
The component does not navigate anywhere itself. It calls `props.onSelect(option)`,
and `Astro.jsx` decides what to do (set `activeFilter` state → show `SearchResultsView`).

### `Navbar.jsx` (modified)

**Key changes:**
- Added `SearchPlaceholder` component — a static div that looks identical to
  the real search input, shown during SSR and during `React.lazy` loading
- `GlobalSearch` is loaded via `React.lazy` + `Suspense` — **this is the SSR fix**
  (see §9)
- `mounted` state (starts `false`, set to `true` in `useEffect`) gates when
  `GlobalSearch` renders, preventing hydration mismatch
- `searchResetKey` prop: when this changes, React sees a different `key` on
  `GlobalSearch` and fully remounts it, clearing all internal state including
  `inputValue` — this is how the search bar clears when "Back to Archive" is clicked
- Width changed from `w-56` (224px) to `w-80` (320px)
- Input contrast increased: `bg-gray-100`, `border-gray-400`, `shadow`

### `Astro.jsx` (modified)

**Key changes:**
- Added `activeFilter` state: `{ type: 'article'|'author'|'tag', id, label } | null`
- Added `searchResetKey` state: integer, incremented on `handleClearFilter`
- `handleSearchSelect(option)`: maps the clicked dropdown option to an `activeFilter`
- `handleClearFilter()`: sets `activeFilter = null` and increments `searchResetKey`
- Conditional rendering:
  ```jsx
  {showAdvancedSearch ? <FilterPage /> :
   activeFilter       ? <SearchResultsView filter={activeFilter} onClear={handleClearFilter} /> :
                        <><HeroSection /><MagazineApp /></>}
  ```

### `SearchResultsView.jsx` (new file)

**Location:** `astro/src/components/SearchResultsView.jsx`

**What it does:**
1. Receives `filter` prop (`{ type, id, label }`) and `onClear` callback
2. Fetches from `/magazine_issue/by_entity/?type=X&id=Y` when `filter` changes
3. Groups the year-keyed response into decade buckets client-side:
   `{ "1980s": [1988], "2000s": [2001] }`
4. Renders decade tabs, year sidebar, and magazine card grid — same visual
   structure as the existing `MagazineArchive` + `ContentGrid` browse UI
5. Shows only the decades and years that contain matching issues
6. Clicking a magazine card opens `IssueModal` (self-contained state)
7. Shows a loading spinner, empty state, and "Back to Archive" button

**Why a separate component instead of filtering the existing browse UI:**  
`MagazineArchive` (Searchbar.jsx) fetches from a hardcoded `/magazine_issue/decades/`
endpoint that always returns all decades. Injecting a filter into it would require
propagating filter state through 4 component layers and modifying multiple
components. A self-contained `SearchResultsView` is simpler, testable in isolation,
and leaves the existing browse code untouched.

---

## 8. Infrastructure Changes

### `nginx/nginx.conf`

Added a dedicated cache zone for the search endpoint:

```nginx
proxy_cache_path /tmp/nginx_search_cache
    levels=1:2
    keys_zone=search_cache:4m
    max_size=100m
    inactive=2h
    use_temp_path=off;

location /search/ {
    proxy_pass             http://hello_django;
    proxy_cache            search_cache;
    proxy_cache_valid      200 1h;
    proxy_cache_key        "$uri$is_args$args";
    proxy_cache_use_stale  error timeout updating http_503;
    proxy_cache_lock       on;
    add_header             X-Cache-Status $upstream_cache_status;
    add_header             Cache-Control "public, max-age=3600";
}
```

**Cache TTL is 1 hour** because the archive publishes a few issues per year —
a cached search result that is 59 minutes old is still perfectly accurate.

**`proxy_cache_lock on`**: if 10 students simultaneously search the same term
on a cold cache, only one request hits Django. The other 9 wait and are served
from cache.

**`proxy_cache_use_stale`**: if Django is temporarily unreachable, Nginx serves
the stale cached response instead of a 502 error.

### `docker-compose.yml`

Changed the frontend port mapping:
```yaml
# Before (port 4321 is in Windows' reserved port range 4250–4349)
ports:
  - 4321:4321

# After
ports:
  - 3000:4321
```

The site is now accessed at **`http://localhost:3000`** in development.
The Astro dev server still runs on port 4321 inside the container.

### `astro/astro.config.mjs`

Added `vite.ssr.noExternal` for MUI packages:
```javascript
ssr: {
  noExternal: [
    '@mui/material', '@mui/system', '@mui/utils',
    '@mui/base', '@emotion/react', '@emotion/styled', '@emotion/cache',
  ],
},
```
See §9 for why this was needed.

---

## 9. Bugs Encountered and Fixed

### Bug 1 — Windows reserved port 4321

**Symptom:** `docker compose up` failed with  
`bind: An attempt was made to access a socket in a way forbidden by its access permissions`

**Root cause:** Windows reserves port ranges for Hyper-V. Port 4321 fell inside
the reserved range `4250–4349` visible via:
```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

**Fix:** Changed host port to `3000` in `docker-compose.yml`. Port 3000 is
outside all excluded ranges on this machine.

---

### Bug 2 — MUI Autocomplete crashes Astro SSR

**Symptom:** Page showed `TypeError: __vite_ssr_import_0__.default is not a function`
at `/app/node_modules/@mui/material/Popper/popperClasses.js`

**Root cause:** Astro pre-renders pages on the server (Node.js). MUI's `Autocomplete`
uses `@popperjs/core` internally, which calls browser-only APIs (`window`, `document`).
These don't exist in Node.js so the SSR render crashes.

**Fix:** `GlobalSearch` is loaded via `React.lazy` + `Suspense`, guarded by a
`mounted` state that starts `false` and is set to `true` only inside `useEffect`
(which runs only in the browser, never during SSR):

```jsx
const GlobalSearch = lazy(() => import("./GlobalSearch"));

const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);

// In render:
{mounted
  ? <Suspense fallback={<SearchPlaceholder />}><GlobalSearch /></Suspense>
  : <SearchPlaceholder />}
```

SSR renders `SearchPlaceholder` (a plain div). After hydration, `useEffect` fires,
`mounted` becomes `true`, and `GlobalSearch` loads. The placeholder is sized
identically so there is no layout shift.

Adding `vite.ssr.noExternal` was attempted first but did not fully resolve the
issue because MUI uses browser APIs at runtime, not just at import time.

---

### Bug 3 — Migration 0005 auto-removed the GIN indexes

**Symptom:** After applying `0004_search_indexes`, all three GIN indexes were
missing from the database.

**Root cause:** A previous developer (or CI step) ran `python manage.py makemigrations`
without the indexes declared in `models.py`. Django compared the DB state (indexes
exist from `0004`) against the model state (no indexes in Meta) and auto-generated
`0005_remove_author_author_name_gin_trgm_idx_and_more` to remove them.

**Fix:**
1. Added `Meta.indexes` with the GIN index declarations to `MagazineArticle`,
   `Author`, and `Tag` in `models.py` — Django now knows the indexes are
   intentional and will not auto-generate removal migrations.
2. Created `0006_restore_search_indexes.py` to re-add the three indexes.
3. Applied via `docker compose exec web python manage.py migrate`.

**Prevention:** Always declare custom indexes in the model's `Meta.indexes`.
Never add them only in a migration without a corresponding Meta declaration.

---

### Bug 4 — Browser caching stale search results during development

**Symptom:** After fixing author sort order, the dropdown still showed the old
unsorted results.

**Root cause:** The `Cache-Control: max-age=3600` header (for production Nginx
caching) was being sent in development too. The browser cached the first "stefan"
response for one hour and never hit Django again.

**Fix:** The `patch_cache_control` call in `search_views.py` is now conditional:
```python
from django.conf import settings as dj_settings
if not dj_settings.DEBUG:
    patch_cache_control(response, max_age=3600, s_maxage=3600)
```
In development (`DEBUG=True`), no caching headers are sent.

---

## 10. Known Quirks in the Data

**Author name inconsistency:** The same person appears under multiple name formats.
Example:
- `Hügel, Stefan` — 214 articles (last-name-first format)
- `Huegel, Stefan` — 56 articles (ASCII transliteration, no umlaut)
- `Stefan Hügel` — 2 articles (first-name-first format)

These are three separate rows in `catalog_author`. A search for "stefan" returns
all three. The sort-by-article-count fix ensures the most prolific entry appears
first (`Hügel, Stefan` with 214).

This is a data quality issue in the original import, not a bug in the search.
A future cleanup task could merge duplicate authors.

---

## 11. How to Verify Everything Works

### 1. Confirm GIN indexes are present
```bash
docker compose exec db psql -U hello_django -d hello_django_dev \
  -c "SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE '%gin%';"
```
Expected: 3 rows — `article_title_gin_trgm_idx`, `author_name_gin_trgm_idx`, `tag_name_gin_trgm_idx`

### 2. Smoke test the search API
```bash
curl "http://localhost:8000/search/?q=AI" | python -m json.tool
```
Expected: JSON with `articles`, `authors`, `tags` arrays, each ≤ 4 items.

### 3. Smoke test the entity filter API
```bash
curl "http://localhost:8000/magazine_issue/by_entity/?type=author&id=1181" | python -m json.tool
```
Expected: JSON grouped by year, e.g. `{ "1990": [...], "1995": [...] }`

### 4. Frontend search flow
1. Open `http://localhost:3000`
2. Type at least 2 characters in the search bar — dropdown opens
3. Type quickly — check Network tab in DevTools: requests should only fire
   after 150 ms pause (debounce), earlier requests should show as "cancelled"
   (AbortController)
4. Click an **author** — landing page replaces with filtered decade/year view
5. Click a **magazine card** in the filtered view — IssueModal opens
6. Click **"← Back to Archive"** — landing page restores, search bar is empty

### 5. Verify author sort order
Search `stefan` — first author result should be `Hügel, Stefan` (214 articles).

---

## 12. How to Run Locally

```bash
# 1. Start all containers
docker compose up -d

# 2. First-time only: install pg_trgm extension
docker compose exec db psql -U hello_django -d hello_django_dev \
  -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# 3. Apply all migrations
docker compose exec web python manage.py migrate

# 4. Open the site
# http://localhost:3000   ← frontend (Astro dev server)
# http://localhost:8000   ← Django API (browsable)
# http://localhost:8000/search/?q=AI  ← test search endpoint directly
```

**Port note:** Port 4321 is blocked on this Windows machine by Hyper-V.
The frontend is mapped to port 3000 in `docker-compose.yml`.
Do not change this back to 4321 on this machine.
