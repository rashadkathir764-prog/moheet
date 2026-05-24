import apiClient from './axios';
import type { ApiResponse, User } from '../types';

export const usersApi = {
  getAll: async (limit = 100): Promise<User[]> => {
    const { data } = await apiClient.get<ApiResponse<User[]>>('/users', {
      params: { limit },
    });
    return data.data;
  },
};
