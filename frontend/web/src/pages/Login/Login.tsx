import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth.api';
import { getLoginDestination } from '../../auth/login-routing';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Lock, Mail } from 'lucide-react';
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
      const requestedReturnTo =
        searchParams.get('returnTo') ?? returnToFromState(location.state);

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
      <div className="login-background"></div>
      <Card className="login-card">
          <CardHeader className="text-center">
            <div className="login-logo">
              <div className="logo-icon">M</div>
            <h2>مُحِيط</h2>
          </div>
          <CardTitle className="mt-2">تسجيل الدخول</CardTitle>
          <p className="text-secondary mt-1">أدخل بياناتك وسنوجهك إلى مساحتك المناسبة</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="login-form d-flex flex-column gap-3">
            {error && <div className="login-error">{error}</div>}
            
            <div className="input-with-icon">
              <Mail className="input-icon" size={20} />
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            
            <div className="input-with-icon">
              <Lock className="input-icon" size={20} />
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            
            <Button type="submit" className="w-100 mt-2" size="lg" isLoading={isLoading}>
              دخول
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
