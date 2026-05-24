import apiClient from './axios';
import type { ApiResponse, Category } from '../types';

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await apiClient.get<ApiResponse<Category[]>>('/categories');
    return data.data;
  },

  getOne: async (id: string): Promise<Category> => {
    const { data } = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
    return data.data;
  },
};
