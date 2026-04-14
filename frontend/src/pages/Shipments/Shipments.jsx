import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shipmentsApi } from '../../services/api';
import toast from 'react-hot-toast';
import './shipments.css';
import { getStatusBadge, getRiskColor } from './shipmentsData';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
const Shipments = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ origin: '', destination: '', cargo: '', weight: '', carrier: '', weather: 'Clear', traffic: 'Normal', description: '' });

  const fetchShipmentsFallback = async () => {
    try {
      const res = await shipmentsApi.getAll({ search, status: statusFilter });
      setShipments(res.data || []);
    } catch (err) {
      toast.error('Failed to load shipments (Fallback)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const shipmentsRef = ref(database, 'shipments');
    const unsubscribe = onValue(shipmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let results = Object.values(data);
        
        // Apply frontend filtering for Realtime DB
        if (statusFilter !== 'all') {
          results = results.filter(s => s.status === statusFilter);
        }
        if (search) {
          const q = search.toLowerCase();
          results = results.filter(s =>
            s.trackingNumber.toLowerCase().includes(q) ||
            s.origin.toLowerCase().includes(q) ||
            s.destination.toLowerCase().includes(q)
          );
        }
        
        // Sort newest first
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setShipments(results);
        setLoading(false);
      } else {
        setShipments([]);
        setLoading(false);
      }
    }, (error) => {
      console.warn("Firebase permission denied. Falling back to local backend REST API for tracking.", error);
      fetchShipmentsFallback(); // Auto-fallback if rules are locked
    });

    // We also run the fallback just in case Firebase hangs
    const fallbackTimeout = setTimeout(() => {
      if (loading) fetchShipmentsFallback();
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimeout);
    };
  }, [search, statusFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await shipmentsApi.update(editingId, form);
        toast.success('Shipment updated successfully!');
      } else {
        await shipmentsApi.create(form);
        toast.success('Shipment created successfully!');
      }
      setShowModal(false);
      setForm({ origin: '', destination: '', cargo: '', weight: '', carrier: '', weather: 'Clear', traffic: 'Normal', description: '', status: 'on-time', riskLevel: 0 });
      fetchShipmentsFallback();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (s, e) => {
    e.stopPropagation();
    setForm({
      origin: s.origin || '', destination: s.destination || '', 
      cargo: s.cargo || '', weight: s.weight || '', 
      carrier: s.carrier || '', weather: s.weather || 'Clear', 
      traffic: s.traffic || 'Normal', description: s.description || '',
      status: s.status || 'on-time', riskLevel: s.riskLevel || 0
    });
    setEditingId(s.id);
    setEditMode(true);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setForm({ origin: '', destination: '', cargo: '', weight: '', carrier: '', weather: 'Clear', traffic: 'Normal', description: '', status: 'on-time', riskLevel: 0 });
    setEditMode(false);
    setEditingId(null);
    setShowModal(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this shipment?')) return;
    try {
      await shipmentsApi.delete(id);
      toast.success('Shipment deleted');
      fetchShipments();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const counts = {
    all: shipments.length,
    'on-time': shipments.filter(s => s.status === 'on-time').length,
    risk: shipments.filter(s => s.status === 'risk').length,
    delayed: shipments.filter(s => s.status === 'delayed').length,
  };

  const role = localStorage.getItem('sc_role') || 'user';
  const isAdmin = role === 'admin';

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">📦 Shipments</h1>
          <p className="page-subtitle">{shipments.length} active shipments tracked globally</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            ＋ New Shipment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🔍</span>
            <input
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search tracking #, origin, destination..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status tabs */}
          <div className="tabs" style={{ minWidth: 'fit-content' }}>
            {['all', 'on-time', 'risk', 'delayed'].map(s => (
              <button
                key={s}
                className={`tab-btn ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? `All (${counts.all})` :
                  s === 'on-time' ? `✅ On-Time (${counts['on-time']})` :
                  s === 'risk' ? `⚠️ Risk (${counts.risk})` :
                  `❌ Delayed (${counts.delayed})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
              Loading shipments...
            </div>
          ) : shipments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No Shipments Found</div>
              <div className="empty-text">Try adjusting your search or filter, or create a new shipment.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Route</th>
                  <th>Cargo</th>
                  <th>Carrier</th>
                  <th>ETA</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id} onClick={() => navigate(`/shipments/${s.id}`)}>
                    <td>
                      <div className="primary-text">{s.trackingNumber}</div>
                      <div className="secondary-text">{s.id}</div>
                    </td>
                    <td>
                      <div className="secondary-text" style={{ maxWidth: '200px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>🟢 {s.origin}</span><br />
                        <span style={{ color: 'var(--text-muted)' }}>🏁 {s.destination}</span>
                      </div>
                    </td>
                    <td>
                      <div className="secondary-text">{s.cargo}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.weight}</div>
                    </td>
                    <td className="secondary-text">{s.carrier}</td>
                    <td className="secondary-text">
                      {s.estimatedDelivery
                        ? new Date(s.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'TBD'}
                    </td>
                    <td>
                      <div className="risk-bar-container">
                        <div className="risk-bar-track" style={{ width: '60px' }}>
                          <div className="risk-bar-fill" style={{ width: `${s.riskLevel || 0}%`, background: getRiskColor(s.riskLevel || 0) }} />
                        </div>
                        <span className="risk-value" style={{ color: getRiskColor(s.riskLevel || 0), fontSize: '12px', fontWeight: 700 }}>
                          {s.riskLevel || 0}%
                        </span>
                      </div>
                    </td>
                    <td>{getStatusBadge(s.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/shipments/${s.id}`)}>
                          View
                        </button>
                        {isAdmin && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={(e) => handleEdit(s, e)}>
                              ✏️
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(s.id, e)}>
                              🗑️
                            </button>
                          </>
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

      {/* Create / Edit Shipment Modal */}
      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editMode ? '✏️ Edit Shipment' : '📦 New Shipment'}
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Origin *</label>
                  <input className="form-input" placeholder="Shanghai, China" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination *</label>
                  <input className="form-input" placeholder="Los Angeles, USA" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Cargo Type *</label>
                  <input className="form-input" placeholder="Electronics" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight</label>
                  <input className="form-input" placeholder="2,400 kg" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Carrier</label>
                  <input className="form-input" placeholder="Pacific Freight" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Weather Condition</label>
                  <select className="form-select" value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })}>
                    <option>Clear</option>
                    <option>Partly Cloudy</option>
                    <option>Heavy Rain</option>
                    <option>Storm Warning</option>
                    <option>Cyclone Warning</option>
                    <option>Foggy</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status || 'on-time'} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="on-time">On-Time</option>
                    <option value="risk">At Risk</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Risk Level (%)</label>
                  <input type="number" min="0" max="100" className="form-input" value={form.riskLevel || 0} onChange={e => setForm({ ...form, riskLevel: Number(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Additional notes..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Save Changes' : 'Create Shipment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipments;
