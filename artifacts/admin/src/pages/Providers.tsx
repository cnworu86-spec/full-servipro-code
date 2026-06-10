import { useEffect, useState } from 'react';
import './UsersList.css';
import './Providers.css';

interface Provider {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  category?: string;
  region?: string;
  createdAt?: string;
}

interface ProvidersProps {
  token: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
};

export default function Providers({ token }: ProvidersProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/users?role=provider', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error('Failed to load providers'); return r.json(); })
      .then(setProviders)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const r = await fetch(`/api/users/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error('Update failed');
      const updated = await r.json();
      setProviders(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    } catch {
      alert('Failed to update provider status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === 'all' ? providers : providers.filter(p => p.status === filter);
  const counts = {
    all: providers.length,
    pending: providers.filter(p => p.status === 'pending').length,
    active: providers.filter(p => p.status === 'active').length,
    suspended: providers.filter(p => p.status === 'suspended').length,
  };

  return (
    <div className="users-container">
      <div className="page-header">
        <h1>Service Providers</h1>
        <p>Approve, reject, or suspend service providers.</p>
      </div>

      <div className="filter-tabs">
        {(['all', 'pending', 'active', 'suspended'] as const).map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''} ${f === 'pending' && counts.pending > 0 ? 'has-badge' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="filter-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="card table-card">
        <div className="table-header">
          <span className="table-title">
            {filter === 'all' ? 'All Providers' : `${STATUS_LABELS[filter] ?? filter} Providers`}
          </span>
          <span className="table-count">
            {loading ? 'Loading…' : error ? '⚠️ Error' : `${filtered.length} shown`}
          </span>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1.5rem', color: '#f87171', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="table-loading">Loading providers…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No providers in this category.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Category</th>
                <th>Region</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{p.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: '#94a3b8', textTransform: 'capitalize' }}>
                    {p.category || '—'}
                  </td>
                  <td style={{ color: '#94a3b8' }}>{p.region || '—'}</td>
                  <td>
                    <span className={`status-badge status-${p.status}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="date-cell">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {p.status !== 'active' && (
                        <button
                          className="action-btn approve"
                          disabled={updatingId === p.id}
                          onClick={() => updateStatus(p.id, 'active')}
                        >
                          {updatingId === p.id ? '…' : 'Approve'}
                        </button>
                      )}
                      {p.status !== 'suspended' && (
                        <button
                          className="action-btn danger"
                          disabled={updatingId === p.id}
                          onClick={() => updateStatus(p.id, 'suspended')}
                        >
                          {updatingId === p.id ? '…' : p.status === 'pending' ? 'Reject' : 'Suspend'}
                        </button>
                      )}
                      {p.status === 'suspended' && (
                        <button
                          className="action-btn view"
                          disabled={updatingId === p.id}
                          onClick={() => updateStatus(p.id, 'pending')}
                        >
                          {updatingId === p.id ? '…' : 'Reinstate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
