import { Link, useNavigate } from 'react-router-dom';
import { PageTransition } from '../../components/Layout/PageTransition';
import { useAuthStore } from '../../store/auth.store';
import { LogOut } from 'lucide-react';
import './StorePages.css';
import './AccountPage.css';

export function AccountPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <PageTransition>
      <div className="commerce-shell">
        <div className="account-page-container">
          <div className="account-page-header">
            <h1>حسابك</h1>
            {user?.fullName && <p>مرحباً بك، {user.fullName}</p>}
          </div>
          
          <div className="account-cards-grid">
            <Link to="/store/orders" className="account-card">
              <div className="account-card-icon">
                <span>📦</span>
              </div>
              <div className="account-card-content">
                <h2>طلباتك</h2>
                <p>تتبع الطلبات، إرجاع المنتجات، أو شراء السلع مجددا</p>
              </div>
            </Link>

            <Link to="/store/account" className="account-card">
              <div className="account-card-icon">
                <span>🛡️</span>
              </div>
              <div className="account-card-content">
                <h2>تسجيل الدخول والأمان</h2>
                <p>تعديل اسمك وبريدك الإلكتروني ورقم هاتفك</p>
              </div>
            </Link>

            <Link to="/store/account" className="account-card">
              <div className="account-card-icon">
                <span>📍</span>
              </div>
              <div className="account-card-content">
                <h2>عناوينك</h2>
                <p>تعديل العناوين الخاصة بالطلبات والهدايا</p>
              </div>
            </Link>

            <Link to="/store/account" className="account-card">
              <div className="account-card-icon">
                <span>💳</span>
              </div>
              <div className="account-card-content">
                <h2>مدفوعاتك</h2>
                <p>إدارة طرق الدفع والإعدادات</p>
              </div>
            </Link>

            <Link to="/store/account" className="account-card">
              <div className="account-card-icon">
                <span>📞</span>
              </div>
              <div className="account-card-content">
                <h2>تواصل معنا</h2>
                <p>طرق المساعدة المتنوعة لخدمة العملاء</p>
              </div>
            </Link>
          </div>

          <button onClick={handleLogout} className="account-logout-btn">
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
