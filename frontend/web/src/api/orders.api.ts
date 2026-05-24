import apiClient from './axios';
import type {
  Order,
  OrderQueryParams,
  UpdateOrderStatusPayload,
  ApiResponse,
  PaginatedResponse,
  CheckoutOrderPayload,
} from '../types';

interface VendorItemsResponse {
  success: boolean;
  data: Array<{
    orderId: string;
    orderCreatedAt: string;
    orderStatus: string;
    customer: { fullName: string; email: string; phone?: string };
    item: {
      id: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    };
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const ordersApi = {
  // ADMIN: جميع الطلبات
  getAll: async (params?: OrderQueryParams): Promise<PaginatedResponse<Order>> => {
    const { data } = await apiClient.get<PaginatedResponse<Order>>('/orders', { params });
    return data;
  },

  // CUSTOMER/VENDOR: طلباتي
  getMy: async (page = 1, limit = 10): Promise<PaginatedResponse<Order>> => {
    const { data } = await apiClient.get<PaginatedResponse<Order>>('/orders/my', {
      params: { page, limit },
    });
    return data;
  },

  // VENDOR: عناصر طلبات منتجاتي
  getVendorItems: async (page = 1, limit = 20): Promise<VendorItemsResponse> => {
    const { data } = await apiClient.get<VendorItemsResponse>('/orders/vendor-items', {
      params: { page, limit },
    });
    return data;
  },

  getOne: async (id: string): Promise<Order> => {
    const { data } = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
    return data.data;
  },

  updateStatus: async (id: string, payload: UpdateOrderStatusPayload): Promise<Order> => {
    const { data } = await apiClient.patch<ApiResponse<Order>>(
      `/orders/${id}/status`,
      payload,
    );
    return data.data;
  },

  checkout: async (payload: CheckoutOrderPayload): Promise<Order> => {
    const { data } = await apiClient.post<ApiResponse<Order>>('/orders/checkout', payload);
    return data.data;
  },

  cancel: async (id: string): Promise<Order> => {
    const { data } = await apiClient.delete<ApiResponse<Order>>(`/orders/${id}`);
    return data.data;
  },
};
