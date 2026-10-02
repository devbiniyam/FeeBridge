import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/Dashboard';
import InvoicesList from './components/InvoicesList';
import WalletView from './components/WalletView';
import StudentsView from './components/StudentsView';
import NotificationsView from './components/NotificationsView';
import FeeStructuresView from './components/FeeStructuresView';
import ReportsView from './components/ReportsView';
import AdminCampusesView from './components/AdminCampusesView';
import WalletDepositModal from './components/WalletDepositModal';
import GenerateInvoicesModal from './components/GenerateInvoicesModal';
import { notificationService } from './services/api';
import { GraduationCap } from 'lucide-react';
import './App.css';

function MainContent() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot-password'
  const [authEmail, setAuthEmail] = useState('');
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'invoices' | 'wallet' | 'students' | 'notifications'


  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    // Refresh unread counts every 20 seconds
    const timer = setInterval(fetchUnreadCount, 20000);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Loading FeeBridge session...</p>
      </div>
    );
  }

  // Unauthenticated: Professional Centered Auth Shell
  if (!user) {
    return (
      <div className="auth-outer-container">
        <div className="auth-brand-masthead">
          <div className="auth-brand-logo">
            <GraduationCap size={32} />
          </div>
          <h1>FeeBridge</h1>
          <p className="auth-brand-sub">Intelligent School Fee & Escrow Infrastructure</p>
        </div>
        <div className="auth-wrapper">
          {authMode === 'login' ? (
            <Login
              onSwitchToRegister={() => setAuthMode('register')}
              onSwitchToForgotPassword={(email) => {
                setAuthEmail(email);
                setAuthMode('forgot-password');
              }}
              initialEmail={authEmail}
            />
          ) : authMode === 'register' ? (
            <Register onSwitchToLogin={() => setAuthMode('login')} />
          ) : (
            <ForgotPassword
              onSwitchToLogin={(email) => {
                if (email) setAuthEmail(email);
                setAuthMode('login');
              }}
            />
          )}
        </div>

      </div>
    );
  }

  // Authenticated: Pro Fintech Two-Column App Shell (Stripe / Mercury style)
  return (
    <div className="app-shell">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        unreadCount={unreadCount}
      />

      {/* Main Viewport */}
      <div className="app-viewport">
        {/* Sticky Fintech Top Bar */}
        <Navbar
          currentView={currentView}
          onSelectView={setCurrentView}
          onTriggerDeposit={() => setIsDepositModalOpen(true)}
          onTriggerGenerate={() => setIsGenerateModalOpen(true)}
          unreadCount={unreadCount}
          onNotificationRead={fetchUnreadCount}
        />

        {/* Viewport Content */}
        <main className="main-viewport-content">
          {currentView === 'invoices' ? (
            <InvoicesList onNavigateBack={() => setCurrentView('dashboard')} />
          ) : currentView === 'wallet' ? (
            <WalletView
              onNavigateBack={() => setCurrentView('dashboard')}
              onNavigateToInvoices={() => setCurrentView('invoices')}
            />
          ) : currentView === 'students' ? (
            <StudentsView
              onNavigateBack={() => setCurrentView('dashboard')}
              onNavigateToInvoices={() => setCurrentView('invoices')}
            />
          ) : currentView === 'notifications' ? (
            <NotificationsView
              onNavigateBack={() => setCurrentView('dashboard')}
              onNavigateToInvoices={() => {
                setCurrentView('invoices');
              }}
            />
          ) : currentView === 'fees' ? (
            <FeeStructuresView
              onNavigateBack={() => setCurrentView('dashboard')}
              onNavigateToGenerate={() => setIsGenerateModalOpen(true)}
              onNavigateToInvoices={() => setCurrentView('invoices')}
            />
          ) : currentView === 'reports' ? (
            <ReportsView
              onNavigateBack={() => setCurrentView('dashboard')}
              onNavigateToInvoices={() => setCurrentView('invoices')}
            />
          ) : currentView === 'campuses' ? (
            <AdminCampusesView
              onNavigateBack={() => setCurrentView('dashboard')}
              onNavigateToInvoices={() => setCurrentView('invoices')}
              onNavigateToReports={() => setCurrentView('reports')}
            />
          ) : (
            <Dashboard
              onNavigate={setCurrentView}
              onTriggerDeposit={() => setIsDepositModalOpen(true)}
              onTriggerGenerate={() => setIsGenerateModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Global Quick Action Modals */}
      {isDepositModalOpen && (
        <WalletDepositModal
          currentBalance={user?.wallet_balance}
          onClose={() => setIsDepositModalOpen(false)}
          onSuccess={() => {
            setIsDepositModalOpen(false);
            fetchUnreadCount();
          }}
        />
      )}

      {isGenerateModalOpen && (
        <GenerateInvoicesModal
          onClose={() => setIsGenerateModalOpen(false)}
          onSuccess={() => {
            setIsGenerateModalOpen(false);
            fetchUnreadCount();
            if (currentView !== 'invoices') {
              setCurrentView('invoices');
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
