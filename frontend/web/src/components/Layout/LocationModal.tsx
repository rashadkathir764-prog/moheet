import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Plus, Home, Pencil } from 'lucide-react';
import { commerceApi } from '../../api/commerce.api';
import { useAuthStore } from '../../store/auth.store';
import { MapModal } from './MapModal';

interface Address {
  id: string;
  recipientName: string;
  phone: string;
  city: string;
  fullAddress: string;
  isDefault: boolean;
  latitude?: string | number;
  longitude?: string | number;
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (city: string) => void;
  currentLocation: string;
}

const QUICK_CITIES = ['القاهرة', 'الجيزة', 'الإسكندرية', 'صنعاء', 'عدن', 'تعز', 'الحديدة'];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocation,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const isCustomer = isAuthenticated && user?.role === 'CUSTOMER';
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [newAddress, setNewAddress] = useState({
    recipientName: '',
    phone: '',
    city: '',
    fullAddress: '',
  });

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const loadAddresses = async () => {
    if (!isCustomer) return;
    setIsLoadingAddresses(true);
    setError(null);
    try {
      const data = await commerceApi.addresses.all();
      setAddresses(data || []);
    } catch (err) {
      console.error('Failed to load addresses:', err);
      setError('تعذر تحميل العناوين المحفوظة');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      if (isOpen) {
        if (isCustomer) {
          loadAddresses();
        }
        setShowAddForm(false);
        setEditingAddressId(null);
        setCoords(null);
        setError(null);
        setCustomCity('');
      } else {
        setAddresses([]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated]);

  const handleEditAddressClick = (e: React.MouseEvent, address: Address) => {
    e.stopPropagation();
    setEditingAddressId(address.id);
    setNewAddress({
      recipientName: address.recipientName,
      phone: address.phone,
      city: address.city,
      fullAddress: address.fullAddress,
    });
    const lat = address.latitude;
    const lng = address.longitude;
    if (lat !== undefined && lat !== null && lat !== '' && lng !== undefined && lng !== null && lng !== '') {
      setCoords({
        lat: parseFloat(String(lat)),
        lng: parseFloat(String(lng)),
      });
    } else {
      setCoords(null);
    }
    setShowAddForm(true);
  };

  const handleAddAddressClick = () => {
    setEditingAddressId(null);
    setCoords(null);
    setNewAddress({
      recipientName: '',
      phone: '',
      city: '',
      fullAddress: '',
    });
    setShowAddForm(true);
  };

  const handleSaveLocation = (lat: number, lng: number, addressText: string) => {
    setCoords({ lat, lng });
    setNewAddress((prev) => {
      const isAddressEmpty = !prev.fullAddress.trim();
      return {
        ...prev,
        fullAddress: isAddressEmpty ? addressText : prev.fullAddress,
      };
    });
  };

  const handleQuickCitySelect = (city: string) => {
    localStorage.setItem('moheet_delivery_city', city);
    onSelectLocation(city);
    onClose();
  };

  const handleCustomCitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCity.trim()) return;
    const city = customCity.trim();
    localStorage.setItem('moheet_delivery_city', city);
    onSelectLocation(city);
    onClose();
  };

  const handleAddressSelect = async (address: Address) => {
    try {
      await commerceApi.addresses.setDefault(address.id);
      localStorage.setItem('moheet_delivery_city', address.city);
      onSelectLocation(address.city);
      onClose();
    } catch (err) {
      console.error('Failed to set default address:', err);
      setError('تعذر تحديد العنوان الافتراضي');
    }
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { recipientName, phone, city, fullAddress } = newAddress;
    if (!recipientName.trim() || !phone.trim() || !city.trim() || !fullAddress.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const payload: {
        recipientName: string;
        phone: string;
        city: string;
        fullAddress: string;
        isDefault: boolean;
        latitude?: number;
        longitude?: number;
      } = {
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        fullAddress: fullAddress.trim(),
        isDefault: true,
      };

      if (coords) {
        payload.latitude = coords.lat;
        payload.longitude = coords.lng;
      }

      let result;
      if (editingAddressId) {
        result = await commerceApi.addresses.update(editingAddressId, payload);
      } else {
        result = await commerceApi.addresses.create(payload);
      }

      if (result?.id) {
        await commerceApi.addresses.setDefault(result.id);
      }

      setEditingAddressId(null);
      setCoords(null);
      setNewAddress({
        recipientName: '',
        phone: '',
        city: '',
        fullAddress: '',
      });
      setShowAddForm(false);
      
      await loadAddresses();

      localStorage.setItem('moheet_delivery_city', city);
      onSelectLocation(city);
      onClose();
    } catch (err) {
      console.error('Failed to save address:', err);
      setError('تعذر حفظ العنوان. يرجى التحقق من المدخلات.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAddress((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="location-modal-backdrop" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="location-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="location-modal-header">
              <h3>تحديث موقع التوصيل</h3>
              <button className="location-modal-close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="location-modal-body">
              {error && (
                <div style={{
                  color: 'var(--color-error)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}>
                  {error}
                </div>
              )}

              {/* Predefined Cities Selector */}
              <div className="location-section-title">
                <MapPin size={16} style={{ color: 'var(--color-accent)' }} />
                <span>اختر مدينة رئيسية للتوصيل السريع</span>
              </div>

              <div className="cities-grid">
                {QUICK_CITIES.map((city) => (
                  <button
                    key={city}
                    className={`city-button ${currentLocation === city ? 'selected' : ''}`}
                    onClick={() => handleQuickCitySelect(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Custom City Entry */}
              <form onSubmit={handleCustomCitySubmit} className="custom-city-input-wrapper">
                <input
                  type="text"
                  className="custom-city-input"
                  placeholder="أو اكتب اسم المدينة هنا..."
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                />
                <button type="submit" className="custom-city-submit-btn">
                  تأكيد
                </button>
              </form>

              {/* User Saved Addresses (authenticated only) */}
              {isCustomer && (
                <>
                  <div className="location-section-title">
                    <Home size={16} style={{ color: 'var(--color-accent)' }} />
                    <span>عناوينك المسجلة</span>
                  </div>

                  {isLoadingAddresses ? (
                    <div className="address-loading-placeholder">جاري تحميل عناوينك...</div>
                  ) : addresses.length > 0 ? (
                    <div className="addresses-list">
                      {addresses.map((address) => (
                        <div
                          key={address.id}
                          className={`address-item-card ${address.isDefault ? 'is-default' : ''}`}
                          onClick={() => handleAddressSelect(address)}
                        >
                          <div className="address-item-card-icon">
                            <MapPin size={20} />
                          </div>
                          <div className="address-item-details">
                            <div className="address-recipient">{address.recipientName}</div>
                            <div className="address-phone">{address.phone}</div>
                            <div className="address-details">{address.city} - {address.fullAddress}</div>
                          </div>
                          {address.isDefault && (
                            <span className="address-default-badge">الافتراضي</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleEditAddressClick(e, address)}
                            style={{
                              position: 'absolute',
                              bottom: '12px',
                              left: '12px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            <Pencil size={12} />
                            <span>تعديل</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="address-empty-placeholder">
                      لا توجد عناوين مسجلة بعد. أضف عنوانك الأول لتسهيل عملية الطلب.
                    </div>
                  )}

                  {/* Inline Address Creation Form */}
                  {!showAddForm ? (
                    <button
                      className="add-address-trigger"
                      onClick={handleAddAddressClick}
                    >
                      <Plus size={16} />
                      <span>إضافة عنوان توصيل جديد</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddAddressSubmit} className="new-address-form-box">
                      <div className="new-address-form-title">
                        {editingAddressId ? 'تعديل العنوان' : 'إضافة عنوان جديد'}
                      </div>
                      
                      <div className="address-form-grid">
                        <div className="address-form-field">
                          <label>اسم المستلم</label>
                          <input
                            type="text"
                            name="recipientName"
                            placeholder="الاسم الكامل"
                            value={newAddress.recipientName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="address-form-field">
                          <label>رقم الهاتف</label>
                          <input
                            type="text"
                            name="phone"
                            placeholder="مثال: 777XXXXXX"
                            value={newAddress.phone}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="address-form-field">
                          <label>المدينة / المحافظة</label>
                          <input
                            type="text"
                            name="city"
                            placeholder="مثال: صنعاء"
                            value={newAddress.city}
                            onChange={handleInputChange}
                            required
                          />
                        </div>

                        {/* Map Location Selector */}
                        <div className="address-form-field form-group-full" style={{ marginTop: '4px', marginBottom: '4px' }}>
                          <div style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                              <MapPin size={16} style={{ color: coords ? 'var(--color-accent)' : 'var(--color-text-secondary)', flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {coords
                                  ? `الموقع الجغرافي: (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`
                                  : 'تحديد موقع العنوان الجغرافي (اختياري)'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsMapOpen(true)}
                              style={{
                                background: coords ? 'var(--color-accent)' : 'none',
                                border: `1px solid ${coords ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                color: coords ? '#FFFFFF' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              {coords ? 'تحديث الموقع' : 'تحديد الموقع على الخريطة'}
                            </button>
                          </div>
                        </div>

                        <div className="address-form-field form-group-full">
                          <label>العنوان بالتفصيل</label>
                          <input
                            type="text"
                            name="fullAddress"
                            placeholder="الشارع، اسم المبنى، رقم الشقة"
                            value={newAddress.fullAddress}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="address-form-actions">
                        <button
                          type="button"
                          className="address-form-btn-cancel"
                          onClick={() => setShowAddForm(false)}
                        >
                          إلغاء
                        </button>
                        <button type="submit" className="address-form-btn-submit">
                          حفظ العنوان
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSaveLocation={handleSaveLocation}
        initialLat={coords?.lat}
        initialLng={coords?.lng}
      />
    </AnimatePresence>
  );
};
