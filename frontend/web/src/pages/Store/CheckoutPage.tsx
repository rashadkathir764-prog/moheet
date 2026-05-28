import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ordersApi } from '../../api/orders.api';
import { trackingApi } from '../../api/tracking.api';
import { commerceApi } from '../../api/commerce.api';
import { PageTransition } from '../../components/Layout/PageTransition';
import { MapModal } from '../../components/Layout/MapModal';
import { useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';
import { extractApiError, logError } from '../../utils/extractApiError';
import type { PaymentMethod } from '../../types';
import { MapPin } from 'lucide-react';
import './StorePages.css';

const parseCoordinate = (value: unknown, min: number, max: number) => {
  if (value === null || value === undefined || value === '') return undefined;

  const coordinate =
    typeof value === 'number' ? value : Number(String(value).trim());

  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    return undefined;
  }

  return coordinate;
};

export function CheckoutPage() {
  const { isAuthenticated, user } = useAuthStore();
  const isCustomer = isAuthenticated && user?.role === 'CUSTOMER';

  const [step, setStep] = useState(1);
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '' });
  const [shippingInfo, setShippingInfo] = useState({ city: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [savedAddressId, setSavedAddressId] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const clearCartCount = useCartStore((state) => state.clearCart);
  const navigate = useNavigate();

  useEffect(() => {
    trackingApi.track('checkout_started', {
      metadata: { step: 1 },
    });
  }, []);

  useEffect(() => {
    if (!isCustomer) return;
    commerceApi.addresses.getDefault()
      .then((address) => {
        if (address) {
          setContactInfo({
            name: address.recipientName,
            phone: address.phone,
          });
          setShippingInfo({
            city: address.city,
            address: address.fullAddress,
          });
          setSavedAddressId(address.id);
          const latitude = parseCoordinate(address.latitude, -90, 90);
          const longitude = parseCoordinate(address.longitude, -180, 180);

          if (latitude !== undefined && longitude !== undefined) {
            setCoordinates({
              lat: latitude,
              lng: longitude,
            });
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load default address:', err);
      });
  }, [isCustomer]);

  const handleSaveLocation = async (lat: number, lng: number, addressText: string) => {
    const latitude = parseCoordinate(lat, -90, 90);
    const longitude = parseCoordinate(lng, -180, 180);

    if (latitude === undefined || longitude === undefined) {
      setIsError(true);
      setMessage('تعذر حفظ الموقع لأن الإحداثيات غير صالحة.');
      return;
    }

    setCoordinates({ lat: latitude, lng: longitude });
    setShippingInfo((prev) => ({
      ...prev,
      address: addressText,
    }));

    if (!isCustomer) return;

    const recipientName = contactInfo.name.trim();
    const phone = contactInfo.phone.trim();
    const city = shippingInfo.city.trim();

    if (!recipientName || !phone || !city) {
      setIsError(false);
      setMessage('تم تحديد الموقع. أكمل الاسم ورقم الهاتف والمدينة لحفظه كعنوان افتراضي.');
      return;
    }

    try {
      const addressPayload = {
        recipientName,
        phone,
        city,
        fullAddress: addressText,
        latitude,
        longitude,
        isDefault: true,
      };

      if (savedAddressId) {
        const updated = await commerceApi.addresses.update(savedAddressId, addressPayload);
        if (updated) {
          setSavedAddressId(updated.id);
        }
      } else {
        const created = await commerceApi.addresses.create(addressPayload);
        if (created) {
          setSavedAddressId(created.id);
        }
      }
    } catch (err) {
      console.error('Failed to update address in database:', err);
    }
  };

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
      const latitude = parseCoordinate(coordinates?.lat, -90, 90);
      const longitude = parseCoordinate(coordinates?.lng, -180, 180);

      // ── MVP gate ────────────────────────────────────────────────────────
      // Online payments are not connected yet. The UI disables Bank Transfer
      // and Credit Card, but we also lock the API payload here as a defence
      // in depth so an inconsistent UI state can never submit a non-COD
      // checkout to the backend.
      const safePaymentMethod: PaymentMethod = 'CASH_ON_DELIVERY';

      const response = await ordersApi.checkout({
        shippingAddress: {
          fullName: contactInfo.name.trim(),
          phone: contactInfo.phone.trim(),
          city: shippingInfo.city.trim(),
          fullAddress: shippingInfo.address.trim(),
          latitude,
          longitude,
        },
        paymentMethod: safePaymentMethod,
      });

      setMessage(`تم إنشاء الطلب بنجاح! رقم الطلب: ${response.id}`);
      trackingApi.track('purchase', {
        orderId: response.id,
        metadata: {
          totalAmount: response.totalAmount,
          paymentMethod: safePaymentMethod,
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
                
                {/* Map Location Selector */}
                <div style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <MapPin size={18} style={{ color: coordinates ? 'var(--color-accent)' : 'var(--color-text-secondary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {coordinates
                        ? `الموقع الجغرافي: (${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)})`
                        : 'لم يتم تحديد موقع جغرافي بعد (اختياري)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapOpen(true)}
                    style={{
                      background: coordinates ? 'var(--color-accent)' : 'none',
                      border: `1px solid ${coordinates ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: coordinates ? '#FFFFFF' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    {coordinates ? 'تحديث الموقع' : 'تحديد الموقع على الخريطة'}
                  </button>
                </div>

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

              {/* MVP banner: only Cash on Delivery is operational right now. */}
              <div
                role="status"
                style={{
                  background: '#FFF8E1',
                  border: '1px solid #FFD54F',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#7B5B00',
                  marginBottom: '16px',
                  fontSize: '13px',
                  lineHeight: 1.7,
                }}
              >
                الدفع الإلكتروني غير متاح حاليًا، يمكنك استخدام الدفع عند الاستلام.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Active option: Cash on Delivery */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px',
                    border: '1px solid var(--color-accent)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: '#FFFFFF',
                  }}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="CASH_ON_DELIVERY"
                    checked={paymentMethod === 'CASH_ON_DELIVERY'}
                    onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>الدفع عند الاستلام</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      ادفع نقدًا عند استلام الطلب من مندوب الشحن.
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#DCFCE7',
                      color: '#166534',
                      borderRadius: '12px',
                      padding: '2px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    متاح
                  </span>
                </label>

                {/* Disabled option: Bank Transfer (coming soon) */}
                <label
                  aria-disabled="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'not-allowed',
                    background: '#F8FAFC',
                    opacity: 0.7,
                  }}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="BANK_TRANSFER"
                    disabled
                    checked={false}
                    readOnly
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>تحويل بنكي</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      سيتم تفعيله قريبًا بعد ربط مزود الدفع.
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#E2E8F0',
                      color: '#475569',
                      borderRadius: '12px',
                      padding: '2px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    قريبًا
                  </span>
                </label>

                {/* Disabled option: Credit Card (coming soon) */}
                <label
                  aria-disabled="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'not-allowed',
                    background: '#F8FAFC',
                    opacity: 0.7,
                  }}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="CREDIT_CARD"
                    disabled
                    checked={false}
                    readOnly
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>بطاقة ائتمانية</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      سيتم تفعيله قريبًا بعد ربط مزود الدفع.
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#E2E8F0',
                      color: '#475569',
                      borderRadius: '12px',
                      padding: '2px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    قريبًا
                  </span>
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
      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSaveLocation={handleSaveLocation}
        initialLat={coordinates?.lat}
        initialLng={coordinates?.lng}
      />
    </PageTransition>
  );
}
