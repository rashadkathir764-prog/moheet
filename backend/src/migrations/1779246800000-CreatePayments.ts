import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1779246800000 implements MigrationInterface {
  name = 'CreatePayments1779246800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "method" varchar(50) NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'PENDING',
        "amount" numeric(12,2) NOT NULL,
        "currency" char(3) NOT NULL DEFAULT 'YER',
        "provider" varchar(80) NOT NULL DEFAULT 'INTERNAL_SIMULATOR',
        "provider_reference" varchar(120),
        "failure_reason" text,
        "metadata" jsonb,
        "authorized_at" timestamptz,
        "captured_at" timestamptz,
        "failed_at" timestamptz,
        "refunded_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_order_id"
      ON "payments" ("order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_customer_id"
      ON "payments" ("customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_status"
      ON "payments" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_created_at"
      ON "payments" ("created_at")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_payments_provider_reference"
      ON "payments" ("provider_reference")
      WHERE "provider_reference" IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_order'
        ) THEN
          ALTER TABLE "payments"
          ADD CONSTRAINT "fk_payments_order"
          FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_customer'
        ) THEN
          ALTER TABLE "payments"
          ADD CONSTRAINT "fk_payments_customer"
          FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE`);
  }
}
