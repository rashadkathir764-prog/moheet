/**
 * أدوار المستخدمين في منظومة MOHEET
 * يُستخدَم في User Entity والـ RBAC Guards
 */
export enum Role {
  ADMIN = 'ADMIN',       // صلاحيات كاملة — إدارة النظام
  VENDOR = 'VENDOR',     // إدارة منتجاته وطلباته فقط
  CUSTOMER = 'CUSTOMER', // التصفح والشراء
}
