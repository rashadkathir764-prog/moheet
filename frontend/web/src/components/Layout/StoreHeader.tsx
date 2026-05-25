import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { categoriesApi } from '../../api/categories.api';
import { commerceApi } from '../../api/commerce.api';
import { logError } from '../../utils/extractApiError';
import type { Category } from '../../types';
import { Search, MapPin, ShoppingCart, Menu, Heart, LogOut, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { LocationModal } from './LocationModal';
import './StoreLayout.css';

const SEARCH_PLACEHOLDERS = [
  "البحث في مُحِيط.eg...",
  "ابحث عن 'لابتوب جيمنج يشغل ألعاب ثقيلة' ✨",
  "ابحث عن 'هدايا ذكية لعيد الأم' ✨",
  "ابحث عن 'سماعة عزل صوت للدراسة' ✨",
];

export const StoreHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { cartCount, fetchCart } = useCartStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [semanticPlaceholder, setSemanticPlaceholder] = useState(SEARCH_PLACEHOLDERS[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [deliveryCity, setDeliveryCity] = useState(() => {
    return localStorage.getItem('moheet_delivery_city') || 'القاهرة';
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'CUSTOMER') {
      commerceApi.addresses.all()
        .then((addrs) => {
          const defaultAddr = addrs?.find((a: { isDefault: boolean; city: string }) => a.isDefault);
          if (defaultAddr) {
            setDeliveryCity(defaultAddr.city);
            localStorage.setItem('moheet_delivery_city', defaultAddr.city);
          }
        })
        .catch((error) => {
          logError('StoreHeader.addresses', error);
        });
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % SEARCH_PLACEHOLDERS.length;
      setSemanticPlaceholder(SEARCH_PLACEHOLDERS[currentIndex]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'CUSTOMER') {
      fetchCart();
    }
    categoriesApi.getAll().then((res) => setCategories(res || [])).catch((error) => {
      logError('StoreHeader.categories', error);
    });
  }, [isAuthenticated, fetchCart, user?.role]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchText) params.set('q', searchText);
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
    navigate(`/store?${params.toString()}`);
  };

  return (
    <div className="store-header-container">
      <div className="store-header-top">
        <Link to="/store" style={{ textDecoration: 'none' }}>
          <motion.div whileHover={{ scale: 1.05 }} className="store-logo">
            <span>مُحِيط</span>
            <span className="domain">.eg</span>
          </motion.div>
        </Link>
        
        <div className="store-location" onClick={() => setIsLocationModalOpen(true)}>
          <MapPin size={18} className="loc-icon" />
          <div className="store-location-text">
            <span>التوصيل إلى {deliveryCity}</span>
            <span>تحديث الموقع</span>
          </div>
        </div>

        <div className="store-search-bar">
          <select 
            className="store-search-category" 
            value={selectedCategoryId} 
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="">الكل</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <input 
              type="text" 
              className="store-search-input" 
              placeholder={semanticPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {!searchText && (
              <Sparkles 
                size={16} 
                style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--color-accent)' }} 
              />
            )}
          </div>
          <button className="store-search-btn" onClick={handleSearch}>
            <Search size={20} />
          </button>
        </div>

        <div className="store-header-actions">
          <Link to={isAuthenticated ? "/store/account" : "/login"} style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ scale: 1.05 }} className="store-nav-item">
              <span className="nav-line-1">مرحباً {user ? user.fullName?.split(' ')[0] : 'تسجيل الدخول'}</span>
              <span className="nav-line-2">الحساب والقوائم ▼</span>
            </motion.div>
          </Link>
          
          <Link to="/store/orders" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ scale: 1.05 }} className="store-nav-item">
              <span className="nav-line-1">المرتجعات</span>
              <span className="nav-line-2">والطلبات</span>
            </motion.div>
          </Link>

          <Link to="/store/favorites" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ scale: 1.05 }} className="store-nav-item">
              <span className="nav-line-1">قائمة</span>
              <span className="nav-line-2"><Heart size={16} style={{marginLeft: 4}} /> المفضلة</span>
            </motion.div>
          </Link>

          {isAuthenticated && (
            <motion.div whileHover={{ scale: 1.05 }} className="store-nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
              <span className="nav-line-1">تسجيل</span>
              <span className="nav-line-2"><LogOut size={16} style={{marginLeft: 4}} /> الخروج</span>
            </motion.div>
          )}

          <Link to="/store/cart" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="store-cart-item">
              <ShoppingCart size={28} />
              <motion.span 
                key={cartCount}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="store-cart-count"
              >
                {cartCount}
              </motion.span>
              <span className="nav-line-2" style={{ marginBottom: 4 }}>عربة التسوق</span>
            </motion.div>
          </Link>
        </div>
      </div>
      
      <div className="store-header-bottom">
        <div className="store-bottom-nav-item">
          <Menu size={20} />
          <span>الكل</span>
        </div>
        <Link to="/store" className="store-bottom-nav-item">عروض اليوم</Link>
        {categories.slice(0, 5).map(cat => (
          <Link key={cat.id} to={`/store?categoryId=${cat.id}`} className="store-bottom-nav-item">
            {cat.name}
          </Link>
        ))}
      </div>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={setDeliveryCity}
        currentLocation={deliveryCity}
      />
    </div>
  );
};
