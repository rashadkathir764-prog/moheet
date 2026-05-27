# MOHEET Database Schema Reference

Last aligned: 2026-05-27

This document describes the schema that is implemented in the current backend
entities and migrations. It is not a roadmap and does not list planned tables as
implemented tables.

Sources of truth:

- `backend/src/**/entities/*.ts`
- `backend/src/migrations/*.ts`
- `backend/src/common/enums/*.ts`

## Schema Notes

- Database: PostgreSQL.
- ORM: TypeORM.
- Primary keys are UUIDs generated with `uuid_generate_v4()`.
- Migrations enable `uuid-ossp` for UUID generation and `pg_trgm` for product
  name search indexing.
- Enum-like fields are stored as `varchar` columns and constrained in
  application code.
- Date columns use `created_at` / `updated_at` where present. Some append-only
  tables only have `created_at`.

## Current Tables

| Table | Key Columns | Relationships / Notes |
| --- | --- | --- |
| `users` | `id`, `email`, `password_hash`, `full_name`, `phone`, `avatar_url`, `role`, `is_active`, `is_verified`, `refresh_token`, `created_at`, `updated_at` | `role` is `ADMIN`, `VENDOR`, or `CUSTOMER`. Users own orders, carts, addresses, favorites, reviews, vendor profiles, notifications, payments, shipments, and user events. `email` is indexed and unique. |
| `categories` | `id`, `name`, `slug`, `description`, `image_url`, `sort_order`, `is_active`, `parent_id`, `created_at`, `updated_at` | Self-referencing parent/children tree. Products belong to one category through `products.category_id`. `slug` is unique. |
| `products` | `id`, `vendor_id`, `category_id`, `name`, `slug`, `description`, `price`, `compare_price`, `sku`, `brand`, `tags`, `stock_quantity`, `is_active`, `is_featured`, `weight_kg`, `thumbnail_url`, `view_count`, `cart_add_count`, `purchase_count`, `favorite_count`, `rating_average`, `review_count`, `created_at`, `updated_at`, `deleted_at` | Product belongs to vendor user and category. Product has many images, cart items, order items, favorites, reviews, and user events. `slug` is unique. `sku` is unique when present. Product name has a trigram index. `deleted_at` supports soft deletion. |
| `product_images` | `id`, `product_id`, `image_url`, `alt_text`, `sort_order`, `created_at` | Image belongs to product. There is no `is_primary`; the current main image is represented by `products.thumbnail_url` and service logic. |
| `carts` | `id`, `user_id`, `created_at`, `updated_at` | One cart per user. `user_id` is unique. Cart has many cart items. |
| `cart_items` | `id`, `cart_id`, `product_id`, `quantity`, `created_at`, `updated_at` | Cart item belongs to cart and product. Unique pair: `cart_id` + `product_id`. |
| `orders` | `id`, `customer_id`, `shipping_address`, `status`, `payment_method`, `payment_status`, `subtotal`, `shipping_fee`, `discount_amount`, `coupon_code`, `total_amount`, `notes`, `admin_notes`, `shipping_carrier`, `tracking_number`, `shipped_at`, `delivered_at`, `cancelled_at`, `refunded_at`, `created_at`, `updated_at` | Order belongs to customer user and has many order items. Shipping address is stored as JSON snapshot in `shipping_address`; there is no `address_id` column. |
| `order_items` | `id`, `order_id`, `product_id`, `product_name`, `product_thumbnail`, `vendor_id`, `price_at_purchase`, `quantity`, `total_price`, `created_at` | Order item belongs to order and product. `vendor_id` is stored as a vendor snapshot for vendor order queries. The item snapshots product name, thumbnail, purchase price, quantity, and line total. |
| `payments` | `id`, `order_id`, `customer_id`, `method`, `status`, `amount`, `currency`, `provider`, `provider_reference`, `failure_reason`, `metadata`, `authorized_at`, `captured_at`, `failed_at`, `refunded_at`, `created_at`, `updated_at` | Payment belongs to order and customer. `provider_reference` is unique when present. Default currency is `YER`; default provider is `INTERNAL_SIMULATOR`. |
| `shipments` | `id`, `order_id`, `customer_id`, `carrier_name`, `tracking_number`, `status`, `origin`, `destination`, `shipped_at`, `estimated_delivery_at`, `delivered_at`, `created_at`, `updated_at` | Shipment belongs to order and customer. One shipment per order. Shipment has many shipment events. `tracking_number` is unique when present. |
| `shipment_events` | `id`, `shipment_id`, `status`, `location`, `message`, `occurred_at`, `created_at` | Append-only status trail for shipment progress. Event belongs to shipment. |
| `addresses` | `id`, `user_id`, `label`, `recipient_name`, `phone`, `city`, `district`, `street`, `full_address`, `country`, `postal_code`, `latitude`, `longitude`, `is_default`, `created_at`, `updated_at` | Address belongs to user. A partial unique index enforces one default address per user when `is_default = true`. |
| `favorites` | `id`, `user_id`, `product_id`, `created_at` | Favorite belongs to user and product. Unique pair: `user_id` + `product_id`. |
| `product_reviews` | `id`, `user_id`, `product_id`, `order_id`, `rating`, `title`, `comment`, `is_verified_purchase`, `status`, `created_at`, `updated_at` | Review belongs to user and product; order relation is optional. `rating` is constrained to 1 through 5. Unique pair: `user_id` + `product_id`. |
| `coupons` | `id`, `code`, `name`, `description`, `type`, `value`, `min_order_amount`, `max_discount_amount`, `usage_limit`, `used_count`, `per_user_limit`, `starts_at`, `ends_at`, `is_active`, `created_at`, `updated_at` | Coupon has many coupon redemptions. `code` is unique. |
| `coupon_redemptions` | `id`, `coupon_id`, `user_id`, `order_id`, `discount_amount`, `created_at` | Redemption belongs to coupon, user, and order. Unique pair: `coupon_id` + `order_id`. |
| `vendor_profiles` | `id`, `user_id`, `store_name`, `slug`, `description`, `business_email`, `business_phone`, `business_address`, `status`, `admin_notes`, `approved_at`, `created_at`, `updated_at` | One vendor profile per user. `slug` is unique. `status` is indexed. Products still reference the vendor through `products.vendor_id`, not `vendor_profiles.id`. |
| `notifications` | `id`, `user_id`, `type`, `title`, `message`, `data`, `read_at`, `created_at` | Notification belongs to user. `data` is JSON metadata. Unread notifications have `read_at = null`. |
| `user_events` | `id`, `user_id`, `session_id`, `type`, `source`, `product_id`, `category_id`, `order_id`, `search_query`, `metadata`, `created_at` | Analytics event table. User, product, category, and order references are optional and use `ON DELETE SET NULL` in migrations. `metadata` is JSONB and indexed with GIN. |

## Important Relationships

- `user -> orders`: `orders.customer_id` references `users.id`.
- `user -> cart`: `carts.user_id` references `users.id` and is unique.
- `user -> addresses`: `addresses.user_id` references `users.id`.
- `vendor -> products`: `products.vendor_id` references `users.id`.
- `product -> images`: `product_images.product_id` references `products.id`.
- `product -> category`: `products.category_id` references `categories.id`.
- `order -> order_items`: `order_items.order_id` references `orders.id`.
- `order_item -> product`: `order_items.product_id` references `products.id`.
- `order_item -> vendor`: `order_items.vendor_id` stores the vendor user ID snapshot
  used by vendor order queries.
- `order -> payments`: `payments.order_id` references `orders.id`.
- `order -> shipment`: `shipments.order_id` references `orders.id` and is unique.
- `user_events -> user/product/category/order`: all are optional analytics context
  references.

## Status and Type Values

### User Roles

- `ADMIN`
- `VENDOR`
- `CUSTOMER`

### Order Status

- `PENDING`
- `CONFIRMED`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`
- `REFUNDED`

### Payment Method

- `CASH_ON_DELIVERY`
- `CREDIT_CARD`
- `BANK_TRANSFER`

### Payment Status

- `PENDING`
- `PAID`
- `FAILED`
- `REFUNDED`

### Shipment Status

- `PENDING`
- `READY_TO_SHIP`
- `SHIPPED`
- `IN_TRANSIT`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `FAILED`
- `RETURNED`
- `CANCELLED`

### User Event Type

- `product_view`
- `search`
- `add_to_cart`
- `update_cart`
- `remove_from_cart`
- `clear_cart`
- `add_to_favorites`
- `remove_from_favorites`
- `checkout_started`
- `purchase`
- `recommendation_impression`
- `recommendation_click`

### User Event Source

- `web`
- `mobile`
- `api`

## Analytics

Analytics is split into two different data sources:

1. Time-bounded events from `user_events`.
2. Cumulative all-time product signals stored directly on `products`.

Product signal columns are cumulative all-time counters:

- `products.view_count`
- `products.cart_add_count`
- `products.purchase_count`
- `products.favorite_count`

The analytics event fields are:

- `user_events.type`
- `user_events.session_id`
- `user_events.source`
- `user_events.product_id`
- `user_events.category_id`
- `user_events.order_id`
- `user_events.search_query`
- `user_events.metadata`
- `user_events.created_at`

The admin analytics summary endpoint supports:

- `range=today`
- `range=7d`
- `range=30d`
- `range=all`

If the range is omitted or invalid, the backend defaults to `7d`. Range-sensitive
metrics are calculated from `user_events`; product signal leaderboards are marked
with `productSignalsScope: "allTime"` because the counters on `products` are not
currently range-bounded.

## Planned / Not Implemented Yet

These items are not implemented in the current entities or migrations and should
not be treated as existing schema:

- `order_status_history` table is not implemented.
- `reserved_quantity` on `products` is not implemented.
- `product_categories` many-to-many table is not implemented; products currently
  use a single `category_id`.
- `product_images.is_primary` is not implemented.
- `orders.order_number` is not implemented.
- `orders.address_id` is not implemented; the order stores a JSON shipping
  address snapshot in `shipping_address`.
- `order_items.product_sku`, `unit_price`, and `line_total` are not implemented;
  current columns are `product_name`, `product_thumbnail`, `vendor_id`,
  `price_at_purchase`, and `total_price`.

## Migration Files

Current migration files define the implemented schema:

- `InitialSchema1700000000000`
- `AddVendorProfileAndAdminFields1710000000000`
- `AddPaymentsAndShipments1720000000000`
- `AddAddressesFavoritesReviewsCoupons1730000000000`
- `AddUserEvents1740000000000`

Update this document whenever entities or migrations change.
