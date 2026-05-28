import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderStatusHistory1779268400000
  implements MigrationInterface
{
  name = 'CreateOrderStatusHistory1779268400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_status_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "from_status" varchar(30),
        "to_status" varchar(30) NOT NULL,
        "changed_by_user_id" uuid,
        "changed_by_role" varchar(30),
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_status_history_order_id"
      ON "order_status_history" ("order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_status_history_created_at"
      ON "order_status_history" ("created_at")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_status_history_order'
        ) THEN
          ALTER TABLE "order_status_history"
          ADD CONSTRAINT "fk_order_status_history_order"
          FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT IF EXISTS "fk_order_status_history_order"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_order_status_history_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_order_status_history_order_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "order_status_history"`);
  }
}
