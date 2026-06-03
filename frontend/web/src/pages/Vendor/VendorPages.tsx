import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { productsApi } from '../../api/products.api';
import { ordersApi } from '../../api/orders.api';
import type { VendorOrderItemRow } from '../../api/orders.api';
import { categoriesApi } from '../../api/categories.api';
import { commerceApi } from '../../api/commerce.api';
import type { Category, CreateProductPayload, Product } from '../../types';
import { PageTransition } from '../../components/Layout/PageTransition';
import { AppDialog, type AppDialogProps } from '../../components/ui/AppDialog';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, MapPin } from 'lucide-react';
import { featureFlags } from '../../config/features';
import { extractApiError, resolveImageUrl } from '../../utils/extractApiError';
import './VendorPages.css';

type DialogState = Omit<AppDialogProps, 'isOpen'>;

// Store and Admin components moved to their respective files

interface VendorProfile {
  id: string;
  userId: string;
  storeName: string;
  status: string;
}

export function VendorDashboard() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [items, setItems] = useState<VendorOrderItemRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const closeDialog = () => setDialog(null);

  const location = useLocation();
  const currentPath = location.pathname;

  const isDashboard = currentPath.endsWith('dashboard') || currentPath === '/vendor' || currentPath === '/vendor/';
  const isProducts = currentPath.endsWith('products');
  const isOrders = currentPath.endsWith('orders');
  const [productForm, setProductForm] = useState<CreateProductPayload>({
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

  const load = () => {
    commerceApi.vendors.me().then(p => {
      setProfile(p);
      if (p?.userId) {
        productsApi.getAll({ vendorId: p.userId }).then(res => setProducts(res.data || []));
      }
    }).catch(() => setProfile(null));
    ordersApi.getVendorItems().then((res) => setItems(res.data ?? []));
    categoriesApi.getAll().then(setCategories);
  };
  useEffect(() => {
    load();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setMessage('خطأ: حجم الملف كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.');
      event.target.value = ''; // Reset input
      setSelectedFile(null);
      return;
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('خطأ: نوع الملف غير مدعوم. الأنواع المدعومة هي: JPEG, PNG, WEBP.');
      event.target.value = ''; // Reset input
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setMessage('');
  };

  const salesByProduct = Object.values(
    items.reduce<Record<string, { name: string; sales: number }>>((groups, row) => {
      const name = row.item?.productName || 'منتج غير مسمى';
      groups[name] = groups[name] ?? { name, sales: 0 };
      groups[name].sales += row.item?.quantity ?? 0;
      return groups;
    }, {}),
  ).slice(0, 8);

  const createProduct = async () => {
    if (!productForm.categoryId) {
      setMessage('خطأ: اختر القسم الذي ينتمي إليه المنتج');
      return;
    }
    if (!productForm.name.trim() || Number(productForm.price) <= 0) {
      setMessage('أدخل اسم المنتج وسعراً صحيحاً قبل الحفظ');
      return;
    }
    try {
      const newProduct = await productsApi.create({
        ...productForm,
        name: productForm.name.trim(),
        description: productForm.description?.trim() || undefined,
        brand: productForm.brand?.trim() || undefined,
        tags: productForm.tags?.map((tag) => tag.trim()).filter(Boolean),
        price: Number(productForm.price),
        stockQuantity: Number(productForm.stockQuantity),
        categoryId: productForm.categoryId,
      });

      if (selectedFile) {
        try {
          await productsApi.uploadImage(newProduct.id, selectedFile);
          setMessage('تم إنشاء المنتج ورفع الصورة بنجاح');
        } catch (uploadErr: unknown) {
          const errMsg = extractApiError(uploadErr);
          setMessage(`تم إنشاء المنتج بنجاح، ولكن فشل رفع الصورة: ${errMsg}`);
        }
      } else {
        setMessage('تم إنشاء المنتج بنجاح');
      }

      setProductForm({
        name: '',
        description: '',
        price: 0,
        stockQuantity: 0,
        categoryId: productForm.categoryId,
        brand: '',
        tags: [],
        isActive: true,
        isFeatured: false,
      });
      setSelectedFile(null);

      const fileInput = document.getElementById('product-image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      load();
    } catch (err: unknown) {
      const errMsg = extractApiError(err);
      setMessage(`خطأ: ${errMsg}`);
    }
  };

  const handleEditProduct = (prod: Product) => {
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
    // Scroll to form smoothly
    document.querySelector('.dashboard-product-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateProduct = async () => {
    if (!editingProductId) return;
    if (!productForm.categoryId) {
      setMessage('خطأ: اختر القسم الذي ينتمي إليه المنتج');
      return;
    }
    if (!productForm.name.trim() || Number(productForm.price) <= 0) {
      setMessage('أدخل اسم المنتج وسعراً صحيحاً قبل الحفظ');
      return;
    }
    try {
      await productsApi.update(editingProductId, {
        ...productForm,
        name: productForm.name.trim(),
        description: productForm.description?.trim() || undefined,
        brand: productForm.brand?.trim() || undefined,
        tags: productForm.tags?.map((tag) => tag.trim()).filter(Boolean),
        price: Number(productForm.price),
        stockQuantity: Number(productForm.stockQuantity),
        categoryId: productForm.categoryId,
      });

      if (selectedFile) {
        try {
          await productsApi.uploadImage(editingProductId, selectedFile);
          setMessage('تم تحديث المنتج ورفع الصورة بنجاح');
        } catch (uploadErr: unknown) {
          const errMsg = extractApiError(uploadErr);
          setMessage(`تم تحديث المنتج بنجاح، ولكن فشل رفع الصورة: ${errMsg}`);
        }
      } else {
        setMessage('تم تحديث المنتج بنجاح');
      }

      setEditingProductId(null);
      setProductForm({
        name: '',
        description: '',
        price: 0,
        stockQuantity: 0,
        categoryId: productForm.categoryId,
        brand: '',
        tags: [],
        isActive: true,
        isFeatured: false,
      });
      setSelectedFile(null);

      const fileInput = document.getElementById('product-image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      load();
    } catch (err: unknown) {
      const errMsg = extractApiError(err);
      setMessage(`خطأ: ${errMsg}`);
    }
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      description: '',
      price: 0,
      stockQuantity: 0,
      categoryId: categories[0]?.id || '',
      brand: '',
      tags: [],
      isActive: true,
      isFeatured: false,
    });
    setSelectedFile(null);
    const fileInput = document.getElementById('product-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
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
          setMessage('تم حذف المنتج بنجاح');
          load();
        } catch (err: unknown) {
          const errMsg = extractApiError(err);
          setMessage(`خطأ: ${errMsg}`);
        }
      },
    });
  };

  return (
    <PageTransition>
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <h1>
          {isProducts 
            ? 'إدارة منتجاتي' 
            : isOrders 
            ? 'طلبات منتجاتي' 
            : 'لوحة التاجر'} <span style={{ color: 'var(--color-accent)' }}>PRO</span>
        </h1>
        <p>
          {isProducts 
            ? 'أضف منتجات جديدة، وحدد أسعارها ومخزونها، وتابع حالتها.' 
            : isOrders 
            ? 'تتبع الطلبات الواردة لمنتجاتك وحالتها التشغيلية.' 
            : profile ? `مرحباً بك في متجرك الاحترافي: ${profile.storeName}` : 'ملف التاجر غير متاح'}
        </p>
        {profile && isDashboard && <span className="status-pill" style={{marginTop: '10px'}}>{profile.status}</span>}
      </section>

      <section className="dashboard-grid" style={{ marginBottom: '20px' }}>
        <div className="dashboard-card">
          <h3>إجمالي المنتجات النشطة</h3>
          <div className="price">{products.length}</div>
        </div>
        <div className="dashboard-card">
          <h3>طلبات العملاء (هذا الشهر)</h3>
          <div className="price">{items.length}</div>
        </div>
        
        {featureFlags.experimentalStoreFeatures && (
          <div className="dashboard-card ai-widget">
            <h3 className="dashboard-ai-title">
              <Sparkles size={18} style={{ color: 'var(--color-accent)' }} /> مساعد الذكاء الاصطناعي (محيط AI)
            </h3>
            <p className="dashboard-ai-copy">
              بناءً على تحليل السوق، نوصي بخفض سعر "سماعة الرأس اللاسلكية" بنسبة <strong>5%</strong> لزيادة المبيعات ومطابقة المنافسين.
            </p>
            <button className="dashboard-ai-action">
              <TrendingUp size={14} /> تطبيق التخفيض المقترح
            </button>
          </div>
        )}
      </section>

      {isDashboard && (
        <section className="dashboard-layout-row">
          {/* Recharts Analytics */}
          <div className="dashboard-panel">
            <h3 style={{ marginBottom: '15px' }}>أداء المنتجات (المبيعات)</h3>
            <ResponsiveContainer className="dashboard-chart-frame" width="100%" height={240}>
              <BarChart data={salesByProduct}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
                <YAxis stroke="var(--color-text-secondary)" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                <Bar dataKey="sales" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {featureFlags.experimentalStoreFeatures && (
            <div className="dashboard-panel dashboard-map">
              <h3 className="dashboard-map-title" style={{ marginBottom: '15px' }}>
                <MapPin size={18} style={{ color: 'var(--color-error)' }} /> الخريطة الحرارية للمبيعات
              </h3>
              <div className="dashboard-map-frame">
                <motion.div initial={{ scale: 0 }} animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 2, repeat: Infinity }} style={{ position: 'absolute', top: '30%', left: '40%', width: '20px', height: '20px', background: '#FF4D6D', borderRadius: '50%', filter: 'blur(5px)' }} />
                <motion.div initial={{ scale: 0 }} animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }} style={{ position: 'absolute', top: '60%', left: '70%', width: '30px', height: '30px', background: 'var(--color-help)', borderRadius: '50%', filter: 'blur(8px)' }} />
                <motion.div initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1], opacity: [0.9, 0, 0.9] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} style={{ position: 'absolute', top: '20%', left: '80%', width: '15px', height: '15px', background: '#1DB954', borderRadius: '50%', filter: 'blur(3px)' }} />
                <div className="dashboard-map-caption">صنعاء (التركيز الأعلى)</div>
              </div>
            </div>
          )}
        </section>
      )}

      {(isDashboard || isProducts || isOrders) && (
        <div className="dashboard-layout-row">
          {(isDashboard || isProducts) && (
            <section className="dashboard-section" style={{ flex: isProducts ? 1 : 2, minWidth: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ margin: 0 }}>إدارة المنتجات</h2>
              </div>
              {message && <p style={{ color: 'var(--color-accent)', marginBottom: '10px' }}>{message}</p>}
              <div className="dashboard-product-grid">
                <input
                  className="dashboard-input"
                  value={productForm.name}
                  onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="اسم المنتج"
                />
                <input
                  className="dashboard-input"
                  type="number"
                  min="0"
                  value={productForm.price || ''}
                  onChange={(event) => setProductForm((current) => ({ ...current, price: Number(event.target.value) }))}
                  placeholder="السعر (ر.ي)"
                />
                <input
                  className="dashboard-input"
                  type="number"
                  min="0"
                  value={productForm.stockQuantity || ''}
                  onChange={(event) => setProductForm((current) => ({ ...current, stockQuantity: Number(event.target.value) }))}
                  placeholder="المخزون"
                />
                <input
                  className="dashboard-input"
                  value={productForm.brand || ''}
                  onChange={(event) => setProductForm((current) => ({ ...current, brand: event.target.value }))}
                  placeholder="العلامة التجارية"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: '#c62828', fontWeight: 600 }}>القسم (تصنيف المنتج) *</label>
                  <select
                    className="dashboard-input"
                    value={productForm.categoryId}
                    onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}
                    style={{ border: productForm.categoryId ? undefined : '2px solid #c62828' }}
                  >
                    <option value="">-- اختر القسم --</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {!productForm.categoryId && (
                    <span style={{ fontSize: '11px', color: '#c62828' }}>اختر القسم الذي ينتمي إليه المنتج</span>
                  )}
                </div>
                <input
                  className="dashboard-input"
                  value={productForm.tags?.join(', ') || ''}
                  onChange={(event) => setProductForm((current) => ({
                    ...current,
                    tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
                  }))}
                  placeholder="وسوم المنتج مفصولة بفواصل"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <input
                    id="product-image-upload"
                    className="dashboard-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    style={{ padding: '8px' }}
                  />
                </div>
              </div>
              <textarea
                className="dashboard-input dashboard-textarea"
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="وصف المنتج الجذاب..."
                rows={3}
              />
              {editingProductId ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="save-btn" style={{ width: 'auto', margin: '0 0 15px', background: 'var(--color-accent)' }} onClick={updateProduct}>تحديث المنتج</button>
                  <button className="save-btn" style={{ width: 'auto', margin: '0 0 15px', background: '#e2e8f0', color: '#1e293b' }} onClick={cancelEdit}>إلغاء التعديل</button>
                </div>
              ) : (
                <button className="save-btn" style={{ width: 'auto', margin: '0 0 15px' }} onClick={createProduct}>إضافة المنتج للسوق</button>
              )}
              
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>الصورة</th>
                    <th>المنتج</th>
                    <th>السعر</th>
                    <th>القسم</th>
                    <th>المخزون</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={7} className="dashboard-note" style={{ textAlign: 'center' }}>لا توجد منتجات بعد.</td></tr>
                  ) : (
                    products.map((prod) => (
                      <tr key={prod.id}>
                        <td>
                          {prod.thumbnailUrl ? (
                            <img
                              src={resolveImageUrl(prod.thumbnailUrl)}
                              alt={prod.name}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          ) : (
                            <span className="dashboard-note" style={{ fontSize: '11px' }}>لا توجد صورة</span>
                          )}
                        </td>
                        <td>{prod.name}</td>
                        <td style={{ color: 'var(--color-accent)' }}>{prod.price} ر.ي</td>
                        <td>
                          <span style={{ background: '#e3f2fd', color: '#0d47a1', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
                            {prod.category?.name || '—'}
                          </span>
                        </td>
                        <td>{prod.stockQuantity}</td>
                        <td><span className="status-pill">{prod.isActive ? 'نشط' : 'غير نشط'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="dashboard-btn" onClick={() => handleEditProduct(prod)} style={{ background: '#ffa41c', color: '#000', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>تعديل</button>
                            <button className="dashboard-btn" onClick={() => handleDeleteProduct(prod.id)} style={{ background: '#d9534f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          )}

          {(isDashboard || isOrders) && (
            <section className="dashboard-section" style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={{ marginTop: 0 }}>الطلبات الواردة (Live)</h2>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>حالة الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={3} className="dashboard-note" style={{ textAlign: 'center' }}>لا توجد طلبات واردة بعد</td></tr>
                  ) : (
                    items.map((row) => (
                      <tr key={`${row.orderId}-${row.item?.id}`}>
                        <td>{row.item?.productName}</td><td>{row.item?.quantity}</td>
                        <td><span className="status-pill warning">{row.orderStatus}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>
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
