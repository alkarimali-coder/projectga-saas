import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Settings } from 'lucide-react';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <Link to="/" className="nav-brand">
            COAM SaaS Platform
          </Link>
          
          <ul className="nav-links">
            <li>
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link to="/tenants" className="nav-link">
                  Tenant Management
                </Link>
              </li>
            )}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16} />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {user?.first_name} {user?.last_name}
              </span>
              <span 
                style={{ 
                  fontSize: '0.75rem', 
                  backgroundColor: user?.role === 'super_admin' ? '#3b82f6' : '#6b7280',
                  color: 'white',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}
              >
                {user?.role === 'super_admin' ? 'Admin' : user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{ padding: '0.375rem 0.75rem' }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;