import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { createJob, getJobs, updateJob } from "../../services/recruiterService";
import { getEmployeesForReference } from "../../services/employeeService";
import { FaPlus, FaBriefcase, FaMapMarkerAlt, FaMoneyBillWave, FaShieldAlt, FaLayerGroup, FaUserTie, FaSearch, FaPowerOff } from 'react-icons/fa';

export default function JobPosting() {
  const [form, setForm] = useState({
    title: "",
    department: "",
    employment_type: "Full-time", // Full-time / Contract / Intern
    work_mode: "Onsite", // Onsite / Hybrid / Remote
    experience_min: "",
    experience_max: "",
    salary_min: "",
    salary_max: "",
    currency: "INR",
    skills_required: "",
    education_required: "",
    description: "",
    location: "",
    positions_open: "1",
    reporting_manager_id: "", // Selectable from employees
    priority: "medium", // low / medium / high / urgent
  });

  const [employees, setEmployees] = useState<any[]>([]);

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const userId = sessionStorage.getItem('userId') || '';
  const userRole = sessionStorage.getItem('userRole') || 'Recruiter';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobData, empData] = await Promise.all([
        getJobs(),
        getEmployeesForReference()
      ]);
      setJobs(jobData || []);
      setEmployees(empData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.department) return alert("Please fill required fields (Title & Department)");

    try {
      // Data Sanitization (Feature 61): Convert empty strings to null for backend Decimal/Int compliance
      const payload: any = {
        ...form,
        salary_min: form.salary_min === "" ? null : parseFloat(form.salary_min),
        salary_max: form.salary_max === "" ? null : parseFloat(form.salary_max),
        positions_open: form.positions_open === "" ? 1 : parseInt(form.positions_open),
        experience_min: form.experience_min === "" ? null : form.experience_min,
        experience_max: form.experience_max === "" ? null : form.experience_max,
        skills_required: form.skills_required.split(',').map(s => s.trim()).filter(Boolean),
        status: "open",
      };

      await createJob(payload);
      loadData();
      setForm({
        title: "", department: "", employment_type: "Full-time", work_mode: "Onsite",
        experience_min: "", experience_max: "", salary_min: "", salary_max: "",
        currency: "INR", skills_required: "", education_required: "", description: "",
        location: "", positions_open: "1", reporting_manager_id: "", priority: "medium",
      });
      setIsAdding(false);
      alert("Official Job Requisition Created Successfully");
    } catch (err) {
      alert("Failed to create requisition.");
    }
  };

  const handleToggleJobStatus = async (job: any, newStatus: string) => {
    const isAuth = userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'hr' || userRole.toLowerCase() === 'recruiter';
    const isOwnerOrLegacy = !job.created_by || job.created_by === userId;

    if (!isOwnerOrLegacy && !isAuth) {
      return alert(`Unauthorized: Only an authorized recruiter or manager can ${newStatus === 'closed' ? 'deactivate' : 'reactivate'} this requisition.`);
    }

    const action = newStatus === 'closed' ? 'deactivate' : 'reactivate';
    if (window.confirm(`Are you sure you want to ${action} this hiring process?`)) {
      try {
        await updateJob(job.job_id, { status: newStatus });
        loadData();
      } catch (err) {
        alert(`Failed to ${action} job.`);
      }
    }
  };

  const filteredJobs = jobs.filter((j: any) => {
    const matchesSearch = (j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.department?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === "active") {
      return matchesSearch && j.status !== 'closed' && j.status !== 'deleted';
    } else {
      return matchesSearch && (j.status === 'closed' || j.status === 'deleted');
    }
  });

  return (
    <div className="dashboard-container">
      <Header role={userRole} title="Official Job Requisitions" />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '15px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button 
                onClick={() => setActiveTab('active')}
                style={{ 
                    padding: '8px 20px', borderRadius: '12px', border: 'none', 
                    background: activeTab === 'active' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                    color: activeTab === 'active' ? 'white' : 'var(--text-secondary)',
                    fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                }}
            >
                Active Requisitions
            </button>
            <button 
                onClick={() => setActiveTab('inactive')}
                style={{ 
                    padding: '8px 20px', borderRadius: '12px', border: 'none', 
                    background: activeTab === 'inactive' ? 'rgba(255, 69, 58, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: activeTab === 'inactive' ? '#ff453a' : 'var(--text-secondary)',
                    fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                }}
            >
                Archived / Closed
            </button>
        </div>

        <div style={{ display: 'flex', gap: '15px', flex: 1, maxWidth: '600px', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: '300px' }}>
                <FaSearch style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                    className="apple-input"
                    placeholder={`Search ${activeTab} jobs...`}
                    style={{ paddingLeft: '45px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button className="apple-btn" onClick={() => setIsAdding(!isAdding)}>
                <FaPlus /> {isAdding ? 'Discard Draft' : 'Create Requisition'}
            </button>
        </div>
      </div>

      {/* Form logic remains same */}
      {isAdding && (
        <GlassCard title="Requisition Configuration" style={{ marginBottom: '30px' }}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Job Title *</label>
              <input className="apple-input" placeholder="e.g. Senior Frontend Developer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Department *</label>
              <input className="apple-input" placeholder="e.g. Engineering" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>

            <div>
              <label style={labelStyle}>Employment Type</label>
              <select className="apple-input" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Work Mode</label>
              <select className="apple-input" value={form.work_mode} onChange={(e) => setForm({ ...form, work_mode: e.target.value })}>
                <option value="Onsite">Onsite</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select className="apple-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Exp Min (Yrs)</label>
                <input className="apple-input" type="number" step="0.1" placeholder="0" value={form.experience_min} onChange={(e) => setForm({ ...form, experience_min: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Exp Max (Yrs)</label>
                <input className="apple-input" type="number" step="0.1" placeholder="5" value={form.experience_max} onChange={(e) => setForm({ ...form, experience_max: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Salary Min ({form.currency})</label>
                <input className="apple-input" type="number" placeholder="300000" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Salary Max ({form.currency})</label>
                <input className="apple-input" type="number" placeholder="800000" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <input className="apple-input" placeholder="INR" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>

            <div>
              <label style={labelStyle}>Location</label>
              <input className="apple-input" placeholder="e.g. Bangalore" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Positions Open</label>
              <input className="apple-input" type="number" value={form.positions_open} onChange={(e) => setForm({ ...form, positions_open: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Education Required</label>
              <input className="apple-input" placeholder="e.g. B.Tech / BCA" value={form.education_required} onChange={(e) => setForm({ ...form, education_required: e.target.value })} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Skills (Comma Separated)</label>
              <input className="apple-input" placeholder="React, Node.js, GraphQL..." value={form.skills_required} onChange={(e) => setForm({ ...form, skills_required: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Reporting Manager</label>
              <select className="apple-input" value={form.reporting_manager_id} onChange={(e) => setForm({ ...form, reporting_manager_id: e.target.value })}>
                <option value="">Select Manager...</option>
                {employees.map((emp: any) => (
                  <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                    {emp.name || `${emp.first_name} ${emp.last_name || ''}`.trim()} ({emp.employee_id || emp.id})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 3' }}>
              <label style={labelStyle}>Job Description</label>
              <textarea className="apple-input" style={{ minHeight: '80px' }} placeholder="Detail the duties and responsibilities..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div style={{ gridColumn: 'span 3', marginTop: '10px' }}>
              <button type="submit" className="apple-btn" style={{ width: '100%', background: 'var(--accent-green)' }}>Finalize & Post Official Requisition</button>
            </div>
          </form>
        </GlassCard>
      )}

      <div className="grid-3">
        {filteredJobs.map((job: any, i: number) => {
          const jobCode = job.job_id;
          const experienceMin = job.experience_min || job.experience_range?.split('-')?.[0] || '0';
          const experienceMax = job.experience_max || job.experience_range?.split('-')?.[1] || '0';
          const salaryMin = Number(job.salary_min || 0);
          const salaryMax = Number(job.salary_max || 0);

          return (
            <GlassCard key={job.job_id || job.id || i} style={{ padding: '20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{
                    background: job.priority === 'urgent' ? 'rgba(248, 81, 73, 0.1)' : (job.priority === 'high' ? 'rgba(210, 153, 34, 0.1)' : 'rgba(57, 211, 83, 0.1)'),
                    color: job.priority === 'urgent' ? 'var(--accent-red)' : (job.priority === 'high' ? 'var(--accent-orange)' : 'var(--accent-green)'),
                    fontSize: '9px',
                    padding: '4px 8px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {job.priority} Priority
                </span>
                <span style={{ 
                  background: job.status === 'closed' ? 'rgba(255, 69, 58, 0.1)' : 'rgba(10, 132, 255, 0.1)', 
                  color: job.status === 'closed' ? '#ff453a' : 'var(--accent-blue)', 
                  fontSize: '9px', padding: '4px 8px', borderRadius: '20px', fontWeight: 'bold' 
                }}>
                  {job.status === 'closed' ? 'INACTIVE' : 'ACTIVE'}
                </span>
              </div>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 'bold' }}>{jobCode}</span>
            </div>

            <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{job.title}</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--accent-blue)', fontSize: '12px', fontWeight: 'bold' }}>{job.department || 'Unknown'}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>•</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{job.employment_type}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div style={infoRowStyle}><FaMapMarkerAlt /> {job.location || 'Remote'}</div>
              <div style={infoRowStyle}><FaLayerGroup /> {(job.positions_open || job.positions || '1')} Positions</div>
              <div style={infoRowStyle}><FaBriefcase /> {experienceMin}-{experienceMax} Yrs</div>
              <div style={infoRowStyle}><FaMoneyBillWave /> {salaryMin ? salaryMin / 100000 : 0}L-{salaryMax ? salaryMax / 100000 : 0}L {job.currency || 'INR'}</div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', marginBottom: '10px' }}>
              <div style={infoRowStyle}><FaUserTie /> Reports To: {job.reporting_manager_id}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {(job.skills_required || []).slice(0, 3).map((skill: string, idx: number) => (
                  <span key={idx} style={skillBadgeStyle}>{skill}</span>
                ))}
              </div>
              {(!job.created_by || job.created_by === userId || userRole.toLowerCase() === 'manager' || userRole.toLowerCase() === 'hr' || userRole.toLowerCase() === 'recruiter') && (
                job.status !== 'closed' ? (
                  <button
                    onClick={() => handleToggleJobStatus(job, 'closed')}
                    style={{
                      background: 'rgba(255, 69, 58, 0.1)',
                      color: '#ff453a',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <FaPowerOff size={10} /> Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleJobStatus(job, 'open')}
                    style={{
                      background: 'rgba(48, 209, 88, 0.1)',
                      color: 'var(--accent-green)',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <FaPowerOff size={10} /> Reactivate
                  </button>
                )
              )}
            </div>
          </GlassCard>
        )})}
        {filteredJobs.length === 0 && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
            <p>No job requisitions found matching your search. Start by creating a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: 'var(--text-tertiary)',
  marginBottom: '4px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '11px',
  color: 'var(--text-secondary)'
};

const skillBadgeStyle: React.CSSProperties = {
  fontSize: '9px',
  padding: '3px 8px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '4px',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--text-secondary)'
};
