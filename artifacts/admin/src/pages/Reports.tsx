import { useEffect, useState } from 'react';
import './UsersList.css';
import './Reports.css';
import './Providers.css';

interface Report {
  id: number;
  reason: string;
  status: string;
  adminNotes?: string | null;
  bookingId?: number | null;
  createdAt?: string;
  reporterId: number;
  reportedId: number;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reportedName?: string | null;
  reportedEmail?: string | null;
  reportedRole?: string | null;
}

interface ReportsProps {
  token: string;
}

const STATUS_OPTIONS = ['all', 'open', 'under_review', 'resolved'];
const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
};

export default function Reports({ token }: ReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');
  const [notesModal, setNotesModal] = useState<{ id: number; notes: string } | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/reports', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Failed to load reports'); return r.json(); })
      .then(setReports)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const updateStatus = async (id: number, status: string, adminNotes?: string) => {
    setUpdatingId(id);
    try {
      const r = await fetch(`/api/reports/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!r.ok) throw new Error('Update failed');
      const updated = await r.json();
      setReports(prev => prev.map(rp => rp.id === id ? { ...rp, ...updated } : rp));
      setNotesModal(null);
    } catch {
      alert('Failed to update report.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const counts: Record<string, number> = { all: reports.length };
  reports.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });

  return (
    <div className="users-container">
      <div className="page-header">
        <h1>Reports</h1>
        <p>Review and resolve user-submitted reports.</p>
      </div>

      <div className="filter-tabs">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            className={`filter-tab ${filter === s ? 'active' : ''} ${s === 'open' && (counts.open ?? 0) > 0 ? 'has-badge' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s] ?? s}
            <span className="filter-count">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="card table-card">
        <div className="table-header">
          <span className="table-title">
            {filter === 'all' ? 'All Reports' : (STATUS_LABEL[filter] ?? filter) + ' Reports'}
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
          <div className="table-loading">Loading reports…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No reports in this category.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Reporter</th>
                <th>Reported</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(report => (
                <tr key={report.id}>
                  <td className="date-cell" style={{ color: '#475569' }}>#{report.id}</td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.875rem' }}>
                      {report.reporterName ?? `User #${report.reporterId}`}
                    </div>
                    {report.reporterEmail && (
                      <div style={{ fontSize: '0.73rem', color: '#64748b' }}>{report.reporterEmail}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.875rem' }}>
                      {report.reportedName ?? `User #${report.reportedId}`}
                    </div>
                    {report.reportedRole && (
                      <span className={`role-badge role-${report.reportedRole}`} style={{ fontSize: '0.7rem' }}>
                        {report.reportedRole}
                      </span>
                    )}
                  </td>
                  <td className="reason-cell">{report.reason}</td>
                  <td>
                    <span className={`status-badge report-status-${report.status.replace('_', '-')}`}>
                      {STATUS_LABEL[report.status] ?? report.status}
                    </span>
                  </td>
                  <td className="date-cell">
                    {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {report.status === 'open' && (
                        <button
                          className="action-btn view"
                          disabled={updatingId === report.id}
                          onClick={() => updateStatus(report.id, 'under_review')}
                        >
                          {updatingId === report.id ? '…' : 'Review'}
                        </button>
                      )}
                      {report.status !== 'resolved' && (
                        <button
                          className="action-btn approve"
                          disabled={updatingId === report.id}
                          onClick={() => setNotesModal({ id: report.id, notes: report.adminNotes ?? '' })}
                        >
                          Resolve
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

      {notesModal && (
        <div className="modal-overlay" onClick={() => setNotesModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Resolve Report #{notesModal.id}</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Add optional admin notes before resolving.
            </p>
            <textarea
              className="modal-textarea"
              placeholder="Admin notes (optional)…"
              value={notesModal.notes}
              onChange={e => setNotesModal({ ...notesModal, notes: e.target.value })}
              rows={4}
            />
            <div className="modal-actions">
              <button className="action-btn view" onClick={() => setNotesModal(null)}>Cancel</button>
              <button
                className="action-btn approve"
                disabled={updatingId === notesModal.id}
                onClick={() => updateStatus(notesModal.id, 'resolved', notesModal.notes)}
              >
                {updatingId === notesModal.id ? 'Resolving…' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
