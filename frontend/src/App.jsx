import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import InvoicesList from './components/InvoicesList';
import './App.css';

function MainContent() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'invoices'

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Loading FeeBridge session...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar currentView={currentView} onSelectView={setCurrentView} />
      <main className="main-content">
        {user ? (
          currentView === 'invoices' ? (
            <InvoicesList onNavigateBack={() => setCurrentView('dashboard')} />
          ) : (
            <Dashboard onNavigate={setCurrentView} />
          )
        ) : (
          <div className="auth-wrapper">
            {authMode === 'login' ? (
              <Login onSwitchToRegister={() => setAuthMode('register')} />
            ) : (
              <Register onSwitchToLogin={() => setAuthMode('login')} />
            )}
          </div>
        )}
      </main>
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
