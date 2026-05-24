import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { StoreHeader } from './StoreHeader';
import { ShoppingCart, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HumanInterventionWidget } from '../../pages/Store/MoheetVisionFeatures';
import { featureFlags } from '../../config/features';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import './StoreLayout.css';
export const StoreLayout: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { isAuthenticated, user } = useAuthStore();
  const { cartCount, fetchCart } = useCartStore();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (isAuthenticated && user?.role === 'CUSTOMER') {
      fetchCart();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, fetchCart, user?.role]);


  const visibleCartCount = isAuthenticated ? cartCount : 0;

  return (
    <div className="store-layout-wrapper">
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            style={{ background: '#FF4D6D', color: '#fff', padding: '10px', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
          >
            <WifiOff size={18} />
            <span>أنت تتصفح في وضع الأوفلاين. يمكنك متابعة تصفح سلتك وسيتم مزامنتها لاحقاً.</span>
          </motion.div>
        )}
      </AnimatePresence>
      <StoreHeader />
      <main className="store-main-content" style={{ minHeight: 'calc(100vh - 350px)' }}>
        <Outlet />
      </main>
      <StoreFooter />

      {/* Sticky Cart (Floating Action Button) */}
      <Link to="/store/cart" className="sticky-cart-fab" style={{ bottom: '90px' }}>
        <ShoppingCart size={24} />
        {visibleCartCount > 0 && <span className="sticky-cart-badge">{visibleCartCount}</span>}
      </Link>

      {featureFlags.experimentalStoreFeatures && <HumanInterventionWidget />}
    </div>
  );
};

const StoreFooter: React.FC = () => {
  return (
    <footer className="moheet-footer">
      <div className="footer-back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        العودة للأعلى
      </div>
      <div className="footer-links-container">
        <div className="footer-column">
          <h3>اعرف المزيد عنا</h3>
          <ul>
            <li><Link to="/store">معلومات عن مُحِيط.eg</Link></li>
            <li><Link to="/store">وظائف</Link></li>
            <li><Link to="/store">مُحِيط ساينس</Link></li>
          </ul>
        </div>
        <div className="footer-column">
          <h3>تسوق معنا</h3>
          <ul>
            <li><Link to="/store/account">حسابك</Link></li>
            <li><Link to="/store/orders">طلباتك</Link></li>
            <li><Link to="/store/account">عناوينك</Link></li>
            <li><Link to="/store/favorites">القوائم الخاصة بك</Link></li>
          </ul>
        </div>
        <div className="footer-column">
          <h3>اكسب الأموال معنا</h3>
          <ul>
            <li><Link to="/vendor/dashboard">البيع على مُحِيط.eg</Link></li>
            <li><Link to="/vendor/products">حماية علامتك التجارية</Link></li>
            <li><Link to="/vendor/dashboard">كن شريكاً تابعاً</Link></li>
          </ul>
        </div>
        <div className="footer-column">
          <h3>دعنا نساعدك</h3>
          <ul>
            <li><Link to="/store/orders">مركز المساعدة</Link></li>
            <li><Link to="/store/orders">سياسات الشحن</Link></li>
            <li><Link to="/store/orders">المبالغ المستردة والعمليات</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="store-logo" style={{ marginBottom: '15px' }}>
          <span>مُحِيط</span>
          <span className="domain">.eg</span>
        </div>
        <p>جميع الحقوق محفوظة © 2026 لموقع مُحِيط</p>
      </div>
    </footer>
  );
};
