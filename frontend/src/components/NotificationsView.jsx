import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api';
import BroadcastNotificationModal from './BroadcastNotificationModal';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Megaphone,
  CheckCheck,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Calendar,
  Sparkles,
  RefreshCw,
  Send,
  AlertCircle
} from 'lucide-react';

export default function NotificationsView({ onNavigateToInvoices, onNavigateBack }) {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'PAYMENT_CONFIRMATION' | 'DUE_REMINDER' | 'OVERDUE_ALERT' | 'GENERAL'
  const [searchQuery, setSearchQuery] = useState('');
  const [staffScope, setStaffScope] = useState('campus'); // 'campus' | 'mine'

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isReminderMenuOpen, setIsReminderMenuOpen] = useState(false);
  const [dispatchingReminders, setDispatchingReminders] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (staffScope === 'mine') {
        params.scope = 'mine';
      }
      const data = await notificationService.getNotifications(params);
      setNotifications(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [staffScope]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setSuccessBanner('All notifications marked as read.');
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err) {
      setError('Failed to mark all as read.');
    }
  };

  const handleDispatchReminders = async (reminderType) => {
    setIsReminderMenuOpen(false);
    setDispatchingReminders(true);
    setError(null);
    try {
      const result = await notificationService.dispatchReminders(reminderType);
      setSuccessBanner(result.detail || 'Reminders successfully dispatched!');
      fetchNotifications();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to dispatch reminders.');
    } finally {
      setDispatchingReminders(false);
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((item) => {
    // Tab filter
    if (activeTab === 'UNREAD' && item.is_read) return false;
    if (
      activeTab !== 'ALL' &&
      activeTab !== 'UNREAD' &&
      item.notification_type !== activeTab
    ) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = item.message?.toLowerCase().includes(q);
      const matchStudent = item.student_name?.toLowerCase().includes(q);
      const matchRecipient = item.recipient_name?.toLowerCase().includes(q) || item.recipient_email?.toLowerCase().includes(q);
      return matchMsg || matchStudent || matchRecipient;
    }

    return true;
  });

  const unreadTotal = notifications.filter((n) => !n.is_read).length;

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'PAYMENT_CONFIRMATION':
        return (
          <div className="notif-type-icon icon-emerald-bg" title="Payment Confirmation">
            <CheckCircle2 size={18} />
          </div>
        );
      case 'DUE_REMINDER':
        return (
          <div className="notif-type-icon icon-amber-bg" title="Tuition Due Reminder">
            <Clock size={18} />
          </div>
        );
      case 'OVERDUE_ALERT':
        return (
          <div className="notif-type-icon icon-rose-bg" title="Overdue Warning">
            <AlertTriangle size={18} />
          </div>
        );
      case 'GENERAL':
      default:
        return (
          <div className="notif-type-icon icon-blue-bg" title="Campus Announcement">
            <Megaphone size={18} />
          </div>
        );
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'PAYMENT_CONFIRMATION':
        return <span className="notif-badge badge-payment">Payment Confirmed</span>;
      case 'DUE_REMINDER':
        return <span className="notif-badge badge-due">Tuition Due Soon</span>;
      case 'OVERDUE_ALERT':
        return <span className="notif-badge badge-overdue">Delinquency Alert</span>;
      case 'GENERAL':
      default:
        return <span className="notif-badge badge-general">Campus Notice</span>;
    }
  };

  return (
    <div className="notifications-container">
      {/* Top Banner Alerts */}
      {successBanner && (
        <div className="fintech-alert-banner alert-success">
          <CheckCircle2 size={16} />
          <span>{successBanner}</span>
        </div>
      )}

      {error && (
        <div className="fintech-alert-banner alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Hub Header */}
      <div className="fintech-view-header">
        <div className="view-header-left">
          <div className="view-title-row">
            <h2>{isParent ? 'Notifications & Alerts Hub' : 'Campus Communications & Alerts'}</h2>
            {unreadTotal > 0 && (
              <span className="unread-count-pill">{unreadTotal} Unread</span>
            )}
          </div>
          <p className="view-header-subtitle">
            {isParent
              ? 'Stay updated on payment confirmations, tuition due dates, and official school broadcasts.'
              : 'Broadcast announcements, monitor sent billing alerts, and automate parent payment reminders.'}
          </p>
        </div>

        <div className="view-header-actions">
          {/* Refresh */}
          <button
            type="button"
            className="btn-fintech-icon"
            onClick={fetchNotifications}
            title="Refresh alerts"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
          </button>

          {/* Mark All Read */}
          {unreadTotal > 0 && (
            <button
              type="button"
              className="btn-fintech-secondary"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck size={15} />
              <span>Mark All as Read</span>
            </button>
          )}

          {/* Staff Actions */}
          {isStaffOrAdmin && (
            <>
              {/* Dispatch Reminders Dropdown */}
              <div className="dropdown-relative">
                <button
                  type="button"
                  className="btn-fintech-secondary btn-reminder-trigger"
                  onClick={() => setIsReminderMenuOpen(!isReminderMenuOpen)}
                  disabled={dispatchingReminders}
                >
                  <Clock size={15} />
                  <span>{dispatchingReminders ? 'Dispatching...' : 'Dispatch Reminders'}</span>
                  <ChevronDown size={14} />
                </button>

                {isReminderMenuOpen && (
                  <div className="dropdown-menu-fintech reminder-menu">
                    <button
                      type="button"
                      className="dropdown-menu-item"
                      onClick={() => handleDispatchReminders('DUE_SOON')}
                    >
                      <Clock size={14} className="text-amber" />
                      <div>
                        <strong>Dispatch Due Reminders</strong>
                        <small>Notify parents with upcoming tuition deadlines</small>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="dropdown-menu-item"
                      onClick={() => handleDispatchReminders('OVERDUE')}
                    >
                      <AlertTriangle size={14} className="text-rose" />
                      <div>
                        <strong>Dispatch Overdue Alerts</strong>
                        <small>Urgent warning for unsettled overdue invoices</small>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Broadcast Announcement Modal Button */}
              <button
                type="button"
                className="btn-fintech-primary"
                onClick={() => setIsBroadcastModalOpen(true)}
              >
                <Megaphone size={15} />
                <span>Broadcast Notice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Tabs and Search Bar Bar */}
      <div className="notif-controls-bar">
        {/* Filter Pills */}
        <div className="notif-tabs">
          <button
            type="button"
            className={`notif-tab ${activeTab === 'ALL' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All
            <span className="tab-badge">{notifications.length}</span>
          </button>

          <button
            type="button"
            className={`notif-tab ${activeTab === 'UNREAD' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('UNREAD')}
          >
            Unread
            {unreadTotal > 0 && <span className="tab-badge badge-unread">{unreadTotal}</span>}
          </button>

          <button
            type="button"
            className={`notif-tab ${activeTab === 'PAYMENT_CONFIRMATION' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('PAYMENT_CONFIRMATION')}
          >
            Payments
          </button>

          <button
            type="button"
            className={`notif-tab ${activeTab === 'DUE_REMINDER' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('DUE_REMINDER')}
          >
            Due Reminders
          </button>

          <button
            type="button"
            className={`notif-tab ${activeTab === 'OVERDUE_ALERT' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('OVERDUE_ALERT')}
          >
            Overdue
          </button>

          <button
            type="button"
            className={`notif-tab ${activeTab === 'GENERAL' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('GENERAL')}
          >
            Campus Notices
          </button>
        </div>

        {/* Search Input & Staff Scope Toggle */}
        <div className="notif-search-group">
          {isStaffOrAdmin && (
            <div className="staff-scope-toggle">
              <button
                type="button"
                className={`scope-btn ${staffScope === 'campus' ? 'scope-active' : ''}`}
                onClick={() => setStaffScope('campus')}
              >
                Campus Feed
              </button>
              <button
                type="button"
                className={`scope-btn ${staffScope === 'mine' ? 'scope-active' : ''}`}
                onClick={() => setStaffScope('mine')}
              >
                My Account
              </button>
            </div>
          )}

          <div className="notif-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="notif-search-input"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-list-wrapper">
        {loading && notifications.length === 0 ? (
          <div className="notif-loading-state">
            <div className="spinner-large" />
            <p>Loading notification feed...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-empty-state">
            <div className="empty-state-icon">
              <Bell size={36} />
            </div>
            <h4>All Caught Up!</h4>
            <p>
              {searchQuery
                ? 'No notifications match your current search query.'
                : 'There are no notifications in this category right now.'}
            </p>
          </div>
        ) : (
          <div className="notif-items-list">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`notif-card ${!notif.is_read ? 'notif-unread' : 'notif-read'}`}
                onClick={() => {
                  if (!notif.is_read) handleMarkAsRead(notif.id);
                }}
              >
                {/* Left Type Icon */}
                <div className="notif-card-icon">
                  {getNotificationIcon(notif.notification_type)}
                </div>

                {/* Center Content */}
                <div className="notif-card-body">
                  <div className="notif-card-header">
                    <div className="notif-badges-row">
                      {getTypeBadge(notif.notification_type)}
                      {!notif.is_read && <span className="unread-dot-badge" />}
                      {isStaffOrAdmin && notif.recipient_name && (
                        <span className="notif-recipient-chip">
                          To: {notif.recipient_name}
                        </span>
                      )}
                    </div>
                    <span className="notif-timestamp">{formatTimestamp(notif.created_at)}</span>
                  </div>

                  {/* Notification Message */}
                  <p className="notif-message-text">{notif.message}</p>

                  {/* Associated Invoice Context Pill */}
                  {notif.related_invoice && (
                    <div className="notif-invoice-context">
                      <div className="context-info">
                        <span className="context-student">
                          <strong>Student:</strong> {notif.student_name || 'Enrolled Child'}
                        </span>
                        {notif.invoice_month && (
                          <span className="context-month">
                            <strong>Period:</strong> {notif.invoice_month}
                          </span>
                        )}
                        {notif.invoice_amount && (
                          <span className="context-amount">
                            <strong>Amount:</strong> {parseFloat(notif.invoice_amount).toLocaleString()} ETB
                          </span>
                        )}
                        {notif.invoice_status && (
                          <span className={`invoice-tag-pill tag-${notif.invoice_status.toLowerCase()}`}>
                            {notif.invoice_status}
                          </span>
                        )}
                      </div>

                      {/* Parent Action: Navigate straight to Invoice */}
                      {isParent && notif.invoice_status !== 'PAID' && (
                        <button
                          type="button"
                          className="btn-notif-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notif.is_read) handleMarkAsRead(notif.id);
                            if (onNavigateToInvoices) onNavigateToInvoices(notif.related_invoice);
                          }}
                        >
                          <span>Pay Invoice</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Quick Controls */}
                <div className="notif-card-actions">
                  {!notif.is_read && (
                    <button
                      type="button"
                      className="btn-mark-single-read"
                      title="Mark as read"
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Broadcast Modal */}
      {isBroadcastModalOpen && (
        <BroadcastNotificationModal
          onClose={() => setIsBroadcastModalOpen(false)}
          onSuccess={() => {
            setIsBroadcastModalOpen(false);
            fetchNotifications();
            setSuccessBanner('Broadcast message dispatched successfully to campus parents!');
            setTimeout(() => setSuccessBanner(null), 4000);
          }}
        />
      )}
    </div>
  );
}
