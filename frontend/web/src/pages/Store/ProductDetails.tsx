import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsApi } from '../../api/products.api';
import { commerceApi } from '../../api/commerce.api';
import { reviewsApi } from '../../api/reviews.api';
import { ordersApi } from '../../api/orders.api';
import { trackingApi } from '../../api/tracking.api';
import { recommendationsApi } from '../../api/recommendations.api';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { extractApiError, logError, resolveImageUrl } from '../../utils/extractApiError';
import type { Product } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '../../components/Layout/PageTransition';
import { Share2, PackagePlus } from 'lucide-react';
import { StockAlertButton } from './AdvancedFeatures';
import { ProductDetailsSkeleton } from '../../components/Skeleton/Skeleton';
import './StorePages.css';

interface PriceDisplayProps {
  price?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({ price, className = "product-price", style }) => {
  const priceParts = price?.toString().split('.') || ['0', '00'];
  return (
    <div className={className} style={style}>
      <span className="price-symbol">ر.ي</span>
      <span className="price-whole">{priceParts[0]}</span>
      <span className="price-fraction">{priceParts[1] || '00'}</span>
    </div>
  );
};

interface ProductReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user?: {
    fullName?: string;
  };
}

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const globalAddToCart = useCartStore((state) => state.addToCart);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  
  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewEligibilityChecked, setReviewEligibilityChecked] = useState(false);

  useEffect(() => {
    if (id) {
      productsApi.getOne(id)
        .then((res) => {
          setReviewOrderId(null);
          setReviewEligibilityChecked(false);
          setQuantity(1);
          setProduct(res);
          setSelectedImage(res.thumbnailUrl || (res.images && res.images.length > 0 ? res.images[0].imageUrl : null));
          trackingApi.track('product_view', {
            productId: res.id,
            categoryId: res.category?.id,
            metadata: {
              price: res.price,
              stockQuantity: res.stockQuantity,
            },
          });
          recommendationsApi.similar(res.id, 4)
            .then((items) => setRelatedProducts(items.filter((item) => item.id !== res.id).slice(0, 3)))
            .catch(() => setRelatedProducts([]));
        })
        .catch(() => setMessage('حدث خطأ أثناء جلب تفاصيل المنتج'))
        .finally(() => setLoading(false));

      reviewsApi.getByProduct(id)
        .then((res) => setReviews(res.data || []))
        .catch((error) => {
          logError('ProductDetails.reviews', error);
          // فشل جلب المراجعات لا يمنع عرض المنتج
        });

      if (isAuthenticated) {
        ordersApi.getMy(1, 50)
          .then((res) => {
            const eligibleOrder = res.data.find((order) =>
              order.status === 'DELIVERED' &&
              order.items?.some((item) => item.productId === id),
            );
            setReviewOrderId(eligibleOrder?.id ?? null);
          })
          .catch((error) => {
            logError('ProductDetails.reviewEligibility', error);
            setReviewOrderId(null);
          })
          .finally(() => setReviewEligibilityChecked(true));
      }
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (relatedProducts.length > 0 && product) {
      relatedProducts.forEach((item, index) => {
        trackingApi.track('recommendation_impression', {
          productId: item.id,
          metadata: {
            source: 'similar',
            position: index,
            page: 'product_details',
            railTitle: 'يُشترى معاً عادةً',
          },
        });
      });
    }
  }, [relatedProducts, product]);

  const submitReview = async () => {
    if (!id || !newReviewText.trim()) return;
    if (!reviewOrderId) {
      setMessage('يمكن إضافة المراجعة فقط بعد استلام طلب يحتوي على هذا المنتج.');
      return;
    }
    try {
      await reviewsApi.create({ productId: id, orderId: reviewOrderId, rating: newReviewRating, comment: newReviewText });
      setMessage('تم إرسال مراجعتك بنجاح');
      setNewReviewText('');
      const updatedReviews = await reviewsApi.getByProduct(id);
      setReviews(updatedReviews.data || []);
    } catch (error) {
      logError('ProductDetails.submitReview', error);
      setMessage(extractApiError(error));
    }
  };

  const addToCart = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      setMessage('يجب تسجيل الدخول لإضافة منتجات للسلة');
      return;
    }
    try {
      await globalAddToCart(product.id, quantity);
      setMessage(`تمت إضافة ${quantity > 1 ? quantity + ' قطع' : 'المنتج'} للسلة بنجاح`);
    } catch (error) {
      logError('ProductDetails.addToCart', error);
      setMessage(extractApiError(error));
    }
  };

  const buyNow = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await globalAddToCart(product.id, quantity);
      navigate('/store/checkout');
    } catch (error) {
      logError('ProductDetails.buyNow', error);
      setMessage(extractApiError(error));
    }
  };

  const addBundleToCart = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      setMessage('يجب تسجيل الدخول لإضافة منتجات للسلة');
      return;
    }
    try {
      await Promise.all([
        globalAddToCart(product.id, 1),
        ...relatedProducts.map((item) => globalAddToCart(item.id, 1)),
      ]);
      setMessage('تمت إضافة الحزمة إلى السلة');
    } catch (error) {
      logError('ProductDetails.addBundle', error);
      setMessage(extractApiError(error));
    }
  };

  const addFavorite = async () => {
    if (!product) return;
    try {
      await commerceApi.favorites.add(product.id);
      trackingApi.track('add_to_favorites', {
        productId: product.id,
        categoryId: product.category?.id,
      });
      setMessage('تم حفظ المنتج في المفضلة');
    } catch (error) {
      logError('ProductDetails.addFavorite', error);
      setMessage(extractApiError(error));
    }
  };

  const inviteFriend = () => {
    navigator.clipboard.writeText(`شاهد هذا المنتج الرائع على محيط! ${window.location.href}`);
    setMessage('تم نسخ رابط المنتج');
  };

  if (loading) {
    return (
      <PageTransition>
        <ProductDetailsSkeleton />
      </PageTransition>
    );
  }

  if (!product) {
    return (
      <div className="commerce-shell">
        <div className="moheet-page-container" style={{ textAlign: 'center', padding: '50px' }}>
          <h2>المنتج غير موجود</h2>
          <button onClick={() => navigate('/store')} className="add-to-cart-btn" style={{ width: '200px', marginTop: '20px' }}>
            العودة للمتجر
          </button>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;
  const roundedRating = Math.round(averageRating);

  return (
    <PageTransition>
    <div className="commerce-shell" style={{ backgroundColor: '#fff' }}>
      
      {/* Breadcrumb Area */}
      <div className="moheet-breadcrumb">
        الرئيسية › {product.category?.name || 'المنتجات'} › {product.name}
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: '#dff0d8', color: '#3c763d', padding: '10px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center' }}>
          {message}
        </motion.div>
      )}
      
      <div className="moheet-page-container">
        <div className="product-details-layout">
          
          {/* Images Section */}
          <div className="product-details-images">
            <div className="thumbnails-column">
              {product.thumbnailUrl && (
                <motion.img 
                  whileHover={{ scale: 1.1 }}
                  src={resolveImageUrl(product.thumbnailUrl)} 
                  alt="thumbnail" 
                  className={`thumb-img ${selectedImage === product.thumbnailUrl ? 'active' : ''}`}
                  onClick={() => setSelectedImage(product.thumbnailUrl!)}
                />
              )}
              {product.images?.map((img) => (
                <motion.img 
                  key={img.id}
                  whileHover={{ scale: 1.1 }}
                  src={resolveImageUrl(img.imageUrl)} 
                  alt={img.altText || 'صورة المنتج'} 
                  className={`thumb-img ${selectedImage === img.imageUrl ? 'active' : ''}`}
                  onClick={() => setSelectedImage(img.imageUrl)}
                />
              ))}
            </div>
            <div className="main-image-container">
              <AnimatePresence mode="wait">
                {selectedImage ? (
                  <motion.img 
                    key={selectedImage}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    src={resolveImageUrl(selectedImage)} alt={product.name} className="main-product-img" 
                  />
                ) : (
                  <div className="product-image-placeholder" style={{ height: '400px' }}>لا توجد صورة</div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Info Section */}
          <div className="product-details-info">
            <h1 className="details-title">{product.name}</h1>
            {reviews.length > 0 && (
              <div className="product-rating details-rating">
                <span className="stars">
                  {'★'.repeat(roundedRating)}
                  {'☆'.repeat(5 - roundedRating)}
                </span>
                <span className="rating-count">{averageRating.toFixed(1)} من 5 ({reviews.length} تقييم)</span>
              </div>
            )}
            
            <hr style={{margin: '10px 0', border: '1px solid #eee'}}/>
            
            <div className="details-price-section">
              <PriceDisplay price={product.price} />
              <p style={{ color: '#565959', fontSize: '14px' }}>الأسعار تشمل ضريبة القيمة المضافة.</p>
            </div>

            <hr style={{margin: '10px 0', border: '1px solid #eee'}}/>
            
            <div className="details-description">
              <h3>عن هذه السلعة:</h3>
              <p>{product.description || 'لا يوجد وصف متاح لهذا المنتج.'}</p>
            </div>
          </div>

          {/* Action Box Section */}
          <div className="product-details-action-box">
            <PriceDisplay price={product.price} style={{ marginBottom: '15px' }} />
            
            <div className="product-shipping" style={{ fontSize: '15px', color: '#007185' }}>
              يتم تحديد التوصيل عند إتمام الطلب
            </div>
            <div style={{ marginTop: '10px', color: product.stockQuantity > 0 ? '#007600' : '#B91C1C', fontSize: '18px', fontWeight: 'bold' }}>
              {product.stockQuantity > 0 ? `متوفر — ${product.stockQuantity} في المخزون` : 'غير متوفر'}
            </div>

            {/* Quantity Selector */}
            {product.stockQuantity > 0 && (
              <div className="qty-selector" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '0' }}>
                <label style={{ fontSize: '14px', color: '#565959', marginLeft: '10px', whiteSpace: 'nowrap' }}>الكمية:</label>
                <button
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="تقليل الكمية"
                >
                  −
                </button>
                <input
                  type="number"
                  className="qty-input"
                  min={1}
                  max={product.stockQuantity}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setQuantity(Math.max(1, Math.min(val, product.stockQuantity)));
                  }}
                />
                <button
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                  disabled={quantity >= product.stockQuantity}
                  aria-label="زيادة الكمية"
                >
                  +
                </button>
              </div>
            )}
            
            <div className="action-box-buttons" style={{ marginTop: '20px' }}>
              <button className="add-to-cart-btn" onClick={addToCart} disabled={!product.isActive || product.stockQuantity === 0} style={{ padding: '10px', fontSize: '15px' }}>
                أضف إلى عربة التسوق
              </button>
              <button className="buy-now-btn" onClick={buyNow} disabled={!product.isActive || product.stockQuantity === 0}>
                شراء الآن
              </button>
              <button className="add-to-favorite-btn" onClick={addFavorite} style={{ padding: '8px', marginTop: '10px' }}>
                إضافة للمفضلة
              </button>
            </div>

            {/* Stock Alert for out-of-stock products */}
            <StockAlertButton
              productId={product.id}
              productName={product.name}
              inStock={product.stockQuantity > 0}
            />

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#565959' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>التوصيل</span>
                <span style={{ color: '#0f1111' }}>حسب عنوان الطلب</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>يباع بواسطة</span>
                <span style={{ color: '#0f1111' }}>{product.vendor?.fullName || 'محيط'}</span>
              </div>
            </div>

            <hr style={{margin: '15px 0', border: '1px solid #eee'}}/>
            
            {/* Social Commerce Button */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={inviteFriend}
              style={{ background: 'var(--color-innovation)', padding: '15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#000', fontWeight: 'bold', justifyContent: 'center' }}
            >
              <Share2 size={18} />
              مشاركة رابط المنتج
            </motion.div>
          </div>
        </div>
        
        {/* Smart Bundling (التجميع الذكي) */}
        {relatedProducts.length > 0 && (
        <div style={{ marginTop: '40px', padding: '24px', background: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackagePlus size={22} style={{ color: 'var(--color-accent)' }} /> يُشترى معاً عادةً
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {product.thumbnailUrl ? (
              <img src={resolveImageUrl(product.thumbnailUrl)} alt={product.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
            ) : (
              <div className="product-image-placeholder" style={{ width: '80px', height: '80px' }}>لا صورة</div>
            )}
            {relatedProducts.map((item) => (
              <React.Fragment key={item.id}>
                <span style={{ fontSize: '24px', color: '#64748b' }}>+</span>
                {item.thumbnailUrl ? (
                  <img src={resolveImageUrl(item.thumbnailUrl)} alt={item.name} title={item.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                ) : (
                  <div className="product-image-placeholder" style={{ width: '80px', height: '80px' }}>{item.name}</div>
                )}
              </React.Fragment>
            ))}
            
            <div style={{ marginRight: 'auto', textAlign: 'left' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>إجمالي الحزمة</div>
              <div style={{ color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '20px' }}>
                {[product, ...relatedProducts].reduce((sum, item) => sum + Number(item.price ?? 0), 0).toLocaleString()} ر.ي
              </div>
              <button onClick={addBundleToCart} style={{ background: 'var(--color-accent)', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                إضافة الحزمة للسلة
              </button>
            </div>
          </div>
        </div>
        )}

        
        {/* Customer Reviews Section */}
        <div className="product-reviews-section" style={{ marginTop: '40px' }}>
          <h2 className="reviews-header">مراجعات العملاء</h2>
          
          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p style={{ color: '#565959' }}>لا توجد مراجعات حتى الآن. كن أول من يقيّم هذا المنتج!</p>
            ) : (
              reviews.map((rev, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={rev.id} 
                  className="review-card"
                >
                  <div className="review-author">
                    <div className="review-author-avatar">{rev.user?.fullName?.charAt(0) || 'U'}</div>
                    <span className="review-author-name">{rev.user?.fullName || 'مستخدم محيط'}</span>
                  </div>
                  <div className="review-rating">
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </div>
                  <div className="review-date">تمت المراجعة في {new Date(rev.createdAt).toLocaleDateString('ar-EG')}</div>
                  
                  <div className="review-text">{rev.comment}</div>
                </motion.div>
              ))
            )}
          </div>

          {isAuthenticated ? (
            <div className="add-review-box">
              <h3>أضف مراجعة</h3>
              <div className="star-rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star} 
                    className={star <= newReviewRating ? 'selected' : ''}
                    onClick={() => setNewReviewRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
              <textarea 
                className="review-textarea" 
                placeholder="شاركنا رأيك في المنتج..."
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
              />
              {!reviewOrderId && reviewEligibilityChecked && (
                <p style={{ color: '#64748b', marginBottom: '10px' }}>
                  يمكن إضافة المراجعة بعد استلام طلب يحتوي على هذا المنتج.
                </p>
              )}
              <button className="review-submit-btn" onClick={submitReview} disabled={!reviewOrderId || !reviewEligibilityChecked}>
                إرسال المراجعة
              </button>
            </div>
          ) : (
            <div className="add-review-box" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '10px' }}>يجب تسجيل الدخول لإضافة مراجعة.</p>
              <button className="review-submit-btn" onClick={() => navigate('/login')}>
                تسجيل الدخول
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
    </PageTransition>
  );
};
