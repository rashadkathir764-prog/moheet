# MOHEET | محيط - Architecture Reference

> Version: 1.0.0 MVP  
> Phase: 0 - Docs-Driven Foundation  
> Status: Approved baseline for implementation  
> Last updated: 2026-05-20

## 1. Purpose

MOHEET is a decoupled e-commerce platform designed around a clear separation between API, database, web frontend, mobile frontend, and deployment infrastructure.

This document is the engineering constitution for the first implementation wave. Any backend, frontend, mobile, or DevOps work must follow the boundaries and contracts defined here unless a later architecture document explicitly changes them.

## 2. Required Architecture

The system uses a fully decoupled architecture:

```text
React Web App        Flutter Mobile App
      |                     |
      | HTTPS / JSON API    |
      v                     v
        NestJS Backend API
              |
              | TypeORM / SQL
              v
          PostgreSQL
```

The frontend applications never connect directly to PostgreSQL. They communicate only through the NestJS API.

## 3. Required Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Backend API | NestJS on Node.js | Business logic, authentication, authorization, product/order APIs |
| Database | PostgreSQL | Durable transactional storage |
| ORM | TypeORM | Entity mapping, migrations, repository access |
| Web Frontend | React + Vite | Customer storefront and admin/vendor dashboard |
| Mobile Frontend | Flutter + Dart | Unified Android/iOS app with offline-friendly product cache |
| Local Runtime | Docker + Docker Compose | Reproducible development environment |
| Production Host | Ubuntu 24.04 | Server operating system |
| Deployment Panel | Dokploy | Deployment orchestration and app management |
| Reverse Proxy | Traefik | Routing, TLS termination, domain management |

## 4. Repository Layout

```text
moheet/
  docs/
    architecture.md
    database-schema.md

  backend/
    src/
      auth/
      users/
      products/
      categories/
      carts/
      orders/
      common/
      main.ts
    database/
      migrations/
      seeders/
    Dockerfile.dev
    package.json

  frontend/
    web/
      src/
        api/
        assets/
        components/
        pages/
        store/
        types/
      package.json

    mobile/
      lib/
        core/
        features/
        shared/
      pubspec.yaml

  docker-compose.yml
  .env.example
```

## 5. Backend Architecture

The NestJS backend is organized by business modules.

Core modules:

| Module | Responsibility |
| --- | --- |
| `AuthModule` | Registration, login, JWT issuance, refresh tokens, logout |
| `UsersModule` | User records, roles, account status |
| `CategoriesModule` | Product category tree and category lookup |
| `ProductsModule` | Product CRUD, image metadata, stock control |
| `CartsModule` | Active cart state per customer |
| `OrdersModule` | Checkout, order creation, inventory decrement, status lifecycle |
| `CommonModule` | Guards, decorators, filters, pipes, shared helpers |

Recommended backend layering:

```text
Controller -> DTO Validation -> Service -> Repository/Transaction -> Database
```

Controllers must stay thin. Business rules belong in services. Cross-module behavior such as authorization, validation, error formatting, and response contracts must be centralized under `common/` where practical.

## 6. API Standards

All public API routes must use this prefix:

```text
/api/v1
```

Recommended response shape:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {},
  "timestamp": "2026-05-20T00:00:00.000Z"
}
```

Rules:

- Use JSON for all API responses.
- Use DTO classes and global validation for request bodies and query parameters.
- Reject unknown fields in write requests.
- Use pagination for list endpoints that can grow.
- Do not expose password hashes, refresh-token hashes, or internal operational fields.
- Return stable error messages and status codes.

## 7. Authentication And Security

Authentication uses JWT with role-based authorization.

Roles:

| Role | Scope |
| --- | --- |
| `ADMIN` | Full platform administration |
| `VENDOR` | Own products and vendor-facing order items |
| `CUSTOMER` | Browsing, cart, checkout, own orders |

Token model:

| Token | Lifetime | Storage | Purpose |
| --- | --- | --- | --- |
| Access token | Short, default 15 minutes | Client memory or controlled local session store | Authorizes API calls |
| Refresh token | Longer, default 7 days | HttpOnly cookie | Issues a new access token |

Security rules:

- Passwords must be hashed with bcrypt using 12 salt rounds.
- Plain-text passwords must never be stored or logged.
- JWT access and refresh secrets must be different.
- Refresh tokens stored in the database must be hashed.
- Protected routes must use JWT guards.
- Role-sensitive routes must use role guards.
- Disabled users must not be able to login or use existing tokens.
- CORS must be limited to known frontend origins.
- Helmet should be enabled for HTTP security headers.
- Rate limiting must be enabled for authentication and public endpoints.

## 8. Password Policy

Initial MVP policy:

- Minimum length: 8 characters.
- Must include at least one number.
- Must include at least one special character.
- Maximum length: 64 characters.
- Hashing algorithm: bcrypt.
- Salt rounds: 12.

## 9. Product And Inventory Rules

Product ownership:

- Every product belongs to one vendor account.
- Admins can manage all products.
- Vendors can manage only their own products.

Inventory:

- Stock is stored on the product record.
- Checkout must validate stock before order creation.
- Stock decrement must happen inside the same database transaction that creates the order.
- Concurrent checkout must not allow stock to go below zero.
- Order cancellation may restore stock only when business rules allow it.

Images:

- Product image records store metadata and URLs or storage paths.
- Large binary files should not be stored directly in database rows.

## 10. Order Lifecycle

Initial order statuses:

```text
PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
PROCESSING -> CANCELLED
```

Rules:

- Customers can create orders.
- Customers can view their own orders only.
- Admins can view and manage all orders.
- Vendors can view only order items connected to their products.
- Invalid status transitions must be rejected.

## 11. Frontend Architecture

The React web app and Flutter mobile app are independent API clients.

Web frontend responsibilities:

- Public product browsing.
- Login and authenticated dashboard.
- Admin product/category/order management.
- Vendor product and order-item management.

Mobile responsibilities:

- Product browsing optimized for fast startup.
- Local product cache for offline-friendly browsing.
- Authentication and customer order flows.

Visual identity:

| Token | Value | Use |
| --- | --- | --- |
| Primary | `#0A1128` | Main surfaces and brand depth |
| Accent | `#00F0FF` | Primary actions and intelligent/interactive emphasis |
| Background | `#0F172A` | Dark-mode base |

## 12. Local Docker Environment

Docker Compose must provide at minimum:

- PostgreSQL service.
- NestJS API service.
- Persistent database volume.
- Environment variables loaded from `.env`.
- Health checks for database readiness.

Local development must be runnable with:

```bash
docker compose up -d --build
```

Sensitive values belong in `.env`. `.env.example` documents required variables without real secrets.

## 13. Production Direction

Production will run on Ubuntu 24.04 managed by Dokploy.

Expected production responsibilities:

- Pull code from GitHub on deployment.
- Build backend and frontend artifacts.
- Run services behind Traefik.
- Attach domains and issue TLS certificates.
- Keep environment variables outside source control.
- Use migrations instead of schema auto-sync.

## 14. Implementation Order

The project must progress in strict phases:

1. Phase 0: Documentation foundation.
2. Phase 1: Local Docker and environment setup.
3. Phase 2: NestJS core backend.
4. Phase 3: React and Flutter frontends.
5. Phase 4: Dokploy deployment.

No implementation work from a later phase should be introduced before the current phase is approved.
