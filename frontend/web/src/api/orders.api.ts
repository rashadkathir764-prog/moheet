import apiClient from './axios';
import type {
  Order,
  OrderQueryParams,
  UpdateOrderStatusPayload,
  ApiResponse,
  PaginatedResponse,
  CheckoutOrderPayload,
} from '../types';

export interface VendorOrderItemRow {
  orderId: string;
  orderCreatedAt: string;
  orderStatus: string;
  customer?: { fullName?: string; email?: string; phone?: string };
  item: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
}

interface VendorOrderItemApiRow {
  id: string;
  orderId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
  totalPrice: number;
  order?: {
    id: string;
    status: string;
    createdAt: string;
    customer?: { fullName?: string; email?: string; phone?: string };
  };
}

interface VendorItemsApiResponse {
  success: boolean;
  data: VendorOrderItemApiRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface VendorItemsResponse extends Omit<VendorItemsApiResponse, 'data'> {
  data: VendorOrderItemRow[];
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
    const { data } = await apiClient.get<VendorItemsApiResponse>('/orders/vendor-items', {
      params: { page, limit },
    });
    return {
      ...data,
      data: data.data.map((row) => ({
        orderId: row.order?.id ?? row.orderId,
        orderCreatedAt: row.order?.createdAt ?? '',
        orderStatus: row.order?.status ?? '',
        customer: row.order?.customer,
        item: {
          id: row.id,
          productName: row.productName,
          quantity: row.quantity,
          unitPrice: row.priceAtPurchase,
          totalPrice: row.totalPrice,
        },
      })),
    };
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
