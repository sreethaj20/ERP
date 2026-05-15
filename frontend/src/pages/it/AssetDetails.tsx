import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import GlassCard from '../../components/GlassCard';
import { getAssets, getAssetHistory } from '../../services/itService';
import { FaArrowLeft, FaEdit, FaHistory, FaDownload } from 'react-icons/fa';

const AssetDetails = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<any[]>([]);

  useEffect(() => {
    loadAssetDetails();
  }, [assetId]);

  const loadAssetDetails = async () => {
    if (!assetId) return;
    setLoading(true);
    try {
      const [assets, history] = await Promise.all([
        getAssets(),
        getAssetHistory(assetId)
      ]);
      
      const currentAsset = assets.find((a: any) => String(a.id) === assetId || a.asset_id === assetId);
      setAsset(currentAsset);
      setAllocations(history || []);
    } catch (error) {
      console.error('Failed to load asset:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-bg)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p>Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="dashboard-container">
        <Header role="IT" title="Asset Not Found" />
        <GlassCard style={{ textAlign: 'center', padding: '60px' }}>
          <h3>Asset not found</h3>
          <button className="apple-btn" onClick={() => navigate('/it/assets')} style={{ marginTop: '20px' }}>
            <FaArrowLeft /> Back to Inventory
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header role="IT" title={`Asset Details - ${asset.name}`} />
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <button className="apple-btn" onClick={() => navigate('/it/assets')}>
          <FaArrowLeft /> Back to Inventory
        </button>
        <button className="apple-btn">
          <FaEdit /> Edit Asset
        </button>
        <button className="apple-btn">
          <FaHistory /> Allocation History
        </button>
        <button className="apple-btn">
          <FaDownload /> Export Record
        </button>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Main Asset Details */}
        <GlassCard title={asset.name}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginTop: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'block' }}>Serial Number</label>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{asset.serial_number}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'block' }}>Type</label>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{asset.type}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'block' }}>Status</label>
              <span style={getStatusBadgeStyle(asset.status)}>{asset.status}</span>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'block' }}>Allocated To</label>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{asset.allocated_to || 'Available'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'block' }}>Created</label>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{new Date(asset.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          {asset.notes && (
            <div style={{ marginTop: '24px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block' }}>Notes</label>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{asset.notes}</p>
            </div>
          )}
        </GlassCard>

        {/* Allocation History */}
        <GlassCard title="Allocation History">
          <div style={{ marginTop: '20px' }}>
            {allocations.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                No allocation history
              </div>
            ) : (
              allocations.map((alloc, i) => (
                <div key={i} style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{alloc.employee_name || alloc.employee_id}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{alloc.allocation_date || (alloc.allocated_at ? new Date(alloc.allocated_at).toLocaleDateString() : 'N/A')}</span>
                  </div>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Status: {alloc.allocation_status} | By: {alloc.allocated_by}</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

const getStatusBadgeStyle = (status: string) => ({
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '14px',
  fontWeight: '600',
  background: status === 'Available' ? 'rgba(0,200,83,0.1)' : 'rgba(10,132,255,0.1)',
  color: status === 'Available' ? '#00c853' : '#0a84ff',
  border: `1px solid ${status === 'Available' ? 'rgba(0,200,83,0.3)' : 'rgba(10,132,255,0.3)' }`
});

export default AssetDetails;

