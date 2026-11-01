UMKM Geospatial App — Technical Design
Oct 1, 2026 · @Rae
Scope and principles
The MVP records UMKM businesses as points on a map, each with name, address, category, contact person and photos, and lets anyone browse them on a map. Everything else waits until a real need shows up.
In the MVP
• Map of all businesses, filter by category, search by name
• Business detail page: info, contact, photo gallery, "open in Google Maps" link
• Logged-in users add, edit and delete businesses; pick location by GPS or by dragging a pin
• Upload photos (documentation) per business
• Installable PWA, mobile-first
Deliberately not in the MVP
• Offline data entry, sync queues
• Indonesian region hierarchy (provinsi/kab/kec/kel) as reference tables
• Verification workflow, audit log, reports/dashboard, export
• Multiple categories or multiple contacts per business
Principles
1. One Go binary serves the API and the built React app. One Postgres database. No message queue, no cache, no object storage yet.
2. Handlers call generated SQL queries directly. Add a service layer only when a handler grows real business logic.
3. Every schema change is a numbered migration, so adding things later is cheap and safe.
4. Store coordinates in PostGIS from day one: the app is geospatial, and migrating lat/lng floats later is the one change that hurts.
Architecture
Three moving parts: a React PWA, one Go binary, one PostgreSQL + PostGIS database. Photos live on disk next to the binary.
The browser only talks to the proxy, which forwards everything to one Go process; map tiles come straight from OpenStreetMap.
Database design
Phase 1 is four tables: users, categories, businesses, business_photos. PostgreSQL 16 + PostGIS, migrations with goose.
Phase 1 schema
-- 0001_init.sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'surveyor'
                  CHECK (role IN ('admin', 'surveyor')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
    id   SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE          -- Kuliner, Fashion, Kerajinan, Jasa, ...
);

CREATE TABLE businesses (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    category_id   SMALLINT NOT NULL REFERENCES categories(id),
    description   TEXT NOT NULL DEFAULT '',  -- goods/services offered
    address       TEXT NOT NULL DEFAULT '',
    contact_name  TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',  -- store as 62812..., format in UI
    location      geometry(Point, 4326) NOT NULL,
    created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX businesses_location_gix ON businesses USING GIST (location);
CREATE INDEX businesses_category_idx ON businesses (category_id);

CREATE TABLE business_photos (
    id          BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    file_path   TEXT NOT NULL,             -- relative to UPLOAD_DIR
    caption     TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX business_photos_business_idx ON business_photos (business_id);
Why these choices:
• geometry(Point, 4326) rather than geography: bounding-box queries with ST_MakeEnvelope are simpler and use the GIST index directly. Cast to ::geography only when you need distances in metres.
• Point order is longitude, latitude: ST_SetSRID(ST_MakePoint(lng, lat), 4326). Read back with ST_X(location) AS lng, ST_Y(location) AS lat. This is the most common bug, so wrap it in one query each.
• categories is a table, not free text, so the filter stays consistent. Seed it in the same migration.
• NOT NULL DEFAULT '' on optional text avoids sql.NullString noise in Go.
• No sessions table: auth uses a signed JWT in an httpOnly cookie (see Go server).
Key queries (sqlc)
-- name: ListBusinessesInBBox :many
SELECT b.id, b.name, b.category_id,
       ST_X(b.location)::float8 AS lng, ST_Y(b.location)::float8 AS lat
FROM businesses b
WHERE b.location && ST_MakeEnvelope(@min_lng, @min_lat, @max_lng, @max_lat, 4326)
  AND (sqlc.narg(category_id)::smallint IS NULL OR b.category_id = sqlc.narg(category_id))
  AND (sqlc.narg(q)::text IS NULL OR b.name ILIKE '%' || sqlc.narg(q) || '%')
LIMIT 2000;

-- name: CreateBusiness :one
INSERT INTO businesses (name, category_id, description, address,
                        contact_name, contact_phone, location, created_by)
VALUES (@name, @category_id, @description, @address, @contact_name, @contact_phone,
        ST_SetSRID(ST_MakePoint(@lng::float8, @lat::float8), 4326), @created_by)
RETURNING id;
Add later, only when needed
Add
Trigger that justifies it
Change
Region reference (kode wilayah Kemendagri/BPS)
Need to filter or report by kecamatan/kabupaten
regions(code, name, level, parent_code) + businesses.region_code, optionally auto-filled with ST_Contains if you load boundary polygons
Fuzzy name search
ILIKE feels slow or misses typos
pg_trgm extension + GIN index on name
Verification status
Data from many surveyors needs review
businesses.status (draft/verified) + verified_by, verified_at
Extra business fields
Lecturer or users ask for them
Nullable columns: nib, opening_hours, instagram, employee_count
Multiple categories
Real businesses straddle categories
business_categories(business_id, category_id) junction, drop category_id
Photo thumbnails
Detail pages load slowly on mobile data
business_photos.thumb_path, generated on upload
Soft delete / audit
Need to recover deletes or see who changed what
deleted_at column, then an audit_log table
Nearby search
"UMKM within 1 km of me" feature
Expression index ON businesses USING GIST ((location::geography)) + ST_DWithin
Go server
Standard library router (Go 1.22+ method patterns), pgx + sqlc for SQL, goose for migrations. The built React app is embedded with embed.FS, so deployment is one binary.
Project layout
umkm/
├── cmd/server/main.go        # load config, open pool, run migrations, start http
├── internal/
│   ├── config/config.go      # env vars: DATABASE_URL, JWT_SECRET, UPLOAD_DIR, PORT
│   ├── db/                   # sqlc output (generated, don't edit)
│   ├── httpapi/
│   │   ├── router.go         # all routes in one place
│   │   ├── middleware.go     # logging, recover, auth, CORS (dev only)
│   │   ├── respond.go        # writeJSON, writeError helpers
│   │   ├── auth.go           # login, logout, me
│   │   ├── businesses.go     # CRUD + bbox list
│   │   ├── photos.go         # upload, delete
│   │   └── categories.go
│   └── storage/local.go      # save/delete files on disk
├── migrations/               # 0001_init.sql, 0002_seed_categories.sql, ...
├── queries/                  # *.sql for sqlc
├── web/                      # Vite React app; web/dist embedded
├── sqlc.yaml
├── docker-compose.yml        # postgis for local dev
└── Makefile
Libraries
Need
Pick
Note
Routing
net/http ServeMux
mux.HandleFunc("GET /api/v1/businesses/{id}", h), r.PathValue("id")
DB driver
jackc/pgx/v5 + pgxpool

Queries
sqlc
Type-safe Go from plain SQL; PostGIS calls stay in SQL
Migrations
pressly/goose/v3
Embed migrations/ and run on startup
Auth
golang-jwt/jwt/v5 + x/crypto/bcrypt
JWT in httpOnly, SameSite=Lax cookie
Logging
log/slog
JSON in prod
Image resize (phase 2)
disintegration/imaging
Only when thumbnails are needed
Patterns to keep
• Handlers own a small struct: type API struct { q *db.Queries; pool *pgxpool.Pool; store storage.Local; jwtKey []byte }. No DI framework.
• One error shape: {"error": {"code": "validation", "message": "...", "fields": {"name": "required"}}}. The frontend reads only this.
• Validate by hand in the handler: name required, lat in −11..6, lng in 95..141 (rough Indonesia bounds catch swapped coordinates).
• Uploads: http.MaxBytesReader at 5 MB, check MIME with http.DetectContentType (jpeg/png/webp only), save as uploads/{business_id}/{uuid}.jpg. Serve with http.FileServer under /uploads/.
• Auth middleware reads the cookie, puts userID and role in the request context. Writes require login; deleting requires admin or the creator.
• SPA fallback: any non-/api and non-/uploads path that isn't a static file returns index.html, so React Router deep links work.
// router.go (sketch)
func (a *API) Routes() http.Handler {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/v1/auth/login", a.login)
    mux.HandleFunc("POST /api/v1/auth/logout", a.logout)
    mux.Handle("GET /api/v1/auth/me", a.requireAuth(a.me))

    mux.HandleFunc("GET /api/v1/categories", a.listCategories)
    mux.HandleFunc("GET /api/v1/businesses", a.listBusinesses)
    mux.HandleFunc("GET /api/v1/businesses/{id}", a.getBusiness)
    mux.Handle("POST /api/v1/businesses", a.requireAuth(a.createBusiness))
    mux.Handle("PUT /api/v1/businesses/{id}", a.requireAuth(a.updateBusiness))
    mux.Handle("DELETE /api/v1/businesses/{id}", a.requireAuth(a.deleteBusiness))
    mux.Handle("POST /api/v1/businesses/{id}/photos", a.requireAuth(a.uploadPhoto))
    mux.Handle("DELETE /api/v1/photos/{id}", a.requireAuth(a.deletePhoto))

    mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(a.uploadDir))))
    mux.Handle("/", spaHandler(webDist))
    return logRequests(recoverPanics(mux))
}
API endpoints
Eleven endpoints under /api/v1. Reads are public; writes need a logged-in user.
Method
Path
Auth
Purpose
POST
/auth/login
—
Email + password → sets cookie, returns user
POST
/auth/logout
—
Clears cookie
GET
/auth/me
user
Current user, used on app load
GET
/categories
—
Category list for filters and form
GET
/businesses?bbox=minLng,minLat,maxLng,maxLat&category=&q=
—
Light list for map markers
GET
/businesses/{id}
—
Full detail + photos
POST
/businesses
user
Create
PUT
/businesses/{id}
creator / admin
Update
DELETE
/businesses/{id}
creator / admin
Delete (also removes photo files)
POST
/businesses/{id}/photos
user
Multipart upload, field file, optional caption
DELETE
/photos/{id}
creator / admin
Delete one photo
The map list stays small so the map stays fast; the detail call carries the rest:
// GET /api/v1/businesses?bbox=109.2,-0.1,109.4,0.1
{ "data": [ { "id": 12, "name": "Kopi Asiang", "category_id": 1, "lat": -0.026, "lng": 109.342 } ] }

// GET /api/v1/businesses/12
{ "data": {
    "id": 12, "name": "Kopi Asiang",
    "category": { "id": 1, "name": "Kuliner" },
    "description": "Kopi susu, roti srikaya",
    "address": "Jl. Merdeka No. 10",
    "contact_name": "Pak Budi", "contact_phone": "6281234567890",
    "lat": -0.026, "lng": 109.342,
    "photos": [ { "id": 3, "url": "/uploads/12/7f3c.jpg", "caption": "Tampak depan" } ],
    "created_at": "2026-10-01T08:00:00Z", "updated_at": "2026-10-01T08:00:00Z" } }
Pagination isn't needed while the bbox list is capped at 2,000 rows. Add marker clustering on the frontend before touching the API.
React + Vite PWA
Vite + React + TypeScript, Leaflet with OpenStreetMap tiles, TanStack Query for server state, Tailwind for styling. Four pages, mobile-first.
Libraries
Need
Pick
Why
Map
leaflet + react-leaflet
Free, no API key, OSM tiles
Routing
react-router
/, /b/:id, /b/new, /b/:id/edit, /login
Server state
@tanstack/react-query
Caching, refetch after create/edit, loading states
Forms
react-hook-form
Light; skip zod until validation gets complex
Styling
tailwindcss
Fast to build a clean, simple UI
PWA
vite-plugin-pwa
Manifest + service worker generated
Clustering (phase 2)
react-leaflet-cluster
Only when markers overlap badly
Structure
web/src/
├── main.tsx              # QueryClient, Router
├── api/
│   ├── client.ts         # fetch wrapper: credentials: 'include', parse error shape
│   ├── businesses.ts     # useBusinessesInBBox, useBusiness, useSaveBusiness ...
│   └── auth.ts           # useMe, login, logout
├── pages/
│   ├── MapPage.tsx       # map + category chips + search + list drawer
│   ├── BusinessPage.tsx  # detail, photos, call/WhatsApp/directions buttons
│   ├── BusinessForm.tsx  # create + edit (same component)
│   └── LoginPage.tsx
├── components/
│   ├── MapView.tsx       # fetches by bbox on moveend (debounced 300 ms)
│   ├── LocationPicker.tsx# "use my location" + draggable pin
│   ├── PhotoUploader.tsx # resize in browser before upload
│   └── CategoryChips.tsx
└── lib/format.ts         # phone → wa.me link, dates in id-ID
Pages
• Map (/): full-screen map centred on the area you survey. Category chips and a search box on top. Markers coloured by category. Tapping a marker opens a small card; tapping the card opens the detail page. On mobile, a bottom sheet lists businesses in the current view.
• Detail (/b/:id): name, category, description, address, contact. Buttons: Telepon (tel:), WhatsApp (https://wa.me/62...), Petunjuk Arah (Google Maps ?q=lat,lng). Photo grid with lightbox. Edit/Delete for allowed users.
• Form (/b/new, /b/:id/edit): fields + LocationPicker. Save the business first, then upload photos to its id, so a failed upload never loses the record.
• Login (/login): email + password.
Practical details
• Resize photos in the browser (canvas, max 1600 px, JPEG quality 0.8) before upload. Phone photos drop from 4–8 MB to about 300 KB, and you avoid server-side image processing in phase 1.
• Geolocation needs HTTPS (localhost is fine in dev). Show the accuracy circle so surveyors know when to drag the pin by hand.
• Dev proxy in vite.config.ts: server.proxy = { '/api': 'http://localhost:8080', '/uploads': 'http://localhost:8080' }. Same origin in prod, so cookies just work and no CORS is needed.
• PWA caching: precache the app shell; StaleWhileRevalidate for /api/v1/categories; NetworkFirst for business data; CacheFirst with a 500-entry limit for map tiles (respect the OSM tile usage policy). This gives fast reloads and read-only viewing of recently seen areas offline. Offline editing is phase 3.
Roadmap
Build Phase 0 and Phase 1 end to end before anything else; each later item ships only when its gate is met.
Inside Phase 1, build vertically: one feature working from database to screen (e.g. create a business and see its pin) before starting the next. That gives the journal team something real to document every week.
Dev setup and deployment
Locally: PostGIS in Docker, Go and Vite running natively. In production: one binary behind a TLS reverse proxy, managed by systemd.
# docker-compose.yml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: umkm
      POSTGRES_PASSWORD: umkm
      POSTGRES_DB: umkm
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
# Makefile
dev-db:   ; docker compose up -d db
sqlc:     ; sqlc generate
run:      ; go run ./cmd/server          # :8080, runs migrations on start
web:      ; cd web && npm run dev        # :5173, proxies /api
build:    ; cd web && npm run build && cd .. && go build -o bin/umkm ./cmd/server
admin:    ; go run ./cmd/server create-admin   # seed first admin user
Deploy
1. make build → bin/umkm with the web app embedded.
2. Copy to server, set env (DATABASE_URL, JWT_SECRET, UPLOAD_DIR=/var/lib/umkm/uploads, PORT), run under a systemd unit.
3. Put it behind HAProxy or Nginx with TLS. HTTPS is required for geolocation and for the PWA to install.
4. Back up two things: pg_dump of the database and the uploads directory.
Git conventions for the team: main always deployable, feature branches + PR, migrations never edited after merge (add a new one instead).
