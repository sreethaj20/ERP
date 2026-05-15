import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaDownload, FaFilter } from 'react-icons/fa';
import { getAssets, createAsset, deleteAsset as deleteITAssetBackend } from '../../services/itService';
import api from '../../api/apiClient';

const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(','))
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const AssetInventory = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'Laptop',
    serial_number: '',
    status: 'Available',
    allocated_to: '',
    allocated_to_name: '',
    notes: ''
  });

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    const filtered = assets.filter(asset => 
      (asset.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (asset.serial_number || '').toLowerCase().includes(search.toLowerCase())
    ).filter(asset => statusFilter === 'all' || asset.status === statusFilter);
    
    setFilteredAssets(filtered);
    setShowEmptyState(filtered.length === 0 && assets.length > 0);
  }, [search, statusFilter, assets]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = await getAssets();
      setAssets(data || []);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (asset: any) => {
    setEditing(asset.id || asset.asset_id);
    setEditForm({ ...asset });
  };

  const saveEdit = async () => {
    try {
      // Prefer the string asset_id (e.g. "AST-001") over numeric DB id
      const aid = editForm.asset_id || editForm.id;
      if (!aid) {
        alert('Cannot identify asset to update.');
        return;
      }
      await api.put(`it/assets/${aid}`, {
        name: editForm.name,
        serial_number: editForm.serial_number,
        status: editForm.status,
        allocated_to: editForm.allocated_to,
        notes: editForm.notes,
        type: editForm.type,
      });
      loadAssets();
      setEditing(null);
    } catch (error) {
      console.error('Failed to update asset:', error);
      alert('Failed to update asset. Please try again.');
    }
  };

  const deleteAsset = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await deleteITAssetBackend(id);
        loadAssets();
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    }
  };

  const exportAssets = () => {
    const exportData = filteredAssets.map(asset => ({
      'Asset Name': asset.name,
      'Serial Number': asset.serial_number,
      'Type': asset.type,
      'Status': asset.status,
      'Allocated To': asset.allocated_to || 'Available'
    }));
    downloadCSV(exportData, 'IT_Assets_Inventory.csv');
  };

  const statusColors = {
    Available: '#22c55e',    // --accent-green
    Allocated: '#0ea5e9',   // --accent-blue
    Maintenance: '#f59e0b', // --accent-yellow
    Retired: '#ef4444',     // --accent-red
    'Sold/Scrap': '#a855f7' // --accent-purple
  };

  const getStatusBadgeStyle = (status: string) => ({
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    background: `${statusColors[status as keyof typeof statusColors] || '#6b7280'}20`,
    color: statusColors[status as keyof typeof statusColors] || '#6b7280',
    border: `1px solid ${statusColors[status as keyof typeof statusColors] || '#6b7280'}40`
  });

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-bg)', borderTop: '3px solid var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p>Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header role="IT" title="Asset Inventory" />

      {/* Header Controls */}
      <div style={headerControlsStyle}>
        <div style={searchContainerStyle}>
          <FaSearch style={searchIconStyle} />
          <input 
            className="apple-input" 
            placeholder="Search by name or serial number..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={searchInputStyle}
          />
        </div>
        <div style={filterContainerStyle}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="all">All Status</option>
            <option value="Available">Available</option>
            <option value="Allocated">Allocated</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Retired">Retired</option>
            <option value="Sold/Scrap">Sold / Scrap</option>
          </select>
        </div>
        <button className="apple-btn" style={{ padding: '12px 24px' }} onClick={exportAssets}>
          <FaDownload /> Export CSV
        </button>
        <button className="apple-btn" style={{ padding: '12px 24px', background: 'var(--accent-green)' }} onClick={() => setShowAddModal(true)}>
          <FaPlus /> Add Asset
        </button>
      </div>

      {/* Stats Row */}
      <div style={statsRowStyle}>
        <GlassCard title="Total Assets" subtitle="Registered in system">
          <div style={statValueStyle()}>{assets.length}</div>
        </GlassCard>
        <GlassCard title="Available" subtitle="Ready for allocation">
          <div style={statValueStyle(assets.filter(a => a.status === 'Available').length, '#30d158')}>{assets.filter(a => a.status === 'Available').length}</div>
        </GlassCard>
        <GlassCard title="Allocated" subtitle="Currently assigned">
          <div style={statValueStyle(assets.filter(a => a.status === 'Allocated').length, '#0a84ff')}>{assets.filter(a => a.status === 'Allocated').length}</div>
        </GlassCard>
        <GlassCard title="Maintenance" subtitle="Under repair">
          <div style={statValueStyle(assets.filter(a => a.status === 'Maintenance').length, '#ff9f0a')}>{assets.filter(a => a.status === 'Maintenance').length}</div>
        </GlassCard>
      </div>

      {/* Assets Grid */}
      <div style={gridContainerStyle}>
        {showEmptyState ? (
          <div style={emptyStateStyle}>
            <div style={emptyIllustrationStyle}></div>
            <h3 style={emptyTitleStyle}>No Assets Match Filters</h3>
            <p style={emptySubtitleStyle}>Try adjusting your search or filter criteria</p>
            <button className="apple-btn" style={{ padding: '12px 32px' }} onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}>
              Clear Filters
            </button>
          </div>
        ) : filteredAssets.length === 0 && assets.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={emptyIllustrationStyle}></div>
            <h3 style={emptyTitleStyle}>No Assets Found</h3>
            <p style={emptySubtitleStyle}>Get started by adding your first IT asset</p>
            <button className="apple-btn" style={{ padding: '12px 32px', background: 'var(--accent-green)' }} onClick={() => setShowAddModal(true)}>
              <FaPlus /> Add First Asset
            </button>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <GlassCard key={asset.id} style={cardStyle} onClick={() => navigate(`/it/assets/${asset.asset_id || asset.id}`)}>
              <div style={cardHeaderStyle}>
                <h3 style={assetTitleStyle}>{asset.name}</h3>
                <span style={getStatusBadgeStyle(asset.status)}>{asset.status}</span>
              </div>
              <div style={assetDetailsStyle}>
                <div style={detailItemStyle}>
                  <span style={detailLabelStyle}>Serial</span>
                  <span style={detailValueStyle}>{asset.serial_number}</span>
                </div>
                <div style={detailItemStyle}>
                  <span style={detailLabelStyle}>Type</span>
                  <span style={detailValueStyle}>{asset.type}</span>
                </div>
                {asset.allocated_to && (
                  <div style={detailItemStyle}>
                    <span style={detailLabelStyle}>Assigned</span>
                    <span style={detailValueStyle}>{asset.allocated_to_name || asset.allocated_to}</span>
                  </div>
                )}
              </div>
              <div style={actionButtonsStyle}>
                <button 
                  className="apple-btn" 
                  style={editButtonStyle} 
                  onClick={(e) => { e.stopPropagation(); handleEdit(asset); }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(10,132,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <FaEdit /> Edit
                </button>
                <button 
                  className="apple-btn" 
                  style={deleteButtonStyle} 
                  onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,69,58,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <FaTrash /> Delete
                </button>
              </div>
              {editing === asset.id && (
                <div style={editFormStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                      className="apple-input" 
                      placeholder="Asset Name" 
                      value={editForm.name || ''} 
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    />
                    <input 
                      className="apple-input" 
                      placeholder="Serial Number" 
                      value={editForm.serial_number || ''} 
                      onChange={(e) => setEditForm({...editForm, serial_number: e.target.value.toUpperCase()})}
                    />
                    <select 
                      className="apple-input" 
                      value={editForm.status || 'Available'} 
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    >
                      <option value="Available">Available</option>
                      <option value="Allocated">Allocated</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Retired">Retired</option>
                      <option value="Sold/Scrap">Sold / Scrap</option>
                    </select>
                    <input 
                      className="apple-input" 
                      placeholder="Allocated To (Employee ID)" 
                      value={editForm.allocated_to || ''} 
                      onChange={(e) => setEditForm({...editForm, allocated_to: e.target.value})}
                    />
                  </div>
                  <div style={editButtonsStyle}>
                    <button className="apple-btn" style={{ background: 'var(--accent-green)', flex: 1 }} onClick={saveEdit}>
                      Save
                    </button>
                    <button className="apple-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }} onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          ))
        )}
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            width: '90vw',
            maxWidth: '500px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: '24px',
            padding: '32px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                <FaPlus style={{ marginRight: '12px', color: 'var(--accent-green)' }} />
                Add New Asset
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  padding: '8px'
                }}
              >
                ×
              </button>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input
                className="apple-input"
                placeholder="Asset Name (e.g., Dell Latitude 5420)"
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                required
              />
              <select
                className="apple-input"
                value={newAsset.type}
                onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
              >
                <option value="Laptop">Laptop</option>
                <option value="Desktop">Desktop</option>
                <option value="Monitor">Monitor</option>
                <option value="Keyboard">Keyboard</option>
                <option value="Mouse">Mouse</option>
                <option value="Printer">Printer</option>
                <option value="Mobile">Mobile Device</option>
                <option value="Tablet">Tablet</option>
                <option value="Server">Server</option>
                <option value="Network">Network Equipment</option>
                <option value="Other">Other</option>
              </select>
              <input
                className="apple-input"
                placeholder="Serial Number"
                value={newAsset.serial_number}
                onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value.toUpperCase() })}
              />
              <select
                className="apple-input"
                value={newAsset.status}
                onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
              >
                <option value="Available">Available</option>
                <option value="Allocated">Allocated</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
                <option value="Sold/Scrap">Sold / Scrap</option>
              </select>
              <div>
                <input
                  className="apple-input"
                  placeholder="Employee ID (e.g., EMP123)"
                  value={newAsset.allocated_to}
                  onChange={(e) => setNewAsset({ ...newAsset, allocated_to: e.target.value, allocated_to_name: '' })}
                  style={{ marginBottom: '8px' }}
                />
                {newAsset.allocated_to && newAsset.allocated_to_name && (
                  <div style={{ fontSize: '13px', color: 'var(--accent-blue)', padding: '4px 8px', background: 'rgba(10,132,255,0.1)', borderRadius: '6px', marginTop: '4px' }}>
                    {newAsset.allocated_to_name}
                  </div>
                )}
              </div>
              <textarea
                className="apple-input"
                placeholder="Notes (optional)"
                value={newAsset.notes}
                onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                rows={3}
                style={{ resize: 'vertical' }}
              />
              
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <button
                  type="submit"
                  className="apple-btn"
                  style={{ flex: 1, background: 'var(--accent-green)' }}
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await createAsset(newAsset);
                      loadAssets();
                      setShowAddModal(false);
                      setNewAsset({
                        name: '',
                        type: 'Laptop',
                        serial_number: '',
                        status: 'Available',
                        allocated_to: '',
                        allocated_to_name: '',
                        notes: ''
                      });
                    } catch (error) {
                      console.error('Failed to add asset:', error);
                      alert('Failed to add asset. Please try again.');
                    }
                  }}
                >
                  Add Asset
                </button>
                <button
                  type="button"
                  className="apple-btn"
                  style={{ flex: 1, background: 'var(--accent-gray)' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};


const headerControlsStyle = {
  display: 'flex',
  gap: '16px',
  marginBottom: '32px',
  flexWrap: 'wrap' as const
};

const searchContainerStyle = {
  position: 'relative' as const,
  flex: 1,
  minWidth: '300px'
};

const searchIconStyle = {
  position: 'absolute' as const,
  left: '16px' as const,
  top: '50%' as const,
  transform: 'translateY(-50%)' as const,
  color: 'var(--text-tertiary)' as const,
  zIndex: 1 as const
};

const searchInputStyle = {
  width: '100%' as const,
  paddingLeft: '48px' as const
};

const filterContainerStyle = {
  position: 'relative' as const,
  minWidth: '180px'
};

const filterSelectStyle = {
  width: '100%' as const,
  padding: '12px 16px 12px 40px' as const,
  background: 'rgba(255,255,255,0.05)' as const,
  border: '1px solid var(--border-light)' as const,
  borderRadius: '12px' as const,
  color: 'white' as const,
  backdropFilter: 'blur(20px)' as const
};

const statsRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
  marginBottom: '32px'
};

const statValueStyle = (count = 0, color = '#0a84ff') => ({
  fontSize: '36px',
  fontWeight: '800',
  marginTop: '8px',
  background: `linear-gradient(135deg, ${color}, ${color}80)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text'
});

const gridContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
  gap: '24px'
};

const cardStyle = {
  transition: 'all 0.3s ease',
  cursor: 'pointer' as const
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '16px'
};

const assetTitleStyle = {
  fontSize: '18px',
  fontWeight: '700',
  margin: 0,
  color: 'white' as const
};

const assetDetailsStyle = {
  marginBottom: '20px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px'
};

const detailItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const detailLabelStyle = {
  fontSize: '12px',
  color: 'var(--text-tertiary)',
  fontWeight: '500'
};

const detailValueStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: 'white'
};

const actionButtonsStyle = {
  display: 'flex',
  gap: '12px'
};

const editButtonStyle = {
  flex: 1,
  padding: '10px 16px',
  fontSize: '13px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-light)',
  color: 'white'
};

const deleteButtonStyle = {
  flex: 1,
  padding: '10px 16px',
  fontSize: '13px',
  background: 'rgba(255, 69, 58, 0.05)',
  border: '1px solid var(--accent-red)',
  color: 'var(--accent-red)'
};

const editFormStyle = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: '1px solid var(--border-light)'
};

const editButtonsStyle = {
  display: 'flex',
  gap: '12px'
};

const emptyStateStyle = {
  gridColumn: '1 / -1',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 40px',
  textAlign: 'center' as const,
  color: 'var(--text-tertiary)'
};

const emptyIllustrationStyle = {
  width: '120px',
  height: '120px',
  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
  borderRadius: '50%',
  marginBottom: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '48px',
  color: 'white'
};

const emptyTitleStyle = {
  fontSize: '24px',
  fontWeight: '700',
  marginBottom: '8px',
  color: 'white'
};

const emptySubtitleStyle = {
  fontSize: '15px',
  marginBottom: '24px',
  opacity: 0.8
};

export default AssetInventory;

