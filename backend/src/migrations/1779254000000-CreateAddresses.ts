import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAddresses1779254000000 implements MigrationInterface {
  name = 'CreateAddresses1779254000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "addresses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "label" varchar(60) NOT NULL DEFAULT 'Home',
        "recipient_name" varchar(150) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "city" varchar(100) NOT NULL,
        "district" varchar(120),
        "street" varchar(180),
        "full_address" text NOT NULL,
        "country" varchar(100) NOT NULL DEFAULT 'Yemen',
        "postal_code" varchar(30),
        "latitude" numeric(10,7),
        "longitude" numeric(10,7),
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_addresses_user_id" ON "addresses" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_lookup" ON "addresses" ("user_id", "is_default")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_addresses_one_default_per_user" ON "addresses" ("user_id") WHERE "is_default" = true`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_addresses_user'
        ) THEN
          ALTER TABLE "addresses"
          ADD CONSTRAINT "fk_addresses_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "addresses" CASCADE`);
  }
}
