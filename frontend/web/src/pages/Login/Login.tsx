import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Loader2 } from 'lucide-react';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
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
    <div className="login-container">
      <div className="animated-bg"></div>
      <div className="glow-orb" style={{ top: '10%', left: '10%' }}></div>
      <div className="glow-orb"></div>
      
      <motion.div 
        className="login-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
      >
        <motion.div 
          className="login-logo"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="logo-icon" variants={itemVariants} whileHover={{ rotate: 10, scale: 1.1 }}>
            M
          </motion.div>
          <motion.div variants={itemVariants} style={{ textAlign: 'center' }}>
            <h2>مُحِيط</h2>
            <p>أدخل بياناتك للمتابعة إلى مساحتك</p>
          </motion.div>
        </motion.div>

        <motion.form 
          onSubmit={handleSubmit} 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {error && (
              <motion.div 
                className="login-error"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div className="input-group" variants={itemVariants}>
            <Mail className="input-icon" size={20} />
            <input
              className="input-field"
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
            />
          </motion.div>
          
          <motion.div className="input-group" variants={itemVariants}>
            <Lock className="input-icon" size={20} />
            <input
              className="input-field"
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
            />
          </motion.div>
          
          <motion.button 
            type="submit" 
            className="submit-btn" 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'دخول'}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
};
