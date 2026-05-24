import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserEventsAndProductSignals1779261200000
  implements MigrationInterface
{
  name = 'CreateUserEventsAndProductSignals1779261200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "brand" varchar(120),
      ADD COLUMN IF NOT EXISTS "tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
      ADD COLUMN IF NOT EXISTS "view_count" int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "cart_add_count" int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "purchase_count" int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "favorite_count" int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "rating_average" numeric(3,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "review_count" int NOT NULL DEFAULT 0
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_products_brand" ON "products" ("brand")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_products_tags" ON "products" USING GIN ("tags")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_products_name_trgm" ON "products" USING GIN ("name" gin_trgm_ops)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "session_id" varchar(128),
        "type" varchar(60) NOT NULL,
        "source" varchar(20) NOT NULL DEFAULT 'web',
        "product_id" uuid,
        "category_id" uuid,
        "order_id" uuid,
        "search_query" varchar(255),
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_events_type_created" ON "user_events" ("type", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_events_user_created" ON "user_events" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_events_session_created" ON "user_events" ("session_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_events_product_created" ON "user_events" ("product_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_events_metadata" ON "user_events" USING GIN ("metadata")`,
    );

    const constraints = [
      [
        'fk_user_events_user',
        `ALTER TABLE "user_events" ADD CONSTRAINT "fk_user_events_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
      ],
      [
        'fk_user_events_product',
        `ALTER TABLE "user_events" ADD CONSTRAINT "fk_user_events_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL`,
      ],
      [
        'fk_user_events_category',
        `ALTER TABLE "user_events" ADD CONSTRAINT "fk_user_events_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL`,
      ],
      [
        'fk_user_events_order',
        `ALTER TABLE "user_events" ADD CONSTRAINT "fk_user_events_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL`,
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
    await queryRunner.query(`DROP TABLE IF EXISTS "user_events" CASCADE`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_name_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_tags"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_brand"`);
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "review_count",
      DROP COLUMN IF EXISTS "rating_average",
      DROP COLUMN IF EXISTS "favorite_count",
      DROP COLUMN IF EXISTS "purchase_count",
      DROP COLUMN IF EXISTS "cart_add_count",
      DROP COLUMN IF EXISTS "view_count",
      DROP COLUMN IF EXISTS "tags",
      DROP COLUMN IF EXISTS "brand"
    `);
  }
}
