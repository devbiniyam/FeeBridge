import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api';
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
  CreditCard,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Megaphone,
  ArrowRight
} from 'lucide-react';

export default function Navbar({
  currentView,
  onSelectView,
  onTriggerDeposit,
  onTriggerGenerate,
  unreadCount = 0,
  onNotificationRead
}) {
  const { user } = useAuth();
  if (!user) return null;

  const isParent = user.role === 'PARENT';
  const walletBalance = parseFloat(user.wallet_balance || 0);

  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [quickNotifs, setQuickNotifs] = useState([]);
  const [loadingTray, setLoadingTray] = useState(false);
  const trayRef = useRef(null);

  const getViewTitle = () => {
    switch (currentView) {
      case 'students':
        return isParent ? 'My Enrolled Children' : 'Campus Students Directory';
      case 'wallet':
        return 'Digital Wallet & Balances';
      case 'invoices':
        return isParent ? 'Tuition Invoices' : 'Campus Invoicing & Billing';
      case 'notifications':
        return 'Notifications & Alerts Hub';
      default:
        return 'Financial Overview';
    }
  };

  // Close tray when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (trayRef.current && !trayRef.current.contains(e.target)) {
        setIsTrayOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch quick preview notifications when tray is opened
  useEffect(() => {
    if (isTrayOpen) {
      setLoadingTray(true);
      notificationService
        .getNotifications({ unread: false })
        .then((data) => {
          setQuickNotifs((data || []).slice(0, 5));
        })
        .catch((err) => console.error('Failed to load tray notifications', err))
        .finally(() => setLoadingTray(false));
    }
  }, [isTrayOpen]);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await notificationService.markAllAsRead();
      setQuickNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setQuickNotifs((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        if (onNotificationRead) onNotificationRead();
      } catch (err) {
        console.error(err);
      }
    }
    setIsTrayOpen(false);
    if (notif.related_invoice) {
      onSelectView('invoices');
    } else {
      onSelectView('notifications');
    }
  };

  const getQuickIcon = (type) => {
    switch (type) {
      case 'PAYMENT_CONFIRMATION':
        return <CheckCircle2 size={14} className="text-emerald" />;
      case 'DUE_REMINDER':
        return <Clock size={14} className="text-amber" />;
      case 'OVERDUE_ALERT':
        return <AlertTriangle size={14} className="text-rose" />;
      default:
        return <Megaphone size={14} className="text-blue" />;
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

        {/* Interactive Notification Bell & Tray */}
        <div className="topbar-bell-wrapper" ref={trayRef}>
          <button
            type="button"
            className={`topbar-bell-btn ${isTrayOpen ? 'bell-btn-active' : ''}`}
            onClick={() => setIsTrayOpen(!isTrayOpen)}
            title="Notifications & Alerts"
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="bell-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
            ) : (
              <span className="bell-badge-dot"></span>
            )}
          </button>

          {/* Quick Dropdown Tray */}
          {isTrayOpen && (
            <div className="notif-dropdown-tray">
              <div className="tray-header">
                <div className="tray-title-group">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && (
                    <span className="tray-unread-badge">{unreadCount} new</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn-tray-read-all"
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    <span>Mark all</span>
                  </button>
                )}
              </div>

              <div className="tray-content">
                {loadingTray ? (
                  <div className="tray-loading">
                    <div className="spinner-large" style={{ width: 18, height: 18 }} />
                    <span>Loading alerts...</span>
                  </div>
                ) : quickNotifs.length === 0 ? (
                  <div className="tray-empty">
                    <Bell size={24} className="text-muted" />
                    <span>No notifications yet.</span>
                  </div>
                ) : (
                  <div className="tray-list">
                    {quickNotifs.map((item) => (
                      <div
                        key={item.id}
                        className={`tray-item ${!item.is_read ? 'tray-item-unread' : ''}`}
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="tray-item-icon">
                          {getQuickIcon(item.notification_type)}
                        </div>
                        <div className="tray-item-body">
                          <p className="tray-item-msg">{item.message}</p>
                          <span className="tray-item-time">
                            {item.student_name ? `${item.student_name} • ` : ''}
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        {!item.is_read && <span className="tray-dot" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="tray-footer">
                <button
                  type="button"
                  className="btn-tray-view-all"
                  onClick={() => {
                    setIsTrayOpen(false);
                    onSelectView('notifications');
                  }}
                >
                  <span>Open Alerts Hub</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
