import { useEffect, useState } from 'react';
import './Location.css';
import './UsersList.css';
import './Providers.css';

interface RegionStat {
  region: string;
  total: number;
  active: number;
  pending: number;
}

interface Provider {
  id: number;
  name: string;
  email: string;
  category?: string;
  region?: string;
  status: string;
  lat?: number | null;
  lng?: number | null;
}

interface LocationProps {
  token: string;
}

const GHANA_REGIONS = [
  "Greater Accra","Ashanti","Western","Eastern","Central","Northern",
  "Upper East","Upper West","Volta","Brong-Ahafo","Savannah","Bono East",
  "Ahafo","North East","Oti","Western North",
];

export default function Location({ token }: LocationProps) {
  const [regions, setRegions] = useState<RegionStat[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [saving, setSaving] = useState(false);

  // GPS distance tester
  const [testLat, setTestLat] = useState('');
  const [testLng, setTestLng] = useState('');
  const [testRadius, setTestRadius] = useState('10');
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testing, setTesting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [regRes, provRes] = await Promise.all([
        fetch('/api/providers/regions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users?role=provider', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const regData = await regRes.json();
      const provData = await provRes.json();
      setRegions(regData.regions ?? []);
      setProviders(Array.isArray(provData) ? provData : []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [token]);

  const startEdit = (p: Provider) => {
    setEditingId(p.id);
    setEditLat(p.lat != null ? String(p.lat) : '');
    setEditLng(p.lng != null ? String(p.lng) : '');
    setEditRegion(p.region ?? '');
  };

  const saveLocation = async (id: number) => {
    setSaving(true);
    try {
      const body: Record<string, any> = { region: editRegion };
      if (editLat) body.lat = parseFloat(editLat);
      if (editLng) body.lng = parseFloat(editLng);

      const r = await fetch(`/api/providers/${id}/location`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('Save failed');
      setProviders(prev => prev.map(p =>
        p.id === id ? { ...p, lat: body.lat ?? p.lat, lng: body.lng ?? p.lng, region: editRegion } : p
      ));
      setEditingId(null);
    } catch {
      alert('Failed to save location.');
    } finally {
      setSaving(false);
    }
  };

  const runGpsTest = async () => {
    if (!testLat || !testLng) return;
    setTesting(true);
    setTestResults(null);
    try {
      const url = `/api/providers?lat=${testLat}&lng=${testLng}&radius=${testRadius}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      setTestResults(Array.isArray(data) ? data : []);
    } catch {
      setTestResults([]);
    } finally {
      setTesting(false);
    }
  };

  const filtered = regionFilter
    ? providers.filter(p => p.region === regionFilter)
    : providers;

  const topRegions = [...regions].sort((a, b) => b.total - a.total).filter(r => r.total > 0).slice(0, 6);
  const maxCount = Math.max(...regions.map(r => r.total), 1);
  const hasGps = providers.filter(p => p.lat != null && p.lng != null).length;

  return (
    <div>
      <div className="page-header">
        <h1>Location Management</h1>
        <p>Region-based filtering and GPS distance sorting for service providers.</p>
      </div>

      {/* Summary row */}
      <div className="loc-summary-row">
        <div className="card loc-stat-card">
          <div className="loc-stat-icon" style={{ background: '#6366f122', color: '#6366f1' }}>📍</div>
          <div className="loc-stat-val">{providers.length}</div>
          <div className="loc-stat-label">Total Providers</div>
        </div>
        <div className="card loc-stat-card">
          <div className="loc-stat-icon" style={{ background: '#10b98122', color: '#10b981' }}>🛰</div>
          <div className="loc-stat-val">{hasGps}</div>
          <div className="loc-stat-label">With GPS Coords</div>
        </div>
        <div className="card loc-stat-card">
          <div className="loc-stat-icon" style={{ background: '#3b82f622', color: '#3b82f6' }}>🗺</div>
          <div className="loc-stat-val">{regions.filter(r => r.total > 0).length}</div>
          <div className="loc-stat-label">Active Regions</div>
        </div>
        <div className="card loc-stat-card">
          <div className="loc-stat-icon" style={{ background: '#f59e0b22', color: '#f59e0b' }}>⚠️</div>
          <div className="loc-stat-val">{providers.length - hasGps}</div>
          <div className="loc-stat-label">Missing GPS</div>
        </div>
      </div>

      <div className="loc-two-col">
        {/* Region distribution */}
        <div className="card">
          <h2 className="section-title">Provider Distribution by Region</h2>
          {loading ? (
            <div style={{ color: '#475569', fontSize: '0.875rem' }}>Loading…</div>
          ) : topRegions.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.875rem' }}>No providers assigned to regions yet.</div>
          ) : (
            <div className="region-bars">
              {topRegions.map(r => (
                <div key={r.region} className="region-bar-row">
                  <span className="region-bar-name">{r.region}</span>
                  <div className="region-bar-wrap">
                    <div
                      className="region-bar-fill"
                      style={{ width: `${Math.round((r.total / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="region-bar-count">
                    <span className="rbc-active">{r.active}</span>
                    {r.pending > 0 && <span className="rbc-pending">+{r.pending}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GPS Distance Tester */}
        <div className="card">
          <h2 className="section-title">GPS Distance Tester</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
            Enter coordinates to find providers within a radius using the Haversine formula.
          </p>
          <div className="gps-test-form">
            <div className="gps-row">
              <div className="form-group-sm">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 5.6037"
                  value={testLat}
                  onChange={e => setTestLat(e.target.value)}
                  className="loc-input"
                />
              </div>
              <div className="form-group-sm">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. -0.1870"
                  value={testLng}
                  onChange={e => setTestLng(e.target.value)}
                  className="loc-input"
                />
              </div>
              <div className="form-group-sm">
                <label>Radius (km)</label>
                <input
                  type="number"
                  min="1"
                  value={testRadius}
                  onChange={e => setTestRadius(e.target.value)}
                  className="loc-input"
                />
              </div>
            </div>
            <button
              className="action-btn approve"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
              onClick={runGpsTest}
              disabled={testing || !testLat || !testLng}
            >
              {testing ? 'Searching…' : 'Find Nearby Providers'}
            </button>
          </div>

          {testResults !== null && (
            <div className="gps-results">
              <div className="gps-results-header">
                {testResults.length === 0
                  ? 'No active providers found within this radius.'
                  : `${testResults.length} provider${testResults.length !== 1 ? 's' : ''} found:`}
              </div>
              {testResults.map(p => (
                <div key={p.id} className="gps-result-row">
                  <div className="gps-result-name">{p.name}</div>
                  <div className="gps-result-meta">{p.category ?? 'General'} · {p.region ?? 'No region'}</div>
                  <div className="gps-result-dist">
                    {p.distanceKm != null ? `${p.distanceKm} km away` : 'No GPS'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Provider location editor */}
      <div className="card table-card" style={{ marginTop: '1.5rem' }}>
        <div className="table-header">
          <span className="table-title">Provider Locations</span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="loc-select"
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
            >
              <option value="">All Regions</option>
              {GHANA_REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <span className="table-count">{filtered.length} shown</span>
          </div>
        </div>

        {loading ? (
          <div className="table-loading">Loading providers…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No providers found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Region</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>GPS Status</th>
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
                        <div style={{ fontSize: '0.73rem', color: '#64748b' }}>{p.category ?? 'No category'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {editingId === p.id ? (
                      <select
                        className="loc-select"
                        value={editRegion}
                        onChange={e => setEditRegion(e.target.value)}
                      >
                        <option value="">— No region —</option>
                        {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span style={{ color: p.region ? '#cbd5e1' : '#475569' }}>
                        {p.region ?? '—'}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingId === p.id ? (
                      <input
                        type="number"
                        step="any"
                        placeholder="5.6037"
                        value={editLat}
                        onChange={e => setEditLat(e.target.value)}
                        className="loc-input-sm"
                      />
                    ) : (
                      <span style={{ color: p.lat != null ? '#94a3b8' : '#334155', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {p.lat != null ? p.lat.toFixed(4) : '—'}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingId === p.id ? (
                      <input
                        type="number"
                        step="any"
                        placeholder="-0.1870"
                        value={editLng}
                        onChange={e => setEditLng(e.target.value)}
                        className="loc-input-sm"
                      />
                    ) : (
                      <span style={{ color: p.lng != null ? '#94a3b8' : '#334155', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {p.lng != null ? p.lng.toFixed(4) : '—'}
                      </span>
                    )}
                  </td>
                  <td>
                    {p.lat != null && p.lng != null ? (
                      <span className="status-badge status-active">📍 Set</span>
                    ) : (
                      <span className="status-badge status-pending">⚠ Missing</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingId === p.id ? (
                        <>
                          <button
                            className="action-btn approve"
                            disabled={saving}
                            onClick={() => saveLocation(p.id)}
                          >
                            {saving ? '…' : 'Save'}
                          </button>
                          <button
                            className="action-btn view"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="action-btn view"
                          onClick={() => startEdit(p)}
                        >
                          Edit Location
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
