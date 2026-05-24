import { Link } from 'react-router-dom';
import { PageTransition } from '../../components/Layout/PageTransition';
import './StorePages.css';

export function AccountPage() {
  return (
    <PageTransition>
      <div className="commerce-shell">
        <div className="moheet-page-container">
          <div className="account-page-header">
            <h1>حسابك</h1>
          </div>
          <div className="account-cards-grid">
            <Link to="/store/orders" className="account-card">
              <div className="account-card-icon">
                <span style={{ fontSize: '40px' }}>📦</span>
              </div>
              <div className="account-card-content">
                <h2>طلباتك</h2>
                <p>تتبع الطلبات، إرجاع المنتجات، أو شراء السلع مجددا</p>
              </div>
            </Link>

            <Link to="/store/account" className="account-card">
              <div className="account-card-icon">
                <span style={{ fontSize: '40px' }}>🛡️</span>
              </div>
              <div className="account-card-content">
                <h2>تسجيل الدخول والأمان</h2>
                <p>تعديل اسمك وبريدك الإلكتروني ورقم هاتفك</p>
              </div>
            </Link>

            <Link to="/store/account" className="account-card">
              <div className="account-card-icon">
                <span style={{ fontSize: '40px' }}>📍</span>
              </div>
              <div className="account-card-content">
                <h2>عناوينك</h2>
                <p>تعديل العناوين الخاصة بالطلبات والهدايا</p>
              </div>
            </Link>

            <Link to="/store/account" className="account-card">
              <div className="account-card-icon">
                <span style={{ fontSize: '40px' }}>💳</span>
              </div>
              <div className="account-card-content">
                <h2>مدفوعاتك</h2>
                <p>إدارة طرق الدفع والإعدادات</p>
              </div>
            </Link>

            <Link to="/store/account" className="account-card">
              <div className="account-card-icon">
                <span style={{ fontSize: '40px' }}>📞</span>
              </div>
              <div className="account-card-content">
                <h2>تواصل معنا</h2>
                <p>طرق المساعدة المتنوعة لخدمة العملاء</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
