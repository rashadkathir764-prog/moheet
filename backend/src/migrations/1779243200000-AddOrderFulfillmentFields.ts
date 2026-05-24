import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderFulfillmentFields1779243200000
  implements MigrationInterface
{
  name = 'AddOrderFulfillmentFields1779243200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "shipping_carrier" varchar(100),
      ADD COLUMN IF NOT EXISTS "tracking_number" varchar(100),
      ADD COLUMN IF NOT EXISTS "shipped_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "refunded_at" timestamptz
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_tracking_number"
      ON "orders" ("tracking_number")
      WHERE "tracking_number" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_tracking_number"`);
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "refunded_at",
      DROP COLUMN IF EXISTS "cancelled_at",
      DROP COLUMN IF EXISTS "delivered_at",
      DROP COLUMN IF EXISTS "shipped_at",
      DROP COLUMN IF EXISTS "tracking_number",
      DROP COLUMN IF EXISTS "shipping_carrier"
    `);
  }
}
