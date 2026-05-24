import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeLocalUploadUrls1779264800000
  implements MigrationInterface
{
  name = 'NormalizeLocalUploadUrls1779264800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "products"
      SET "thumbnail_url" = REPLACE("thumbnail_url", 'localhost:3001', 'localhost:3000')
      WHERE "thumbnail_url" LIKE '%localhost:3001%'
    `);

    await queryRunner.query(`
      UPDATE "product_images"
      SET "image_url" = REPLACE("image_url", 'localhost:3001', 'localhost:3000')
      WHERE "image_url" LIKE '%localhost:3001%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "products"
      SET "thumbnail_url" = REPLACE("thumbnail_url", 'localhost:3000', 'localhost:3001')
      WHERE "thumbnail_url" LIKE '%localhost:3000%'
    `);

    await queryRunner.query(`
      UPDATE "product_images"
      SET "image_url" = REPLACE("image_url", 'localhost:3000', 'localhost:3001')
      WHERE "image_url" LIKE '%localhost:3000%'
    `);
  }
}
