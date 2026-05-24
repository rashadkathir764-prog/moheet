import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { commerceApi } from '../../api/commerce.api';
import { trackingApi } from '../../api/tracking.api';
import { PageTransition } from '../../components/Layout/PageTransition';
import { extractApiError, logError, resolveImageUrl } from '../../utils/extractApiError';
import type { Product } from '../../types';
import { GiftModePanel } from './AdvancedFeatures';
import { CartSkeleton } from '../../components/Skeleton/Skeleton';
import './StorePages.css';

const money = (value?: number) => `${Number(value ?? 0).toFixed(2)} ر.ي`;

interface CartItem {
  id: string;
  quantity: number;
  product?: Pick<Product, 'id' | 'name' | 'price' | 'thumbnailUrl'>;
}

interface CartSummary {
  items?: CartItem[];
}

export function CartPage() {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const load = () =>
    commerceApi.cart
      .get()
      .then(setCart)
      .catch((error) => {
        logError('CartPage.load', error);
        setMessage(extractApiError(error));
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  const items = useMemo(() => cart?.items ?? [], [cart]);
  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity, 0),
    [items],
  );
  const moveToFavorites = async (item: CartItem) => {
    if (!item.product?.id) {
      setMessage('تعذر حفظ هذا المنتج في المفضلة');
      return;
    }

    try {
      await commerceApi.favorites.add(item.product.id);
      await commerceApi.cart.remove(item.id);
      trackingApi.track('add_to_favorites', { productId: item.product.id });
      trackingApi.track('remove_from_cart', {
        productId: item.product.id,
        metadata: { itemId: item.id, quantity: item.quantity, reason: 'move_to_favorites' },
      });
      await load();
      setMessage('تم نقل المنتج إلى المفضلة');
    } catch {
      setMessage('تعذر نقل المنتج إلى المفضلة');
    }
  };

  const clearCart = async () => {
    if (!window.confirm('هل تريد تفريغ السلة بالكامل؟')) return;
    try {
      await commerceApi.cart.clear();
      trackingApi.track('clear_cart', {
        metadata: { itemCount: items.length },
      });
      await load();
    } catch (error) {
      logError('CartPage.clear', error);
      setMessage(extractApiError(error));
    }
  };

  const updateQuantity = async (item: CartItem, quantity: number) => {
    try {
      await commerceApi.cart.update(item.id, quantity);
      trackingApi.track('update_cart', {
        productId: item.product?.id,
        metadata: { itemId: item.id, previousQuantity: item.quantity, quantity },
      });
      await load();
    } catch (error) {
      logError('CartPage.update', error);
      setMessage(extractApiError(error));
    }
  };

  const removeItem = async (item: CartItem) => {
    try {
      await commerceApi.cart.remove(item.id);
      trackingApi.track('remove_from_cart', {
        productId: item.product?.id,
        metadata: { itemId: item.id, quantity: item.quantity },
      });
      await load();
    } catch (error) {
      logError('CartPage.remove', error);
      setMessage(extractApiError(error));
    }
  };

  const goToCheckout = () => {
    trackingApi.track('checkout_started', {
      metadata: { itemCount: items.length, subtotal: total },
    });
    navigate('/store/checkout');
  };

  return (
    <PageTransition>
      <div className="commerce-shell">
        <div className="moheet-page-container cart-page-container">
          <div className="cart-main">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
              <h1 style={{ color: 'var(--color-text-primary)' }}>سلة المشتريات</h1>
              <p style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => void clearCart()}>
                تفريغ السلة من المنتجات
              </p>
            </div>
            {message && <div style={{ color: 'var(--color-accent)', marginBottom: '15px', fontWeight: 'bold' }}>{message}</div>}

            {loading ? (
              <CartSkeleton count={3} />
            ) : items.length === 0 ? (
              <div style={{ padding: '20px' }}>عربة التسوق الخاصة بك فارغة.</div>
            ) : (
              <div className="cart-items-list">
                {items.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div className="cart-item-image">
                      {item.product?.thumbnailUrl ? (
                        <img src={resolveImageUrl(item.product.thumbnailUrl)} alt={item.product.name} />
                      ) : (
                        <div className="product-image-placeholder" style={{ height: 100 }}>لا صورة</div>
                      )}
                    </div>
                    <div className="cart-item-info">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Link to={`/store/product/${item.product?.id}`} className="cart-item-title">
                          {item.product?.name}
                        </Link>
                        <span className="cart-item-price">{money(Number(item.product?.price ?? 0))}</span>
                      </div>
                      <div className="cart-item-shipping">يتم تأكيد الشحن عند إتمام الطلب</div>

                      <div className="cart-item-actions">
                        <select
                          className="cart-qty-select"
                          value={item.quantity}
                          onChange={(event) => void updateQuantity(item, Number(event.target.value))}
                        >
                          {[...Array(10)].map((_, index) => (
                            <option key={index + 1} value={index + 1}>الكمية: {index + 1}</option>
                          ))}
                        </select>
                        <div className="cart-action-divider">|</div>
                        <span
                          className="cart-action-link"
                          onClick={() => void removeItem(item)}
                        >حذف</span>
                        <div className="cart-action-divider">|</div>
                        <span className="cart-action-link" onClick={() => void moveToFavorites(item)}>نقل إلى المفضلة</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="cart-subtotal-bottom">
                المجموع الفرعي ({items.length} سلعة): <strong>{money(total)}</strong>
              </div>
            )}
          </div>

          <div className="cart-sidebar">
            <div className="cart-subtotal-box">
              <div style={{ color: '#007600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '20px' }}>✓</span>
                <span>راجع العنوان وخيارات الشحن قبل تأكيد الطلب.</span>
              </div>
              <div className="subtotal-text" style={{ fontSize: '18px', marginBottom: '20px' }}>
                المجموع الفرعي ({items.length} سلعة): <strong>{money(total)}</strong>
              </div>
              <button
                className="primary cart-checkout-btn"
                onClick={goToCheckout}
                disabled={items.length === 0}
              >
                المتابعة لإتمام عملية الشراء
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setGiftOpen(true)}
                style={{ width: '100%', background: 'linear-gradient(135deg, rgba(255,119,143,0.15), rgba(255,77,109,0.1))', border: '1px solid rgba(255,119,143,0.4)', color: '#FF758F', borderRadius: '12px', padding: '13px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
              >
                هذه هدية؟ فعل وضع الإهداء
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      <GiftModePanel isOpen={giftOpen} onClose={() => setGiftOpen(false)} />
    </PageTransition>
  );
}
