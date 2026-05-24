import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommerceExperienceModules1779257600000
  implements MigrationInterface
{
  name = 'CreateCommerceExperienceModules1779257600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorites" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_favorites_user_product" ON "favorites" ("user_id", "product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_favorites_user_id" ON "favorites" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "order_id" uuid,
        "rating" int NOT NULL,
        "title" varchar(140),
        "comment" text,
        "is_verified_purchase" boolean NOT NULL DEFAULT true,
        "status" varchar(20) NOT NULL DEFAULT 'APPROVED',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_product_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_reviews_user_product" ON "product_reviews" ("user_id", "product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_product_reviews_product_status" ON "product_reviews" ("product_id", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(40) NOT NULL UNIQUE,
        "name" varchar(120) NOT NULL,
        "description" text,
        "type" varchar(20) NOT NULL,
        "value" numeric(10,2) NOT NULL,
        "min_order_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "max_discount_amount" numeric(12,2),
        "usage_limit" int,
        "used_count" int NOT NULL DEFAULT 0,
        "per_user_limit" int NOT NULL DEFAULT 1,
        "starts_at" timestamptz,
        "ends_at" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_coupons_code" ON "coupons" ("code")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "coupon_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "discount_amount" numeric(12,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_coupon_redemptions_coupon_order" ON "coupon_redemptions" ("coupon_id", "order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_coupon_user" ON "coupon_redemptions" ("coupon_id", "user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL UNIQUE,
        "store_name" varchar(160) NOT NULL,
        "slug" varchar(180) NOT NULL UNIQUE,
        "description" text,
        "business_email" varchar(255),
        "business_phone" varchar(30),
        "business_address" text,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "admin_notes" text,
        "approved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vendor_profiles_status" ON "vendor_profiles" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" varchar(40) NOT NULL,
        "title" varchar(160) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id", "read_at")`,
    );

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "coupon_code" varchar(40)
    `);

    const constraints = [
      [
        'fk_favorites_user',
        `ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      ],
      [
        'fk_favorites_product',
        `ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE`,
      ],
      [
        'fk_product_reviews_user',
        `ALTER TABLE "product_reviews" ADD CONSTRAINT "fk_product_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      ],
      [
        'fk_product_reviews_product',
        `ALTER TABLE "product_reviews" ADD CONSTRAINT "fk_product_reviews_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE`,
      ],
      [
        'fk_product_reviews_order',
        `ALTER TABLE "product_reviews" ADD CONSTRAINT "fk_product_reviews_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL`,
      ],
      [
        'fk_coupon_redemptions_coupon',
        `ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "fk_coupon_redemptions_coupon" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE`,
      ],
      [
        'fk_coupon_redemptions_user',
        `ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "fk_coupon_redemptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      ],
      [
        'fk_coupon_redemptions_order',
        `ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "fk_coupon_redemptions_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE`,
      ],
      [
        'fk_vendor_profiles_user',
        `ALTER TABLE "vendor_profiles" ADD CONSTRAINT "fk_vendor_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      ],
      [
        'fk_notifications_user',
        `ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      ],
    ];

    for (const [name, sql] of constraints) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = '${name}'
          ) THEN
            ${sql};
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "coupon_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_profiles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupon_redemptions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_reviews" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "favorites" CASCADE`);
  }
}
