import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Wallet,
  Bell,
  PlusCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building,
  User,
  LogOut,
  CreditCard
} from 'lucide-react';

export default function Navbar({
  currentView,
  onSelectView,
  onTriggerDeposit,
  onTriggerGenerate
}) {
  const { user } = useAuth();
  if (!user) return null;

  const isParent = user.role === 'PARENT';
  const walletBalance = parseFloat(user.wallet_balance || 0);

  const getViewTitle = () => {
    switch (currentView) {
      case 'students':
        return isParent ? 'My Enrolled Children' : 'Campus Students Directory';
      case 'wallet':
        return 'Digital Wallet & Balances';
      case 'invoices':
        return isParent ? 'Tuition Invoices' : 'Campus Invoicing & Billing';
      default:
        return 'Financial Overview';
    }
  };


  return (
    <header className="fintech-topbar">
      {/* Left: Dynamic Breadcrumb */}
      <div className="topbar-left">
        <div className="topbar-breadcrumbs">
          <span className="crumb-root" onClick={() => onSelectView('dashboard')}>Finance</span>
          <ChevronRight size={13} className="crumb-sep" />
          <span className="crumb-active">{getViewTitle()}</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="topbar-center">
        <div className="fintech-search-box">
          <Search size={15} className="fintech-search-icon" />
          <input
            type="text"
            placeholder="Search invoices, receipts, student ID, references..."
            className="fintech-search-input"
          />
          <span className="search-shortcut">⌘K</span>
        </div>
      </div>

      {/* Right: Quick Action + Live Wallet Pill + Notifications */}
      <div className="topbar-right">
        {/* Quick Action Button */}
        {isParent ? (
          <button
            type="button"
            className="btn-topbar-action"
            onClick={onTriggerDeposit || (() => onSelectView('wallet'))}
          >
            <PlusCircle size={15} />
            <span>Deposit Funds</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn-topbar-action btn-topbar-staff"
            onClick={onTriggerGenerate || (() => onSelectView('invoices'))}
          >
            <Sparkles size={15} />
            <span>Generate Invoices</span>
          </button>
        )}

        {/* Live Wallet Chip (for parent) */}
        {isParent && (
          <button
            type="button"
            className="topbar-wallet-chip"
            onClick={() => onSelectView('wallet')}
            title="View Digital Wallet & Statement"
          >
            <div className="wallet-chip-icon">
              <Wallet size={14} />
            </div>
            <div className="wallet-chip-content">
              <span className="wallet-chip-label">BALANCE</span>
              <strong className="wallet-chip-val">
                {walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
              </strong>
            </div>
          </button>
        )}

        {/* Notification Bell */}
        <div className="topbar-bell-btn" title="Notifications">
          <Bell size={18} />
          <span className="bell-badge-dot"></span>
        </div>
      </div>
    </header>
  );
}
