import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Grid, TrendingUp, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';
import './MobileBottomNav.css';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { cartCount } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const visibleCartCount = isAuthenticated ? cartCount : 0;

  const isActive = (path: string) => {
    if (path === '/store') return location.pathname === '/store';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="التنقل الرئيسي">
      <Link to="/store" className={`mobile-nav-item ${isActive('/store') ? 'active' : ''}`} id="mobile-nav-shop">
        <ShoppingBag size={22} className="mobile-nav-icon" />
        <span>تسوق</span>
      </Link>

      <Link to="/store?showCategories=1" className={`mobile-nav-item`} id="mobile-nav-category">
        <Grid size={22} className="mobile-nav-icon" />
        <span>الفئات</span>
      </Link>

      <Link to="/store?sortBy=newest" className={`mobile-nav-item`} id="mobile-nav-trends">
        <TrendingUp size={22} className="mobile-nav-icon" />
        <span>الرائج</span>
      </Link>

      <Link to="/store/cart" className={`mobile-nav-item ${isActive('/store/cart') ? 'active' : ''}`} id="mobile-nav-cart">
        <div className="mobile-nav-cart-wrapper">
          <ShoppingCart size={22} className="mobile-nav-icon" />
          {visibleCartCount > 0 && (
            <span className="mobile-nav-cart-badge">{visibleCartCount}</span>
          )}
        </div>
        <span>السلة</span>
      </Link>

      <Link
        to={isAuthenticated ? '/store/account' : '/login'}
        className={`mobile-nav-item ${isActive('/store/account') || isActive('/login') ? 'active' : ''}`}
        id="mobile-nav-me"
      >
        <User size={22} className="mobile-nav-icon" />
        <span>حسابي</span>
      </Link>
    </nav>
  );
};
