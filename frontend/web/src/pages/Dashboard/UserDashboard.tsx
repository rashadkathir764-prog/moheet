import React from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Heart, MapPin, CreditCard, 
  Settings, LogOut, Package, Clock, ShieldCheck, LayoutDashboard
} from 'lucide-react';
import { PageTransition } from '../../components/Layout/PageTransition';

export const UserDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/store');
  };

  const statCards = [
    { title: 'طلباتي', value: '12', icon: <Package size={24} />, color: '#3B82F6', link: '/store/orders' },
    { title: 'المفضلة', value: '5', icon: <Heart size={24} />, color: '#EF4444', link: '/store/favorites' },
    { title: 'العناوين', value: '2', icon: <MapPin size={24} />, color: '#10B981', link: '/store/account' },
    { title: 'الرصيد', value: '0 ر.ي', icon: <CreditCard size={24} />, color: '#F59E0B', link: '/store/account' },
  ];

  const recentOrders = [
    { id: 'ORD-98231', date: '2026-05-20', status: 'في الطريق', total: '15,000 ر.ي' },
    { id: 'ORD-97542', date: '2026-05-15', status: 'مكتمل', total: '42,500 ر.ي' },
    { id: 'ORD-96321', date: '2026-05-10', status: 'مكتمل', total: '8,000 ر.ي' },
  ];

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', color: 'var(--color-text-primary)', fontFamily: 'Cairo, sans-serif' }}>
        
        {/* Top Navbar */}
        <div style={{ background: '#FFFFFF', padding: '16px 40px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--color-primary-dark)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: '20px' }}>مُ</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>لوحة تحكم العميل</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => navigate('/store')} style={{ background: 'transparent', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-text-primary)', fontFamily: 'inherit' }}>
              الذهاب للمتجر
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{user?.fullName || 'مستخدم'}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{user?.email}</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'var(--color-accent)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '40px 20px', gap: '30px' }}>
          
          {/* Sidebar */}
          <div style={{ width: '280px', background: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border)', height: 'fit-content' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'الرئيسية', icon: <LayoutDashboard size={20} />, active: true },
                { label: 'طلباتي', icon: <ShoppingBag size={20} /> },
                { label: 'المفضلة', icon: <Heart size={20} /> },
                { label: 'عناويني', icon: <MapPin size={20} /> },
                { label: 'طرق الدفع', icon: <CreditCard size={20} /> },
                { label: 'خزنة الضمان', icon: <ShieldCheck size={20} /> },
                { label: 'الإعدادات', icon: <Settings size={20} /> },
              ].map((item, idx) => (
                <li key={idx}>
                  <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: 'none', background: item.active ? 'rgba(255, 138, 0, 0.1)' : 'transparent', color: item.active ? 'var(--color-accent)' : 'var(--color-text-primary)', cursor: 'pointer', fontSize: '15px', fontWeight: item.active ? 'bold' : 'normal', textAlign: 'right', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                    {item.icon} {item.label}
                  </button>
                </li>
              ))}
              <div style={{ height: '1px', background: 'var(--color-border)', margin: '16px 0' }} />
              <li>
                <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: 'none', background: '#FEE2E2', color: '#EF4444', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', textAlign: 'right', fontFamily: 'inherit' }}>
                  <LogOut size={20} /> تسجيل الخروج
                </button>
              </li>
            </ul>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Welcome Banner */}
            <div style={{ background: 'var(--color-primary-dark)', borderRadius: '16px', padding: '30px', color: '#FFF', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', top: '-100px', left: '-100px' }} />
              <h1 style={{ fontSize: '28px', margin: '0 0 10px', fontWeight: '800', zIndex: 1, position: 'relative' }}>مرحباً بك، {user?.fullName}! 👋</h1>
              <p style={{ margin: 0, fontSize: '15px', color: '#CBD5E1', zIndex: 1, position: 'relative' }}>إليك نظرة سريعة على حسابك ونشاطاتك الأخيرة في المتجر.</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              {statCards.map((stat, i) => (
                <motion.div whileHover={{ y: -5 }} key={i} style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer' }} onClick={() => navigate(stat.link)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {stat.icon}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-text-primary)' }}>{stat.value}</div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{stat.title}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Orders */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-primary)' }}>أحدث الطلبات</h3>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => navigate('/store/orders')}>عرض الكل</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentOrders.map((order, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--color-border)', borderRadius: '12px', background: '#F8FAFC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                        <Package size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{order.id}</div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <Clock size={12} /> {order.date}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{order.total}</div>
                      <div style={{ fontSize: '12px', color: order.status === 'مكتمل' ? '#10B981' : '#F59E0B', background: order.status === 'مكتمل' ? '#D1FAE5' : '#FEF3C7', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block' }}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
};


