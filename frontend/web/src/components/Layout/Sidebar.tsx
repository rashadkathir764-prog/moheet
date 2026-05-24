import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import {
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Store,
  Tags,
  Users,
} from 'lucide-react';
import './Layout.css';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const isVendor = user?.role === 'VENDOR';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-link active' : 'nav-link';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon-small">M</span>
          <h2>مُحِيط</h2>
        </div>
        <div className="sidebar-badge">
          {isAdmin ? 'المدير' : isVendor ? 'تاجر' : 'عميل'}
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {!isVendor && !isAdmin && (
            <>
              <li><NavLink to="/store" className={navClass}><Store size={20} /><span>تصفح المتجر</span></NavLink></li>
            </>
          )}

          {isVendor && (
            <>
              <li><NavLink to="/vendor/dashboard" className={navClass}><LayoutDashboard size={20} /><span>لوحة التاجر</span></NavLink></li>
              <li><NavLink to="/vendor/products" className={navClass}><Package size={20} /><span>منتجاتي</span></NavLink></li>
              <li><NavLink to="/vendor/orders" className={navClass}><ShoppingCart size={20} /><span>طلبات منتجاتي</span></NavLink></li>
            </>
          )}

          {isAdmin && (
            <>
              <li><NavLink to="/admin/dashboard" className={navClass}><LayoutDashboard size={20} /><span>لوحة الإدارة</span></NavLink></li>
              <li><NavLink to="/admin/products" className={navClass}><Package size={20} /><span>المنتجات</span></NavLink></li>
              <li><NavLink to="/admin/orders" className={navClass}><ShoppingCart size={20} /><span>الطلبات</span></NavLink></li>
              <li><NavLink to="/admin/categories" className={navClass}><Tags size={20} /><span>التصنيفات</span></NavLink></li>
              <li><NavLink to="/admin/users" className={navClass}><Users size={20} /><span>المستخدمون</span></NavLink></li>
            </>
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};
