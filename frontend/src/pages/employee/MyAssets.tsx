import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import GlassCard from '../../components/GlassCard';
import { getMyAssets } from '../../services/employeeService';
import { FaLaptop, FaIdCard, FaCheckCircle, FaCalendarAlt, FaKeyboard, FaDesktop } from 'react-icons/fa';
import { getRole } from '../../utils/storage';

const MyAssets = () => {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const userRole = getRole();

    const loadAssets = async () => {
        setLoading(true);
        try {
            const data = await getMyAssets();
            setAssets(data || []);
        } catch (error) {
            console.error('Failed to load personal assets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssets();
    }, []);

    const getAssetIcon = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('laptop')) return <FaLaptop />;
        if (t.includes('monitor') || t.includes('desktop')) return <FaDesktop />;
        return <FaKeyboard />;
    };

    if (loading) {
        return (
            <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-bg)', borderTop: '3px solid var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                    <p>Fetching your assigned devices...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <Header role={userRole.toUpperCase()} title="My Personal Assets" />

            <div style={{ marginTop: '35px', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '42px', fontWeight: 800 }}>My Assigned Assets</h1>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '16px' }}>Hardware and devices officially allocated to you.</p>
            </div>

            {assets.length === 0 ? (
                <GlassCard style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', color: 'var(--text-tertiary)', marginBottom: '20px', opacity: 0.5 }}>
                        <FaLaptop />
                    </div>
                    <h3 style={{ fontSize: '24px', color: 'white', marginBottom: '10px' }}>No Assets Assigned</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>You currently don't have any hardware assets assigned to your profile.</p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '10px' }}>If you have received hardware, please contact the IT department to update the portal.</p>
                </GlassCard>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {assets.map((item) => (
                        <GlassCard key={item.id} style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ 
                                position: 'absolute', top: '-10px', right: '-10px', 
                                fontSize: '80px', opacity: 0.05, transform: 'rotate(15deg)'
                            }}>
                                {getAssetIcon(item.asset_name)}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ 
                                    width: '50px', height: '50px', borderRadius: '15px', 
                                    background: 'var(--accent-blue)', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'center', fontSize: '22px'
                                }}>
                                    {getAssetIcon(item.asset_name)}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{item.asset_name}</h3>
                                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>ID: {item.asset_id}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                                <div style={infoRowStyle}>
                                    <span style={labelStyle}><FaIdCard style={{ marginRight: '8px' }} /> Serial Number</span>
                                    <span style={valueStyle}>{item.serial_number || '—'}</span>
                                </div>
                                <div style={infoRowStyle}>
                                    <span style={labelStyle}><FaCalendarAlt style={{ marginRight: '8px' }} /> Allocated On</span>
                                    <span style={valueStyle}>{item.allocation_date || '—'}</span>
                                </div>
                                <div style={infoRowStyle}>
                                    <span style={labelStyle}><FaCheckCircle style={{ marginRight: '8px' }} /> Condition</span>
                                    <span style={{ ...valueStyle, color: 'var(--accent-green)' }}>{item.asset_condition || 'Good'}</span>
                                </div>
                            </div>

                            <div style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '12px', 
                                borderRadius: '12px',
                                border: '1px solid var(--border-light)',
                                fontSize: '12px',
                                color: 'var(--text-secondary)'
                            }}>
                                <strong>Note:</strong> Please ensure hardware safety. Any damage should be reported to IT immediately.
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};

const infoRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)'
};

const valueStyle = {
    fontSize: '14px',
    fontWeight: 600,
    color: 'white'
};

export default MyAssets;
