import { useEffect, useMemo, useState } from 'react';
import type { ProductSortBy } from '../../types';
import { useSearchParams } from 'react-router-dom';
import { productsApi } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';
import { commerceApi } from '../../api/commerce.api';
import { trackingApi } from '../../api/tracking.api';
import { recommendationsApi } from '../../api/recommendations.api';
import type { Category, Product } from '../../types';
import { extractApiError, logError } from '../../utils/extractApiError';
import { AnimatePresence, motion } from 'framer-motion';
import { PageTransition } from '../../components/Layout/PageTransition';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { MoheetWallet } from './AdvancedFeatures';
import { MysteryBoxWidget, FieldAgentsWidget } from './MoheetProFeatures';
import { PopularVoteWidget, OpenInnovationWidget } from './MoheetVisionFeatures';
import { featureFlags } from '../../config/features';
import { FlashDeals } from './components/FlashDeals';
import { PromoBlocks } from './components/PromoBlocks';
import { BentoCategories } from './components/BentoCategories';
import { ProductCard } from './components/ProductCard';
import { RecommendationRail } from './components/RecommendationRail';
import { ProductGridSkeleton } from '../../components/Skeleton/Skeleton';
import './StorePages.css';

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [baseProducts, setBaseProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [storeError, setStoreError] = useState('');
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [personalProducts, setPersonalProducts] = useState<Product[]>([]);
  const [brandFilter, setBrandFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [searchParams] = useSearchParams();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sortBy, setSortBy] = useState<ProductSortBy>('newest');
  const [walletOpen, setWalletOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const globalAddToCart = useCartStore((state) => state.addToCart);

  const slides = useMemo(() => [
    { bg: 'radial-gradient(circle at 80% 50%, var(--color-thrill) 0%, var(--color-background) 70%)', title: 'عروض مذهلة!', subtitle: 'اكتشف أفضل الخصومات على المنتجات الإلكترونية بأسعار لا تقبل المنافسة.' },
    { bg: 'radial-gradient(circle at 80% 50%, var(--color-innovation) 0%, var(--color-background) 70%)', title: 'الأجهزة المنزلية الذكية', subtitle: 'وفر حتى 30% على منتجات المنزل الذكي المختارة واجعل حياتك أسهل.' },
    { bg: 'radial-gradient(circle at 80% 50%, var(--color-giving) 0%, var(--color-background) 70%)', title: 'كل ما تحتاجه للعودة للمدارس', subtitle: 'خصومات كبرى على القرطاسية والحقائب، تسوق الآن قبل النفاذ.' }
  ], []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    categoriesApi.getAll()
      .then((res) => setCategories(res || []))
      .catch(() => setStoreError('تعذر تحميل التصنيفات الآن.'));
    productsApi.getAll({ limit: 50 })
      .then((res) => setBaseProducts(res.data || []))
      .catch(() => setStoreError('تعذر تحميل المنتجات المختارة الآن.'));
    recommendationsApi.trending(10)
      .then(setTrendingProducts)
      .catch(() => setTrendingProducts([]));
    recommendationsApi.forMe(10)
      .then(setPersonalProducts)
      .catch(() => setPersonalProducts([]));
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingProducts(true);
    setStoreError('');

    productsApi.getAll({
      limit: 50,
      q,
      categoryId,
      sortBy,
      brand: brandFilter || undefined,
      tag: tagFilter || undefined,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        setProducts(res.data || []);
        if (q && q.trim().length >= 2) {
          trackingApi.track('search', {
            searchQuery: q.trim(),
            categoryId,
            metadata: {
              sortBy,
              resultCount: res.data?.length ?? 0,
            },
          });
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setProducts([]);
        setStoreError('تعذر تحميل المنتجات. حاول مرة أخرى.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProducts(false);
      });
    return () => controller.abort();
  }, [searchParams, sortBy, brandFilter, tagFilter]);

  const addToCart = async (productId: string) => {
    if (!isAuthenticated) {
      setMessage('يجب تسجيل الدخول لإضافة منتجات للسلة');
      return;
    }
    try {
      await globalAddToCart(productId, 1);
      setMessage('تمت إضافة المنتج للسلة بنجاح');
    } catch (error) {
      logError('StorePages.addToCart', error);
      setMessage(extractApiError(error));
    }
  };

  const addFavorite = async (productId: string) => {
    if (!isAuthenticated) {
      setMessage('يجب تسجيل الدخول لحفظ المنتج في المفضلة');
      return;
    }
    try {
      await commerceApi.favorites.add(productId);
      trackingApi.track('add_to_favorites', { productId });
      setMessage('تم حفظ المنتج في المفضلة بنجاح');
    } catch (error) {
      logError('StorePages.addFavorite', error);
      setMessage(extractApiError(error));
    }
  };

  const availableBrands = useMemo(
    () => Array.from(new Set(baseProducts.map((product) => product.brand).filter(Boolean) as string[])).sort(),
    [baseProducts],
  );

  const availableTags = useMemo(
    () => Array.from(new Set(baseProducts.flatMap((product) => product.tags ?? []))).sort(),
    [baseProducts],
  );



  return (
    <PageTransition>
    <div className="commerce-shell">
      
      {/* 1. Dynamic Profile Welcome */}
      {user && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="dynamic-profile-welcome"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>مرحباً بعودتك، <span className="highlight-name">{user.fullName}</span>!</h2>
              <p>أعددنا لك اختيارات خصيصاً بناءً على اهتماماتك السابقة.</p>
            </div>
              {featureFlags.experimentalStoreFeatures && <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setWalletOpen(true)}
              style={{ background: '#FFF7ED', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
            >
              💰 محفظتي
            </motion.button>}
          </div>
        </motion.div>
      )}

      {/* 3. Bento Categories */}
      <BentoCategories categories={categories} />

      {/* 4. Hero Carousel */}
      <section className="hero-carousel" style={{ position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className={`hero-slide active`} 
            style={{ background: slides[currentSlide].bg }}
          >
            <div className="hero-gradient-orb" />
            <div className="hero-glass-overlay"></div>
            <div className="hero-content">
              <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                {slides[currentSlide].title}
              </motion.h2>
              <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                {slides[currentSlide].subtitle}
              </motion.p>
              <motion.button 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.6 }}
                className="hero-cta-btn"
                onClick={() => document.getElementById('main-store-grid')?.scrollIntoView({ behavior: 'smooth' })}
              >
                تسوق الآن
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
        <button className="hero-nav-btn hero-prev" onClick={() => setCurrentSlide(s => s === 0 ? slides.length - 1 : s - 1)}>‹</button>
        <button className="hero-nav-btn hero-next" onClick={() => setCurrentSlide(s => (s + 1) % slides.length)}>›</button>
        <div className="hero-fade-bottom"></div>
      </section>

      {featureFlags.experimentalStoreFeatures && (
        <MoheetWallet isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
      )}

      {message && <div className="commerce-section" style={{ maxWidth: '1400px', margin: '0 auto 20px', padding: '0 20px', color: '#1DB954' }}>{message}</div>}
      {storeError && <div className="commerce-section" role="alert" style={{ maxWidth: '1400px', margin: '0 auto 20px', padding: '0 20px', color: '#B91C1C' }}>{storeError}</div>}

      {/* 5. Flash Deals */}
      <FlashDeals products={baseProducts.slice(0, 10)} />

      <RecommendationRail
        title="مقترحة لك"
        products={personalProducts}
        onAddToCart={addToCart}
        onAddFavorite={addFavorite}
        trackingSource="for_you"
        trackingPage="store"
      />

      <RecommendationRail
        title="الأكثر رواجًا الآن"
        products={trendingProducts}
        onAddToCart={addToCart}
        onAddFavorite={addFavorite}
        trackingSource="trending"
        trackingPage="store"
      />

      {/* 6. Promo Blocks */}
      <PromoBlocks products={baseProducts.slice(10, 20)} />

      {/* 8. Main Content Area (Store Grid) */}
      <div className="store-main-content" id="main-store-grid">
        <div className="store-top-bar" style={{ padding: '0 20px', maxWidth: '1400px', margin: '0 auto 20px' }}>
          <span>عرض {products.length} نتيجة متوفرة</span>
          <div>
            <label style={{ marginLeft: '10px' }}>فرز حسب:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as ProductSortBy)}>
              <option value="newest">أحدث المنتجات</option>
              <option value="price_asc">السعر: من الأقل للأعلى</option>
              <option value="price_desc">السعر: من الأعلى للأقل</option>
              <option value="name_az">الاسم: أ → ي</option>
            </select>
          </div>
        </div>

        {(availableBrands.length > 0 || availableTags.length > 0) && (
          <div className="store-filter-bar">
            {availableBrands.length > 0 && (
              <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
                <option value="">كل العلامات</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            )}
            {availableTags.length > 0 && (
              <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option value="">كل الوسوم</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
            {(brandFilter || tagFilter) && (
              <button type="button" onClick={() => { setBrandFilter(''); setTagFilter(''); }}>
                مسح الفلاتر
              </button>
            )}
          </div>
        )}

        <section className="commerce-grid" style={{ padding: '0 20px', maxWidth: '1400px', margin: '0 auto' }}>
          {loadingProducts ? (
            <ProductGridSkeleton count={8} />
          ) : products.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                {searchParams.get('q')
                  ? `لا توجد منتجات مطابقة للبحث عن "${searchParams.get('q')}"`
                  : 'لا توجد منتجات متاحة حالياً'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                {searchParams.get('q') ? 'جرّب كلمة بحث مختلفة أو امسح البحث لعرض كل المنتجات.' : 'ارجع لاحقاً أو جرّب تصنيفاً مختلفاً.'}
              </div>
            </div>
          ) : (
            products.map((product, idx) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                index={idx} 
                onAddToCart={addToCart} 
                onAddFavorite={addFavorite} 
              />
            ))
          )}
        </section>
      </div>

      {featureFlags.experimentalStoreFeatures && (
      <>
      {/* 9. Moheet PRO Grid (Exclusive Features moved to bottom so it doesn't block the store) */}
      <div style={{ padding: '40px 20px 0', maxWidth: '1400px', margin: '40px auto 0', borderTop: '1px solid var(--color-border)' }}>
        <h3 style={{ color: 'var(--color-text-primary)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--color-accent)' }}>PRO</span> ميزات محيط الحصرية والذكية
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px' }}>اكتشف طرقاً جديدة ومبتكرة للتسوق والتفاعل معنا.</p>
      </div>
      
      <div className="pro-features-grid">
        <MysteryBoxWidget />
        <PopularVoteWidget />
        <OpenInnovationWidget />
        <FieldAgentsWidget />
        
        {/* Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <motion.a href="/store/auction" whileHover={{ y: -4 }} style={{ background: '#FFF3EB', border: '1px solid #FDBA74', borderRadius: '8px', padding: '24px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <span style={{ fontSize: '36px' }}>🔨</span>
            <div>
              <div style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '16px' }}>المزاد الصامت</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>24 ساعة من العروض السرية</div>
            </div>
          </motion.a>
          <motion.a href="/store/warranty" whileHover={{ y: -4 }} style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '8px', padding: '24px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <span style={{ fontSize: '36px' }}>🛡️</span>
            <div>
              <div style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '16px' }}>خزنة الضمان</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>جميع فواتيرك في مكان آمن</div>
            </div>
          </motion.a>
        </div>
      </div>
      </>
      )}

    </div>
    </PageTransition>
  );
}

