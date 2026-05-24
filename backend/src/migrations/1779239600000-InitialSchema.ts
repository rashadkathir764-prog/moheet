import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1779239600000 implements MigrationInterface {
  name = 'InitialSchema1779239600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "full_name" varchar(150) NOT NULL,
        "phone" varchar(20) UNIQUE,
        "avatar_url" text,
        "role" varchar(20) NOT NULL DEFAULT 'CUSTOMER',
        "is_active" boolean NOT NULL DEFAULT true,
        "is_verified" boolean NOT NULL DEFAULT false,
        "refresh_token" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL,
        "slug" varchar(150) NOT NULL UNIQUE,
        "description" text,
        "image_url" text,
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "parent_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "vendor_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL UNIQUE,
        "description" text,
        "price" numeric(10,2) NOT NULL,
        "compare_price" numeric(10,2),
        "sku" varchar(100) UNIQUE,
        "stock_quantity" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_featured" boolean NOT NULL DEFAULT false,
        "weight_kg" numeric(6,3),
        "thumbnail_url" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_images" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "image_url" text NOT NULL,
        "alt_text" varchar(255),
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "carts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cart_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "cart_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "shipping_address" jsonb NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'PENDING',
        "payment_method" varchar(50) NOT NULL DEFAULT 'CASH_ON_DELIVERY',
        "payment_status" varchar(30) NOT NULL DEFAULT 'PENDING',
        "subtotal" numeric(12,2) NOT NULL,
        "shipping_fee" numeric(8,2) NOT NULL DEFAULT 0,
        "discount_amount" numeric(8,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(12,2) NOT NULL,
        "notes" text,
        "admin_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "product_name" varchar(255) NOT NULL,
        "product_thumbnail" text,
        "vendor_id" uuid NOT NULL,
        "price_at_purchase" numeric(10,2) NOT NULL,
        "quantity" int NOT NULL,
        "total_price" numeric(12,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await this.createIndexes(queryRunner);
    await this.createForeignKeys(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "carts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_images" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
  }

  private async createIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")`,
      `CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role")`,
      `CREATE INDEX IF NOT EXISTS "idx_categories_parent_id" ON "categories" ("parent_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_products_vendor_id" ON "products" ("vendor_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_products_category_id" ON "products" ("category_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_products_is_active" ON "products" ("is_active")`,
      `CREATE INDEX IF NOT EXISTS "idx_products_is_featured" ON "products" ("is_featured")`,
      `CREATE INDEX IF NOT EXISTS "idx_products_price" ON "products" ("price")`,
      `CREATE INDEX IF NOT EXISTS "idx_products_created_at" ON "products" ("created_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_product_images_product_id" ON "product_images" ("product_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_carts_user_id" ON "carts" ("user_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_cart_items_cart_id" ON "cart_items" ("cart_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_cart_items_product_id" ON "cart_items" ("product_id")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_cart_items_cart_product" ON "cart_items" ("cart_id", "product_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" ("customer_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status")`,
      `CREATE INDEX IF NOT EXISTS "idx_orders_payment_status" ON "orders" ("payment_status")`,
      `CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders" ("created_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items" ("order_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_order_items_product_id" ON "order_items" ("product_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_order_items_vendor_id" ON "order_items" ("vendor_id")`,
    ];

    for (const indexSql of indexes) {
      await queryRunner.query(indexSql);
    }
  }

  private async createForeignKeys(queryRunner: QueryRunner): Promise<void> {
    const foreignKeys = [
      {
        name: 'fk_categories_parent',
        sql: `ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL`,
      },
      {
        name: 'fk_products_vendor',
        sql: `ALTER TABLE "products" ADD CONSTRAINT "fk_products_vendor" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE RESTRICT`,
      },
      {
        name: 'fk_products_category',
        sql: `ALTER TABLE "products" ADD CONSTRAINT "fk_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT`,
      },
      {
        name: 'fk_product_images_product',
        sql: `ALTER TABLE "product_images" ADD CONSTRAINT "fk_product_images_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE`,
      },
      {
        name: 'fk_carts_user',
        sql: `ALTER TABLE "carts" ADD CONSTRAINT "fk_carts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      },
      {
        name: 'fk_cart_items_cart',
        sql: `ALTER TABLE "cart_items" ADD CONSTRAINT "fk_cart_items_cart" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE`,
      },
      {
        name: 'fk_cart_items_product',
        sql: `ALTER TABLE "cart_items" ADD CONSTRAINT "fk_cart_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT`,
      },
      {
        name: 'fk_orders_customer',
        sql: `ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT`,
      },
      {
        name: 'fk_order_items_order',
        sql: `ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE`,
      },
      {
        name: 'fk_order_items_product',
        sql: `ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT`,
      },
    ];

    for (const foreignKey of foreignKeys) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = '${foreignKey.name}'
          ) THEN
            ${foreignKey.sql};
          END IF;
        END $$;
      `);
    }
  }
}
