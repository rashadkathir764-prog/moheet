import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ordersApi } from '../../api/orders.api';
import { trackingApi } from '../../api/tracking.api';
import { PageTransition } from '../../components/Layout/PageTransition';
import { useCartStore } from '../../store/cart.store';
import { extractApiError, logError } from '../../utils/extractApiError';
import type { PaymentMethod } from '../../types';
import './StorePages.css';

export function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '' });
  const [shippingInfo, setShippingInfo] = useState({ city: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const clearCartCount = useCartStore((state) => state.clearCart);
  const navigate = useNavigate();

  const nextStep = () => setStep((currentStep) => Math.min(currentStep + 1, 3));
  const prevStep = () => setStep((currentStep) => Math.max(currentStep - 1, 1));
  const validateContact = () => {
    if (!contactInfo.name.trim() || !contactInfo.phone.trim()) {
      setIsError(true);
      setMessage('أدخل اسم المستلم ورقم الهاتف للمتابعة');
      return false;
    }

    setIsError(false);
    setMessage('');
    return true;
  };
  const validateShipping = () => {
    if (!shippingInfo.city.trim() || !shippingInfo.address.trim()) {
      setIsError(true);
      setMessage('أدخل المدينة والعنوان التفصيلي للمتابعة');
      return false;
    }

    setIsError(false);
    setMessage('');
    return true;
  };
  const continueToShipping = () => {
    if (validateContact()) nextStep();
  };
  const continueToPayment = () => {
    if (validateShipping()) nextStep();
  };
  const checkout = async () => {
    if (!validateContact()) {
      setStep(1);
      return;
    }

    if (!validateShipping()) {
      setStep(2);
      return;
    }

    try {
      setIsError(false);
      setMessage('');

      const response = await ordersApi.checkout({
        shippingAddress: {
          fullName: contactInfo.name.trim(),
          phone: contactInfo.phone.trim(),
          city: shippingInfo.city.trim(),
          fullAddress: shippingInfo.address.trim(),
        },
        paymentMethod,
      });

      setMessage(`تم إنشاء الطلب بنجاح! رقم الطلب: ${response.id}`);
      trackingApi.track('purchase', {
        orderId: response.id,
        metadata: {
          totalAmount: response.totalAmount,
          paymentMethod,
          itemCount: response.items?.length ?? 0,
        },
      });
      clearCartCount();
      setStep(4);
    } catch (error) {
      logError('CheckoutPage.checkout', error);
      setIsError(true);
      setMessage(extractApiError(error));
    }
  };

  return (
    <PageTransition>
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: '20px' }}>إتمام الشراء</h1>
        {message && step < 4 && (
          <div
            role="alert"
            style={{
              background: isError ? '#FEF2F2' : '#ECFDF5',
              border: `1px solid ${isError ? '#FCA5A5' : '#6EE7B7'}`,
              borderRadius: '8px',
              color: isError ? '#B91C1C' : '#047857',
              marginBottom: '20px',
              padding: '12px 14px',
            }}
          >
            {message}
          </div>
        )}

        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '15px', left: 0, right: 0, height: '2px', background: 'var(--color-border)', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: '15px', right: 0, width: `${((step - 1) / 2) * 100}%`, height: '2px', background: 'var(--color-accent)', zIndex: 0, transition: 'width 0.3s' }} />

            {['معلومات الاتصال', 'التوصيل', 'الدفع'].map((label, index) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: step > index ? 'var(--color-accent)' : 'var(--color-surface-2)', color: step > index ? '#FFF' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {index + 1}
                </div>
                <span style={{ fontSize: '12px', marginTop: '5px', color: step >= index + 1 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="checkout-wizard-card" style={{ background: '#FFFFFF', padding: '30px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: 18, marginBottom: '20px' }}>معلومات الاتصال</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input placeholder="الاسم الكامل" value={contactInfo.name} onChange={(event) => setContactInfo({ ...contactInfo, name: event.target.value })} style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#FFFFFF', color: 'var(--color-text-primary)' }} />
                <input placeholder="رقم الهاتف" value={contactInfo.phone} onChange={(event) => setContactInfo({ ...contactInfo, phone: event.target.value })} style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#FFFFFF', color: 'var(--color-text-primary)' }} />
                <button className="hero-cta-btn" onClick={continueToShipping} style={{ marginTop: '10px' }}>متابعة للشحن</button>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: 18, marginBottom: '20px' }}>تفاصيل التوصيل</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input placeholder="المدينة" value={shippingInfo.city} onChange={(event) => setShippingInfo({ ...shippingInfo, city: event.target.value })} style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#FFFFFF', color: 'var(--color-text-primary)' }} />
                <textarea placeholder="العنوان بالتفصيل (الحي، الشارع، المبنى)" rows={3} value={shippingInfo.address} onChange={(event) => setShippingInfo({ ...shippingInfo, address: event.target.value })} style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', background: '#FFFFFF', color: 'var(--color-text-primary)', resize: 'none' }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={prevStep} style={{ flex: 1, padding: '15px', borderRadius: '30px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}>العودة</button>
                  <button className="hero-cta-btn" onClick={continueToPayment} style={{ flex: 2 }}>متابعة للدفع</button>
                </div>
              </div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: 18, marginBottom: '20px' }}>طريقة الدفع</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', border: `1px solid ${paymentMethod === 'CASH_ON_DELIVERY' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: '4px', cursor: 'pointer' }}>
                  <input type="radio" value="CASH_ON_DELIVERY" checked={paymentMethod === 'CASH_ON_DELIVERY'} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} />
                  <span style={{ color: 'var(--color-text-primary)' }}>الدفع عند الاستلام</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', border: `1px solid ${paymentMethod === 'BANK_TRANSFER' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: '4px', cursor: 'pointer', background: '#FFF3EB' }}>
                  <input type="radio" value="BANK_TRANSFER" checked={paymentMethod === 'BANK_TRANSFER'} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} />
                  <div>
                    <div style={{ color: 'var(--color-finance)', fontWeight: 'bold' }}>تحويل بنكي</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>سيتم تأكيد الطلب بعد مراجعة التحويل من الإدارة.</div>
                  </div>
                </label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={prevStep} style={{ flex: 1, padding: '15px', borderRadius: '30px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}>العودة</button>
                  <button className="hero-cta-btn" onClick={checkout} style={{ flex: 2, background: 'var(--color-giving)' }}>تأكيد الطلب</button>
                </div>
              </div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '50px', marginBottom: '20px' }}>✓</div>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: 24, marginBottom: '10px' }}>تم استلام طلبك بنجاح!</h2>
              <p style={{ color: 'var(--color-accent)', fontSize: '18px', marginBottom: '30px' }}>{message}</p>
              <button className="hero-cta-btn" onClick={() => navigate('/store')}>العودة للتسوق</button>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
