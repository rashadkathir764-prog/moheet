import apiClient from './axios';
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductQueryParams,
  ProductsListResponse,
  ApiResponse,
} from '../types';

export const productsApi = {
  getAll: async (params?: ProductQueryParams): Promise<ProductsListResponse> => {
    const { data } = await apiClient.get<ProductsListResponse>('/products', { params });
    return data;
  },

  getOne: async (id: string): Promise<Product> => {
    const { data } = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return data.data;
  },

  create: async (payload: CreateProductPayload): Promise<Product> => {
    const { data } = await apiClient.post<ApiResponse<Product>>('/products', payload);
    return data.data;
  },

  update: async (id: string, payload: UpdateProductPayload): Promise<Product> => {
    const { data } = await apiClient.patch<ApiResponse<Product>>(`/products/${id}`, payload);
    return data.data;
  },

  softDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  restore: async (id: string): Promise<Product> => {
    const { data } = await apiClient.patch<ApiResponse<Product>>(`/products/${id}/restore`);
    return data.data;
  },

  uploadImage: async (id: string, file: File, makeMain: boolean = true): Promise<Product> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('makeMain', makeMain ? 'true' : 'false');
    const { data } = await apiClient.post<ApiResponse<Product>>(`/products/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.data;
  },
};

