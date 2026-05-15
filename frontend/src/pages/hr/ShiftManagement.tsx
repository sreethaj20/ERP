import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
    getShifts, addShift, updateShift, deleteShift,
    assignShift, removeAssignment, getEmployees,
    getWorkingDaysInMonth, refreshShifts, refreshEmployees
} from "../../utils/storage";
import {
    FaClock, FaPlus, FaEdit, FaTrash, FaUsers, FaCheck,
    FaTimes, FaSave, FaMoon, FaSun, FaCalendarAlt,
    FaUserTie, FaUser, FaSearch, FaChevronDown, FaLink
} from "react-icons/fa";

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SHIFT_COLORS = [
    '#0a84ff', '#30d158', '#ff9f0a', '#bf5af2',
    '#ff453a', '#64d2ff', '#ff375f', '#5e5ce6'
];

const ROLE_BADGE: Record<string, { color: string; label: string }> = {
    employee: { color: '#30d158', label: 'Employee' },
    teamleader: { color: '#ff9f0a', label: 'Team Leader' },
    hr: { color: '#0a84ff', label: 'HR' },
    recruiter: { color: '#bf5af2', label: 'Recruiter' },
    it: { color: '#64d2ff', label: 'IT' },
    itdepartment: { color: '#64d2ff', label: 'IT' },
    manager: { color: '#ff375f', label: 'Manager' },
    admin: { color: '#ff375f', label: 'Admin' },
};

const DEFAULT_FORM = {
    shift_name: '',
    start_time: '09:00',
    end_time: '18:00',
    grace_time: 15,
    break_duration_minutes: 60,
    is_night_shift: false,
    department_applicability: [] as string[],
    color: '#0a84ff',
    description: '',
    week_off_days: [] as string[]
};

function calcShiftHours(start: string | undefined, end: string | undefined): number {
    if (!start || !end) return 0;
    const parts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    if (parts.length < 2 || endParts.length < 2) return 0;
    const [sh, sm] = parts;
    const [eh, em] = endParts;
    // Handle overnight shifts (e.g., 10 PM to 6 AM)
    let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    return totalMinutes / 60;
}

function formatTime(t: string | undefined | null): string {
    if (!t) return '—';
    const parts = t.split(':').map(Number);
    if (parts.length < 2) return t;
    const [h, m] = parts;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}
export default function ShiftManagement() {
    const userId = sessionStorage.getItem('userId') || '';
    const [shifts, setShifts] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [tab, setTab] = useState<'shifts' | 'assign'>('shifts');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...DEFAULT_FORM });
    const [selectedShiftForAssign, setSelectedShiftForAssign] = useState<any>(null);
    const [assignSearch, setAssignSearch] = useState('');
    const [assignFilter, setAssignFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res: any = await refreshShifts();
            const data = Array.isArray(res) ? res : (res?.shifts || res?.data || []);
            setShifts(data);
            const emps = await getEmployees();
            setEmployees(emps);
        } catch (e) {
            console.error('[ShiftManagement] load error:', e);
            const raw = getShifts();
            setShifts((raw || []).filter((s: any) => s && (s.shift_name || s.name)));
            setEmployees(getEmployees());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const onStorageSync = () => load();
        window.addEventListener('storage', onStorageSync);
        return () => window.removeEventListener('storage', onStorageSync);
    }, []);

    const handleSave = async () => {
        if (!form.shift_name.trim()) { alert('Shift name is required'); return; }
        if (!form.start_time || !form.end_time) { alert('Shift start and end times are required'); return; }
        try {
            if (editingId) {
                await updateShift(editingId, form);
            } else {
                await addShift(form);
            }
            setShowForm(false);
            setEditingId(null);
            setForm({ ...DEFAULT_FORM });
            await load();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.message || 'Failed to save shift';
            alert(`❌ Error: ${msg}`);
        }
    };

    const handleEdit = (shift: any) => {
        setForm({
            shift_name: shift.shift_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            grace_time: shift.grace_time || 15,
            break_duration_minutes: shift.break_duration_minutes || 60,
            is_night_shift: shift.is_night_shift || false,
            department_applicability: shift.department_applicability || [],
            color: shift.color || '#0a84ff',
            description: shift.description || '',
            week_off_days: shift.week_off_days || []
        });
        setEditingId(shift.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this shift? Employees assigned will lose their shift.')) return;
        try {
            await deleteShift(id);
            await load();
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Failed to delete shift');
        }
    };

    const toggleWeekOff = (day: string) => {
        setForm(f => {
            const current = f.week_off_days || [];
            return {
                ...f,
                week_off_days: current.includes(day)
                    ? current.filter(d => d !== day)
                    : [...current, day]
            };
        });
    };

    const selectedShift = shifts.find(s => String(s.id) === String(selectedShiftForAssign));
    const assignedIds: string[] = selectedShift?.assignments?.map((a: any) => a.employee_id) || [];

    const filteredEmps = employees.filter(emp => {
        const r_raw = (emp.role || emp.designation || emp.department || '').toLowerCase().replace(/[\s_]+/g, '');
        let r = r_raw;
        if (r_raw.includes('teamleader') || r_raw === 'tl') r = 'teamleader';
        if (r_raw.includes('recruiter')) r = 'recruiter';
        if (r_raw.includes('it') || r_raw.includes('tech')) r = 'it';
        if (r_raw.includes('manager')) r = 'manager';
        if (r_raw.includes('hr')) r = 'hr';

        const term = assignSearch.toLowerCase();
        const searchPool = `${emp.name} ${emp.employee_name || ''} ${emp.department || ''} ${emp.designation || ''} ${emp.role || ''} ${emp.employee_id || ''}`.toLowerCase();
        if (term && !searchPool.includes(term)) return false;

        const adminRoles = ["hr", "recruiter", "teamleader", "it", "manager", "admin", "itdepartment"];
        const groupRole = adminRoles.includes(r) ? r : 'employee';

        return assignFilter === 'all' || groupRole === assignFilter;
    });

    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

    const toggleEmployeeSelect = (empId: string) => {
        setSelectedEmployees(prev => 
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const handleBulkAssign = async () => {
        if (!selectedShiftForAssign || selectedEmployees.length === 0) {
            alert('Select shift and employees first');
            return;
        }
        try {
            for (const empId of selectedEmployees) {
                await assignShift(Number(selectedShiftForAssign), empId);
            }
            setSelectedEmployees([]);
            await load();
            alert(`✅ Bulk assigned ${selectedEmployees.length} employees`);
        } catch (err: any) {
            alert(`❌ Bulk assign failed: ${err?.response?.data?.detail || err?.message}`);
        }
    };

    const handleBulkUnassign = async () => {
        if (!selectedShiftForAssign || selectedEmployees.length === 0) {
            alert('Select employees first');
            return;
        }
        try {
            for (const empId of selectedEmployees) {
                await removeAssignment(Number(selectedShiftForAssign), empId);
            }
            setSelectedEmployees([]);
            await load();
            alert(`✅ Bulk unassigned ${selectedEmployees.length} employees`);
        } catch (err: any) {
            alert(`❌ Bulk unassign failed: ${err?.response?.data?.detail || err?.message}`);
        }
    };

    const handleAssign = async (emp: any) => {
        if (!selectedShiftForAssign) { 
            alert('Select a shift first'); 
            return; 
        }
        try {
            const isAssigned = assignedIds.includes(emp.employee_id);
            if (isAssigned) {
                await removeAssignment(Number(selectedShiftForAssign), emp.employee_id);
            } else {
                await assignShift(Number(selectedShiftForAssign), emp.employee_id);
            }
            await load();
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.message || 'Assignment failed';
            alert(`❌ ${msg}`);
        }
    };

    return (
        <div className="dashboard-container" style={{ position: 'relative' }}>
            <Header role="HR" title="Shift Control Center" />

            {/* Premium Header Section */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0, background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Shift Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '15px' }}>
                        Orchestrate workforce timing and availability with precision control.
                    </p>
                </div>
                <button
                    className="apple-btn"
                    onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...DEFAULT_FORM }); }}
                    style={{ 
                        background: 'linear-gradient(135deg, #0a84ff 0%, #0056b3 100%)', 
                        color: 'white', 
                        padding: '12px 24px',
                        boxShadow: '0 4px 15px rgba(10,132,255,0.3)',
                        borderRadius: '14px'
                    }}
                >
                    <FaPlus style={{ marginRight: '10px' }} /> Create New Definition
                </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '32px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '16px', 
                padding: '6px', 
                width: 'fit-content',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {[
                    { id: 'shifts', label: 'Shift Definitions', icon: FaClock },
                    { id: 'assign', label: 'Staff Deployment', icon: FaUsers }
                ].map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => setTab(t.id as any)} 
                        style={{
                            padding: '10px 24px', 
                            borderRadius: '12px', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontWeight: '600', 
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: tab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: tab === t.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <t.icon /> {t.label}
                    </button>
                ))}
            </div>

            {/* Modal Overlay for Form */}
            {showForm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <GlassCard style={{ 
                        width: '100%', maxWidth: '800px', 
                        border: '1px solid rgba(10,132,255,0.3)',
                        animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>
                                    {editingId ? 'Edit Configuration' : 'Shift Architecture'}
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                                    Define timing parameters and operational rules.
                                </p>
                            </div>
                            <button onClick={() => setShowForm(false)} style={{ 
                                background: 'rgba(255,255,255,0.05)', border: 'none', 
                                color: 'var(--text-tertiary)', cursor: 'pointer', 
                                width: '40px', height: '40px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label className="input-label">Identity</label>
                                    <input className="apple-input" placeholder="e.g. Alpha Morning Squad" value={form.shift_name}
                                        onChange={e => setForm(f => ({ ...f, shift_name: e.target.value }))} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="input-label">Clock-In</label>
                                        <input type="time" className="apple-input" value={form.start_time}
                                            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="input-label">Clock-Out</label>
                                        <input type="time" className="apple-input" value={form.end_time}
                                            onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label className="input-label">Grace Window (min)</label>
                                        <input type="number" className="apple-input" value={form.grace_time}
                                            onChange={e => setForm(f => ({ ...f, grace_time: Number(e.target.value) }))} />
                                    </div>
                                    <div>
                                        <label className="input-label">Break Cap (min)</label>
                                        <input type="number" className="apple-input" value={form.break_duration_minutes}
                                            onChange={e => setForm(f => ({ ...f, break_duration_minutes: Number(e.target.value) }))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="input-label">Branding Color</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {SHIFT_COLORS.map(c => (
                                            <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '10px', background: c, cursor: 'pointer',
                                                    border: form.color === c ? '3px solid white' : 'none',
                                                    boxShadow: form.color === c ? `0 0 15px ${c}` : 'none',
                                                    transform: form.color === c ? 'scale(1.1)' : 'scale(1)', transition: '0.2s'
                                                }} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label className="input-label">Recurrent Rest Days</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {DAYS_OF_WEEK.map(day => {
                                            const isOff = form.week_off_days.includes(day);
                                            return (
                                                <button key={day} onClick={() => toggleWeekOff(day)} style={{
                                                    padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)',
                                                    cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                                                    background: isOff ? 'rgba(255,69,58,0.2)' : 'rgba(48,209,88,0.1)',
                                                    color: isOff ? '#ff453a' : '#30d158',
                                                    transition: '0.2s'
                                                }}>
                                                    {day.slice(0, 3)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className="input-label">Visual Simulation</label>
                                    <div style={{
                                        padding: '24px', borderRadius: '20px',
                                        background: `linear-gradient(135deg, ${form.color}20 0%, rgba(0,0,0,0.4) 100%)`,
                                        border: `1px solid ${form.color}40`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: form.color, boxShadow: `0 0 10px ${form.color}` }} />
                                            <span style={{ fontWeight: '800', fontSize: '18px' }}>{form.shift_name || 'Design Phase...'}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            {[
                                                { icon: FaClock, label: 'Timing', val: `${formatTime(form.start_time)} - ${formatTime(form.end_time)}` },
                                                { icon: FaClock, label: 'Net Duration', val: `${calcShiftHours(form.start_time, form.end_time).toFixed(1)}h` },
                                                { icon: FaCalendarAlt, label: 'Work Days', val: 7 - (form.week_off_days?.length || 0) + ' / 7' }
                                            ].map((item, i) => (
                                                <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>{item.label}</div>
                                                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{item.val}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button className="apple-btn" onClick={() => setShowForm(false)} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                                Close Portal
                            </button>
                            <button className="apple-btn" onClick={handleSave} 
                                style={{ background: '#0a84ff', color: 'white', padding: '10px 32px' }}>
                                <FaSave style={{ marginRight: '10px' }} /> Commit Changes
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-tertiary)' }}>
                    <div style={{ animation: 'spin 2s linear infinite' }}>⌛</div>
                    <span style={{ marginLeft: '12px', fontWeight: '600' }}>Synchronizing Shift Data...</span>
                </div>
            ) : tab === 'shifts' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                    {shifts.length === 0 ? (
                         <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
                            <FaClock size={60} style={{ color: 'var(--text-tertiary)', opacity: 0.1, marginBottom: '20px' }} />
                            <h3>No Operational Shifts Found</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Begin by architecting a shift schedule to enable personnel tracking.</p>
                         </div>
                    ) : shifts.map((shift: any) => {
                        const count = shift.assignments?.length || 0;
                        const color = shift.color || '#0a84ff';
                        const hours = calcShiftHours(shift.start_time, shift.end_time);

                        return (
                            <GlassCard key={shift.id} style={{ 
                                position: 'relative', overflow: 'hidden', padding: 0, 
                                border: '1px solid rgba(255,255,255,0.05)',
                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}>
                                <div style={{ height: '4px', background: color }} />
                                <div style={{ padding: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', gap: '14px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
                                                <FaClock size={22} />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{shift.shift_name}</h3>
                                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600' }}>#{shift.id}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={() => handleEdit(shift)} className="icon-btn-ghost"><FaEdit /></button>
                                            <button onClick={() => handleDelete(shift.id)} className="icon-btn-ghost" style={{ color: '#ff453a' }}><FaTrash /></button>
                                        </div>
                                    </div>

                                    <div style={{ 
                                        display: 'flex', alignItems: 'center', gap: '15px', 
                                        padding: '16px', background: 'rgba(0,0,0,0.2)', 
                                        borderRadius: '16px', marginBottom: '20px' 
                                    }}>
                                        <div style={{ textAlign: 'center', flex: 1 }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>IN</div>
                                            <div style={{ fontSize: '16px', fontWeight: '800' }}>{formatTime(shift.start_time)}</div>
                                        </div>
                                        <div style={{ width: '40px', height: '2px', background: 'rgba(255,255,255,0.1)', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '800', color: color }}>{hours.toFixed(1)}h</div>
                                        </div>
                                        <div style={{ textAlign: 'center', flex: 1 }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>OUT</div>
                                            <div style={{ fontSize: '16px', fontWeight: '800' }}>{formatTime(shift.end_time)}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                                        {[
                                            { label: 'Grace', val: shift.grace_time + 'm' },
                                            { label: 'Break', val: shift.break_duration_minutes + 'm' },
                                            { label: 'Deployed', val: count }
                                        ].map((stat, i) => (
                                            <div key={i} style={{ textAlign: 'center', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '700' }}>{stat.val}</div>
                                                <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '2px' }}>{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {(shift.week_off_days || []).map((day: string) => (
                                                <div key={day} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ff453a' }} title={`OFF: ${day}`} />
                                            ))}
                                        </div>
                                        <button 
                                            className="apple-btn" 
                                            onClick={() => { setSelectedShiftForAssign(shift.id); setTab('assign'); }}
                                            style={{ padding: '6px 16px', fontSize: '12px', background: `${color}15`, color: color, border: `1px solid ${color}30` }}
                                        >
                                            Deploy Personnel →
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        )
                    })}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', alignItems: 'start' }}>
                    <GlassCard title="Squad Selector" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {shifts.map(s => {
                                const active = String(selectedShiftForAssign) === String(s.id);
                                const c = s.color || '#0a84ff';
                                return (
                                    <div key={s.id} onClick={() => setSelectedShiftForAssign(s.id)} style={{
                                        padding: '16px', borderRadius: '16px', cursor: 'pointer',
                                        background: active ? `${c}15` : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${active ? `${c}40` : 'rgba(255,255,255,0.05)'}`,
                                        transition: '0.2s'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: active ? '#fff' : 'var(--text-secondary)' }}>{s.shift_name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{formatTime(s.start_time)} - {formatTime(s.end_time)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>

                    <GlassCard 
                        title="Deployment Matrix" 
                        subtitle={selectedShift ? `Active Shift: ${selectedShift.shift_name} / ${assignedIds.length} Personnel` : 'Select a Squad to Begin Deployment'}
                        style={{ padding: '24px' }}
                    >
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '24px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <FaSearch style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input className="apple-input" placeholder="Filter by Name, ID, or Department..." value={assignSearch} 
                                    onChange={e => setAssignSearch(e.target.value)} style={{ paddingLeft: '44px' }} />
                            </div>
                            <select className="apple-input" value={assignFilter} onChange={e => setAssignFilter(e.target.value)} style={{ width: '180px' }}>
                                <option value="all">All Personnel</option>
                                <option value="teamleader">Team Leaders</option>
                                <option value="employee">Staff</option>
                                <option value="hr">Human Resources</option>
                                <option value="manager">Management</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Selected ({selectedEmployees.length}):</label>
                                <span style={{ fontSize: '20px', fontWeight: '800', color: '#30d158' }}>{selectedEmployees.length}</span>
                            </div>
                            {selectedEmployees.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="apple-btn" onClick={handleBulkAssign} style={{ padding: '8px 16px', fontSize: '13px', background: 'rgba(48,209,88,0.1)', color: '#30d158' }}>
                                        Bulk Deploy
                                    </button>
                                    <button className="apple-btn" onClick={handleBulkUnassign} style={{ padding: '8px 16px', fontSize: '13px', background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}>
                                        Bulk Recall
                                    </button>
                                    <button onClick={() => setSelectedEmployees([])} style={{ padding: '8px 12px', background: 'transparent', color: 'var(--text-tertiary)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                            {filteredEmps.map(emp => {
                                const isAssigned = assignedIds.includes(emp.employee_id);
                                const isSelected = selectedEmployees.includes(emp.employee_id);
                                const managerRef = emp.reporting_to_id || emp.manager_id;
                                const inheritedShift = !isAssigned && managerRef ? shifts.find(s => (s.assignments || []).some((a: any) => String(a.employee_id) === String(managerRef))) : null;

                                return (
                                    <div key={emp.employee_id} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '16px 20px', borderRadius: '18px',
                                        background: isSelected ? 'rgba(10,132,255,0.1)' : (isAssigned ? 'rgba(48,209,88,0.03)' : 'rgba(255,255,255,0.01)'),
                                        border: `1px solid ${isSelected ? 'rgba(10,132,255,0.3)' : (isAssigned ? 'rgba(48,209,88,0.2)' : 'rgba(255,255,255,0.05)')}`,
                                        cursor: 'pointer',
                                        transition: '0.2s',
                                        position: 'relative'
                                    }} onClick={() => toggleEmployeeSelect(emp.employee_id)}>
                                        <div style={{ width: '20px', textAlign: 'center', fontWeight: 'bold', color: isSelected ? '#0a84ff' : 'var(--text-tertiary)' }}>
                                            {isSelected ? '✓' : ''}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800' }}>
                                                {(emp.name || emp.employee_name || 'U')[0]}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '15px' }}>{emp.name || emp.employee_name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-tertiary)' }}>{emp.employee_id}</span>
                                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{emp.department || 'General'}</span>
                                                    {inheritedShift && <span style={{ fontSize: '10px', color: '#0a84ff', display: 'flex', alignItems: 'center', gap: '4px' }}><FaLink size={10} /> Following TL Shift</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
