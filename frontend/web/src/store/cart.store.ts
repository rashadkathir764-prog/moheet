import { create } from 'zustand';
import { commerceApi } from '../api/commerce.api';
import { trackingApi } from '../api/tracking.api';
import { extractApiError, logError } from '../utils/extractApiError';

interface CartState {
  cartCount: number;
  cartError: string;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  clearCart: () => void;
  setCartCount: (count: number) => void;
}

export const useCartStore = create<CartState>()((set) => ({
  cartCount: 0,
  cartError: '',
  fetchCart: async () => {
    try {
      const cart = await commerceApi.cart.get();
      set({ cartCount: cart?.items?.length || 0, cartError: '' });
    } catch (error) {
      // فشل جلب السلة لا يمنع تحميل الصفحة — نصفّر العدد فقط
      logError('fetchCart', error);
      set({ cartCount: 0 });
    }
  },
  addToCart: async (productId: string, quantity = 1) => {
    try {
      const cart = await commerceApi.cart.add(productId, quantity);
      trackingApi.track('add_to_cart', {
        productId,
        metadata: { quantity },
      });
      set({ cartCount: cart?.items?.length || 0, cartError: '' });
    } catch (error) {
      logError('addToCart', error);
      // نرمي الخطأ للـ caller (ProductDetails) ليعرضه للمستخدم
      throw new Error(extractApiError(error), { cause: error });
    }
  },
  clearCart: () => set({ cartCount: 0 }),
  setCartCount: (count: number) => set({ cartCount: count }),
}));
