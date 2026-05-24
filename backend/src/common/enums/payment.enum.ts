export enum PaymentMethod {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY', // الدفع عند الاستلام
  CREDIT_CARD = 'CREDIT_CARD',           // بطاقة ائتمان (للمراحل القادمة)
  BANK_TRANSFER = 'BANK_TRANSFER',       // تحويل بنكي
}

export enum PaymentStatus {
  PENDING = 'PENDING',     // في انتظار الدفع
  PAID = 'PAID',           // تم الدفع
  FAILED = 'FAILED',       // فشل الدفع
  REFUNDED = 'REFUNDED',   // تم الاسترجاع
}
