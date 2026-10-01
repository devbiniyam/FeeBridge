import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  Receipt,
  GraduationCap,
  Bell,
  BarChart3,
  Building,
  CheckCircle2,
  Users,
  CreditCard,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  PlusCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Zap
} from 'lucide-react';

export default function Dashboard({ onNavigate, onTriggerDeposit, onTriggerGenerate }) {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';

  const walletBalance = parseFloat(user?.wallet_balance || 0);

  return (
    <div className="fintech-dashboard-container">
      {/* Top Welcome & Telemetry Header */}
      <div className="fintech-welcome-bar">
        <div className="welcome-headline-group">
          <div className="fintech-badges-row">
            <span className="fintech-badge badge-primary">
              <Sparkles size={13} /> Intelligent Fee Infrastructure
            </span>
            <span className="fintech-badge badge-emerald">
              <ShieldCheck size={13} /> Bank-Grade Escrow Security
            </span>
            <span className="fintech-badge badge-indigo">
              <Zap size={13} /> Chapa Gateway Connected
            </span>
          </div>

          <h1 className="welcome-fintech-title">
            Welcome back, {user?.first_name} {user?.last_name}
          </h1>
          <p className="welcome-fintech-sub">
            {isParent && 'Tuition payment terminal for your family. Monitor school billing, maintain escrow balance, and clear invoices seamlessly.'}
            {isStaff && `Campus Operations Portal for ${user?.school_name || 'your assigned campus'}. Manage grade fee structures, run monthly billing, and track collections.`}
            {isAdmin && 'FeeBridge Central Administration Console. System-wide governance over schools, tuition schedules, automated deductions, and financial ledgers.'}
          </p>
        </div>

        {/* System Pulse Indicator */}
        <div className="fintech-system-status">
          <span className="status-pulse-dot"></span>
          <div className="status-text-stack">
            <strong>Settlement Engine</strong>
            <span>Active & Synced</span>
          </div>
        </div>
      </div>

      {/* High-Impact Financial Overview Cards (KPIs) */}
      <div className="fintech-kpi-grid">
        {isParent ? (
          <>
            {/* KPI 1: Escrow Wallet Balance */}
            <div className="fintech-kpi-card kpi-card-wallet">
              <div className="kpi-card-header">
                <span className="kpi-card-eyebrow">ESCROW WALLET BALANCE</span>
                <div className="kpi-icon-pill icon-pill-emerald">
                  <Wallet size={18} />
                </div>
              </div>
              <div className="kpi-big-value">
                <span className="kpi-currency">ETB</span>
                <strong>{walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="kpi-footer-row">
                <span className="kpi-hint-text">100% Reserved for tuition</span>
                <button
                  type="button"
                  className="btn-kpi-action"
                  onClick={onTriggerDeposit || (() => onNavigate('wallet'))}
                >
                  <PlusCircle size={14} /> Deposit Funds
                </button>
              </div>
            </div>

            {/* KPI 2: Tuition Invoices Portal */}
            <div className="fintech-kpi-card kpi-card-invoices">
              <div className="kpi-card-header">
                <span className="kpi-card-eyebrow">TUITION BILLING</span>
                <div className="kpi-icon-pill icon-pill-amber">
                  <Receipt size={18} />
                </div>
              </div>
              <div className="kpi-big-value">
                <span className="kpi-sub-heading">School Invoices</span>
              </div>
              <div className="kpi-footer-row">
                <span className="kpi-hint-text">Track monthly dues & receipts</span>
                <button
                  type="button"
                  className="btn-kpi-action btn-kpi-amber"
                  onClick={() => onNavigate('invoices')}
                >
                  Open Billing <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* KPI 3: Instant Clearance Gateway */}
            <div className="fintech-kpi-card kpi-card-gateway">
              <div className="kpi-card-header">
                <span className="kpi-card-eyebrow">PAYMENT METHODS</span>
                <div className="kpi-icon-pill icon-pill-cyan">
                  <CreditCard size={18} />
                </div>
              </div>
              <div className="kpi-methods-list">
                <span className="method-pill">Telebirr</span>
                <span className="method-pill">CBE Birr</span>
                <span className="method-pill">Cards</span>
              </div>
              <div className="kpi-footer-row">
                <span className="kpi-hint-text">Processed via Chapa</span>
                <span className="kpi-badge-live">Instant</span>
              </div>
            </div>

            {/* KPI 4: Security & Tenant Profile */}
            <div className="fintech-kpi-card kpi-card-security">
              <div className="kpi-card-header">
                <span className="kpi-card-eyebrow">FAMILY PROFILE</span>
                <div className="kpi-icon-pill icon-pill-purple">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="kpi-user-preview">
                <strong className="kpi-user-name">{user?.first_name} {user?.last_name}</strong>
                <span className="kpi-user-email">{user?.email}</span>
              </div>
              <div className="kpi-footer-row">
                <span className="kpi-hint-text">Phone: {user?.phone_number || 'N/A'}</span>
                <span className="kpi-tag-verified">Verified</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Staff KPI 1: Assigned Campus */}
            <div className="fintech-kpi-card kpi-card-school">
              <div className="kpi-card-header">
                <span className="kpi-card-eyebrow">ASSIGNED CAMPUS</span>
                <div className="kpi-icon-pill icon-pill-purple">
                  <Building size={18} />
                </div>
              </div>
              <div className="kpi-big-value">
                <span className="kpi-school-title">{user?.school_name || 'Main Campus'}</span>
              </div>
              <div className="kpi-footer-row">
                <span className="kpi-hint-text">Multi-Tenant Tenant ID #{user?.school || '1'}</span>
                <span className="kpi-badge-live">Online</span>
              </div>
            </div>

            {/* Staff KPI 2: Quick Billing Run */}
            <div className="fintech-kpi-card kpi-card-billing">
              <div className="kpi-card-header">
                <span className="kpi-card-eyebrow">CAMPUS BILLING RUN</span>
                <div className="kpi-icon-pill icon-pill-amber">
                  <Sparkles size={18} />
                </div>
              </div>
              <div className="kpi-big-value">
                <span className="kpi-sub-heading">Monthly Invoices</span>
              </div>
              <div className="kpi-footer-row">
                <span className="kpi-hint-text">Batch generate grade invoices</span>
                <button
                  type="button"
                  className="btn-kpi-action btn-kpi-amber"
                  onClick={onTriggerGenerate || (() => onNavigate('invoices'))}
                >
                  <Sparkles size={14} /> Run Billing
                </button>
              </div>
            </div>

            {/* Staff KPI 3: Invoicing Ledger */}
            <div className="fintech-kpi-card kpi-card-ledger">
              <div className="kpi-card-header">
                <span className="kpi-card-eyebrow">COLLECTION REVENUE</span>
                <div className="kpi-icon-pill icon-pill-emerald">
                  <Receipt size={18} />
                </div>
              </div>
              <div className="kpi-big-value">
                <span className="kpi-sub-heading">Invoices & Ledgers</span>
              </div>
              <div className="kpi-footer-row">
                <span className="kpi-hint-text">View all student collections</span>
                <button
                  type="button"
                  className="btn-kpi-action"
                  onClick={() => onNavigate('invoices')}
                >
                  View Ledger <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Staff KPI 4: Staff Credentials */}
            <div className="fintech-kpi-card kpi-card-security">
              <div className="kpi-card-header">
                <span className="kpi-card-eyebrow">STAFF OPERATOR</span>
                <div className="kpi-icon-pill icon-pill-cyan">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="kpi-user-preview">
                <strong className="kpi-user-name">{user?.first_name} {user?.last_name}</strong>
                <span className="kpi-user-email">{user?.email}</span>
              </div>
              <div className="kpi-footer-row">
                <span className="kpi-hint-text">Role: Campus Staff</span>
                <span className="kpi-tag-verified">Authorized</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Action Command Toolbar */}
      <div className="fintech-quick-actions-bar">
        <span className="actions-bar-label">QUICK WORKFLOWS:</span>
        <div className="actions-bar-buttons">
          {isParent ? (
            <>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={onTriggerDeposit || (() => onNavigate('wallet'))}
              >
                <PlusCircle size={15} className="text-emerald" />
                <span>Top-up Escrow Wallet</span>
              </button>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => onNavigate('invoices')}
              >
                <Receipt size={15} className="text-amber" />
                <span>Review Tuition Invoices</span>
              </button>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => onNavigate('students')}
              >
                <Users size={15} className="text-teal" />
                <span>My Enrolled Children</span>
              </button>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => onNavigate('wallet')}
              >
                <CreditCard size={15} className="text-indigo" />
                <span>Manage Digital Card & Statements</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={onTriggerGenerate || (() => onNavigate('invoices'))}
              >
                <Sparkles size={15} className="text-amber" />
                <span>Run Monthly Tuition Invoicing</span>
              </button>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => onNavigate('students')}
              >
                <Users size={15} className="text-teal" />
                <span>Campus Student Roster</span>
              </button>
              <button
                type="button"
                className="btn-quick-chip"
                onClick={() => onNavigate('invoices')}
              >
                <Receipt size={15} className="text-emerald" />
                <span>Open Invoice Billing Dashboard</span>
              </button>
            </>
          )}

        </div>
      </div>

      {/* Platform Services & Modules Showcase */}
      <div className="fintech-modules-section">
        <div className="section-title-row">
          <div>
            <h3 className="section-main-heading">Platform Modules & Services</h3>
            <p className="section-sub-heading">Direct access to all integrated financial services and campus ops</p>
          </div>
        </div>

        <div className="fintech-modules-grid">
          {isParent ? (
            <>
              {/* Tuition Billing */}
              <div
                className="fintech-module-box box-invoices"
                onClick={() => onNavigate('invoices')}
                role="button"
                tabIndex={0}
              >
                <div className="module-box-top">
                  <div className="module-bubble bubble-amber">
                    <Receipt size={22} />
                  </div>
                  <span className="module-status-chip chip-live">Live</span>
                </div>
                <h4>Tuition Invoices & Due Dates</h4>
                <p>Track monthly tuition schedules per enrolled child, verify fee items, and clear invoices before deadlines.</p>
                <div className="module-box-footer">
                  <span className="module-action-link">
                    Open Invoices <ChevronRight size={14} />
                  </span>
                </div>
              </div>

              {/* Digital Wallet */}
              <div
                className="fintech-module-box box-wallet"
                onClick={() => onNavigate('wallet')}
                role="button"
                tabIndex={0}
              >
                <div className="module-box-top">
                  <div className="module-bubble bubble-emerald">
                    <Wallet size={22} />
                  </div>
                  <span className="module-status-chip chip-emerald">Escrow Ready</span>
                </div>
                <h4>Digital Tuition Wallet</h4>
                <p>Pre-fund your family escrow wallet for automated settlement without repeated manual transfers.</p>
                <div className="module-box-footer">
                  <span className="module-action-link">
                    View Statement ({walletBalance.toFixed(2)} ETB) <ChevronRight size={14} />
                  </span>
                </div>
              </div>

              {/* Online Payment Gateway */}
              <div
                className="fintech-module-box box-gateway"
                onClick={() => onNavigate('invoices')}
                role="button"
                tabIndex={0}
              >
                <div className="module-box-top">
                  <div className="module-bubble bubble-cyan">
                    <CreditCard size={22} />
                  </div>
                  <span className="module-status-chip chip-cyan">Chapa</span>
                </div>
                <h4>Direct Online Payments</h4>
                <p>Support for Telebirr, CBE Birr, and Visa/Mastercard with instant digital receipt generation.</p>
                <div className="module-box-footer">
                  <span className="module-action-link">
                    Pay Online via Invoices <ChevronRight size={14} />
                  </span>
                </div>
              </div>

              {/* SMS & Alerts Notification Hub */}
              <div className="fintech-module-box box-notifications">
                <div className="module-box-top">
                  <div className="module-bubble bubble-rose">
                    <Bell size={22} />
                  </div>
                  <span className="module-status-chip chip-subtle">SMS Ready</span>
                </div>
                <h4>Billing Alerts & SMS</h4>
                <p>Instant SMS notifications and email payment receipts upon every automated or manual settlement.</p>
                <div className="module-box-footer">
                  <span className="module-action-link text-muted">
                    Automated via Twilio / Ethio Telecom
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Staff Invoicing */}
              <div
                className="fintech-module-box box-invoices"
                onClick={() => onNavigate('invoices')}
                role="button"
                tabIndex={0}
              >
                <div className="module-box-top">
                  <div className="module-bubble bubble-amber">
                    <Receipt size={22} />
                  </div>
                  <span className="module-status-chip chip-live">Live</span>
                </div>
                <h4>School Billing & Invoices</h4>
                <p>Generate batch invoices for all enrolled students across grades, adjust fee structures, and monitor status.</p>
                <div className="module-box-footer">
                  <span className="module-action-link">
                    Open Invoicing Console <ChevronRight size={14} />
                  </span>
                </div>
              </div>

              {/* Students Roster */}
              <div
                className="fintech-module-box box-students"
                onClick={() => onNavigate('students')}
                role="button"
                tabIndex={0}
              >
                <div className="module-box-top">
                  <div className="module-bubble bubble-teal">
                    <Users size={22} />
                  </div>
                  <span className="module-status-chip chip-live">Active</span>
                </div>
                <h4>Student Roster & Profiles</h4>
                <p>Manage registered students scoped to your campus, link parents, and maintain billing accounts.</p>
                <div className="module-box-footer">
                  <span className="module-action-link">
                    Open Student Roster <ChevronRight size={14} />
                  </span>
                </div>
              </div>


              {/* Multi-Tenant Governance */}
              <div className="fintech-module-box box-school">
                <div className="module-box-top">
                  <div className="module-bubble bubble-purple">
                    <Building size={22} />
                  </div>
                  <span className="module-status-chip chip-purple">Isolated</span>
                </div>
                <h4>Campus Tenant Governance</h4>
                <p>Institutional security isolation ensuring student balances and invoices are segregated per school.</p>
                <div className="module-box-footer">
                  <span className="module-action-link">
                    Tenant Settings <ChevronRight size={14} />
                  </span>
                </div>
              </div>

              {/* Financial Analytics */}
              <div className="fintech-module-box box-analytics">
                <div className="module-box-top">
                  <div className="module-bubble bubble-emerald">
                    <BarChart3 size={22} />
                  </div>
                  <span className="module-status-chip chip-emerald">Analytics</span>
                </div>
                <h4>Collection Reports & Ledger</h4>
                <p>Institutional reconciliation reports, exportable transaction ledgers, and collection rate analytics.</p>
                <div className="module-box-footer">
                  <span className="module-action-link">
                    Audit & Reports <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
