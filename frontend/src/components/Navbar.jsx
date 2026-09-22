import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  LogOut,
  User,
  Building,
  ShieldCheck,
  LayoutDashboard,
  Receipt,
  Wallet
} from 'lucide-react';

export default function Navbar({ currentView, onSelectView }) {
  const { user, logout } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="badge badge-admin"><ShieldCheck size={13} /> Admin</span>;
      case 'STAFF':
        return <span className="badge badge-staff"><Building size={13} /> Staff</span>;
      default:
        return <span className="badge badge-parent"><User size={13} /> Parent</span>;
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-brand-section">
        <div className="navbar-brand" onClick={() => onSelectView && onSelectView('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">
            <GraduationCap size={24} />
          </div>
          <div className="brand-text">
            <span className="brand-title">FeeBridge</span>
            <span className="brand-subtitle">School Fee & Digital Wallet</span>
          </div>
        </div>

        {user && (
          <nav className="nav-links">
            <button
              type="button"
              className={`nav-link-btn ${currentView === 'dashboard' ? 'nav-link-active' : ''}`}
              onClick={() => onSelectView('dashboard')}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentView === 'invoices' ? 'nav-link-active' : ''}`}
              onClick={() => onSelectView('invoices')}
            >
              <Receipt size={15} />
              <span>Invoices</span>
            </button>
          </nav>
        )}
      </div>

      {user && (
        <div className="navbar-user">
          {user.role === 'PARENT' && user.wallet_balance !== undefined && (
            <div className="nav-wallet-pill" title="Current Digital Wallet Balance">
              <Wallet size={14} className="nav-wallet-icon" />
              <div className="nav-wallet-texts">
                <span className="nav-wallet-label">Wallet</span>
                <strong className="nav-wallet-amount">{parseFloat(user.wallet_balance).toFixed(2)} ETB</strong>
              </div>
            </div>
          )}

          <div className="user-details">
            <div className="user-name-row">
              <span className="user-name">{user.first_name} {user.last_name}</span>
              {getRoleBadge(user.role)}
            </div>
            <div className="user-subtext">
              <span className="user-email">{user.email}</span>
              {user.school_name && (
                <span className="user-school">• {user.school_name}</span>
              )}
            </div>
          </div>
          <button onClick={logout} className="btn-logout" title="Log Out">
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </header>
  );
}
