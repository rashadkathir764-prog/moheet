import apiClient from './axios';

export type TrackingEventType =
  | 'product_view'
  | 'search'
  | 'add_to_cart'
  | 'update_cart'
  | 'remove_from_cart'
  | 'clear_cart'
  | 'add_to_favorites'
  | 'remove_from_favorites'
  | 'checkout_started'
  | 'purchase'
  | 'recommendation_impression'
  | 'recommendation_click';

interface TrackingPayload {
  productId?: string;
  categoryId?: string;
  orderId?: string;
  searchQuery?: string;
  metadata?: Record<string, unknown>;
}

const SESSION_STORAGE_KEY = 'moheet_session_id';

const createSessionId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16)).join('-');
};

export const getTrackingSessionId = () => {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const sessionId = createSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
};

const trackedImpressions = new Set<string>();

export const trackingApi = {
  track: (type: TrackingEventType, payload: TrackingPayload = {}) => {
    if (type === 'recommendation_impression') {
      const productId = payload.productId ?? '';
      const metadata = payload.metadata ?? {};
      const source = String(metadata.source ?? '');
      const page = String(metadata.page ?? '');
      const railTitle = String(metadata.railTitle ?? '');

      const key = `${productId}:${source}:${page}:${railTitle}`;
      if (trackedImpressions.has(key)) {
        return;
      }
      trackedImpressions.add(key);
    }

    void apiClient.post('/events', {
      type,
      source: 'web',
      sessionId: getTrackingSessionId(),
      ...payload,
    }).catch(() => undefined);
  },
};

