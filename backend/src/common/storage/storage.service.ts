export interface ProductImageUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface StoredFile {
  relativePath?: string;
  publicUrl: string;
}

export interface StorageService {
  storeProductImage(file: ProductImageUploadFile): Promise<StoredFile>;
  deleteByPublicUrl(publicUrl: string): Promise<void>;
}
