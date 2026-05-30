import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, MapPin, Camera, Gift, Bell, X, ChevronRight, Upload, CheckCircle2, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { AppDialog } from '../../components/ui/AppDialog';

interface InfoDialogState {
  title?: string;
  message: string;
}

// ─── 1. محفظة محيط الرقمية ───────────────────────────────────────────────────

export const MoheetWallet: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [balance] = useState(1240.50);
  const [tab, setTab] = useState<'overview' | 'topup' | 'history'>('overview');
  const [topupAmount, setTopupAmount] = useState('');
  const [info, setInfo] = useState<InfoDialogState | null>(null);

  const transactions = [
    { id: '1', label: 'شراء منتج — لابتوب', amount: -850, date: '2026-05-20' },
    { id: '2', label: 'شحن رصيد', amount: +2000, date: '2026-05-18' },
    { id: '3', label: 'شراء منتج — سماعات', amount: -210, date: '2026-05-15' },
    { id: '4', label: 'استرجاع طلب #A91F', amount: +210, date: '2026-05-10' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="wallet-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="wallet-modal-header">
              <div className="wallet-header-left">
                <Wallet size={24} className="wallet-icon-glow" />
                <span>محفظة محيط</span>
              </div>
              <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            {/* Balance Card */}
            <div className="wallet-balance-card">
              <div className="wallet-balance-label">رصيدك الحالي</div>
              <div className="wallet-balance-amount">
                <span className="wallet-currency">ر.ي</span>
                <span className="wallet-amount">{balance.toLocaleString('ar-EG')}</span>
              </div>
              <div className="wallet-user">مرحباً {user?.fullName?.split(' ')[0] || 'بك'} 👋</div>
            </div>

            {/* Tabs */}
            <div className="wallet-tabs">
              {(['overview', 'topup', 'history'] as const).map((t) => (
                <button
                  key={t}
                  className={`wallet-tab ${tab === t ? 'active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t === 'overview' ? 'نظرة عامة' : t === 'topup' ? 'شحن رصيد' : 'السجل'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="wallet-content">
              {tab === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="wallet-stats-grid">
                    <div className="wallet-stat">
                      <CreditCard size={18} />
                      <div>
                        <div className="stat-label">إجمالي الإنفاق</div>
                        <div className="stat-value" style={{ color: '#FF4D6D' }}>ر.ي 1,060</div>
                      </div>
                    </div>
                    <div className="wallet-stat">
                      <CheckCircle2 size={18} />
                      <div>
                        <div className="stat-label">المسترجع</div>
                        <div className="stat-value" style={{ color: 'var(--color-giving)' }}>ر.ي 210</div>
                      </div>
                    </div>
                  </div>
                  <button className="wallet-action-btn" onClick={() => setInfo({ title: 'المحفظة', message: 'تم تفعيل خيار الدفع بالمحفظة للطلب القادم!' })}>
                    استخدم المحفظة في دفعتك القادمة
                  </button>
                </motion.div>
              )}
              {tab === 'topup' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div className="topup-presets">
                    {[500, 1000, 2000, 5000].map(amt => (
                      <button key={amt} className={`topup-preset ${topupAmount === String(amt) ? 'active' : ''}`} onClick={() => setTopupAmount(String(amt))}>
                        {amt.toLocaleString()} ر.ي
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    placeholder="أو أدخل مبلغاً مخصصاً"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="topup-input"
                  />
                  <button className="wallet-action-btn" onClick={() => { if(topupAmount) { setInfo({ title: 'شحن الرصيد', message: `تم شحن ${Number(topupAmount).toLocaleString()} ر.ي بنجاح!` }); setTopupAmount(''); } else { setInfo({ title: 'تنبيه', message: 'يرجى تحديد المبلغ أولاً' }); } }}>
                    شحن {topupAmount ? `${Number(topupAmount).toLocaleString()} ر.ي` : 'الرصيد'} الآن
                  </button>
                </motion.div>
              )}
              {tab === 'history' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {transactions.map((tx) => (
                    <div key={tx.id} className="tx-row">
                      <div>
                        <div className="tx-label">{tx.label}</div>
                        <div className="tx-date">{tx.date}</div>
                      </div>
                      <div className={`tx-amount ${tx.amount > 0 ? 'credit' : 'debit'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ر.ي
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <AppDialog
        isOpen={info !== null}
        title={info?.title}
        message={info?.message}
        confirmText="حسناً"
        onConfirm={() => setInfo(null)}
      />
    </AnimatePresence>
  );
};

// ─── 2. فلتر التوصيل بالمنطقة ───────────────────────────────────────────────

interface DeliveryZoneFilterProps {
  onZoneChange: (zone: string) => void;
  currentZone: string;
}

export const DeliveryZoneFilter: React.FC<DeliveryZoneFilterProps> = ({ onZoneChange, currentZone }) => {
  const zones = [
    { id: 'all', label: 'كل المناطق', emoji: '🌍' },
    { id: 'sanaa', label: 'صنعاء', emoji: '🏙️' },
    { id: 'aden', label: 'عدن', emoji: '🌊' },
    { id: 'taiz', label: 'تعز', emoji: '⛰️' },
    { id: 'hodeida', label: 'الحديدة', emoji: '🏖️' },
  ];

  return (
    <div className="delivery-zone-strip" style={{ margin: 0, padding: 0, background: 'transparent', border: 'none' }}>
      <div className="zone-strip-header" style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '15px' }}>
        <MapPin size={18} className="zone-icon" style={{ color: 'var(--color-accent)' }} />
        <span>التوصيل إلى:</span>
      </div>
      <div className="zone-chips" style={{ marginTop: '12px' }}>
        {zones.map((zone) => (
          <motion.button
            key={zone.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`zone-chip ${currentZone === zone.id ? 'active' : ''}`}
            onClick={() => onZoneChange(zone.id)}
            style={{ 
              background: currentZone === zone.id ? 'var(--color-accent)' : '#F8FAFC', 
              color: currentZone === zone.id ? '#FFF' : 'var(--color-text-secondary)',
              border: '1px solid',
              borderColor: currentZone === zone.id ? 'var(--color-accent)' : 'var(--color-border)',
              fontWeight: currentZone === zone.id ? '700' : '600',
              padding: '8px 16px',
              fontSize: '13px'
            }}
          >
            {zone.emoji} {zone.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// ─── 3. الاسترجاع الذاتي بالصور ─────────────────────────────────────────────

export const SelfReturnModal: React.FC<{ orderId: string; isOpen: boolean; onClose: () => void }> = ({ orderId, isOpen, onClose }) => {
  const [step, setStep] = useState<'reason' | 'upload' | 'success'>('reason');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const reasons = [
    'المنتج وصل تالفاً',
    'المنتج لا يتطابق مع الوصف',
    'استلمت منتجاً مختلفاً',
    'المنتج لا يعمل بشكل صحيح',
    'لم أعد بحاجة للمنتج',
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="return-modal"
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="return-modal-header">
              <span>🔄 طلب استرجاع — #{orderId.slice(0, 8)}</span>
              <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            {step === 'reason' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="return-subtitle">ما سبب الاسترجاع؟</p>
                <div className="return-reasons">
                  {reasons.map((r) => (
                    <motion.button
                      key={r}
                      whileTap={{ scale: 0.97 }}
                      className={`return-reason-btn ${reason === r ? 'selected' : ''}`}
                      onClick={() => setReason(r)}
                    >
                      {reason === r ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
                      {r}
                    </motion.button>
                  ))}
                </div>
                <button className="return-next-btn" disabled={!reason} onClick={() => setStep('upload')}>
                  التالي: رفع صورة المنتج →
                </button>
              </motion.div>
            )}

            {step === 'upload' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <p className="return-subtitle">📸 ارفع صورة توضح المشكلة</p>
                <label className="upload-zone">
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                  {preview ? (
                    <img src={preview} alt="preview" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <div className="upload-placeholder">
                      <Camera size={32} />
                      <span>اضغط لاختيار صورة</span>
                      <Upload size={16} style={{ opacity: 0.5 }} />
                    </div>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setStep('reason')} className="return-back-btn">← العودة</button>
                  <button className="return-next-btn" style={{ flex: 2 }} onClick={() => setStep('success')}>
                    إرسال طلب الاسترجاع
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>✅</div>
                <h3 style={{ color: '#fff', marginBottom: '10px' }}>تم استلام طلب الاسترجاع!</h3>
                <p style={{ color: '#94a3b8', marginBottom: '20px' }}>سيقوم فريقنا بمراجعة صورتك والرد خلال 24 ساعة.</p>
                <button className="wallet-action-btn" onClick={onClose}>حسناً، شكراً!</button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── 4. وضع الإهداء (Gift Mode) ──────────────────────────────────────────────

export const GiftModePanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [activated, setActivated] = useState(false);

  const themes = [
    { bg: 'linear-gradient(135deg, #FF6B6B, #FFE66D)', emoji: '🎂', label: 'عيد ميلاد' },
    { bg: 'linear-gradient(135deg, #FF758F, #FF4D6D)', emoji: '❤️', label: 'حب وتقدير' },
    { bg: 'linear-gradient(135deg, #4ECDC4, #45B7D1)', emoji: '🎓', label: 'تخرج' },
    { bg: 'linear-gradient(135deg, var(--color-giving), #45B7D1)', emoji: '🎁', label: 'عام جديد' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="gift-modal"
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gift-modal-header">
              <Gift size={22} style={{ color: '#FF758F' }} />
              <span>وضع الإهداء</span>
              <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            {!activated ? (
              <>
                {/* Card Preview */}
                <div className="gift-card-preview" style={{ background: themes[selectedTheme].bg }}>
                  <div className="gift-card-emoji">{themes[selectedTheme].emoji}</div>
                  <div className="gift-card-to">إلى: {recipientName || 'شخص مميز'}</div>
                  <div className="gift-card-msg">{message || 'رسالتك هنا...'}</div>
                  <div className="gift-card-from">من: مُحِيط 🛍️</div>
                </div>

                {/* Theme Picker */}
                <div className="gift-themes">
                  {themes.map((t, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedTheme(i)}
                      className={`gift-theme-btn ${selectedTheme === i ? 'active' : ''}`}
                      style={{ background: t.bg }}
                    >
                      {t.emoji}
                    </motion.button>
                  ))}
                </div>

                {/* Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    className="gift-input"
                    placeholder="اسم المُهدى إليه"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                  <textarea
                    className="gift-textarea"
                    placeholder="اكتب رسالة من القلب... ✍️"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="gift-activate-btn"
                    onClick={() => setActivated(true)}
                    disabled={!recipientName}
                  >
                    🎁 تفعيل وضع الإهداء
                  </motion.button>
                </div>
              </>
            ) : (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>🎉</div>
                <h3 style={{ color: '#fff' }}>تم تفعيل وضع الإهداء!</h3>
                <p style={{ color: '#94a3b8', margin: '10px 0 20px' }}>
                  سيصل الطلب بتغليف هدية أنيق مع كارت إلى "{recipientName}" 💌
                </p>
                <button className="wallet-action-btn" onClick={onClose}>رائع! متابعة للدفع</button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── 5. تنبيه توفر المنتج ────────────────────────────────────────────────────

export const StockAlertButton: React.FC<{ productId: string; productName: string; inStock: boolean }> = ({
  productId, productName, inStock,
}) => {
  const [alertSet, setAlertSet] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleSetAlert = () => {
    setAnimating(true);
    // Save to localStorage for demo
    const alerts = JSON.parse(localStorage.getItem('stockAlerts') || '[]');
    alerts.push({ productId, productName, timestamp: Date.now() });
    localStorage.setItem('stockAlerts', JSON.stringify(alerts));
    setTimeout(() => {
      setAlertSet(true);
      setAnimating(false);
    }, 600);
  };

  if (inStock) return null;

  return (
    <motion.button
      className={`stock-alert-btn ${alertSet ? 'alert-set' : ''}`}
      onClick={handleSetAlert}
      disabled={alertSet}
      animate={animating ? { scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      <Bell size={16} />
      {alertSet ? '✓ سنُعلمك عند التوفر!' : 'أبلغني عند عودة المنتج'}
    </motion.button>
  );
};

// ─── CSS Injection ────────────────────────────────────────────────────────────
const AdvancedFeaturesStyles = `
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Close Button */
.modal-close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.modal-close-btn:hover { background: rgba(255, 255, 255, 0.15); }

/* ── Wallet Modal ── */
.wallet-modal {
  background: #0f0f0f;
  border: 1px solid rgba(255, 138, 0, 0.2);
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
}
.wallet-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}
.wallet-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wallet-icon-glow {
  color: var(--color-accent);
  filter: drop-shadow(0 0 6px var(--color-accent));
}
.wallet-balance-card {
  background: linear-gradient(135deg, rgba(255, 138, 0, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%);
  margin: 20px;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 138, 0, 0.2);
  text-align: center;
}
.wallet-balance-label { color: #94a3b8; font-size: 13px; margin-bottom: 8px; }
.wallet-balance-amount { display: flex; align-items: flex-start; justify-content: center; gap: 5px; }
.wallet-currency { color: var(--color-accent); font-size: 18px; margin-top: 6px; }
.wallet-amount { color: #fff; font-size: 42px; font-weight: 800; }
.wallet-user { color: #94a3b8; font-size: 13px; margin-top: 8px; }

.wallet-tabs {
  display: flex;
  margin: 0 20px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}
.wallet-tab {
  flex: 1;
  background: none;
  border: none;
  color: #94a3b8;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  font-family: inherit;
}
.wallet-tab.active { background: rgba(255, 138, 0, 0.15); color: var(--color-accent); font-weight: 600; }

.wallet-content { padding: 20px; }

.wallet-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.wallet-stat {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-accent);
}
.stat-label { font-size: 11px; color: #64748b; }
.stat-value { font-size: 15px; font-weight: 700; color: #fff; }

.wallet-action-btn {
  width: 100%;
  background: var(--color-accent);
  color: #000;
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.wallet-action-btn:hover { transform: scale(1.02); box-shadow: 0 6px 20px rgba(255, 138, 0, 0.28); }

.topup-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.topup-preset {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
}
.topup-preset.active, .topup-preset:hover {
  background: rgba(255, 138, 0, 0.1);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.topup-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  padding: 12px;
  font-size: 15px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}
.tx-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.tx-label { color: #fff; font-size: 14px; }
.tx-date { color: #64748b; font-size: 12px; margin-top: 2px; }
.tx-amount { font-weight: 700; font-size: 14px; }
.tx-amount.credit { color: var(--color-giving); }
.tx-amount.debit { color: #FF4D6D; }

/* ── Delivery Zone Strip ── */
.delivery-zone-strip {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 30px;
}
.zone-strip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 12px;
}
.zone-icon { color: var(--color-accent); }
.zone-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.zone-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 7px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.2s;
}
.zone-chip.active, .zone-chip:hover {
  background: rgba(255, 138, 0, 0.1);
  border-color: var(--color-accent);
  color: #fff;
}

/* ── Return Modal ── */
.return-modal {
  background: #0f0f0f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 440px;
  padding: 24px;
}
.return-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20px;
}
.return-subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 14px; }
.return-reasons { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.return-reason-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: right;
  transition: all 0.2s;
}
.return-reason-btn.selected {
  border-color: var(--color-accent);
  background: rgba(255, 138, 0, 0.08);
  color: var(--color-accent);
}
.return-next-btn {
  width: 100%;
  background: var(--color-accent);
  color: #000;
  border: none;
  padding: 13px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.return-next-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.return-next-btn:not(:disabled):hover { transform: scale(1.01); }
.return-back-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 13px;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
}
.upload-zone {
  display: block;
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 130px;
}
.upload-zone:hover { border-color: var(--color-accent); }
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px;
  color: #64748b;
}

/* ── Gift Modal ── */
.gift-modal {
  background: #0f0f0f;
  border: 1px solid rgba(255, 119, 143, 0.3);
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  padding: 24px;
}
.gift-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20px;
}
.gift-modal-header button { margin-right: auto; }
.gift-card-preview {
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.gift-card-emoji { font-size: 32px; }
.gift-card-to { color: rgba(0,0,0,0.7); font-size: 13px; }
.gift-card-msg { color: #000; font-size: 15px; font-weight: 600; max-width: 200px; }
.gift-card-from { color: rgba(0,0,0,0.5); font-size: 12px; }
.gift-themes { display: flex; gap: 10px; justify-content: center; margin-bottom: 16px; }
.gift-theme-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}
.gift-theme-btn.active { border-color: #fff; transform: scale(1.1); }
.gift-input, .gift-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
}
.gift-textarea { resize: none; }
.gift-activate-btn {
  width: 100%;
  background: linear-gradient(135deg, #FF758F, #FF4D6D);
  color: #fff;
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.gift-activate-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.gift-activate-btn:not(:disabled):hover { transform: scale(1.02); box-shadow: 0 5px 20px rgba(255, 77, 109, 0.4); }

/* ── Stock Alert Button ── */
.stock-alert-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 138, 0, 0.08);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 25px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  font-weight: 600;
  transition: all 0.3s;
  width: 100%;
  justify-content: center;
  margin-top: 10px;
}
.stock-alert-btn:hover { background: rgba(255, 138, 0, 0.15); }
.stock-alert-btn.alert-set {
  background: var(--color-giving);
  color: #000;
  border-color: var(--color-giving);
  cursor: default;
}
`;

// Inject styles once
if (!document.getElementById('advanced-features-styles')) {
  const style = document.createElement('style');
  style.id = 'advanced-features-styles';
  style.textContent = AdvancedFeaturesStyles;
  document.head.appendChild(style);
}

export default {};
