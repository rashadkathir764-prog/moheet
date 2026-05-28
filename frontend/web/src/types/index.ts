// ─── Unions ───────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'VENDOR' | 'CUSTOMER';

export type OrderStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CASH_ON_DELIVERY'
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'fullName' | 'role' | 'isVerified'>;
  accessToken: string;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  imageUrl: string;
  altText?: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  brand?: string;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  weightKg?: number;
  tags?: string[];
  thumbnailUrl?: string;
  viewCount?: number;
  cartAddCount?: number;
  purchaseCount?: number;
  favoriteCount?: number;
  ratingAverage?: number;
  reviewCount?: number;
  vendor?: Pick<User, 'id' | 'fullName' | 'email'>;
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  sku?: string;
  brand?: string;
  tags?: string[];
  stockQuantity: number;
  categoryId: string;
  thumbnailUrl?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  weightKg?: number;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

// ─── Order ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId?: string | null;
  changedByRole?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Pick<User, 'id' | 'fullName' | 'email' | 'phone'>;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  items?: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  adminNotes?: string;
  note?: string;
  shippingCarrier?: string;
  trackingNumber?: string;
}

export interface ShippingAddressPayload {
  fullName: string;
  phone: string;
  fullAddress: string;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface CheckoutOrderPayload {
  shippingAddress?: ShippingAddressPayload;
  savedAddressId?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  couponCode?: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export type ProductsListResponse = PaginatedResponse<Product>;

export type AnalyticsEventKey =
  | 'product_view'
  | 'add_to_cart'
  | 'checkout_started'
  | 'purchase';

export type AnalyticsRange = 'today' | '7d' | '30d' | 'all';

export type AnalyticsEventCountKey =
  | AnalyticsEventKey
  | 'update_cart'
  | 'remove_from_cart'
  | 'remove_from_favorites'
  | 'recommendation_impression'
  | 'recommendation_click';

export interface AnalyticsProductMetric {
  productId: string;
  name: string;
  count: number;
}

export interface AnalyticsSearchMetric {
  query: string;
  count: number;
}

export interface AnalyticsFunnelStep {
  event: AnalyticsEventKey;
  label: string;
  count: number;
  rateFromViews: number;
  rateFromPrevious: number;
}

export interface RecommendationAnalytics {
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface AnalyticsDataQuality {
  totalEventsInRange: number;
  eventsWithoutProductId: number;
  emptySearchQueries: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  productSignalsScope: 'allTime';
  totals: Record<AnalyticsEventKey, number>;
  eventCounts: Record<AnalyticsEventCountKey, number>;
  recommendationMetrics: RecommendationAnalytics;
  dataQuality: AnalyticsDataQuality;
  topViewedProducts: AnalyticsProductMetric[];
  topCartProducts: AnalyticsProductMetric[];
  topPurchasedProducts: AnalyticsProductMetric[];
  topSearches: AnalyticsSearchMetric[];
  funnel: AnalyticsFunnelStep[];
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export type ProductSortBy = 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'name_az';

export interface ProductQueryParams {
  q?: string;
  page?: number;
  limit?: number;
  categoryId?: string;
  includeInactive?: boolean;
  vendorId?: string;
  brand?: string;
  tag?: string;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: ProductSortBy;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}
