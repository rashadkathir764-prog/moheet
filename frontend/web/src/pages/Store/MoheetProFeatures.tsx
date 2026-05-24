import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gavel, Users, Search, Shield,
  Clock, TrendingUp, MapPin, Star,
  Download, ChevronRight, Sparkles,
  Package
} from 'lucide-react';
import { ordersApi } from '../../api/orders.api';
import type { Order } from '../../types';

// ─── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(endTime: Date) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, endTime.getTime() - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return timeLeft;
}

const pad = (n: number) => String(n).padStart(2, '0');

const randomIndex = (max: number) => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
};

// ─── 1. المزاد الصامت (Silent Auction) ───────────────────────────────────────

interface AuctionItem {
  id: string;
  name: string;
  image: string;
  startPrice: number;
  currentBid: number;
  bidsCount: number;
  endTime: Date;
  category: string;
}

const auctionItems: AuctionItem[] = [
  {
    id: 'a1',
    name: 'لابتوب Dell XPS 15 — فئة 2024',
    image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&h=200&fit=crop',
    startPrice: 800000,
    currentBid: 1200000,
    bidsCount: 34,
    endTime: new Date(Date.now() + 5 * 3600 * 1000 + 23 * 60000),
    category: 'إلكترونيات',
  },
  {
    id: 'a2',
    name: 'آيفون 15 Pro Max — 256GB',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop',
    startPrice: 500000,
    currentBid: 780000,
    bidsCount: 57,
    endTime: new Date(Date.now() + 11 * 3600 * 1000 + 7 * 60000),
    category: 'هواتف',
  },
  {
    id: 'a3',
    name: 'سماعة Sony WH-1000XM5',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
    startPrice: 80000,
    currentBid: 113000,
    bidsCount: 19,
    endTime: new Date(Date.now() + 22 * 3600 * 1000),
    category: 'صوتيات',
  },
];

export const SilentAuctionPage: React.FC = () => {
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null);
  const [myBid, setMyBid] = useState('');
  const [bidMessage, setBidMessage] = useState('');

  const handleBid = (auction: AuctionItem) => {
    const bid = Number(myBid);
    if (bid <= auction.currentBid) {
      setBidMessage('مزايدتك يجب أن تكون أعلى من العرض الحالي!');
      return;
    }
    setBidMessage(`✅ تم تقديم مزايدتك بـ ${bid.toLocaleString()} ر.ي بنجاح!`);
    setMyBid('');
    setTimeout(() => {
      setBidMessage('');
      setSelectedAuction(null);
    }, 2000);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <Gavel style={{ color: 'var(--color-innovation)' }} size={36} />
          المزاد الصامت — محيط
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>زايد بصمت، افوز بذكاء. كل المزايدات سرية حتى نهاية المزاد.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {auctionItems.map(auction => (
          <AuctionCard key={auction.id} auction={auction} onBid={() => setSelectedAuction(auction)} />
        ))}
      </div>

      {/* Bid Modal */}
      <AnimatePresence>
        {selectedAuction && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAuction(null)}>
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ background: '#FFFFFF', border: '1px solid rgba(197, 160, 89, 0.3)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '8px' }}>{selectedAuction.name}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                العرض الحالي: <strong style={{ color: 'var(--color-innovation)' }}>{selectedAuction.currentBid.toLocaleString()} ر.ي</strong>
              </p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                {[selectedAuction.currentBid + 10000, selectedAuction.currentBid + 25000, selectedAuction.currentBid + 50000].map(v => (
                  <button key={v} onClick={() => setMyBid(String(v))} style={{ flex: 1, background: myBid === String(v) ? 'rgba(197,160,89,0.2)' : '#FFFFFF', border: '1px solid ' + (myBid === String(v) ? 'var(--color-innovation)' : 'var(--color-border)'), color: myBid === String(v) ? 'var(--color-innovation)' : 'var(--color-text-primary)', borderRadius: '8px', padding: '8px 4px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                    +{((v - selectedAuction.currentBid) / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={myBid}
                onChange={e => setMyBid(e.target.value)}
                placeholder={`أدخل مزايدتك (أعلى من ${selectedAuction.currentBid.toLocaleString()})`}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--color-text-primary)', padding: '12px', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px' }}
              />
              {bidMessage && <p style={{ color: bidMessage.startsWith('✅') ? 'var(--color-giving)' : '#FF4D6D', marginBottom: '12px', fontSize: '14px' }}>{bidMessage}</p>}
              <button
                onClick={() => handleBid(selectedAuction)}
                style={{ width: '100%', background: 'var(--color-innovation)', color: '#000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                🔨 قدّم مزايدتي السرية
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AuctionCard: React.FC<{ auction: AuctionItem; onBid: () => void }> = ({ auction, onBid }) => {
  const timeLeft = useCountdown(auction.endTime);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      style={{ background: '#FFFFFF', border: '1px solid rgba(197,160,89,0.2)', borderRadius: '20px', overflow: 'hidden' }}
    >
      <div style={{ position: 'relative' }}>
        <img src={auction.image} alt={auction.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: '20px', padding: '4px 12px', color: 'var(--color-innovation)', fontSize: '12px', fontWeight: '700' }}>
          {auction.category}
        </div>
        {/* Countdown Badge */}
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: '#FF4D6D', borderRadius: '20px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: '700' }}>
          <Clock size={12} />
          {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
        </div>
      </div>
      <div style={{ padding: '16px' }}>
        <h3 style={{ color: 'var(--color-text-primary)', fontSize: '15px', marginBottom: '12px', lineHeight: 1.4 }}>{auction.name}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>العرض الحالي</div>
            <div style={{ color: 'var(--color-innovation)', fontWeight: '800', fontSize: '18px' }}>{auction.currentBid.toLocaleString()} ر.ي</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>المزايدات</div>
            <div style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} style={{ color: 'var(--color-giving)' }} />
              {auction.bidsCount}
            </div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onBid}
          style={{ width: '100%', background: 'linear-gradient(135deg, rgba(197,160,89,0.2), rgba(197,160,89,0.1))', border: '1px solid rgba(197,160,89,0.5)', color: 'var(--color-innovation)', borderRadius: '12px', padding: '12px', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit', fontSize: '14px' }}
        >
          <Gavel size={14} style={{ display: 'inline', marginLeft: '6px' }} />
          زايد الآن
        </motion.button>
      </div>
    </motion.div>
  );
};

// ─── 2. الوكلاء الميدانيين (Field Agents) ─────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  rating: number;
  deliveries: number;
  online: boolean;
  avatar: string;
}

const agents: Agent[] = [
  { id: 'ag1', name: 'محمد السياني', neighborhood: 'حي السبعين', city: 'صنعاء', rating: 4.9, deliveries: 1240, online: true, avatar: 'م' },
  { id: 'ag2', name: 'أحمد الحميقاني', neighborhood: 'حي الزبيري', city: 'صنعاء', rating: 4.8, deliveries: 876, online: true, avatar: 'أ' },
  { id: 'ag3', name: 'خالد الوادعي', neighborhood: 'حي المعلا', city: 'عدن', rating: 4.7, deliveries: 543, online: false, avatar: 'خ' },
  { id: 'ag4', name: 'عبدالله المقطري', neighborhood: 'حي الحصب', city: 'تعز', rating: 4.9, deliveries: 921, online: true, avatar: 'ع' },
];

export const FieldAgentsWidget: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState('الكل');
  const cities = ['الكل', 'صنعاء', 'عدن', 'تعز'];
  const filtered = agents.filter(a => selectedCity === 'الكل' || a.city === selectedCity);

  return (
    <div className="field-agents-section">
      <div className="section-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={22} style={{ color: 'var(--color-thrill)' }} />
          <h2 style={{ color: 'var(--color-text-primary)', margin: 0 }}>الوكلاء الميدانيون في حارتك</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {cities.map(c => (
            <button key={c} onClick={() => setSelectedCity(c)} style={{ background: selectedCity === c ? 'var(--color-thrill)' : '#FFFFFF', border: 'none', color: selectedCity === c ? '#000' : 'var(--color-text-secondary)', borderRadius: '20px', padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: selectedCity === c ? '700' : '400' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {filtered.map(agent => (
          <motion.div key={agent.id} whileHover={{ y: -4 }} style={{ background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--color-thrill)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700' }}>
                {agent.avatar}
              </div>
              <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', background: agent.online ? '#22c55e' : 'var(--color-text-secondary)', border: '2px solid #0f0f0f' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '14px' }}>{agent.name}</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <MapPin size={11} /> {agent.neighborhood} — {agent.city}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <span style={{ color: '#fbbf24', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Star size={11} fill="#fbbf24" /> {agent.rating}
                </span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{agent.deliveries.toLocaleString()} توصيلة</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!agent.online}
              style={{ background: agent.online ? 'var(--color-thrill)' : '#FFFFFF', color: agent.online ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', border: 'none', borderRadius: '20px', padding: '8px 14px', cursor: agent.online ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}
            >
              {agent.online ? 'اطلب' : 'مشغول'}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── 3. صندوق الحظ (Mystery Box) ─────────────────────────────────────────────

const mysteryBoxes = [
  { id: 'mb1', name: 'صندوق التقنية المجنونة', price: 15000, tier: 'ذهبي', minValue: 30000, maxValue: 150000, emoji: '🖥️', color: '#C5A059' },
  { id: 'mb2', name: 'صندوق المرأة العصرية', price: 8000, tier: 'فضي', minValue: 15000, maxValue: 60000, emoji: '👜', color: 'var(--color-text-secondary)' },
  { id: 'mb3', name: 'صندوق الجيمر', price: 12000, tier: 'ماسي', minValue: 25000, maxValue: 120000, emoji: '🎮', color: '#3B82F6' },
];

export const MysteryBoxWidget: React.FC = () => {
  const [openingBox, setOpeningBox] = useState<string | null>(null);
  const [revealedPrize, setRevealedPrize] = useState<string | null>(null);

  const prizes = ['سماعة JBL اللاسلكية 🎧', 'شاحن لاسلكي سريع ⚡', 'ساعة ذكية Amazfit 🕒', 'حقيبة لابتوب فاخرة 💼', 'قلم Apple Pencil ✏️'];

  const openBox = (boxId: string) => {
    setOpeningBox(boxId);
    setTimeout(() => {
      setRevealedPrize(prizes[randomIndex(prizes.length)]);
    }, 1500);
  };

  const reset = () => {
    setOpeningBox(null);
    setRevealedPrize(null);
  };

  return (
    <div className="mystery-box-section">
      <div className="section-header-row" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Package size={22} style={{ color: '#FF4D6D' }} />
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', margin: 0 }}>صندوق الحظ</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0 }}>اشترِ الغموض، اكسب المفاجأة!</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {mysteryBoxes.map(box => (
          <motion.div key={box.id} whileHover={{ y: -5 }} style={{ background: `linear-gradient(135deg, rgba(${box.color === '#C5A059' ? '197,160,89' : box.color === 'var(--color-text-secondary)' ? '148,163,184' : '0,242,255'},0.1) 0%, rgba(15,15,15,1) 100%)`, border: `1px solid ${box.color}30`, borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              style={{ fontSize: '48px', marginBottom: '12px' }}
            >
              {box.emoji}
            </motion.div>
            <div style={{ background: box.color, color: '#000', fontSize: '11px', fontWeight: '700', borderRadius: '20px', padding: '3px 12px', display: 'inline-block', marginBottom: '12px' }}>
              {box.tier}
            </div>
            <h3 style={{ color: 'var(--color-text-primary)', fontSize: '16px', margin: '0 0 8px' }}>{box.name}</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', margin: '0 0 16px' }}>
              قيمة محتملة: <span style={{ color: box.color, fontWeight: '700' }}>{box.minValue.toLocaleString()} — {box.maxValue.toLocaleString()} ر.ي</span>
            </p>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '16px' }}>
              {box.price.toLocaleString()} ر.ي
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openBox(box.id)}
              style={{ width: '100%', background: box.color, color: '#000', border: 'none', borderRadius: '12px', padding: '13px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              🎲 جرب حظك!
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Opening Animation Modal */}
      <AnimatePresence>
        {openingBox && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={!revealedPrize ? undefined : reset}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20 }}
              style={{ textAlign: 'center', padding: '40px' }}
              onClick={e => e.stopPropagation()}
            >
              {!revealedPrize ? (
                <>
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                    style={{ fontSize: '80px', marginBottom: '20px', display: 'block' }}
                  >
                    🎁
                  </motion.div>
                  <p style={{ color: 'var(--color-text-primary)', fontSize: '20px', fontWeight: '700' }}>يتم فتح الصندوق...</p>
                </>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <div style={{ fontSize: '20px', color: '#fbbf24', marginBottom: '10px' }}>🎉 مبروك! فزت بـ:</div>
                  <div style={{ fontSize: '26px', color: 'var(--color-text-primary)', fontWeight: '800', marginBottom: '20px', padding: '20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(0,242,255,0.3)' }}>
                    {revealedPrize}
                  </div>
                  <button onClick={() => { reset(); alert('تمت إضافة المنتج إلى السلة بنجاح!'); }} style={{ background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: '12px', padding: '12px 30px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    رائع! إضافة للسلة
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── 4. البحث باللهجة المحلية ─────────────────────────────────────────────────

const dialectMap: Record<string, string> = {
  'جوال': 'هاتف',
  'موبايل': 'هاتف',
  'تلفون': 'هاتف',
  'ديش': 'شاشة',
  'تلفزيون': 'تلفاز',
  'كبتر': 'حاسوب',
  'كمبيوتر': 'حاسوب',
  'لابتوب': 'حاسوب محمول',
  'برادة': 'ثلاجة',
  'غساله': 'غسالة',
  'مياه': 'مشروبات',
  'ثلج': 'مشروبات',
  'بلانتة': 'خلاط',
  'بلاستيشن': 'ألعاب',
  'بلايستيشن': 'ألعاب',
  'شبشب': 'أحذية',
  'دشداشة': 'ملابس',
  'فستان': 'ملابس',
  'حرامي': 'حقيبة',
  'شنطة': 'حقيبة',
  'بطارية': 'شاحن',
  'فردة': 'حذاء',
};

export const DialectSearchBar: React.FC<{ onSearch: (term: string) => void }> = ({ onSearch }) => {
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const dialects = [
    { label: 'جوال', result: 'هاتف' },
    { label: 'كبتر', result: 'حاسوب' },
    { label: 'برادة', result: 'ثلاجة' },
    { label: 'شنطة', result: 'حقيبة' },
  ];

  const handleInput = (val: string) => {
    setInput(val);
    const found = Object.entries(dialectMap).find(([dialect]) =>
      val.toLowerCase().includes(dialect.toLowerCase())
    );
    setSuggestion(found ? found[1] : null);
  };

  const handleSearch = () => {
    const term = suggestion || input;
    onSearch(term);
  };

  return (
    <div className="dialect-search-section" style={{ margin: 0, padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '15px' }}>البحث بلهجتك — محيط يفهم عاميتنا!</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', gap: '10px' }}>
        <input
          value={input}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="مثال: ابحث عن 'كبتر' أو 'جوال صيني رخيص'..."
          style={{ flex: 1, background: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-text-primary)', padding: '14px 16px', fontSize: '15px', fontFamily: 'inherit', outline: 'none' }}
        />
        <button onClick={handleSearch} style={{ background: 'var(--color-accent)', color: '#FFF', border: 'none', borderRadius: '12px', padding: '14px 24px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={18} /> بحث
        </button>
      </div>

      {/* Translation Hint */}
      <AnimatePresence>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ marginTop: '8px', background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
            <span style={{ color: 'var(--color-text-primary)', fontSize: '13px' }}>
              يعني: <strong style={{ color: 'var(--color-accent)' }}>"{suggestion}"</strong> — سأبحث لك عنه!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Dialect Chips */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        {dialects.map(d => (
          <button key={d.label} onClick={() => { setInput(d.label); setSuggestion(d.result); }} style={{ background: '#F8FAFC', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }}>
            جرّب: {d.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── 5. الضمان الرقمي (Digital Warranty Vault) ───────────────────────────────

interface Invoice {
  id: string;
  product: string;
  date: string;
  amount: number;
  warrantyMonths: number;
  orderId: string;
  status: 'active' | 'expired' | 'expiring';
}

export const DigitalWarrantyVault: React.FC = () => {
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());

  const statusConfig = {
    active: { color: '#22c55e', label: 'ضمان سارٍ', bg: 'rgba(34,197,94,0.1)' },
    expiring: { color: '#f59e0b', label: 'ينتهي قريباً', bg: 'rgba(245,158,11,0.1)' },
    expired: { color: 'var(--color-text-secondary)', label: 'منتهي الضمان', bg: 'rgba(100,116,139,0.1)' },
  };

  const getRemainingMonths = (date: string, months: number) => {
    const purchased = new Date(date);
    const expiry = new Date(purchased.setMonth(purchased.getMonth() + months));
    const remaining = Math.max(0, Math.ceil((expiry.getTime() - now) / (1000 * 60 * 60 * 24 * 30)));
    return remaining;
  };

  useEffect(() => {
    const getWarrantyStatus = (date: string, months: number): Invoice['status'] => {
      const purchased = new Date(date);
      const expiry = new Date(purchased.setMonth(purchased.getMonth() + months));
      const remaining = Math.max(0, Math.ceil((expiry.getTime() - now) / (1000 * 60 * 60 * 24 * 30)));
      if (remaining <= 0) return 'expired';
      if (remaining <= 2) return 'expiring';
      return 'active';
    };

    ordersApi.getMy(1, 50)
      .then((response) => {
        const orderInvoices = response.data.flatMap((order: Order) => {
          const date = order.createdAt || new Date().toISOString();
          const items = order.items?.length
            ? order.items
            : [{
                id: order.id,
                productName: `طلب #${order.id.slice(0, 8)}`,
                totalPrice: order.totalAmount,
              }];

          return items.map((item) => {
            const warrantyMonths = 12;
            return {
              id: `${order.id}-${item.id}`,
              product: item.productName,
              date: date.slice(0, 10),
              amount: Number(item.totalPrice ?? order.totalAmount ?? 0),
              warrantyMonths,
              orderId: order.id.slice(0, 8),
              status: getWarrantyStatus(date, warrantyMonths),
            };
          });
        });
        setInvoices(orderInvoices);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [now]);

  return (
    <div className="warranty-vault-section">
      <div className="section-header-row" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={22} style={{ color: 'var(--color-giving)' }} />
          <div>
            <h2 style={{ color: 'var(--color-text-primary)', margin: 0 }}>الضمان الرقمي — خزنة فواتيرك</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0 }}>جميع ضماناتك في مكان واحد آمن</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', padding: '16px' }}>
            جاري تحميل فواتير طلباتك...
          </div>
        )}

        {!loading && invoices.length === 0 && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', padding: '16px', background: '#FFFFFF', borderRadius: '14px' }}>
            لا توجد فواتير مرتبطة بطلباتك حتى الآن.
          </div>
        )}

        {invoices.map(inv => {
          const cfg = statusConfig[inv.status];
          const remaining = getRemainingMonths(inv.date, inv.warrantyMonths);
          return (
            <motion.div
              key={inv.id}
              whileHover={{ x: 4 }}
              onClick={() => setSelected(inv)}
              style={{ background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={20} style={{ color: cfg.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '14px' }}>{inv.product}</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                  {inv.orderId} • {inv.date} • {inv.amount.toLocaleString()} ر.ي
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ background: cfg.bg, color: cfg.color, fontSize: '11px', fontWeight: '700', borderRadius: '20px', padding: '3px 10px', marginBottom: '4px' }}>
                  {cfg.label}
                </div>
                {inv.status !== 'expired' && (
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textAlign: 'center' }}>{remaining} شهر متبقي</div>
                )}
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </motion.div>
          );
        })}
      </div>

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ background: '#FFFFFF', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '420px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🛡️</div>
                <h3 style={{ color: 'var(--color-text-primary)', margin: '0 0 4px' }}>{selected.product}</h3>
                <span style={{ background: statusConfig[selected.status].bg, color: statusConfig[selected.status].color, fontSize: '12px', fontWeight: '700', borderRadius: '20px', padding: '4px 14px' }}>
                  {statusConfig[selected.status].label}
                </span>
              </div>

              <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {[
                  ['رقم الطلب', selected.orderId],
                  ['تاريخ الشراء', selected.date],
                  ['قيمة المنتج', selected.amount.toLocaleString() + ' ر.ي'],
                  ['مدة الضمان', selected.warrantyMonths + ' شهر'],
                  ['الضمان المتبقي', getRemainingMonths(selected.date, selected.warrantyMonths) + ' شهر'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{label}</span>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: '600' }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSelected(null)} style={{ flex: 1, background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  إغلاق
                </button>
                <button onClick={() => alert('جاري تحميل الفاتورة PDF...')} style={{ flex: 2, background: 'var(--color-giving)', color: '#000', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Download size={16} /> تحميل الفاتورة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const MoheetProStyles = `
.field-agents-section,
.mystery-box-section,
.dialect-search-section,
.warranty-vault-section {
  max-width: 1400px;
  margin: 0 auto 50px auto;
  padding: 0 20px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
`;

if (!document.getElementById('moheet-pro-styles')) {
  const style = document.createElement('style');
  style.id = 'moheet-pro-styles';
  style.textContent = MoheetProStyles;
  document.head.appendChild(style);
}

export default {};

