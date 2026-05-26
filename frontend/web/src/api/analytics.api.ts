import apiClient from './axios';
import type { AnalyticsRange, AnalyticsSummary, ApiResponse } from '../types';

export const analyticsApi = {
  getSummary: async (range: AnalyticsRange = '7d'): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get<ApiResponse<AnalyticsSummary>>(
      '/events/analytics/summary',
      { params: { range } },
    );
    return data.data;
  },
};
