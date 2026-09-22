import React from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogOut, User, Building, ShieldCheck } from 'lucide-react';

export default function Navbar() {
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
      <div className="navbar-brand">
        <div className="brand-icon">
          <GraduationCap size={26} />
        </div>
        <div className="brand-text">
          <span className="brand-title">FeeBridge</span>
          <span className="brand-subtitle">School Fee & Digital Wallet</span>
        </div>
      </div>

      {user && (
        <div className="navbar-user">
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
