import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  LayoutDashboard,
  Wallet,
  Receipt,
  Users,
  Bell,
  LogOut,
  ShieldCheck,
  Building,
  User,
  ChevronRight,
  Sparkles,
  CreditCard,
  BarChart3
} from 'lucide-react';

export default function Sidebar({ currentView, onSelectView, unreadCount = 0 }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const isParent = user.role === 'PARENT';
  const isStaff = user.role === 'STAFF';
  const isAdmin = user.role === 'ADMIN';

  const walletBalance = parseFloat(user.wallet_balance || 0);

  const getRoleBadge = () => {
    if (isAdmin) return <span className="sidebar-role-badge role-admin"><ShieldCheck size={11} /> Admin</span>;
    if (isStaff) return <span className="sidebar-role-badge role-staff"><Building size={11} /> Staff</span>;
    return <span className="sidebar-role-badge role-parent"><User size={11} /> Parent</span>;
  };

  return (
    <aside className="fintech-sidebar">
      {/* Brand & Multi-Tenant Switcher */}
      <div className="sidebar-brand-box">
        <div className="sidebar-brand-header">
          <div className="brand-gem">
            <GraduationCap size={22} />
          </div>
          <div className="brand-names">
            <span className="brand-main">FeeBridge</span>
            <span className="brand-edition">FINTECH SUITE</span>
          </div>
        </div>

        {/* Tenant Indicator */}
        <div className="sidebar-tenant-badge">
          <Building size={13} className="text-muted" />
          <span className="tenant-text">
            {user.school_name ? user.school_name : isParent ? 'Family Tuition Portal' : 'Central Engine'}
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-scrollable-nav">
        {/* Section 1: Core Finance */}
        <div className="nav-group">
          <span className="nav-group-title">FINANCE & BILLING</span>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'dashboard' ? 'nav-item-active' : ''}`}
            onClick={() => onSelectView('dashboard')}
          >
            <div className="nav-item-icon">
              <LayoutDashboard size={18} />
            </div>
            <span className="nav-item-label">Overview</span>
            {currentView === 'dashboard' && <div className="nav-active-pill" />}
          </button>

          {isParent && (
            <button
              type="button"
              className={`sidebar-nav-item ${currentView === 'wallet' ? 'nav-item-active' : ''}`}
              onClick={() => onSelectView('wallet')}
            >
              <div className="nav-item-icon icon-emerald-tint">
                <Wallet size={18} />
              </div>
              <span className="nav-item-label">Digital Wallet</span>
              <span className="nav-balance-chip">
                {walletBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
              </span>
            </button>
          )}

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'invoices' ? 'nav-item-active' : ''}`}
            onClick={() => onSelectView('invoices')}
          >
            <div className="nav-item-icon icon-amber-tint">
              <Receipt size={18} />
            </div>
            <span className="nav-item-label">{isParent ? 'Tuition Invoices' : 'Invoice Billing'}</span>
            <span className="nav-tag-live">Live</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'reports' ? 'nav-item-active' : ''}`}
            onClick={() => onSelectView('reports')}
            title={isParent ? 'Tuition Statements & Settlement Ledger' : 'Financial Analytics & Audit Reports'}
          >
            <div className="nav-item-icon icon-teal-tint">
              <BarChart3 size={18} />
            </div>
            <span className="nav-item-label">{isParent ? 'Tuition Statement' : 'Analytics & Audit'}</span>
            <span className="nav-badge-subtle">{isParent ? 'Audit' : 'Ledger'}</span>
            {currentView === 'reports' && <div className="nav-active-pill" />}
          </button>
        </div>

        {/* Section 2: Management / Campus */}
        <div className="nav-group">
          <span className="nav-group-title">{isParent ? 'ACCOUNTS' : 'CAMPUS OPS'}</span>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'students' ? 'nav-item-active' : ''}`}
            onClick={() => onSelectView('students')}
            title={isParent ? 'Enrolled Children Billing Profiles' : 'Campus Students Roster'}
          >
            <div className="nav-item-icon icon-teal-tint">
              <Users size={18} />
            </div>
            <span className="nav-item-label">{isParent ? 'My Students' : 'Students Roster'}</span>
            <span className="nav-badge-subtle">Roster</span>
            {currentView === 'students' && <div className="nav-active-pill" />}
          </button>


          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'fees' ? 'nav-item-active' : ''}`}
            onClick={() => onSelectView('fees')}
            title={isParent ? 'Approved Campus Tuition Rates' : 'Campus Tuition Rates per Grade'}
          >
            <div className="nav-item-icon icon-indigo-tint">
              <CreditCard size={18} />
            </div>
            <span className="nav-item-label">{isParent ? 'Tuition Schedule' : 'Fee Structures'}</span>
            <span className="nav-badge-subtle">{isParent ? 'Rates' : 'Grades'}</span>
            {currentView === 'fees' && <div className="nav-active-pill" />}
          </button>
        </div>

        {/* Section 3: System */}
        <div className="nav-group">
          <span className="nav-group-title">COMMUNICATION</span>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'notifications' ? 'nav-item-active' : ''}`}
            onClick={() => onSelectView('notifications')}
            title="Alerts & Reminders Hub"
          >
            <div className="nav-item-icon icon-purple-tint">
              <Bell size={18} />
            </div>
            <span className="nav-item-label">Notifications</span>
            {unreadCount > 0 ? (
              <span className="nav-badge-count">{unreadCount}</span>
            ) : (
              <span className="nav-badge-subtle">0</span>
            )}
            {currentView === 'notifications' && <div className="nav-active-pill" />}
          </button>
        </div>
      </div>

      {/* Sidebar Footer: User Card & Engine Status */}
      <div className="sidebar-footer">
        {/* Engine Connectivity Status */}
        <div className="engine-status-row">
          <div className="engine-dot-pulse"></div>
          <span className="engine-text">Chapa Gateway • Connected</span>
        </div>

        {/* Profile Card */}
        <div className="sidebar-user-card">
          <div className="user-avatar-initials">
            {user.first_name ? user.first_name[0] : 'U'}
            {user.last_name ? user.last_name[0] : ''}
          </div>
          <div className="user-text-info">
            <span className="user-fullname">{user.first_name} {user.last_name}</span>
            <div className="user-role-line">
              {getRoleBadge()}
            </div>
          </div>
          <button
            type="button"
            className="btn-sidebar-logout"
            onClick={logout}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
