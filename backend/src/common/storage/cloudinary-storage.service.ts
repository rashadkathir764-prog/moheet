import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { StorageService, StoredFile, ProductImageUploadFile } from './storage.service';

@Injectable()
export class CloudinaryStorageService implements StorageService {
  private readonly folder: string;
  private readonly allowedMimeTypes: Set<string>;
  private readonly maxFileSize: number;

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    this.folder = this.configService.get<string>('CLOUDINARY_FOLDER', 'moheet');

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

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${this.folder}/products`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            return reject(
              new BadRequestException(
                `فشل رفع الصورة إلى Cloudinary: ${error.message}`,
              ),
            );
          }
          if (!result) {
            return reject(
              new BadRequestException(
                'فشل رفع الصورة إلى Cloudinary: نتيجة غير معروفة',
              ),
            );
          }
          resolve({
            relativePath: result.public_id,
            publicUrl: result.secure_url,
          });
        },
      );

      uploadStream.write(file.buffer);
      uploadStream.end();
    });
  }

  async deleteByPublicUrl(publicUrl: string): Promise<void> {
    const publicId = this.extractPublicId(publicUrl);
    if (!publicId) return;

    try {
      await cloudinary.uploader.destroy(publicId);
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

  private extractPublicId(publicUrl: string): string | null {
    if (!publicUrl) return null;

    const uploadMarker = '/upload/';
    const index = publicUrl.indexOf(uploadMarker);
    if (index === -1) return null;

    const pathAfterUpload = publicUrl.slice(index + uploadMarker.length);
    const parts = pathAfterUpload.split('/');

    // Check if the first part is a version identifier (starts with 'v' and followed by digits)
    if (parts.length > 0 && /^v\d+$/.test(parts[0])) {
      parts.shift();
    }

    const pathWithoutVersion = parts.join('/');
    const lastDotIndex = pathWithoutVersion.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      return pathWithoutVersion.slice(0, lastDotIndex);
    }
    return pathWithoutVersion;
  }
}
