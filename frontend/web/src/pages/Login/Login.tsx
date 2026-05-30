import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowRight, Lock, Mail, Loader2, ShoppingBag, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth.api';
import { getLoginDestination } from '../../auth/login-routing';
import './Login.css';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const getApiErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError).response?.data?.message || fallback;

interface LoginLocationState {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
}

const returnToFromState = (state: unknown) => {
  const from = (state as LoginLocationState | null)?.from;
  if (!from?.pathname) {
    return null;
  }
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
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

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });
      login(response.user, response.accessToken);
      const requestedReturnTo = searchParams.get('returnTo') ?? returnToFromState(location.state);

      navigate(getLoginDestination(response.user.role, requestedReturnTo), {
        replace: true,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      <motion.div
        className="login-shell"
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <section className="login-brand-panel" aria-label="محيط">
          <Link to="/store" className="login-back-link">
            <ArrowRight size={18} />
            العودة إلى المتجر
          </Link>

          <div className="login-brand-content">
            <div className="login-brand-mark" aria-hidden="true">
              <ShoppingBag size={30} />
            </div>
            <p className="login-brand-eyebrow">متجر إلكتروني</p>
            <h1>محيط</h1>
            <p>
              كل ما تحتاجه في تجربة تسوق عربية واضحة، من المنتجات إلى الطلبات والمتابعة.
            </p>
          </div>
        </section>

        <motion.section
          className="login-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          aria-labelledby="login-title"
        >
          <motion.div className="login-card-header" variants={itemVariants}>
            <span className="login-store-name">محيط</span>
            <h2 id="login-title">تسجيل الدخول</h2>
            <p>سجّل دخولك للوصول إلى حسابك ومتابعة طلباتك</p>
          </motion.div>

          <motion.form
            className="login-form"
            onSubmit={handleSubmit}
            variants={containerVariants}
          >
            <AnimatePresence>
              {error && (
                <motion.div
                  className="login-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div className="login-field" variants={itemVariants}>
              <label htmlFor="login-email">البريد الإلكتروني</label>
              <div className="login-input-wrap">
                <Mail className="login-input-icon" size={19} />
                <input
                  id="login-email"
                  className="login-input"
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

            <motion.div className="login-field" variants={itemVariants}>
              <label htmlFor="login-password">كلمة المرور</label>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" size={19} />
                <input
                  id="login-password"
                  className="login-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  dir="ltr"
                />
              </div>
            </motion.div>

            <motion.button
              type="submit"
              className="login-submit-btn"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="login-spinner" size={22} />
                  جار تسجيل الدخول
                </>
              ) : (
                'دخول'
              )}
            </motion.button>

            <motion.div className="login-register-row" variants={itemVariants}>
              <span>ليس لديك حساب؟</span>
              <span className="login-register-link login-register-disabled" aria-disabled="true">
                <UserPlus size={17} />
                إنشاء حساب
              </span>
            </motion.div>
          </motion.form>

          <motion.div className="login-footnote" variants={itemVariants}>
            تسجيل الدخول يعمل لنفس حسابات العميل والتاجر والأدمن.
          </motion.div>
        </motion.section>
      </motion.div>
    </main>
  );
};
