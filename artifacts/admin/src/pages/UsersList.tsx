import { useEffect, useState } from 'react';
import './UsersList.css';
import './Providers.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  category?: string;
  region?: string;
  createdAt?: string;
}

interface UsersListProps {
  token: string;
}

const ROLE_FILTER_OPTIONS = ['all', 'client', 'provider', 'admin'];
const STATUS_LABEL: Record<string, string> = { active: 'Active', pending: 'Pending', suspended: 'Suspended' };

export default function UsersList({ token }: UsersListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Failed to load users'); return r.json(); })
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const r = await fetch(`/api/users/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error('Update failed');
      const updated = await r.json();
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
    } catch {
      alert('Failed to update user status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );

  const roleCounts: Record<string, number> = { all: users.length };
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1; });

  return (
    <div className="users-container">
      <div className="page-header">
        <h1>Users</h1>
        <p>Manage all clients and administrators on the platform.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="filter-tabs" style={{ marginBottom: 0 }}>
          {ROLE_FILTER_OPTIONS.map(r => (
            <button
              key={r}
              className={`filter-tab ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
              <span className="filter-count">{roleCounts[r] ?? 0}</span>
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card table-card">
        <div className="table-header">
          <span className="table-title">Users</span>
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
          <div className="table-loading">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No users found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{user.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {STATUS_LABEL[user.status] ?? user.status}
                    </span>
                  </td>
                  <td className="date-cell">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {user.status === 'active' ? (
                        <button
                          className="action-btn danger"
                          disabled={updatingId === user.id || user.role === 'admin'}
                          title={user.role === 'admin' ? 'Cannot suspend admin' : ''}
                          onClick={() => updateStatus(user.id, 'suspended')}
                        >
                          {updatingId === user.id ? '…' : 'Suspend'}
                        </button>
                      ) : (
                        <button
                          className="action-btn approve"
                          disabled={updatingId === user.id}
                          onClick={() => updateStatus(user.id, 'active')}
                        >
                          {updatingId === user.id ? '…' : 'Activate'}
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
