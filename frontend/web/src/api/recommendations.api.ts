import apiClient from './axios';
import { getTrackingSessionId } from './tracking.api';
import type { ApiResponse, Product } from '../types';

export const recommendationsApi = {
  trending: async (limit = 10): Promise<Product[]> => {
    const { data } = await apiClient.get<ApiResponse<Product[]>>(
      '/recommendations/trending',
      { params: { limit } },
    );
    return data.data;
  },

  similar: async (productId: string, limit = 8): Promise<Product[]> => {
    const { data } = await apiClient.get<ApiResponse<Product[]>>(
      `/recommendations/similar/${productId}`,
      { params: { limit } },
    );
    return data.data;
  },

  forMe: async (limit = 10): Promise<Product[]> => {
    const { data } = await apiClient.get<ApiResponse<Product[]>>(
      '/recommendations/for-me',
      {
        params: {
          limit,
          sessionId: getTrackingSessionId(),
        },
      },
    );
    return data.data;
  },
};
