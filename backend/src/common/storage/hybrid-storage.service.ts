import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalFileStorageService } from './local-file-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { StorageService, StoredFile, ProductImageUploadFile } from './storage.service';

@Injectable()
export class HybridStorageService implements StorageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly localService: LocalFileStorageService,
    private readonly cloudinaryService: CloudinaryStorageService,
  ) {}

  async storeProductImage(file: ProductImageUploadFile): Promise<StoredFile> {
    const provider = this.configService.get<string>('STORAGE_PROVIDER', 'local');
    if (provider === 'cloudinary') {
      return this.cloudinaryService.storeProductImage(file);
    }
    return this.localService.storeProductImage(file);
  }

  async deleteByPublicUrl(publicUrl: string): Promise<void> {
    if (!publicUrl) return;

    try {
      if (publicUrl.includes('cloudinary.com')) {
        await this.cloudinaryService.deleteByPublicUrl(publicUrl);
      } else if (publicUrl.includes('/uploads')) {
        await this.localService.deleteByPublicUrl(publicUrl);
      }
    } catch {
      // Do not allow delete failure to block operations
    }
  }
}
