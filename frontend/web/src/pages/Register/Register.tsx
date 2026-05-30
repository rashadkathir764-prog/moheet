import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShoppingBag,
  User,
} from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { getLoginDestination } from '../../auth/login-routing';
import { useAuthStore } from '../../store/auth.store';
import './Register.css';

interface ApiError {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as ApiError).response?.data?.message;
  if (Array.isArray(message)) {
    return message.join('، ');
  }
  return message || fallback;
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 14, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.25,
    },
  },
};

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    const previousHtmlDir = document.documentElement.getAttribute('dir');
    const previousBodyDir = document.body.getAttribute('dir');

    document.documentElement.setAttribute('dir', 'ltr');
    document.body.setAttribute('dir', 'ltr');
    window.requestAnimationFrame(() => {
      window.scrollTo({ left: 0, top: 0 });
      document.scrollingElement?.scrollTo({ left: 0, top: 0 });
    });

    return () => {
      if (previousHtmlDir) {
        document.documentElement.setAttribute('dir', previousHtmlDir);
      } else {
        document.documentElement.removeAttribute('dir');
      }

      if (previousBodyDir) {
        document.body.setAttribute('dir', previousBodyDir);
      } else {
        document.body.removeAttribute('dir');
      }
    };
  }, []);

  const validateForm = () => {
    if (!fullName.trim()) {
      return 'الاسم الكامل مطلوب';
    }

    if (!email.trim()) {
      return 'البريد الإلكتروني مطلوب';
    }

    if (!password) {
      return 'كلمة المرور مطلوبة';
    }

    if (password !== confirmPassword) {
      return 'تأكيد كلمة المرور غير مطابق';
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });

      const user = {
        ...response.user,
        isVerified: response.user.isVerified ?? false,
      };

      login(user, response.accessToken);
      setSuccess('تم إنشاء الحساب بنجاح');

      navigate(getLoginDestination(user.role), {
        replace: true,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'فشل إنشاء الحساب. يرجى التحقق من البيانات.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="register-page">
      <motion.div
        className="register-shell"
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <section className="register-brand-panel" aria-label="محيط">
          <Link to="/store" className="register-back-link">
            <ArrowRight size={18} />
            العودة إلى المتجر
          </Link>

          <div className="register-brand-content">
            <div className="register-brand-mark" aria-hidden="true">
              <ShoppingBag size={30} />
            </div>
            <p className="register-brand-eyebrow">متجر إلكتروني</p>
            <h1>محيط</h1>
            <p>
              ابدأ حسابك كعميل في محيط وتابع طلباتك ومشترياتك من مكان واحد.
            </p>
          </div>
        </section>

        <motion.section
          className="register-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          aria-labelledby="register-title"
        >
          <motion.div className="register-card-header" variants={itemVariants}>
            <span className="register-store-name">محيط</span>
            <h2 id="register-title">إنشاء حساب</h2>
            <p>أنشئ حسابك للطلب ومتابعة مشترياتك بسهولة</p>
          </motion.div>

          <motion.form
            className="register-form"
            onSubmit={handleSubmit}
            variants={containerVariants}
          >
            <AnimatePresence>
              {error && (
                <motion.div
                  className="register-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  className="register-success"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <CheckCircle2 size={18} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div className="register-field" variants={itemVariants}>
              <label htmlFor="register-full-name">الاسم الكامل</label>
              <div className="register-input-wrap">
                <User className="register-input-icon" size={19} />
                <input
                  id="register-full-name"
                  className="register-input"
                  type="text"
                  placeholder="مثال: أحمد محمد"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </motion.div>

            <motion.div className="register-field" variants={itemVariants}>
              <label htmlFor="register-email">البريد الإلكتروني</label>
              <div className="register-input-wrap">
                <Mail className="register-input-icon" size={19} />
                <input
                  id="register-email"
                  className="register-input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  dir="ltr"
                />
              </div>
            </motion.div>

            <motion.div className="register-field" variants={itemVariants}>
              <label htmlFor="register-phone">رقم الهاتف اختياري</label>
              <div className="register-input-wrap">
                <Phone className="register-input-icon" size={19} />
                <input
                  id="register-phone"
                  className="register-input"
                  type="tel"
                  placeholder="+967712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  dir="ltr"
                />
              </div>
            </motion.div>

            <motion.div className="register-field" variants={itemVariants}>
              <label htmlFor="register-password">كلمة المرور</label>
              <div className="register-input-wrap">
                <Lock className="register-input-icon" size={19} />
                <input
                  id="register-password"
                  className="register-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  dir="ltr"
                />
              </div>
            </motion.div>

            <motion.div className="register-field" variants={itemVariants}>
              <label htmlFor="register-confirm-password">تأكيد كلمة المرور</label>
              <div className="register-input-wrap">
                <Lock className="register-input-icon" size={19} />
                <input
                  id="register-confirm-password"
                  className="register-input"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  dir="ltr"
                />
              </div>
            </motion.div>

            <motion.button
              type="submit"
              className="register-submit-btn"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="register-spinner" size={22} />
                  جار إنشاء الحساب
                </>
              ) : (
                'إنشاء الحساب'
              )}
            </motion.button>

            <div className="register-login-row">
              <span>لديك حساب؟</span>
              <Link to="/login" className="register-login-link">
                تسجيل الدخول
              </Link>
            </div>
          </motion.form>
        </motion.section>
      </motion.div>
    </main>
  );
};
