import { useEffect, useState } from 'react';
import './DashboardOverview.css';

interface TopService {
  serviceType: string;
  count: number;
}

interface Stats {
  totalUsers: number;
  totalProviders: number;
  activeProviders: number;
  pendingProviders: number;
  bookingsToday: number;
  pendingReports: number;
  totalBookings: number;
  completedBookings: number;
  topServices: TopService[];
}

const token = () => localStorage.getItem('token') || '';

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/stats', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(setStats)
      .catch(() => setError('Could not load stats'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cards = [
    { title: 'Total Users', value: stats?.totalUsers, icon: '👥', color: '#6366f1' },
    { title: 'Active Providers', value: stats?.activeProviders, icon: '🔧', color: '#10b981' },
    { title: 'Total Bookings', value: stats?.totalBookings, icon: '📅', color: '#3b82f6' },
    { title: 'Pending Reports', value: stats?.pendingReports, icon: '⚠️', color: '#f59e0b' },
  ];

  const completionRate = stats && stats.totalBookings > 0
    ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
    : 0;

  const maxServiceCount = stats?.topServices?.[0]?.count ?? 1;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Dashboard</h1>
            <p>Platform overview — live data from the database.</p>
          </div>
          <button className="refresh-btn" onClick={load} disabled={loading}>
            {loading ? '↻ Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">⚠️ {error}</div>
      )}

      <div className="dashboard-grid">
        {cards.map((card, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-top">
              <span className="stat-icon" style={{ background: card.color + '22', color: card.color }}>
                {card.icon}
              </span>
            </div>
            <div className="stat-value">
              {loading ? <span className="stat-skeleton" /> : (card.value ?? 0)}
            </div>
            <div className="stat-title">{card.title}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-row">
        <div className="card" style={{ flex: 1 }}>
          <h2 className="section-title">Booking Summary</h2>
          <div className="booking-stats">
            <div className="booking-stat">
              <span className="bs-label">Total</span>
              <span className="bs-value">{loading ? '—' : stats?.totalBookings ?? 0}</span>
            </div>
            <div className="booking-stat">
              <span className="bs-label">Completed</span>
              <span className="bs-value" style={{ color: '#10b981' }}>
                {loading ? '—' : stats?.completedBookings ?? 0}
              </span>
            </div>
            <div className="booking-stat">
              <span className="bs-label">Today</span>
              <span className="bs-value" style={{ color: '#6366f1' }}>
                {loading ? '—' : stats?.bookingsToday ?? 0}
              </span>
            </div>
          </div>
          <div className="completion-bar-wrap">
            <div className="completion-bar-label">
              <span>Completion rate</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>{completionRate}%</span>
            </div>
            <div className="completion-bar-bg">
              <div
                className="completion-bar-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h2 className="section-title">Provider Status</h2>
          <div className="booking-stats">
            <div className="booking-stat">
              <span className="bs-label">Total</span>
              <span className="bs-value">{loading ? '—' : stats?.totalProviders ?? 0}</span>
            </div>
            <div className="booking-stat">
              <span className="bs-label">Active</span>
              <span className="bs-value" style={{ color: '#10b981' }}>
                {loading ? '—' : stats?.activeProviders ?? 0}
              </span>
            </div>
            <div className="booking-stat">
              <span className="bs-label">Pending Approval</span>
              <span className="bs-value" style={{ color: '#f59e0b' }}>
                {loading ? '—' : stats?.pendingProviders ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Most Requested Services</h2>
        {loading ? (
          <div className="services-loading">Loading services…</div>
        ) : !stats?.topServices?.length ? (
          <div className="services-empty">No booking data yet.</div>
        ) : (
          <div className="services-list">
            {stats.topServices.map((s, i) => (
              <div key={s.serviceType} className="service-row">
                <span className="service-rank">#{i + 1}</span>
                <span className="service-name">{s.serviceType || 'General'}</span>
                <div className="service-bar-wrap">
                  <div
                    className="service-bar"
                    style={{ width: `${Math.round((s.count / maxServiceCount) * 100)}%` }}
                  />
                </div>
                <span className="service-count">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
