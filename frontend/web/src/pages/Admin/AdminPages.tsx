import { useEffect, useState } from 'react';
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
} from '../../types';
import { PageTransition } from '../../components/Layout/PageTransition';
import { extractApiError } from '../../utils/extractApiError';
import './AdminPages.css';

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
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

interface OrderStatusDraft {
  status: OrderStatus | '';
  shippingCarrier: string;
  trackingNumber: string;
}

const emptyOrderStatusDraft = (): OrderStatusDraft => ({
  status: '',
  shippingCarrier: '',
  trackingNumber: '',
});

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

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج؟')) return;
    try {
      await productsApi.softDelete(id);
      // Reload products list
      productsApi.getAll({ limit: 100 }).then((res) => setProducts(res.data || []));
    } catch (err: unknown) {
      alert('فشل الحذف: ' + extractApiError(err));
    }
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
      productsApi.getAll({ limit: 100 }).then((res) => setProducts(res.data || []));
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
          <h2>قائمة المنتجات المتاحة بالسوق ({products.length})</h2>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>اسم المنتج</th>
                <th>الفئة</th>
                <th>السعر</th>
                <th>المخزون المتوفر</th>
                <th>حالة التفعيل</th>
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
                    <td>{product.category?.name || 'عام'}</td>
                    <td style={{ color: '#B12704', fontWeight: 'bold' }}>{money(product.price)}</td>
                    <td>{product.stockQuantity}</td>
                    <td>
                      <span className="status-pill" style={{ background: product.isActive ? '#e2fbe8' : '#fbe2e2', color: product.isActive ? '#1b5e20' : '#c62828' }}>
                        {product.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleDeleteProduct(product.id)} style={{ background: '#d9534f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>حذف</button>
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
      ...(draft.status === 'SHIPPED' && {
        shippingCarrier: draft.shippingCarrier.trim(),
        trackingNumber: draft.trackingNumber.trim(),
      }),
    };

    try {
      setUpdatingOrderId(order.id);
      const updatedOrder = await ordersApi.updateStatus(order.id, payload);

      setUpdatedOrdersById((current) => ({
        ...current,
        [updatedOrder.id]: updatedOrder,
      }));
      setDrafts((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      setMessage(`تم تحديث حالة الطلب ${order.id.slice(0, 8)} إلى ${updatedOrder.status}.`);
    } catch (updateError: unknown) {
      setError(extractApiError(updateError));
    } finally {
      setUpdatingOrderId(null);
    }
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
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}</td>
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
                  </td>
                  <td style={{ fontWeight: 'bold', color: '#B12704' }}>{money(order.totalAmount)}</td>
                  <td>{order.paymentStatus}</td>
                </tr>
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
