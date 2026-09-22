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
  ShieldCheck
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <div className="telemetry-tags">
            <span className="telemetry-pill">
              <Sparkles size={13} className="sparkle-icon" /> Intelligent Fee Infrastructure
            </span>
            <span className="telemetry-pill pill-cyan">
              <ShieldCheck size={13} /> Bank-Grade Security
            </span>
          </div>
          <h1>
            Welcome back, {user?.first_name} {user?.last_name}
          </h1>
          <p>
            {isParent && 'Track your student invoices, settle tuition with one-click Telebirr or digital wallet, and manage children billing profiles.'}
            {isStaff && `Campus Operations Portal for ${user?.school_name || 'your assigned school'}. Manage grade fee structures, students, and collection analytics.`}
            {isAdmin && 'FeeBridge Super-Administration Console. Global oversight across schools, students, automated deductions, and financial reports.'}
          </p>
        </div>
        <div className="system-pill">
          <span className="dot-active"></span>
          <span>Engine Active • API v1</span>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="card profile-card">
        <h3>Account Overview</h3>
        <div className="profile-grid">
          <div className="profile-item">
            <span className="profile-label">Email</span>
            <span className="profile-value">{user?.email}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">Phone Number</span>
            <span className="profile-value">{user?.phone_number || 'N/A'}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">Account Role</span>
            <span className="profile-value highlight-role">{user?.role}</span>
          </div>
          {user?.school_name && (
            <div className="profile-item">
              <span className="profile-label">Assigned School</span>
              <span className="profile-value highlight-school">{user?.school_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Portal Quick Cards */}
      <div className="features-section">
        <h3>Platform Modules</h3>
        <div className="module-grid">
          {isParent ? (
            <>
              <div className="module-card module-invoices">
                <div className="module-icon icon-amber">
                  <Receipt size={24} />
                </div>
                <h4>School Invoices</h4>
                <p>View pending monthly tuition invoices, due dates, and outstanding balances.</p>
                <span className="module-tag tag-invoices">Next Feature</span>
              </div>

              <div className="module-card module-wallet">
                <div className="module-icon icon-emerald">
                  <Wallet size={24} />
                </div>
                <h4>Digital Wallet</h4>
                <p>Deposit funds and enable automated invoice deductions without bank queues.</p>
                <span className="module-tag tag-wallet">Next Feature</span>
              </div>

              <div className="module-card module-pay">
                <div className="module-icon icon-cyan">
                  <CreditCard size={24} />
                </div>
                <h4>Online Gateway</h4>
                <p>Pay instantly with Telebirr, CBE Birr, or Bank Cards powered by Chapa.</p>
                <span className="module-tag tag-pay">Next Feature</span>
              </div>

              <div className="module-card module-notify">
                <div className="module-icon icon-rose">
                  <Bell size={24} />
                </div>
                <h4>Notifications</h4>
                <p>Real-time payment confirmations, upcoming due reminders, and alerts.</p>
                <span className="module-tag tag-notify">Next Feature</span>
              </div>
            </>
          ) : (
            <>
              <div className="module-card module-students">
                <div className="module-icon icon-teal">
                  <Users size={24} />
                </div>
                <h4>Student Management</h4>
                <p>View and register enrolled students scoped to your school campus.</p>
                <span className="module-tag tag-ready">
                  <CheckCircle2 size={12} /> Ready
                </span>
              </div>

              <div className="module-card module-wallet">
                <div className="module-icon icon-emerald">
                  <BarChart3 size={24} />
                </div>
                <h4>Financial Analytics</h4>
                <p>Access total billed, collection rates, and per-grade revenue breakdowns.</p>
                <span className="module-tag tag-wallet">Ready</span>
              </div>

              <div className="module-card module-invoices">
                <div className="module-icon icon-amber">
                  <Receipt size={24} />
                </div>
                <h4>Fee Structures</h4>
                <p>Configure grade tuition rates and manage monthly invoice schedules.</p>
                <span className="module-tag tag-invoices">Ready</span>
              </div>

              <div className="module-card module-school">
                <div className="module-icon icon-violet">
                  <Building size={24} />
                </div>
                <h4>School Multi-Tenancy</h4>
                <p>Isolated student records, invoices, and accounting per school.</p>
                <span className="module-tag tag-school">
                  <CheckCircle2 size={12} /> Active
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
