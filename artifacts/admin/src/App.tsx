import { useState } from 'react';
import './App.css';
import DashboardOverview from './pages/DashboardOverview';
import UsersList from './pages/UsersList';
import Reports from './pages/Reports';
import Providers from './pages/Providers';
import Location from './pages/Location';
import AdminLogin from './pages/AdminLogin';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const handleLogin = (token: string, user: AuthUser) => {
    localStorage.setItem('token', token);
    setAuthToken(token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setCurrentUser(null);
  };

  if (!authToken) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'providers', label: 'Providers', icon: '🔧' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'reports', label: 'Reports', icon: '📋' },
  ];

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardOverview />;
      case 'users': return <UsersList token={authToken} />;
      case 'providers': return <Providers token={authToken} />;
      case 'location': return <Location token={authToken} />;
      case 'reports': return <Reports token={authToken} />;
      default: return <DashboardOverview />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">⚙</span>
          <span className="logo-text">ServiPro Admin</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar-sm">{currentUser?.name[0]}</div>
            <div className="user-details">
              <span className="user-name">{currentUser?.name}</span>
              <span className="user-role">{currentUser?.role}</span>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
