# MOHEET

MOHEET is a commerce workspace with a NestJS API, a React store/admin web app,
and a Flutter mobile app.

## Workspace

| Area | Path | Notes |
| --- | --- | --- |
| API | `backend` | NestJS, TypeORM, PostgreSQL |
| Web | `frontend/web` | React, Vite |
| Mobile | `frontend/mobile` | Flutter |
| Design notes | `docs` | Architecture and database schema references |

## Local API

1. Copy `.env.example` to `.env` and replace the database and JWT secrets.
2. Start PostgreSQL and the API:

   ```powershell
   docker compose up -d --build
   ```

3. Run migrations and optional demo data from the API container:

   ```powershell
   docker compose exec moheet-api npm run migration:run
   docker compose exec moheet-api npm run seed:demo
   ```

The compose stack publishes the API at `http://localhost:${API_HOST_PORT}` and
the API routes under `/api/v1`. Swagger is exposed at `/api/docs` outside
production.

## Web

The web client defaults to `http://127.0.0.1:3000/api/v1`. Override it with
`VITE_API_BASE_URL` when the API is published elsewhere.

```powershell
cd frontend/web
npm ci
npm run dev
```

The web app uses one local Vite origin: `http://localhost:5173`.
Store, vendor, and admin are routes inside that same app:
`/store`, `/vendor/dashboard`, and `/admin/dashboard`.

Prototype store surfaces are disabled by default. Set
`VITE_EXPERIMENTAL_STORE_FEATURES=true` only when intentionally reviewing the
experimental wallet, auction, warranty, AI, and heatmap views.

## Mobile

```powershell
cd frontend/mobile
flutter pub get
flutter run
```

## Verification

```powershell
cd backend
npm ci
npm run lint -- --no-fix
npm run build
npm test
npm run test:e2e

cd ..\frontend\web
npm ci
npm run lint
npm run build

cd ..\mobile
flutter analyze
flutter test
```

The backend e2e suite expects a reachable PostgreSQL database with migrations
applied. CI provisions that database and runs migrations before the e2e smoke
test.

## Delivery Notes

- The current checkout uses the backend payment methods and requires an
  authenticated customer.
- Payments are still backend lifecycle/simulator flows until a real provider is
  integrated.
- Shipping state is managed inside the backend until a carrier integration is
  added.
- Production deployments should use `backend/Dockerfile`, explicit secrets,
  explicit CORS origins, durable upload storage, and migrations as a deployment
  step.
