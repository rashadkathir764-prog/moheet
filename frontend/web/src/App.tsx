import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { authApi } from './api/auth.api';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { RoleGuard } from './components/guards/RoleGuard';
import { Layout } from './components/Layout/Layout';
import { StoreLayout } from './components/Layout/StoreLayout';
import { useAuthStore } from './store/auth.store';
import { featureFlags } from './config/features';

const Login = lazy(() => import('./pages/Login/Login').then((module) => ({ default: module.Login })));
const Storefront = lazy(() => import('./pages/Store/StorePages').then((module) => ({ default: module.Storefront })));
const ProductDetailsPage = lazy(() => import('./pages/Store/ProductDetails').then((module) => ({ default: module.ProductDetailsPage })));
const CartPage = lazy(() => import('./pages/Store/CartPage').then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import('./pages/Store/CheckoutPage').then((module) => ({ default: module.CheckoutPage })));
const FavoritesPage = lazy(() => import('./pages/Store/FavoritesPage').then((module) => ({ default: module.FavoritesPage })));
const CustomerOrdersPage = lazy(() => import('./pages/Store/CustomerOrdersPage').then((module) => ({ default: module.CustomerOrdersPage })));
const AccountPage = lazy(() => import('./pages/Store/AccountPage').then((module) => ({ default: module.AccountPage })));
const SilentAuctionPage = lazy(() => import('./pages/Store/MoheetProFeatures').then((module) => ({ default: module.SilentAuctionPage })));
const DigitalWarrantyVault = lazy(() => import('./pages/Store/MoheetProFeatures').then((module) => ({ default: module.DigitalWarrantyVault })));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminPages').then((module) => ({ default: module.AdminDashboard })));
const VendorDashboard = lazy(() => import('./pages/Vendor/VendorPages').then((module) => ({ default: module.VendorDashboard })));
const UserDashboard = lazy(() => import('./pages/Dashboard/UserDashboard').then((module) => ({ default: module.UserDashboard })));

const AppLoading = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--color-background)',
    color: 'var(--color-text-primary)',
    fontSize: '18px',
    fontFamily: 'Cairo, sans-serif',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #FFA41C',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 16px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      جاري التحميل...
    </div>
  </div>
);

const LoginRedirect = ({ returnTo }: { returnTo?: string }) => (
  <Navigate
    to={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'}
    replace
  />
);

const App: React.FC = () => {
  const { token, isAuthenticated, logout, setToken } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      if (isAuthenticated) {
        try {
          if (!token) {
            const refreshedSession = await authApi.refresh();
            setToken(refreshedSession.accessToken);
          }
          await authApi.getMe();
        } catch {
          logout();
        }
      }
      setChecking(false);
    };
    void checkSession();
  }, [isAuthenticated, logout, setToken, token]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/login')) {
      document.title = 'تسجيل الدخول — MOHEET | محيط';
    } else if (path.startsWith('/admin')) {
      document.title = 'لوحة الإدارة — MOHEET | محيط';
    } else if (path.startsWith('/vendor')) {
      document.title = 'لوحة التاجر — MOHEET | محيط';
    } else if (path.startsWith('/store')) {
      document.title = 'متجر محيط | Moheet';
    } else {
      document.title = 'مُحِيط | MOHEET';
    }
  }, [location.pathname]);

  if (checking) {
    return <AppLoading />;
  }

  return (
    <Suspense fallback={<AppLoading />}>
      <Routes>
        <Route path="/" element={<Navigate to="/store" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<LoginRedirect />} />
        <Route path="/store/login" element={<LoginRedirect />} />
        <Route path="/store/checkout/login" element={<LoginRedirect returnTo="/store/checkout" />} />
        <Route path="/user/login" element={<LoginRedirect returnTo="/user/dashboard" />} />

        <Route element={<StoreLayout />}>
          <Route path="/store" element={<Storefront />} />
          <Route path="/store/product/:id" element={<ProductDetailsPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRoles={['CUSTOMER', 'ADMIN']} />}>
              <Route path="/store/cart" element={<CartPage />} />
              <Route path="/store/checkout" element={<CheckoutPage />} />
              <Route path="/store/favorites" element={<FavoritesPage />} />
              <Route path="/store/orders" element={<CustomerOrdersPage />} />
              <Route path="/store/account" element={<AccountPage />} />
              {featureFlags.experimentalStoreFeatures && (
                <Route path="/store/auction" element={<SilentAuctionPage />} />
              )}
              {featureFlags.experimentalStoreFeatures && (
                <Route
                  path="/store/warranty"
                  element={(
                    <div style={{ padding: '20px', minHeight: '80vh', background: 'var(--color-background)' }}>
                      <DigitalWarrantyVault />
                    </div>
                  )}
                />
              )}
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGuard allowedRoles={['CUSTOMER', 'ADMIN']} />}>
            <Route path="/user/dashboard" element={<UserDashboard />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/vendor" element={<RoleGuard allowedRoles={['VENDOR']} />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<VendorDashboard />} />
              <Route path="products" element={<VendorDashboard />} />
              <Route path="orders" element={<VendorDashboard />} />
            </Route>

            <Route path="/admin" element={<RoleGuard allowedRoles={['ADMIN']} />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="products" element={<AdminDashboard />} />
              <Route path="categories" element={<AdminDashboard />} />
              <Route path="orders" element={<AdminDashboard />} />
              <Route path="users" element={<AdminDashboard />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/store" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
