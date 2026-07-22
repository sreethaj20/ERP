import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import GlassCard from '../../components/GlassCard';
import { 
  FaPlus, FaTicketAlt, FaClock, FaCheckCircle, 
  FaExclamationTriangle, FaPaperPlane, FaSearch, 
  FaFilter, FaHistory, FaBug, FaQuestionCircle,
  FaArrowRight, FaTrash, FaCheck
} from 'react-icons/fa';
import { getTickets, addITTicket, setITTickets, getHRTickets, addHRTicket, getITTickets, deleteTicket, resolveTicket, refreshTickets, updateTicketStatus, uploadFile, getFileUrl } from '../../utils/storage';
import { downloadCSV } from '../../utils/formatters';
import api from '../../api/apiClient';

export default function SupportTickets() {
  const [activeTab, setActiveTab] = useState<'open' | 'it' | 'hr' | 'my'>('open');
  const [tickets, setTickets] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [department, setDepartment] = useState<'IT' | 'HR'>('IT');
  const [issue, setIssue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const userName = sessionStorage.getItem('userName') || 'User';
  const empId = sessionStorage.getItem('userId') || '';

  useEffect(() => {
    loadTickets();
  }, [activeTab]);

  const loadTickets = async () => {
    setLoading(true);
    await refreshTickets();
    let data: any[] = [];
    if (activeTab === 'open') {
      data = getTickets();
    } else if (activeTab === 'it') {
      data = getITTickets();
    } else {
      data = getHRTickets();
    }
    setTickets(data);

    // Fetch IT personal tickets (for IT admin role)
    const role = (sessionStorage.getItem('userRole') || '').toLowerCase();
    if (role === 'it') {
      try {
        const res = await api.get('it/my-tickets');
        setMyTickets(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.warn('[IT] my-tickets fetch failed:', e);
        setMyTickets([]);
      }
    }
    setLoading(false);
  };

  const sourceTickets = activeTab === 'my' ? myTickets : tickets;
  const filteredTickets = sourceTickets.filter(t => 
    (t.issue || t.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.employee_name || t.author_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.id || '').toString().includes(search)
  );

  const submitTicket = async () => {
    if (!issue.trim()) return;
    setLoading(true);
    try {
      let ticketData: any = {
        emp_id: empId,
        employee_name: userName,
        department,
        issue,
        status: 'Open',
        attachments: undefined,
        created_at: new Date().toISOString()
      };
      if (file) {
        const uploaded = await uploadFile(file);
        ticketData.attachments = uploaded.url || uploaded.file_path;
      }
      
      if (department === 'IT') {
        await addITTicket(ticketData);
      } else {
        await addHRTicket(ticketData);
      }
      
      setIssue('');
      loadTickets();
    } catch (error) {
      console.error('Ticket submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, status: string, reply?: string) => {
    try {
      const payload: any = { status };
      if (reply) {
        payload.reply = reply;
        payload.author = userName;
      }
      
      await updateTicketStatus(ticketId, payload);
      
      setReplyText(prev => ({ ...prev, [ticketId]: '' }));
      loadTickets();
    } catch (error) {
      console.error('Ticket update failed:', error);
    }
  };

  const removeTicket = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    const success = await deleteTicket(id);
    if (success) {
      loadTickets();
    }
  };

  const handleResolve = async (id: number) => {
    if (!window.confirm('Mark this ticket as resolved?')) return;
    const success = await resolveTicket(id, userName);
    if (success) {
      loadTickets();
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Resolved': return '#30d158';
      case 'In Progress': return '#0a84ff';
      case 'Open': return '#ff9f0a';
      default: return '#64748b';
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return '#ff453a';
      case 'Medium': return '#ff9f0a';
      case 'Low': return '#30d158';
      default: return '#64748b';
    }
  };

  return (
    <div className="dashboard-container">
      <Header role="Support Desk" title="Support Tickets" />
      
      {/* Hero Section */}
      <div style={heroContainerStyle}>
        <div style={heroContentStyle}>
          <h1 style={heroTitleStyle}>Support Center</h1>
          <p style={heroSubtitleStyle}>Raise IT/HR queries & track resolution in real-time</p>
        </div>
        <div style={statsRowStyle}>
          <div style={statItemStyle}>
            <div style={{ ...iconCircleStyle, background: 'rgba(255, 159, 10, 0.15)', color: '#ff9f0a' }}><FaTicketAlt /></div>
            <div>
              <div className="stat-value-glow" style={statValueStyle}>{tickets.filter(t => t.status === 'Open').length}</div>
              <div style={statLabelStyle}>Open Tickets</div>
            </div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...iconCircleStyle, background: 'rgba(10, 132, 255, 0.15)', color: '#0a84ff' }}><FaClock /></div>
            <div>
              <div className="stat-value-glow" style={statValueStyle}>{tickets.filter(t => t.status === 'In Progress').length}</div>
              <div style={statLabelStyle}>In Progress</div>
            </div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...iconCircleStyle, background: 'rgba(48, 209, 88, 0.15)', color: '#30d158' }}><FaCheckCircle /></div>
            <div>
              <div className="stat-value-glow" style={statValueStyle}>{tickets.filter(t => t.status === 'Resolved').length}</div>
              <div style={statLabelStyle}>Resolved</div>
            </div>
          </div>
        </div>
      </div>

      <div style={mainGridStyle}>
        {/* Left Column: Form */}
        <div style={leftColStyle}>
          <GlassCard title="New Support Request" subtitle="How can we help you today?">
            <div style={formStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Request Department</label>
                <div style={deptSelectorStyle}>
                  <button 
                    onClick={() => setDepartment('IT')} 
                    style={{ ...deptOptionStyle, background: department === 'IT' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)', color: department === 'IT' ? 'white' : 'var(--text-secondary)' }}
                  >
                    <FaBug style={{ marginRight: '8px' }} /> IT Support
                  </button>
                  <button 
                    onClick={() => setDepartment('HR')} 
                    style={{ ...deptOptionStyle, background: department === 'HR' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)', color: department === 'HR' ? 'white' : 'var(--text-secondary)' }}
                  >
                    <FaQuestionCircle style={{ marginRight: '8px' }} /> HR Query
                  </button>
                </div>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Describe Issue</label>
                <textarea 
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="Tell us what's happening..."
                  className="apple-input" 
                  style={{ minHeight: '120px', resize: 'none' }}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Attach Screenshot/File (Optional)</label>
                <input 
                  type="file" 
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) {
                      setFile(selected);
                      const preview = URL.createObjectURL(selected);
                      setFilePreview(preview);
                    } else {
                      setFile(null);
                      setFilePreview(null);
                    }
                  }}
                  className="apple-input"
                  style={{ background: 'rgba(255,255,255,0.05)', padding: '12px' }}
                  accept="image/*,.pdf,.doc,.docx"
                />
                {filePreview && (
                  <img src={filePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginTop: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                )}
              </div>

              <button 
                onClick={submitTicket} 
                disabled={!issue.trim() || loading}
                className="apple-btn" 
                style={{ width: '100%', marginTop: '10px' }}
              >
                {loading ? 'Submitting...' : <><FaPaperPlane style={{ marginRight: '8px' }} /> Launch Ticket</>}
              </button>
            </div>
          </GlassCard>

          <GlassCard title="Resources" subtitle="Self-help links" style={{ marginTop: '24px' }}>
            <div style={resourceLinkStyle}><span>System Status</span> <FaClock style={{ color: '#30d158' }} /></div>
            <div style={resourceLinkStyle}><span>HR Policy Handbook</span> <FaArrowRight /></div>
            <div style={resourceLinkStyle}><span>IT Security Guidelines</span> <FaArrowRight /></div>
          </GlassCard>
        </div>

        {/* Right Column: Tickets */}
        <div style={rightColStyle}>
          {/* Controls */}
          <div style={controlsRowStyle}>
            <div style={tabContainerStyle}>
              <button 
                onClick={() => setActiveTab('open')} 
                style={{ ...tabStyle, background: activeTab === 'open' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'open' ? 'white' : 'var(--text-secondary)' }}
              >
                All Active
              </button>
              <button 
                onClick={() => setActiveTab('it')} 
                style={{ ...tabStyle, background: activeTab === 'it' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'it' ? 'white' : 'var(--text-secondary)' }}
              >
                IT Only
              </button>
              <button 
                onClick={() => setActiveTab('hr')} 
                style={{ ...tabStyle, background: activeTab === 'hr' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'hr' ? 'white' : 'var(--text-secondary)' }}
              >
                HR Only
              </button>
              {(sessionStorage.getItem('userRole') || '').toLowerCase() === 'it' && (
                <button
                  onClick={() => setActiveTab('my')}
                  style={{ ...tabStyle, background: activeTab === 'my' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'my' ? 'white' : 'var(--text-secondary)' }}
                >
                  My Submitted
                </button>
              )}
            </div>
            <div style={searchBoxStyle}>
              <FaSearch style={searchIconStyle} />
              <input 
                placeholder="Search tickets..." 
                className="apple-input" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}
              />
            </div>
          </div>

          <div style={ticketListStyle}>
            {filteredTickets.length === 0 ? (
              <div style={emptyStateStyle}>
                <FaHistory size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <h3>No Tickets Found</h3>
                <p>Try adjusting your filters or raise a new request.</p>
              </div>
            ) : (
              filteredTickets.map(ticket => (
                <div key={ticket.id} style={ticketCardStyle}>
                  <div style={cardTopStyle}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)' }}>#{String(ticket.id).slice(-4)}</span>
                      <span style={{ ...priorityBadgeStyle, background: `${getPriorityColor(ticket.priority || 'Medium')}20`, color: getPriorityColor(ticket.priority || 'Medium') }}>
                        {ticket.priority || 'Medium'}
                      </span>
                      <span style={{ ...deptBadgeStyle }}>{ticket.department}</span>
                    </div>
                    <span style={{ ...statusBadgeStyle, background: `${getStatusColor(ticket.status)}20`, color: getStatusColor(ticket.status) }}>
                      {ticket.status}
                    </span>
                  </div>
                  <div style={cardIssueStyle}>{ticket.issue}</div>
                  {ticket.attachment && (
                    <div style={{ marginBottom: '15px' }}>
                      <a 
                        href={getFileUrl(ticket.attachment)} 
                        download 
                        style={{ 
                          fontSize: '12px', 
                          color: 'var(--accent-blue)', 
                           background: 'rgba(0,122,255,0.1)', 
                           padding: '6px 12px', 
                           borderRadius: '8px', 
                           textDecoration: 'none',
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: '6px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        📎 Download Attachment
                      </a>
                    </div>
                  )}
                  <div style={cardFooterStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        Raised by {ticket.employee_name} • {new Date(ticket.created_at || Date.now()).toLocaleDateString()}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeTicket(ticket.id); }}
                        style={{ background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer', opacity: 0.8, display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                        title="Delete Ticket"
                        className="hover-bright"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>

                    {ticket.status !== 'Resolved' && (
                      <button 
                        onClick={() => handleResolve(ticket.id)}
                        className="apple-btn"
                        style={{ padding: '6px 12px', fontSize: '11px', height: '28px' }}
                      >
                        <FaCheck style={{ marginRight: '5px' }} /> Mark Resolved
                      </button>
                    )}
                  </div>

                  {ticket.replies && ticket.replies.length > 0 && (
                    <div style={repliesContainerStyle}>
                      {ticket.replies.map((reply: any, i: number) => (
                        <div key={i} style={replyItemStyle}>
                          <div style={replyHeaderStyle}>
                            <span style={{ fontWeight: '600' }}>{reply.author}</span>
                            <span>{new Date(reply.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div>{reply.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {ticket.status !== 'Resolved' && (
                    <div style={replyInputRowStyle}>
                      <input 
                        className="apple-input" 
                        placeholder="Type a message..." 
                        value={replyText[ticket.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [ticket.id]: e.target.value })}
                        style={{ height: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}
                      />
                      <button 
                        onClick={() => handleUpdateStatus(ticket.id, 'In Progress', replyText[ticket.id])}
                        style={sendBtnStyle}
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const heroContainerStyle: React.CSSProperties = {
  marginBottom: '40px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '30px',
  background: 'linear-gradient(to right, rgba(14, 165, 233, 0.05), transparent)',
  padding: '40px',
  borderRadius: '30px',
  border: '1px solid var(--border-light)'
};

const heroContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '300px'
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: '42px',
  fontWeight: '800',
  margin: '0 0 10px 0',
  background: 'linear-gradient(to right, #fff, #94a3b8)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const heroSubtitleStyle: React.CSSProperties = {
  fontSize: '18px',
  color: 'var(--text-secondary)',
  margin: 0
};

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '40px'
};

const statItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px'
};

const iconCircleStyle: React.CSSProperties = {
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px'
};

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '800',
  lineHeight: 1
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-tertiary)',
  marginTop: '4px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const mainGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '380px 1fr',
  gap: '32px',
  alignItems: 'start'
};

const leftColStyle: React.CSSProperties = {};
const rightColStyle: React.CSSProperties = {};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  marginTop: '10px'
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  paddingLeft: '4px'
};

const deptSelectorStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px'
};

const deptOptionStyle: React.CSSProperties = {
  padding: '12px',
  border: '1px solid var(--border-light)',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease'
};

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  gap: '20px'
};

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  background: 'rgba(255,255,255,0.03)',
  padding: '5px',
  borderRadius: '12px',
  border: '1px solid var(--border-light)'
};

const tabStyle: React.CSSProperties = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const searchBoxStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  maxWidth: '300px'
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '15px',
  top: '12px',
  color: 'var(--text-tertiary)'
};

const ticketListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
};

const ticketCardStyle: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--border-light)',
  borderRadius: '20px',
  padding: '24px',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden'
};

const cardTopStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px'
};

const priorityBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: '800',
  textTransform: 'uppercase',
  padding: '3px 10px',
  borderRadius: '10px',
  letterSpacing: '0.5px'
};

const deptBadgeStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: 'var(--text-secondary)',
  background: 'rgba(255,255,255,0.05)',
  padding: '3px 10px',
  borderRadius: '10px'
};

const statusBadgeStyle: React.CSSProperties = {
  padding: '5px 15px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '700'
};

const cardIssueStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '500',
  lineHeight: '1.5',
  color: 'var(--text-primary)',
  marginBottom: '20px'
};

const cardFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: '16px',
  borderTop: '1px solid var(--border-light)'
};

const repliesContainerStyle: React.CSSProperties = {
  marginTop: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const replyItemStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  padding: '12px 16px',
  borderRadius: '12px',
  fontSize: '13px'
};

const replyHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '6px',
  fontSize: '11px',
  color: 'var(--text-tertiary)'
};

const replyInputRowStyle: React.CSSProperties = {
  marginTop: '20px',
  display: 'flex',
  gap: '10px'
};

const sendBtnStyle: React.CSSProperties = {
  width: '45px',
  height: '40px',
  borderRadius: '10px',
  background: 'var(--accent-blue)',
  color: 'white',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const emptyStateStyle: React.CSSProperties = {
  padding: '80px 20px',
  textAlign: 'center',
  color: 'var(--text-tertiary)',
  background: 'rgba(255,255,255,0.01)',
  borderRadius: '24px',
  border: '1px dashed var(--border-light)'
};

const resourceLinkStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '12px',
  marginBottom: '10px',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: '1px solid transparent'
};

