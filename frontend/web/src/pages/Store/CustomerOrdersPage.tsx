import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, MapPin, Truck } from 'lucide-react';
import { ordersApi } from '../../api/orders.api';
import { PageTransition } from '../../components/Layout/PageTransition';
import type { Order } from '../../types';
import { SelfReturnModal } from './AdvancedFeatures';
import './StorePages.css';

const money = (value?: number) => `${Number(value ?? 0).toFixed(2)} ر.ي`;

export function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);

  useEffect(() => {
    ordersApi.getMy().then((response) => setOrders(response.data));
  }, []);

  return (
    <PageTransition>
      <OrdersTable title="طلباتي" orders={orders} onReturnRequest={(id) => setReturnOrderId(id)} />
      <SelfReturnModal
        orderId={returnOrderId || ''}
        isOpen={!!returnOrderId}
        onClose={() => setReturnOrderId(null)}
      />
    </PageTransition>
  );
}

function OrdersTable({
  title,
  orders,
  onReturnRequest,
}: {
  title: string;
  orders: Order[];
  onReturnRequest?: (id: string) => void;
}) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  return (
    <div className="moheet-page-container" style={{ background: '#FFFFFF', color: 'var(--color-text-primary)', padding: '30px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
      <h2 style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      <hr style={{ margin: '10px 0 20px', border: '1px solid var(--color-border)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {orders.length === 0 ? <p style={{ color: 'var(--color-text-secondary)' }}>لا توجد طلبات</p> : orders.map((order) => (
          <div key={order.id} style={{ background: '#F8FAFC', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', cursor: 'pointer', alignItems: 'center' }}
              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
            >
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>رقم الطلب</span>
                <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>#{order.id.slice(0, 8)}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>الإجمالي</span>
                <div style={{ fontWeight: 'bold', color: 'var(--color-accent)', fontSize: '16px' }}>{money(order.totalAmount)}</div>
              </div>
              <span className="status-pill" style={{ background: 'var(--color-innovation)', color: '#FFF', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{order.status}</span>
            </div>

            <AnimatePresence>
              {expandedOrder === order.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ background: '#FFFFFF', padding: '24px', borderTop: '1px solid var(--color-border)' }}
                >
                  <h4 style={{ marginBottom: '20px', color: 'var(--color-text-primary)' }}>التتبع اللحظي للشحنة</h4>
                  <div style={{ position: 'relative', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.05) 0%, transparent 70%)', zIndex: 0 }} />
                    <div style={{ position: 'absolute', left: '40px', right: '40px', height: '4px', background: '#E2E8F0', zIndex: 1, borderRadius: '2px' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '60%' }}
                        transition={{ duration: 2, ease: 'easeOut' }}
                        style={{ height: '100%', background: 'var(--color-accent)', borderRadius: '2px' }}
                      />
                    </div>
                    <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={16} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#888' }}>المخزن</span>
                    </div>
                    <motion.div
                      initial={{ left: '40px' }}
                      animate={{ left: '60%' }}
                      transition={{ duration: 2, ease: 'easeOut' }}
                      style={{ zIndex: 3, position: 'absolute', top: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                      <div style={{ background: '#fff', color: '#000', padding: '5px', borderRadius: '50%', boxShadow: '0 0 15px var(--color-accent)' }}>
                        <Truck size={18} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '5px', fontWeight: 'bold' }}>في الطريق</span>
                    </motion.div>
                    <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#333', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={16} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#888' }}>الوجهة</span>
                    </div>
                  </div>
                  {onReturnRequest && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onReturnRequest(order.id)}
                      style={{ marginTop: '20px', width: '100%', background: 'rgba(255, 77, 109, 0.1)', border: '1px solid rgba(255, 77, 109, 0.3)', color: '#FF4D6D', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}
                    >
                      طلب استرجاع بالصورة
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
