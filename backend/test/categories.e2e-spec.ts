import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Categories API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves public category reads from the versioned API', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });
  });
});
