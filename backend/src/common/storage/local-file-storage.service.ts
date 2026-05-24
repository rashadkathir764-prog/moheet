import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { StorageService, StoredFile, ProductImageUploadFile } from './storage.service';

export { ProductImageUploadFile };

@Injectable()
export class LocalFileStorageService implements StorageService {
  private readonly uploadRoot: string;
  private readonly publicBaseUrl?: string;
  private readonly allowedMimeTypes: Set<string>;
  private readonly maxFileSize: number;

  constructor(private readonly configService: ConfigService) {
    this.uploadRoot = resolve(
      process.cwd(),
      this.configService.get<string>('UPLOAD_DEST', './uploads'),
    );
    this.publicBaseUrl = this.configService.get<string>(
      'UPLOAD_PUBLIC_BASE_URL',
    );
    this.allowedMimeTypes = new Set(
      this.configService
        .get<string>('ALLOWED_IMAGE_TYPES', 'image/jpeg,image/png,image/webp')
        .split(',')
        .map((type) => type.trim())
        .filter(Boolean),
    );
    this.maxFileSize = Number(
      this.configService.get<string>('MAX_FILE_SIZE', '5242880'),
    );
  }

  async storeProductImage(file: ProductImageUploadFile): Promise<StoredFile> {
    this.validateImageFile(file);

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const extension = this.resolveExtension(file);
    const filename = `${randomUUID()}${extension}`;
    const relativePath = join('products', year, month, filename).replace(
      /\\/g,
      '/',
    );
    const absolutePath = join(this.uploadRoot, relativePath);

    await mkdir(join(this.uploadRoot, 'products', year, month), {
      recursive: true,
    });
    await writeFile(absolutePath, file.buffer);

    return {
      relativePath,
      publicUrl: this.toPublicUrl(relativePath),
    };
  }

  async deleteByPublicUrl(publicUrl: string): Promise<void> {
    const relativePath = this.toRelativePath(publicUrl);
    if (!relativePath) return;

    try {
      await unlink(join(this.uploadRoot, relativePath));
    } catch {
      // The database row is the source of truth; missing files should not block cleanup.
    }
  }

  private validateImageFile(file?: ProductImageUploadFile): void {
    if (!file) {
      throw new BadRequestException('ملف الصورة مطلوب');
    }

    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(
        `نوع الصورة غير مسموح. الأنواع المسموحة: ${[
          ...this.allowedMimeTypes,
        ].join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `حجم الصورة يتجاوز الحد المسموح (${this.maxFileSize} bytes)`,
      );
    }
  }

  private resolveExtension(file: ProductImageUploadFile): string {
    const byMimeType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    return byMimeType[file.mimetype] || extname(file.originalname) || '.bin';
  }

  private toPublicUrl(relativePath: string): string {
    const normalizedPath = relativePath.replace(/\\/g, '/');

    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${normalizedPath}`;
    }

    return `/uploads/${normalizedPath}`;
  }

  private toRelativePath(publicUrl: string): string | null {
    if (!publicUrl) return null;

    if (this.publicBaseUrl && publicUrl.startsWith(this.publicBaseUrl)) {
      return publicUrl
        .slice(this.publicBaseUrl.length)
        .replace(/^\/+/, '')
        .replace(/\\/g, '/');
    }

    const uploadsPrefix = '/uploads/';
    const index = publicUrl.indexOf(uploadsPrefix);
    if (index >= 0) {
      return publicUrl.slice(index + uploadsPrefix.length).replace(/\\/g, '/');
    }

    return null;
  }
}
