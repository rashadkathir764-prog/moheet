import React from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Menu, Bell, User as UserIcon } from 'lucide-react';
import './Layout.css';

export const Header: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <header className="header">
      <div className="header-left">
        <button className="mobile-menu-btn">
          <Menu size={24} />
        </button>
        <h2 className="page-title">مرحباً، {user?.fullName?.split(' ')[0] || 'المستخدم'}</h2>
      </div>

      <div className="header-right">
        <button className="icon-btn">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>
        
        <div className="user-profile">
          <div className="user-avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} />
            ) : (
              <UserIcon size={20} />
            )}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.fullName}</span>
            <span className="user-role">{user?.role === 'ADMIN' ? 'مدير النظام' : 'تاجر معتمد'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
