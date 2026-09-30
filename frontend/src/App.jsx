import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import InvoicesList from './components/InvoicesList';
import WalletView from './components/WalletView';
import WalletDepositModal from './components/WalletDepositModal';
import GenerateInvoicesModal from './components/GenerateInvoicesModal';
import { GraduationCap } from 'lucide-react';
import './App.css';

function MainContent() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'invoices' | 'wallet'
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

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
            <Login onSwitchToRegister={() => setAuthMode('register')} />
          ) : (
            <Register onSwitchToLogin={() => setAuthMode('login')} />
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
      />

      {/* Main Viewport */}
      <div className="app-viewport">
        {/* Sticky Fintech Top Bar */}
        <Navbar
          currentView={currentView}
          onSelectView={setCurrentView}
          onTriggerDeposit={() => setIsDepositModalOpen(true)}
          onTriggerGenerate={() => setIsGenerateModalOpen(true)}
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
          }}
        />
      )}

      {isGenerateModalOpen && (
        <GenerateInvoicesModal
          onClose={() => setIsGenerateModalOpen(false)}
          onSuccess={() => {
            setIsGenerateModalOpen(false);
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
