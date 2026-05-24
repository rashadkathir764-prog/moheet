# MOHEET | محيط - Database Schema Reference

> Version: 1.0.0 MVP  
> Phase: 0 - Docs-Driven Foundation  
> Database: PostgreSQL 16+  
> ORM target: TypeORM  
> Last updated: 2026-05-20

## 1. Purpose

This document defines the MVP database model for MOHEET. It is the baseline for future TypeORM entities and migrations.

The schema focuses on:

- Users and role-based access.
- Product catalog and categories.
- Product images and inventory.
- Customer carts.
- Orders, order items, and status tracking.

## 2. Design Principles

- Use UUID primary keys for externally referenced records.
- Use `TIMESTAMPTZ` for all timestamps.
- Store money as `NUMERIC`, never floating point.
- Store password hashes only, never plain-text passwords.
- Keep inventory changes transactional.
- Prefer explicit join tables for many-to-many relationships.
- Keep soft-delete support for business records where recovery is useful.

## 3. Entity Relationship Overview

```text
users 1 ---- * products
users 1 ---- * carts
users 1 ---- * orders
users 1 ---- * addresses

categories 1 ---- * categories
categories * ---- * products via product_categories

products 1 ---- * product_images
products 1 ---- * cart_items
products 1 ---- * order_items

carts 1 ---- * cart_items
orders 1 ---- * order_items
orders 1 ---- * order_status_history
```

## 4. Enum Values

Recommended database enum values:

```sql
CREATE TYPE user_role AS ENUM ('ADMIN', 'VENDOR', 'CUSTOMER');

CREATE TYPE order_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE payment_method AS ENUM (
  'CASH_ON_DELIVERY',
  'CARD',
  'BANK_TRANSFER'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED'
);
```

If TypeORM enum portability becomes a concern, these values can be represented as validated `VARCHAR` columns with database checks.

## 5. Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

`pgcrypto` provides `gen_random_uuid()`. `pg_trgm` supports efficient fuzzy search for product and category names.

## 6. `users`

Stores all platform accounts.

Relationship summary:

- One user can own many products when role is `VENDOR`.
- One user can create many orders when role is `CUSTOMER`.
- One user can have many saved addresses.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) UNIQUE,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  refresh_token_hash TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

Security notes:

- `password_hash` must be generated using bcrypt with 12 salt rounds.
- `refresh_token_hash` stores a hashed refresh token, not the raw token.
- Inactive users must be blocked from login and token validation.

## 7. `addresses`

Stores customer delivery addresses.

Relationship summary:

- `users` one-to-many `addresses`.

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL DEFAULT 'Home',
  recipient_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Yemen',
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100),
  street TEXT,
  full_address TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_city ON addresses(city);
```

## 8. `categories`

Stores hierarchical product categories.

Relationship summary:

- `categories` one-to-many self relationship through `parent_id`.
- `categories` many-to-many `products` through `product_categories`.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);
```

## 9. `products`

Stores catalog items and stock information.

Relationship summary:

- `users` one-to-many `products` as vendor ownership.
- `products` many-to-many `categories` through `product_categories`.
- `products` one-to-many `product_images`.
- `products` one-to-many `cart_items`.
- `products` one-to-many `order_items`.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  compare_price NUMERIC(12, 2) CHECK (compare_price >= 0),
  sku VARCHAR(100) UNIQUE,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  weight_kg NUMERIC(8, 3),
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
```

Inventory rule:

```text
available_stock = stock_quantity - reserved_quantity
```

Checkout must validate and decrement stock inside a transaction.

## 10. `product_categories`

Join table for product/category many-to-many mapping.

Relationship summary:

- `products` many-to-many `categories`.

```sql
CREATE TABLE product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_product_categories_category_id ON product_categories(category_id);
CREATE UNIQUE INDEX uq_product_primary_category
  ON product_categories(product_id)
  WHERE is_primary = TRUE;
```

Each product may have many categories, but only one primary category.

## 11. `product_images`

Stores image metadata for products.

Relationship summary:

- `products` one-to-many `product_images`.

```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE UNIQUE INDEX uq_product_primary_image
  ON product_images(product_id)
  WHERE is_primary = TRUE;
```

Images should be stored as files or object-storage assets. The database stores paths/URLs and metadata only.

## 12. `carts`

Stores active cart containers.

Relationship summary:

- `users` one-to-many `carts`.
- `carts` one-to-many `cart_items`.

```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE UNIQUE INDEX uq_active_cart_per_user
  ON carts(user_id)
  WHERE is_active = TRUE;
```

MVP rule: one active cart per user.

## 13. `cart_items`

Stores product quantities inside a cart.

Relationship summary:

- `carts` one-to-many `cart_items`.
- `products` one-to-many `cart_items`.

```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
```

## 14. `orders`

Stores checkout records.

Relationship summary:

- `users` one-to-many `orders`.
- `addresses` one-to-many `orders` optionally.
- `orders` one-to-many `order_items`.
- `orders` one-to-many `order_status_history`.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'PENDING',
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method payment_method NOT NULL DEFAULT 'CASH_ON_DELIVERY',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  customer_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

## 15. `order_items`

Stores immutable product snapshots at checkout time.

Relationship summary:

- `orders` one-to-many `order_items`.
- `products` one-to-many `order_items`.
- `users` one-to-many `order_items` through `vendor_id`.

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_vendor_id ON order_items(vendor_id);
```

`product_name`, `product_sku`, and `unit_price` are snapshots. They must not change when the product is edited later.

## 16. `order_status_history`

Stores an audit trail for order lifecycle changes.

Relationship summary:

- `orders` one-to-many `order_status_history`.
- `users` one-to-many `order_status_history` as actor.

```sql
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  from_status order_status,
  to_status order_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);
```

## 17. Order Status Transitions

Allowed transitions:

| From | To |
| --- | --- |
| `PENDING` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | `SHIPPED`, `CANCELLED` |
| `SHIPPED` | `DELIVERED` |
| `DELIVERED` | `REFUNDED` |
| `CANCELLED` | none |
| `REFUNDED` | none |

Invalid transitions must be rejected by the backend service layer.

## 18. Transaction Rules

Checkout transaction must:

1. Lock requested product rows.
2. Validate products exist and are active.
3. Validate requested quantities are available.
4. Decrement stock or update reserved stock according to the selected strategy.
5. Create the order.
6. Create all order items.
7. Write initial order status history.
8. Commit all changes together.

If any step fails, the entire checkout must roll back.

## 19. Migration Policy

Development may use schema synchronization only before production data exists.

Production rules:

- Use explicit migrations.
- Do not rely on automatic schema synchronization.
- Review destructive migrations manually.
- Keep seed data separate from schema migrations.
- Never store real secrets in migration or seed files.
