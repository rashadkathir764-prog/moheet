import { Fragment, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ordersApi } from '../../api/orders.api';
import { commerceApi } from '../../api/commerce.api';
import { productsApi } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';
import { usersApi } from '../../api/users.api';
import { analyticsApi } from '../../api/analytics.api';
import type {
  AnalyticsProductMetric,
  AnalyticsRange,
  AnalyticsSummary,
  Order,
  OrderStatus,
  Product,
  Category,
  UpdateOrderStatusPayload,
  User,
  CreateProductPayload,
} from '../../types';
import { PageTransition } from '../../components/Layout/PageTransition';
import { AppDialog, type AppDialogProps } from '../../components/ui/AppDialog';
import { extractApiError } from '../../utils/extractApiError';
import './AdminPages.css';

type DialogState = Omit<AppDialogProps, 'isOpen'>;

const money = (value?: number) => `${Number(value ?? 0).toFixed(2)} ر.ي`;

const couponCode = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return `MOHEET${100 + (values[0] % 900)}`;
};

const roleLabel = (role: User['role']) => {
  if (role === 'ADMIN') return 'المدير';
  if (role === 'VENDOR') return 'تاجر';
  return 'عميل';
};

const percent = (value?: number) => `${Number(value ?? 0).toFixed(1)}%`;

const analyticsRangeOptions: Array<{ value: AnalyticsRange; label: string }> = [
  { value: 'today', label: 'اليوم' },
  { value: '7d', label: 'آخر 7 أيام' },
  { value: '30d', label: 'آخر 30 يوم' },
  { value: 'all', label: 'كل الوقت' },
];

interface VendorSummary {
  id: string;
  storeName: string;
  status: string;
}

interface CouponSummary {
  id: string;
  code?: string;
  name?: string;
}

const orderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  PROCESSING: 'قيد التجهيز',
  SHIPPED: 'تم الشحن',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
  REFUNDED: 'مسترد',
};

interface OrderStatusDraft {
  status: OrderStatus | '';
  shippingCarrier: string;
  trackingNumber: string;
  note: string;
}

const emptyOrderStatusDraft = (): OrderStatusDraft => ({
  status: '',
  shippingCarrier: '',
  trackingNumber: '',
  note: '',
});

const orderStatusText = (status?: OrderStatus | null) =>
  status ? orderStatusLabels[status] : 'بداية';

const textOrEmpty = (value?: string | number | null) => {
  if (value === 0) return '0';
  return value ? String(value) : 'غير متوفر';
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return 'غير متوفر';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير متوفر';
  return date.toLocaleString('ar-SA');
};

const getOrderItemUnitPrice = (item: NonNullable<Order['items']>[number]) =>
  item.priceAtPurchase ?? item.unitPrice ?? 0;

export function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [coupons, setCoupons] = useState<CouponSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('7d');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const closeDialog = () => setDialog(null);

  // ── Admin product form state ───────────────────────────────────────────────
  const emptyProductForm = (): CreateProductPayload => ({
    name: '',
    description: '',
    price: 0,
    stockQuantity: 0,
    categoryId: '',
    brand: '',
    tags: [],
    isActive: true,
    isFeatured: false,
  });
  const [productForm, setProductForm] = useState<CreateProductPayload>(emptyProductForm());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productFormMsg, setProductFormMsg] = useState('');
  const [productFormErr, setProductFormErr] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const location = useLocation();
  const currentPath = location.pathname;

  const isDashboard = currentPath.endsWith('dashboard') || currentPath === '/admin' || currentPath === '/admin/';
  const isProducts = currentPath.endsWith('products');
  const isCategories = currentPath.endsWith('categories');
  const isOrders = currentPath.endsWith('orders');
  const isUsers = currentPath.endsWith('users');

  const load = () => {
    ordersApi.getAll({ limit: 100 }).then((res) => setOrders(res.data || []));
    commerceApi.vendors.all().then(setVendors);
    commerceApi.coupons.all().then(setCoupons);
    usersApi.getAll().then(setUsers).catch(() => setUsers([]));
  };

  const loadAllCategories = () => {
    categoriesApi.getAll().then((res) => setAllCategories(res || [])).catch(() => {});
  };

  const openCreateProduct = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm());
    setProductFormMsg('');
    setProductFormErr('');
    setShowProductForm(true);
    loadAllCategories();
  };

  const openEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name,
      description: prod.description || '',
      price: prod.price,
      stockQuantity: prod.stockQuantity,
      categoryId: prod.category?.id || '',
      brand: prod.brand || '',
      tags: prod.tags || [],
      isActive: prod.isActive,
      isFeatured: prod.isFeatured,
    });
    setProductFormMsg('');
    setProductFormErr('');
    setShowProductForm(true);
    loadAllCategories();
  };

  const cancelProductForm = () => {
    setShowProductForm(false);
    setEditingProductId(null);
    setProductForm(emptyProductForm());
    setProductFormMsg('');
    setProductFormErr('');
  };

  const submitProductForm = async () => {
    setProductFormErr('');
    setProductFormMsg('');
    if (!productForm.name.trim()) {
      setProductFormErr('أدخل اسم المنتج.');
      return;
    }
    if (!productForm.categoryId) {
      setProductFormErr('اختر القسم الذي ينتمي إليه المنتج');
      return;
    }
    if (Number(productForm.price) <= 0) {
      setProductFormErr('أدخل سعراً صحيحاً أكبر من صفر.');
      return;
    }
    try {
      const payload: CreateProductPayload = {
        ...productForm,
        name: productForm.name.trim(),
        description: productForm.description?.trim() || undefined,
        brand: productForm.brand?.trim() || undefined,
        tags: productForm.tags?.map((t) => t.trim()).filter(Boolean),
        price: Number(productForm.price),
        stockQuantity: Number(productForm.stockQuantity),
      };
      if (editingProductId) {
        await productsApi.update(editingProductId, payload);
        setProductFormMsg('تم تحديث المنتج بنجاح.');
      } else {
        await productsApi.create(payload);
        setProductFormMsg('تم إنشاء المنتج بنجاح.');
      }
      productsApi.getAll({ limit: 100 }).then((res) => setProducts(res.data || []));
      setShowProductForm(false);
      setEditingProductId(null);
      setProductForm(emptyProductForm());
    } catch (err: unknown) {
      setProductFormErr(extractApiError(err));
    }
  };

  const handleDeleteProduct = (id: string) => {
    setDialog({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من رغبتك في حذف هذا المنتج؟',
      variant: 'danger',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      onCancel: closeDialog,
      onConfirm: async () => {
        closeDialog();
        try {
          await productsApi.softDelete(id);
          // Reload products list
          productsApi.getAll({ limit: 100 }).then((res) => setProducts(res.data || []));
        } catch (err: unknown) {
          setDialog({
            title: 'فشل الحذف',
            message: extractApiError(err),
            confirmText: 'حسناً',
            onConfirm: closeDialog,
          });
        }
      },
    });
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!isDashboard) return;

    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      setAnalyticsLoading(true);
      setAnalyticsError('');

      analyticsApi.getSummary(analyticsRange)
        .then((summary) => {
          if (active) setAnalytics(summary);
        })
        .catch((error: unknown) => {
          if (active) setAnalyticsError(extractApiError(error));
        })
        .finally(() => {
          if (active) setAnalyticsLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isDashboard, analyticsRange]);

  useEffect(() => {
    if (isProducts) {
      productsApi.getAll({ limit: 100, includeInactive: true }).then((res) => setProducts(res.data || []));
      loadAllCategories();
    }
    if (isCategories) {
      categoriesApi.getAll().then((res) => setCategories(res || []));
    }
  }, [isProducts, isCategories]);

  const weeklySales = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const dateKey = day.toISOString().slice(0, 10);
    return {
      name: day.toLocaleDateString('ar', { weekday: 'short' }),
      sales: orders
        .filter((order) => order.createdAt?.slice(0, 10) === dateKey)
        .reduce((total, order) => total + Number(order.totalAmount ?? 0), 0),
    };
  });

  const statusData = Object.entries(
    orders.reduce<Record<string, number>>((counts, order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const createCoupon = async () => {
    await commerceApi.coupons.create({
      code: couponCode(),
      name: 'Admin campaign',
      type: 'PERCENTAGE',
      value: 10,
      minOrderAmount: 1,
      perUserLimit: 1,
      isActive: true,
    });
    load();
  };

  return (
    <PageTransition>
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <h1>
          {isProducts 
            ? 'إدارة المنتجات' 
            : isCategories 
            ? 'إدارة التصنيفات' 
            : isOrders 
            ? 'إدارة الطلبات' 
            : isUsers 
            ? 'إدارة المستخدمين' 
            : 'لوحة الإدارة'}
        </h1>
        <p>
          {isProducts 
            ? 'عرض قائمة المنتجات المتوفرة وتتبع حالة تفعيلها ومخزونها.' 
            : isCategories 
            ? 'مراجعة التصنيفات وفئات المنتجات الرئيسية وسرعة ترتيبها.' 
            : isOrders 
            ? 'مراقبة الطلبات الصادرة وحالتها التشغيلية وتتبع الإيرادات.' 
            : isUsers 
            ? 'التحكم في حسابات المستخدمين وإدارة أدوارهم وتفويضاتهم.' 
            : 'طلبات، تجار، كوبونات، ومراقبة تشغيلية.'}
        </p>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card"><h3>الطلبات</h3><div className="price">{orders.length}</div></div>
        <div className="dashboard-card"><h3>طلبات التجار</h3><div className="price">{vendors.length}</div></div>
        <div className="dashboard-card"><h3>الكوبونات</h3><div className="price">{coupons.length}</div></div>
      </section>

      {isDashboard && (
        <>
          <section style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px', padding: '0 20px' }}>
            <div style={{ flex: 1, minWidth: '300px', minHeight: '320px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #ddd' }}>
              <h3 style={{ marginBottom: '15px', color: '#0f1111' }}>المبيعات الأسبوعية</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={weeklySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="#e77600" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ flex: 1, minWidth: '300px', minHeight: '320px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #ddd' }}>
              <h3 style={{ marginBottom: '15px', color: '#0f1111' }}>حالة الطلبات</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                    <Cell fill="#007600" />
                    <Cell fill="#e77600" />
                    <Cell fill="#d9534f" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <AnalyticsPanel
            analytics={analytics}
            loading={analyticsLoading}
            error={analyticsError}
            selectedRange={analyticsRange}
            onRangeChange={setAnalyticsRange}
          />

          <section className="dashboard-section">
            <h2>الموافقة على التجار</h2>
            <table className="dashboard-table">
              <tbody>{vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>{vendor.storeName}</td><td>{vendor.status}</td>
                  <td><button onClick={() => commerceApi.vendors.approve(vendor.id).then(load)}>موافقة</button></td>
                  <td><button onClick={() => commerceApi.vendors.reject(vendor.id).then(load)}>رفض</button></td>
                </tr>
              ))}</tbody>
            </table>
            <button className="primary" onClick={createCoupon}>إنشاء كوبون 10%</button>
          </section>
          
          <OrdersTable title="آخر الطلبات" orders={orders} />
        </>
      )}

      {isProducts && (
        <section className="dashboard-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>قائمة المنتجات ({products.length})</h2>
            <button
              onClick={openCreateProduct}
              style={{ background: '#007600', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + إضافة منتج جديد
            </button>
          </div>

          {/* Admin Product Form */}
          {showProductForm && (
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '20px', background: '#f8fafc' }}>
              <h3 style={{ margin: '0 0 16px', color: '#0f1111' }}>
                {editingProductId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h3>
              {productFormErr && (
                <div style={{ background: '#fbe2e2', color: '#c62828', padding: '10px 14px', borderRadius: '4px', marginBottom: '12px', fontWeight: 600 }}>
                  {productFormErr}
                </div>
              )}
              {productFormMsg && (
                <div style={{ background: '#e2fbe8', color: '#1b5e20', padding: '10px 14px', borderRadius: '4px', marginBottom: '12px', fontWeight: 600 }}>
                  {productFormMsg}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>اسم المنتج *</label>
                  <input
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    value={productForm.name}
                    onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="اسم المنتج"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>السعر (ر.ي) *</label>
                  <input
                    type="number" min="0"
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    placeholder="السعر"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>المخزون</label>
                  <input
                    type="number" min="0"
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    value={productForm.stockQuantity || ''}
                    onChange={(e) => setProductForm((f) => ({ ...f, stockQuantity: Number(e.target.value) }))}
                    placeholder="الكمية في المخزون"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#c62828', marginBottom: '4px', fontWeight: 600 }}>القسم (تصنيف المنتج) *</label>
                  <select
                    style={{ width: '100%', padding: '8px', border: productForm.categoryId ? '1px solid #cbd5e1' : '2px solid #c62828', borderRadius: '4px', boxSizing: 'border-box', background: '#fff' }}
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm((f) => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">-- اختر القسم --</option>
                    {allCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {!productForm.categoryId && (
                    <span style={{ fontSize: '12px', color: '#c62828' }}>اختر القسم الذي ينتمي إليه المنتج</span>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>العلامة التجارية</label>
                  <input
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    value={productForm.brand || ''}
                    onChange={(e) => setProductForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="العلامة التجارية"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>الوسوم (مفصولة بفاصلة)</label>
                  <input
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    value={productForm.tags?.join(', ') || ''}
                    onChange={(e) => setProductForm((f) => ({ ...f, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))}
                    placeholder="وسوم مفصولة بفواصل"
                  />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>وصف المنتج</label>
                <textarea
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', resize: 'vertical' }}
                  rows={3}
                  value={productForm.description || ''}
                  onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="وصف المنتج..."
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={submitProductForm}
                  style={{ background: '#007600', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {editingProductId ? 'حفظ التعديلات' : 'إنشاء المنتج'}
                </button>
                <button
                  onClick={cancelProductForm}
                  style={{ background: '#e2e8f0', color: '#1e293b', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <table className="dashboard-table">
            <thead>
              <tr>
                <th>اسم المنتج</th>
                <th>القسم</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>جاري تحميل قائمة المنتجات...</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td style={{ fontWeight: 'bold' }}>{product.name}</td>
                    <td>
                      <span style={{ background: '#e3f2fd', color: '#0d47a1', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        {product.category?.name || '—'}
                      </span>
                    </td>
                    <td style={{ color: '#B12704', fontWeight: 'bold' }}>{money(product.price)}</td>
                    <td>{product.stockQuantity}</td>
                    <td>
                      <span className="status-pill" style={{ background: product.isActive ? '#e2fbe8' : '#fbe2e2', color: product.isActive ? '#1b5e20' : '#c62828' }}>
                        {product.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditProduct(product)}
                          style={{ background: '#ffa41c', color: '#000', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          style={{ background: '#d9534f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {isCategories && (
        <section className="dashboard-section">
          <h2>إدارة التصنيفات المعتمدة ({categories.length})</h2>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>اسم التصنيف</th>
                <th>الرابط المحسن (Slug)</th>
                <th>ترتيب العرض</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>جاري تحميل قائمة التصنيفات...</td></tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 'bold' }}>{cat.name}</td>
                    <td><code>{cat.slug}</code></td>
                    <td>{cat.sortOrder}</td>
                    <td>
                      <span className="status-pill" style={{ background: cat.isActive ? '#e2fbe8' : '#fbe2e2', color: cat.isActive ? '#1b5e20' : '#c62828' }}>
                        {cat.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {isOrders && (
        <OrdersTable title="قائمة كل الطلبات المسجلة بالنظام" orders={orders} />
      )}

      {isUsers && (
        <section className="dashboard-section">
          <h2>قائمة المستخدمين المسجلين</h2>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>الاسم بالكامل</th>
                <th>البريد الإلكتروني</th>
                <th>الدور (الصلاحية)</th>
                <th>الحالة التشغيلية</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>لا توجد بيانات مستخدمين حقيقية متاحة حالياً.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 'bold' }}>{user.fullName}</td>
                    <td><code>{user.email}</code></td>
                    <td><span className="status-pill" style={{ background: '#e3f2fd', color: '#0d47a1' }}>{roleLabel(user.role)}</span></td>
                    <td><span className="status-pill" style={{ background: user.isActive ? '#e2fbe8' : '#fbe2e2', color: user.isActive ? '#1b5e20' : '#c62828' }}>{user.isActive ? 'نشط' : 'موقوف'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
    <AppDialog
      isOpen={dialog !== null}
      title={dialog?.title}
      message={dialog?.message}
      variant={dialog?.variant}
      confirmText={dialog?.confirmText}
      cancelText={dialog?.cancelText}
      onConfirm={dialog?.onConfirm}
      onCancel={dialog?.onCancel}
    />
    </PageTransition>
  );
}

// VendorDashboard moved to VendorPages.tsx

function OrdersTable({ title, orders }: { title: string; orders: Order[] }) {
  const location = useLocation();
  const canManageStatus = location.pathname.endsWith('/orders');
  const [updatedOrdersById, setUpdatedOrdersById] = useState<Record<string, Order>>({});
  const [drafts, setDrafts] = useState<Record<string, OrderStatusDraft>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const displayedOrders = orders.map((order) => updatedOrdersById[order.id] ?? order);

  const updateDraft = (orderId: string, changes: Partial<OrderStatusDraft>) => {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? emptyOrderStatusDraft()),
        ...changes,
      },
    }));
  };

  const handleStatusUpdate = async (order: Order) => {
    const draft = drafts[order.id] ?? emptyOrderStatusDraft();

    setMessage('');
    setError('');

    if (!draft.status) {
      setError('اختر حالة جديدة للطلب أولاً.');
      return;
    }

    if (draft.status === 'SHIPPED' && (!draft.shippingCarrier.trim() || !draft.trackingNumber.trim())) {
      setError('شركة الشحن ورقم التتبع مطلوبان عند تحويل الطلب إلى SHIPPED.');
      return;
    }

    const payload: UpdateOrderStatusPayload = {
      status: draft.status,
      ...(draft.note.trim() && { note: draft.note.trim() }),
      ...(draft.status === 'SHIPPED' && {
        shippingCarrier: draft.shippingCarrier.trim(),
        trackingNumber: draft.trackingNumber.trim(),
      }),
    };

    try {
      setUpdatingOrderId(order.id);
      const updatedOrder = await ordersApi.updateStatus(order.id, payload);
      let rowOrder = updatedOrder;

      if (selectedOrderId === order.id) {
        try {
          const freshOrder = await ordersApi.getOne(order.id);
          setSelectedOrder(freshOrder);
          setDetailsError('');
          rowOrder = freshOrder;
        } catch (detailsFetchError: unknown) {
          setDetailsError(extractApiError(detailsFetchError));
        }
      }

      setUpdatedOrdersById((current) => ({
        ...current,
        [rowOrder.id]: rowOrder,
      }));
      setDrafts((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      setMessage(`تم تحديث حالة الطلب ${order.id.slice(0, 8)} إلى ${orderStatusText(updatedOrder.status)}.`);
    } catch (updateError: unknown) {
      setError(extractApiError(updateError));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openOrderDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedOrder(null);
    setDetailsLoading(true);
    setDetailsError('');

    try {
      const order = await ordersApi.getOne(orderId);
      setSelectedOrder(order);
      setUpdatedOrdersById((current) => ({
        ...current,
        [order.id]: order,
      }));
    } catch (detailsFetchError: unknown) {
      setDetailsError(extractApiError(detailsFetchError));
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeOrderDetails = () => {
    setSelectedOrderId(null);
    setSelectedOrder(null);
    setDetailsError('');
  };

  return (
    <div className="moheet-page-container" style={{ padding: '0 20px', marginTop: '20px' }}>
      <div className="dashboard-section" style={{ margin: 0 }}>
        <h2 style={{color: '#0f1111'}}>{title}</h2>
        <hr style={{margin: '10px 0', border: '1px solid #ddd'}}/>
        {message && (
          <div style={{ marginBottom: '12px', color: '#1b5e20', fontWeight: 600 }}>{message}</div>
        )}
        {error && (
          <div style={{ marginBottom: '12px', color: '#c62828', fontWeight: 600 }}>{error}</div>
        )}
        <table className="dashboard-table">
          <thead><tr><th>رقم الطلب</th><th>الحالة</th><th>الإجمالي</th><th>الدفع</th></tr></thead>
          <tbody>
            {displayedOrders.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>لا توجد طلبات مسجلة حالياً.</td></tr>
            ) : (
              displayedOrders.map((order) => (
                <Fragment key={order.id}>
                  <tr>
                    <td>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <span>{order.id.slice(0, 8)}</span>
                        {canManageStatus && (
                          <button
                            type="button"
                            onClick={() => openOrderDetails(order.id)}
                            style={{
                              width: 'fit-content',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              background: selectedOrderId === order.id ? '#e2e8f0' : '#fff',
                              color: '#0f172a',
                              cursor: 'pointer',
                              padding: '5px 8px',
                              fontSize: '12px',
                            }}
                          >
                            عرض التفاصيل
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="status-pill">{orderStatusLabels[order.status]}</span>
                      {canManageStatus && (
                        <OrderStatusManager
                          order={order}
                          draft={drafts[order.id] ?? emptyOrderStatusDraft()}
                          updating={updatingOrderId === order.id}
                          onDraftChange={(changes) => updateDraft(order.id, changes)}
                          onSubmit={() => handleStatusUpdate(order)}
                        />
                      )}
                      {canManageStatus && <OrderStatusHistoryPreview order={order} />}
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#B12704' }}>{money(order.totalAmount)}</td>
                    <td>{order.paymentStatus}</td>
                  </tr>
                  {canManageStatus && selectedOrderId === order.id && (
                    <tr>
                      <td colSpan={4} style={{ padding: 0, background: '#f8fafc' }}>
                        <OrderDetailsPanel
                          order={selectedOrder}
                          loading={detailsLoading}
                          error={detailsError}
                          onClose={closeOrderDetails}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderStatusManager({
  order,
  draft,
  updating,
  onDraftChange,
  onSubmit,
}: {
  order: Order;
  draft: OrderStatusDraft;
  updating: boolean;
  onDraftChange: (changes: Partial<OrderStatusDraft>) => void;
  onSubmit: () => void;
}) {
  const allowedStatuses = orderStatusTransitions[order.status];
  const selectedStatus = draft.status;
  const needsShippingDetails = selectedStatus === 'SHIPPED';

  if (allowedStatuses.length === 0) {
    return (
      <div style={{ marginTop: '8px', color: '#64748b', fontSize: '12px' }}>
        لا توجد انتقالات متاحة
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '8px', marginTop: '10px', maxWidth: '260px' }}>
      <select
        value={selectedStatus}
        onChange={(event) => onDraftChange({ status: event.target.value as OrderStatus | '' })}
        disabled={updating}
        style={{ minHeight: '32px' }}
      >
        <option value="">اختر الحالة التالية</option>
        {allowedStatuses.map((status) => (
          <option key={status} value={status}>
            {orderStatusLabels[status]}
          </option>
        ))}
      </select>

      {needsShippingDetails && (
        <>
          <input
            value={draft.shippingCarrier}
            onChange={(event) => onDraftChange({ shippingCarrier: event.target.value })}
            placeholder="شركة الشحن"
            disabled={updating}
            style={{ minHeight: '32px' }}
          />
          <input
            value={draft.trackingNumber}
            onChange={(event) => onDraftChange({ trackingNumber: event.target.value })}
            placeholder="رقم التتبع"
            disabled={updating}
            style={{ minHeight: '32px' }}
          />
        </>
      )}

      <input
        value={draft.note}
        onChange={(event) => onDraftChange({ note: event.target.value })}
        placeholder="ملاحظة اختيارية"
        disabled={updating}
        style={{ minHeight: '32px' }}
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={updating || !selectedStatus}
        style={{
          minHeight: '32px',
          background: updating || !selectedStatus ? '#94a3b8' : '#0f1111',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: updating || !selectedStatus ? 'not-allowed' : 'pointer',
        }}
      >
        {updating ? 'جارٍ التحديث...' : 'تحديث الحالة'}
      </button>
    </div>
  );
}

function OrderStatusHistoryPreview({ order }: { order: Order }) {
  const history = order.statusHistory ?? [];

  if (history.length === 0) return null;

  const latest = history[history.length - 1];

  return (
    <div style={{ marginTop: '8px', color: '#475569', fontSize: '12px', lineHeight: 1.5 }}>
      <div>
        آخر تغيير: {orderStatusText(latest.fromStatus)} -&gt; {orderStatusText(latest.toStatus)}
      </div>
      <div>بواسطة: {latest.changedByRole ?? 'SYSTEM'}</div>
      {latest.note && <div>ملاحظة: {latest.note}</div>}
    </div>
  );
}

function OrderDetailsPanel({
  order,
  loading,
  error,
  onClose,
}: {
  order: Order | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  const items = order?.items ?? [];
  const history = order?.statusHistory ?? [];
  const address = order?.shippingAddress;
  const payments = order?.payments ?? [];
  const shipments = order?.shipments ?? [];
  const fallbackShipment =
    order?.shippingCarrier || order?.trackingNumber
      ? {
          carrierName: order.shippingCarrier ?? '',
          trackingNumber: order.trackingNumber ?? '',
          status: order.status,
        }
      : null;

  return (
    <section
      dir="rtl"
      style={{
        marginTop: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '16px',
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>تفاصيل الطلب</h3>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            padding: '6px 10px',
          }}
        >
          إغلاق
        </button>
      </div>

      {loading && <p style={{ color: '#64748b' }}>جاري تحميل تفاصيل الطلب...</p>}
      {error && <p style={{ color: '#c62828', fontWeight: 600 }}>تعذر تحميل التفاصيل: {error}</p>}
      {!loading && !error && !order && (
        <p style={{ color: '#64748b' }}>لا توجد تفاصيل متاحة لهذا الطلب.</p>
      )}

      {order && (
        <div style={{ display: 'grid', gap: '18px', marginTop: '14px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <DetailField label="رقم الطلب" value={order.id} />
            <DetailField label="الحالة الحالية" value={orderStatusText(order.status)} />
            <DetailField label="حالة الدفع" value={order.paymentStatus} />
            <DetailField label="طريقة الدفع" value={order.paymentMethod} />
            <DetailField label="الإجمالي" value={money(order.totalAmount)} />
            <DetailField label="المجموع الفرعي" value={money(order.subtotal)} />
            <DetailField label="رسوم الشحن" value={money(order.shippingFee)} />
            <DetailField label="الخصم" value={money(order.discountAmount)} />
            <DetailField label="تاريخ الإنشاء" value={formatDateTime(order.createdAt)} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
            }}
          >
            <section style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
              <h4 style={{ marginTop: 0 }}>بيانات العميل</h4>
              <DetailField label="الاسم" value={textOrEmpty(order.customer?.fullName)} />
              <DetailField label="البريد" value={textOrEmpty(order.customer?.email)} />
              <DetailField label="الهاتف" value={textOrEmpty(order.customer?.phone)} />
            </section>

            <section style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
              <h4 style={{ marginTop: 0 }}>عنوان الشحن</h4>
              {address ? (
                <>
                  <DetailField label="المستلم" value={textOrEmpty(address.fullName)} />
                  <DetailField label="الهاتف" value={textOrEmpty(address.phone)} />
                  <DetailField label="المدينة" value={textOrEmpty(address.city)} />
                  <DetailField label="العنوان" value={textOrEmpty(address.fullAddress)} />
                  <DetailField label="الدولة" value={textOrEmpty(address.country)} />
                  <DetailField
                    label="الإحداثيات"
                    value={
                      address.latitude !== undefined || address.longitude !== undefined
                        ? `${textOrEmpty(address.latitude)}, ${textOrEmpty(address.longitude)}`
                        : 'غير متوفر'
                    }
                  />
                </>
              ) : (
                <p style={{ color: '#64748b' }}>لا توجد بيانات شحن</p>
              )}
            </section>
          </div>

          <section>
            <h4>عناصر الطلب</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر وقت الشراء</th>
                    <th>الإجمالي</th>
                    <th>التاجر</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                        لا توجد عناصر في الطلب
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td>{textOrEmpty(item.productName)}</td>
                        <td>{item.quantity}</td>
                        <td>{money(getOrderItemUnitPrice(item))}</td>
                        <td>{money(item.totalPrice)}</td>
                        <td>{textOrEmpty(item.vendorId)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h4>تاريخ الحالات</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>من</th>
                    <th>إلى</th>
                    <th>بواسطة</th>
                    <th>ملاحظة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                        لا يوجد سجل حالات بعد
                      </td>
                    </tr>
                  ) : (
                    history.map((entry) => (
                      <tr key={entry.id}>
                        <td>{orderStatusText(entry.fromStatus)}</td>
                        <td>{orderStatusText(entry.toStatus)}</td>
                        <td>{textOrEmpty(entry.changedByRole)}</td>
                        <td>{textOrEmpty(entry.note)}</td>
                        <td>{formatDateTime(entry.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
            }}
          >
            <section style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
              <h4 style={{ marginTop: 0 }}>الدفع</h4>
              <DetailField label="حالة الدفع" value={order.paymentStatus} />
              <DetailField label="طريقة الدفع" value={order.paymentMethod} />
              {payments.length === 0 ? (
                <p style={{ color: '#64748b' }}>لا توجد سجلات دفع منفصلة</p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} style={{ borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '10px' }}>
                    <DetailField label="الحالة" value={payment.status} />
                    <DetailField label="المبلغ" value={money(payment.amount)} />
                    <DetailField label="المزود" value={textOrEmpty(payment.provider)} />
                    <DetailField label="المرجع" value={textOrEmpty(payment.providerReference)} />
                  </div>
                ))
              )}
            </section>

            <section style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
              <h4 style={{ marginTop: 0 }}>الشحن</h4>
              {shipments.length === 0 && !fallbackShipment ? (
                <p style={{ color: '#64748b' }}>لا توجد بيانات شحن</p>
              ) : (
                <>
                  {fallbackShipment && (
                    <div>
                      <DetailField label="شركة الشحن" value={textOrEmpty(fallbackShipment.carrierName)} />
                      <DetailField label="رقم التتبع" value={textOrEmpty(fallbackShipment.trackingNumber)} />
                      <DetailField label="الحالة" value={orderStatusText(fallbackShipment.status as OrderStatus)} />
                    </div>
                  )}
                  {shipments.map((shipment) => (
                    <div key={shipment.id} style={{ borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '10px' }}>
                      <DetailField label="شركة الشحن" value={shipment.carrierName} />
                      <DetailField label="رقم التتبع" value={shipment.trackingNumber} />
                      <DetailField label="حالة الشحنة" value={shipment.status} />
                      <DetailField label="الوجهة" value={textOrEmpty(shipment.destination)} />
                    </div>
                  ))}
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailField({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'grid', gap: '3px', marginBottom: '8px' }}>
      <span style={{ color: '#64748b', fontSize: '12px' }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  );
}

function AnalyticsPanel({
  analytics,
  loading,
  error,
  selectedRange,
  onRangeChange,
}: {
  analytics: AnalyticsSummary | null;
  loading: boolean;
  error: string;
  selectedRange: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
}) {
  const totals = analytics?.totals;
  const eventCounts = analytics?.eventCounts;
  const recommendationMetrics = analytics?.recommendationMetrics;
  const dataQuality = analytics?.dataQuality;
  const removalCount = eventCounts?.remove_from_favorites
    ? eventCounts.remove_from_favorites
    : eventCounts?.remove_from_cart ?? 0;
  const removalLabel = eventCounts?.remove_from_favorites
    ? 'إزالة من المفضلة'
    : 'إزالة من السلة';
  const cards = [
    { label: 'مشاهدات المنتجات', value: totals?.product_view ?? 0 },
    { label: 'إضافة للسلة', value: totals?.add_to_cart ?? 0 },
    { label: 'بدء الدفع', value: totals?.checkout_started ?? 0 },
    { label: 'المشتريات', value: totals?.purchase ?? 0 },
    { label: 'ظهور التوصيات', value: recommendationMetrics?.impressions ?? 0 },
    { label: 'نقرات التوصيات', value: recommendationMetrics?.clicks ?? 0 },
    { label: 'CTR التوصيات', value: percent(recommendationMetrics?.ctr) },
    { label: removalLabel, value: removalCount },
  ];

  return (
    <section className="dashboard-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>تحليلات المتجر</h2>
          <p style={{ color: '#64748b', margin: 0 }}>
            جداول المنتجات تعتمد على إشارات تراكمية لكل الوقت.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {analyticsRangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onRangeChange(option.value)}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                background: selectedRange === option.value ? '#232f3e' : '#fff',
                color: selectedRange === option.value ? '#fff' : '#0f1111',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {loading && <p style={{ color: '#64748b' }}>جاري تحميل التحليلات...</p>}
      {error && <p style={{ color: '#c62828' }}>تعذر تحميل التحليلات: {error}</p>}

      <div className="dashboard-grid" style={{ padding: 0 }}>
        {cards.map((card) => (
          <div className="dashboard-card" key={card.label}>
            <h3>{card.label}</h3>
            <div className="price">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid" style={{ padding: 0, marginTop: '20px' }}>
        <div className="dashboard-card">
          <h3>إجمالي الأحداث في الفترة</h3>
          <div className="price">{dataQuality?.totalEventsInRange ?? 0}</div>
        </div>
        <div className="dashboard-card">
          <h3>أحداث ناقصة productId</h3>
          <div className="price">{dataQuality?.eventsWithoutProductId ?? 0}</div>
        </div>
        <div className="dashboard-card">
          <h3>عمليات بحث فارغة</h3>
          <div className="price">{dataQuality?.emptySearchQueries ?? 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <TopProductsTable
          title="أكثر المنتجات مشاهدة"
          products={analytics?.topViewedProducts ?? []}
        />
        <TopProductsTable
          title="أكثر المنتجات إضافة للسلة"
          products={analytics?.topCartProducts ?? []}
        />
        <TopProductsTable
          title="أكثر المنتجات شراءً"
          products={analytics?.topPurchasedProducts ?? []}
        />
        <TopSearchesTable searches={analytics?.topSearches ?? []} />
      </div>

      <table className="dashboard-table">
        <thead>
          <tr>
            <th>مرحلة المسار</th>
            <th>العدد</th>
            <th>من المشاهدات</th>
            <th>من الخطوة السابقة</th>
          </tr>
        </thead>
        <tbody>
          {!analytics?.funnel.length ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                لا توجد بيانات كافية بعد
              </td>
            </tr>
          ) : (
            analytics.funnel.map((step) => (
              <tr key={step.event}>
                <td>{step.label}</td>
                <td>{step.count}</td>
                <td>{percent(step.rateFromViews)}</td>
                <td>{percent(step.rateFromPrevious)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function TopProductsTable({
  title,
  products,
}: {
  title: string;
  products: AnalyticsProductMetric[];
}) {
  return (
    <div>
      <h3 style={{ color: '#0f1111', marginBottom: 0 }}>{title}</h3>
      <table className="dashboard-table">
        <tbody>
          {products.length === 0 ? (
            <tr><td style={{ color: '#64748b' }}>لا توجد بيانات كافية بعد</td></tr>
          ) : (
            products.map((product) => (
              <tr key={product.productId}>
                <td>{product.name}</td>
                <td style={{ fontWeight: 'bold' }}>{product.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TopSearchesTable({
  searches,
}: {
  searches: AnalyticsSummary['topSearches'];
}) {
  return (
    <div>
      <h3 style={{ color: '#0f1111', marginBottom: 0 }}>أكثر كلمات البحث استخدامًا</h3>
      <table className="dashboard-table">
        <tbody>
          {searches.length === 0 ? (
            <tr><td style={{ color: '#64748b' }}>لا توجد بيانات كافية بعد</td></tr>
          ) : (
            searches.map((search) => (
              <tr key={search.query}>
                <td>{search.query}</td>
                <td style={{ fontWeight: 'bold' }}>{search.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// AccountPage moved to StorePages.tsx
