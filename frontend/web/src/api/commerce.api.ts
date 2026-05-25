import apiClient from './axios';

export const commerceApi = {
  cart: {
    get: async () => (await apiClient.get('/cart')).data.data,
    add: async (productId: string, quantity = 1) =>
      (await apiClient.post('/cart/items', { productId, quantity })).data.data,
    update: async (itemId: string, quantity: number) =>
      (await apiClient.patch(`/cart/items/${itemId}`, { quantity })).data.data,
    remove: async (itemId: string) =>
      (await apiClient.delete(`/cart/items/${itemId}`)).data.data,
    clear: async () => (await apiClient.delete('/cart')).data.data,
  },
  addresses: {
    all: async () => (await apiClient.get('/addresses')).data.data,
    getDefault: async () => (await apiClient.get('/addresses/default')).data.data,
    create: async (payload: Record<string, unknown>) =>
      (await apiClient.post('/addresses', payload)).data.data,
    update: async (id: string, payload: Record<string, unknown>) =>
      (await apiClient.patch(`/addresses/${id}`, payload)).data.data,
    setDefault: async (id: string) =>
      (await apiClient.patch(`/addresses/${id}/default`)).data.data,
  },
  favorites: {
    all: async () => (await apiClient.get('/favorites')).data.data,
    add: async (productId: string) =>
      (await apiClient.post(`/favorites/${productId}`)).data.data,
    remove: async (productId: string) =>
      (await apiClient.delete(`/favorites/${productId}`)).data,
  },
  coupons: {
    validate: async (code: string, subtotal: number) =>
      (await apiClient.post('/coupons/validate', { code, subtotal })).data.data,
    all: async () => (await apiClient.get('/coupons')).data.data,
    create: async (payload: Record<string, unknown>) =>
      (await apiClient.post('/coupons', payload)).data.data,
  },
  reviews: {
    byProduct: async (productId: string) =>
      (await apiClient.get(`/reviews/products/${productId}`)).data.data,
    mine: async () => (await apiClient.get('/reviews/my')).data.data,
    create: async (payload: Record<string, unknown>) =>
      (await apiClient.post('/reviews', payload)).data.data,
  },
  vendors: {
    all: async () => (await apiClient.get('/vendors')).data.data,
    me: async () => (await apiClient.get('/vendors/me')).data.data,
    approve: async (id: string) =>
      (await apiClient.patch(`/vendors/${id}/status`, { status: 'APPROVED' })).data.data,
    reject: async (id: string) =>
      (await apiClient.patch(`/vendors/${id}/status`, { status: 'REJECTED' })).data.data,
  },
  notifications: {
    all: async () => (await apiClient.get('/notifications')).data.data,
    readAll: async () => (await apiClient.patch('/notifications/read-all')).data,
  },
};
