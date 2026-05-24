import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShipments1779250400000 implements MigrationInterface {
  name = 'CreateShipments1779250400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL UNIQUE,
        "customer_id" uuid NOT NULL,
        "carrier_name" varchar(120) NOT NULL,
        "tracking_number" varchar(120) NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'READY_TO_SHIP',
        "origin" varchar(150),
        "destination" varchar(150),
        "shipped_at" timestamptz,
        "estimated_delivery_at" timestamptz,
        "delivered_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "shipment_id" uuid NOT NULL,
        "status" varchar(30) NOT NULL,
        "location" varchar(150),
        "message" text,
        "occurred_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    const indexes = [
      `CREATE INDEX IF NOT EXISTS "idx_shipments_customer_id" ON "shipments" ("customer_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_shipments_status" ON "shipments" ("status")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_shipments_tracking_number" ON "shipments" ("tracking_number") WHERE "tracking_number" IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS "idx_shipment_events_shipment_id" ON "shipment_events" ("shipment_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_shipment_events_status" ON "shipment_events" ("status")`,
      `CREATE INDEX IF NOT EXISTS "idx_shipment_events_occurred_at" ON "shipment_events" ("occurred_at")`,
    ];

    for (const indexSql of indexes) {
      await queryRunner.query(indexSql);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_order'
        ) THEN
          ALTER TABLE "shipments"
          ADD CONSTRAINT "fk_shipments_order"
          FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_customer'
        ) THEN
          ALTER TABLE "shipments"
          ADD CONSTRAINT "fk_shipments_customer"
          FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipment_events_shipment'
        ) THEN
          ALTER TABLE "shipment_events"
          ADD CONSTRAINT "fk_shipment_events_shipment"
          FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_events" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipments" CASCADE`);
  }
}
