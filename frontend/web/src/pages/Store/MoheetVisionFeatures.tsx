import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote, Lightbulb, HeartHandshake, PhoneCall,
  CheckCircle2, X, Send
} from 'lucide-react';
import { AppDialog } from '../../components/ui/AppDialog';

// ─── 1. التصويت الشعبي (Popular Vote) ────────────────────────────────────────

interface PollItem {
  id: string;
  name: string;
  description: string;
  votes: number;
  totalVotes: number;
  image: string;
}

const initialPolls: PollItem[] = [
  {
    id: 'p1',
    name: 'سكوتر كهربائي شاومي',
    description: 'وسيلة تنقل ذكية واقتصادية للمسافات القصيرة.',
    votes: 450,
    totalVotes: 1000,
    image: 'https://images.unsplash.com/photo-1593955891392-8097d4c82c61?w=300&h=200&fit=crop',
  },
  {
    id: 'p2',
    name: 'نظارة الواقع الافتراضي Meta Quest',
    description: 'تجربة ألعاب وترفيه لا مثيل لها.',
    votes: 320,
    totalVotes: 1000,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=300&h=200&fit=crop',
  },
  {
    id: 'p3',
    name: 'ماكينة قهوة احترافية',
    description: 'قهوة الإسبريسو الحقيقية في منزلك.',
    votes: 230,
    totalVotes: 1000,
    image: 'https://images.unsplash.com/photo-1517246286431-13fbc155f9f6?w=300&h=200&fit=crop',
  },
];

export const PopularVoteWidget: React.FC = () => {
  const [polls, setPolls] = useState(initialPolls);
  const [votedId, setVotedId] = useState<string | null>(null);

  const handleVote = (id: string) => {
    if (votedId) return; // Only vote once
    setVotedId(id);
    setPolls(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, votes: p.votes + 1, totalVotes: p.totalVotes + 1 };
      }
      return { ...p, totalVotes: p.totalVotes + 1 };
    }));
  };

  return (
    <div className="vision-widget-container" style={{ maxWidth: '1400px', margin: '0 auto 50px', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Vote size={24} style={{ color: 'var(--color-innovation)' }} />
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', margin: 0 }}>صوت للمنتج القادم</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0 }}>أنت من يقرر ماذا نوفر في المتجر قريباً!</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {polls.map((poll) => {
          const percent = Math.round((poll.votes / poll.totalVotes) * 100);
          const isVoted = votedId === poll.id;

          return (
            <motion.div
              key={poll.id}
              whileHover={!votedId ? { y: -5 } : {}}
              style={{
                background: isVoted ? 'rgba(255, 138, 0, 0.08)' : '#FFFFFF',
                border: `1px solid ${isVoted ? 'rgba(255, 138, 0, 0.4)' : 'var(--color-border)'}`,
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <img src={poll.image} alt={poll.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
              <div style={{ padding: '16px' }}>
                <h3 style={{ color: 'var(--color-text-primary)', fontSize: '15px', margin: '0 0 6px' }}>{poll.name}</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', margin: '0 0 16px', minHeight: '36px' }}>{poll.description}</p>
                
                {/* Progress Bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    <span>{poll.votes} صوت</span>
                    <span style={{ color: 'var(--color-innovation)' }}>{percent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${percent}%` }} 
                      transition={{ duration: 1 }}
                      style={{ height: '100%', background: 'var(--color-innovation)' }} 
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={!votedId ? { scale: 1.02 } : {}}
                  whileTap={!votedId ? { scale: 0.98 } : {}}
                  onClick={() => handleVote(poll.id)}
                  disabled={!!votedId}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isVoted ? 'var(--color-innovation)' : votedId ? 'rgba(255,255,255,0.05)' : 'rgba(255, 138, 0, 0.15)',
                    color: isVoted ? '#000' : votedId ? '#64748b' : 'var(--color-innovation)',
                    fontWeight: '700',
                    fontFamily: 'inherit',
                    cursor: votedId ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isVoted ? <CheckCircle2 size={16} /> : <Vote size={16} />}
                  {isVoted ? 'تم التصويت بنجاح' : votedId ? 'شكراً لتصويتك' : 'صوت لهذا المنتج'}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ─── 2. مركز الابتكار المفتوح (Open Innovation Center) ───────────────────────

interface InnovationProject {
  id: string;
  title: string;
  creator: string;
  avatar: string;
  goal: number;
  raised: number;
  description: string;
  daysLeft: number;
}

const localProjects: InnovationProject[] = [
  {
    id: 'inv1',
    title: 'نظام ري ذكي للمزارع اليمنية',
    creator: 'م. عبدالله أحمد',
    avatar: 'ع',
    goal: 5000000,
    raised: 3200000,
    description: 'جهاز يعتمد على إنترنت الأشياء لتقليل هدر المياه في مزارع البن اليمني.',
    daysLeft: 12,
  },
  {
    id: 'inv2',
    title: 'تطبيق التراث اليمني ثلاثي الأبعاد',
    creator: 'ستوديو سبأ',
    avatar: 'س',
    goal: 2000000,
    raised: 500000,
    description: 'تطبيق يحول المعالم التاريخية اليمنية إلى مجسمات تفاعلية.',
    daysLeft: 24,
  }
];

export const OpenInnovationWidget: React.FC = () => {
  const [info, setInfo] = useState<string | null>(null);
  return (
    <div className="vision-widget-container" style={{ maxWidth: '1400px', margin: '0 auto 50px', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Lightbulb size={24} style={{ color: '#fbbf24' }} />
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', margin: 0 }}>مركز الابتكار المفتوح</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0 }}>ادعم المبدعين المحليين وحوّل أفكارهم لواقع (طلب مسبق).</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {localProjects.map(project => {
          const progress = Math.round((project.raised / project.goal) * 100);
          return (
            <motion.div
              key={project.id}
              whileHover={{ y: -4 }}
              style={{ background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fbbf24', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {project.avatar}
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-primary)', fontSize: '15px', fontWeight: 'bold' }}>{project.title}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>ابتكار: {project.creator}</div>
                </div>
              </div>
              <p style={{ color: 'var(--color-text-primary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>{project.description}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-primary)', fontSize: '13px', marginBottom: '8px' }}>
                <span>تم جمع <strong style={{ color: '#fbbf24' }}>{project.raised.toLocaleString()}</strong> ر.ي</span>
                <span style={{ color: '#94a3b8' }}>من {project.goal.toLocaleString()} ر.ي</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }} style={{ height: '100%', background: '#fbbf24' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setInfo('شكراً لدعمك الابتكار المحلي! سيتم إشعارك حين إطلاق المنتج.')} style={{ flex: 1, background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}>
                  ادعم الآن (طلب مسبق)
                </button>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '10px', color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '80px' }}>
                  {project.daysLeft} يوم متبقٍ
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <AppDialog
        isOpen={info !== null}
        title="الابتكار المفتوح"
        message={info ?? ''}
        confirmText="حسناً"
        onConfirm={() => setInfo(null)}
      />
    </div>
  );
};

// ─── 3. التدخل البشري الحقيقي (SOS Floating Widget) ──────────────────────────

export const HumanInterventionWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<{sender: 'user' | 'agent', text: string}[]>([]);
  const [inputText, setInputText] = useState('');

  const handleOpen = () => {
    setIsOpen(true);
    if (!connected && !isConnecting) {
      setIsConnecting(true);
      setTimeout(() => {
        setIsConnecting(false);
        setConnected(true);
        setMessages([{ sender: 'agent', text: 'أهلاً بك! أنا أحمد من فريق دعم محيط. كيف يمكنني مساعدتك فوراً؟' }]);
      }, 2000);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { sender: 'user', text: inputText }]);
    setInputText('');
    setTimeout(() => {
      setMessages(prev => [...prev, { sender: 'agent', text: 'فهمت عليك، لحظات وأقوم بحل المشكلة لك.' }]);
    }, 1500);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpen}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, #FF4D6D, #C52A4A)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(255, 77, 109, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        <PhoneCall size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '90px',
              right: '24px',
              width: '320px',
              height: '450px',
              background: 'var(--color-primary-dark)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1000
            }}
          >
            {/* Header */}
            <div style={{ background: '#111', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {connected ? (
                  <div style={{ position: 'relative' }}>
                    <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" alt="Agent" style={{ width: '40px', height: '40px', borderRadius: '20px', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#22c55e', borderRadius: '5px', border: '2px solid #111' }} />
                  </div>
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HeartHandshake size={20} color="#fff" />
                  </div>
                )}
                <div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{connected ? 'أحمد الدبعي' : 'تدخل بشري فوري'}</div>
                  <div style={{ color: connected ? '#22c55e' : '#f59e0b', fontSize: '11px' }}>{connected ? 'متصل الآن' : 'جاري التوصيل بموظف...'}</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)' }}>
              {isConnecting && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ border: '3px solid rgba(255,77,109,0.3)', borderTopColor: '#FF4D6D', borderRadius: '50%', width: '30px', height: '30px' }} />
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>جاري البحث عن أقرب موظف متاح...</span>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', background: m.sender === 'user' ? '#FF4D6D' : 'rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '14px', borderBottomRightRadius: m.sender === 'user' ? '4px' : '14px', borderBottomLeftRadius: m.sender === 'agent' ? '4px' : '14px', maxWidth: '85%', fontSize: '13px', lineHeight: 1.4 }}>
                  {m.text}
                </div>
              ))}
            </div>

            {/* Input */}
            {connected && (
              <div style={{ padding: '12px', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب رسالتك هنا..."
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '20px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={handleSend} style={{ width: '36px', height: '36px', borderRadius: '18px', background: '#FF4D6D', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Send size={16} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
