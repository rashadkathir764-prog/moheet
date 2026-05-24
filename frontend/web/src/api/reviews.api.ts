import api from './axios';

export const reviewsApi = {
  getByProduct: async (productId: string) => {
    const response = await api.get(`/reviews/products/${productId}`);
    return response.data;
  },

  create: async (data: { productId: string; orderId: string; rating: number; comment?: string }) => {
    const response = await api.post('/reviews', data);
    return response.data;
  },

  getMyReviews: async () => {
    const response = await api.get('/reviews/my');
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/reviews');
    return response.data;
  },

  updateStatus: async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const response = await api.patch(`/reviews/${id}/status`, { status });
    return response.data;
  },
};
