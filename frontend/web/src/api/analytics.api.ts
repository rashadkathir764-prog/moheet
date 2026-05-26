import apiClient from './axios';
import type { AnalyticsSummary, ApiResponse } from '../types';

export const analyticsApi = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get<ApiResponse<AnalyticsSummary>>(
      '/events/analytics/summary',
    );
    return data.data;
  },
};
