/**
 * حالات دورة حياة الطلب
 * مطابقة للمخطط في docs/database-schema.md
 */
export enum OrderStatus {
  PENDING = 'PENDING',         // في انتظار تأكيد البائع
  CONFIRMED = 'CONFIRMED',     // تم التأكيد من البائع
  PROCESSING = 'PROCESSING',   // جاري التجهيز والتعبئة
  SHIPPED = 'SHIPPED',         // تم الشحن — في الطريق
  DELIVERED = 'DELIVERED',     // تم الاستلام بنجاح
  CANCELLED = 'CANCELLED',     // ملغى (من العميل أو الإدارة)
  REFUNDED = 'REFUNDED',       // تم استرجاع المبلغ
}

/**
 * تدفق انتقال الحالات المسموح به:
 *
 * PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
 *    │                                              │
 *    └──────────────── CANCELLED ←─────────────────┘
 *                          │
 *                       REFUNDED (إذا كان مدفوعاً)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};
