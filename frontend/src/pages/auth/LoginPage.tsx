import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import { FaArrowRight, FaQuestionCircle, FaShieldAlt, FaEnvelope, FaLock, FaKey, FaChevronLeft, FaTimes, FaSearch, FaPhoneAlt, FaInfoCircle } from "react-icons/fa";
import { getEmployees, getRoleAssignments, DEFAULT_PASSWORD, initStorage, recordLoginPresence, startShiftSession, requestEarlyLogin } from "../../utils/storage";
import { loginUser, requestPasswordReset, verifyResetToken, resetPassword } from "../../services/authService";

type AuthView = "login" | "forgot" | "verify" | "reset";

export default function LoginPage() {
  const navigate = useNavigate();

  // Core States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // View State Management
  const [view, setView] = useState<AuthView>("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [earlyLoginState, setEarlyLoginState] = useState({ show: false, type: 'early' as 'early' | 'late', emp_id: '', name: '', userId: '', reason: '' });

  // Help Center & Privacy Policy States
  const [modalView, setModalView] = useState<"help" | "privacy" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      category: "Login & Credentials",
      q: "How do I reset my password?",
      a: "Click on 'Reset Password' under the primary log-in field (or contact IT). Enter your registered work email address to receive a 6-digit verification code, verify it, and then set a new secure password of at least 8 characters."
    },
    {
      category: "Login & Credentials",
      q: "What is my default password as a new hire?",
      a: `All new employees are pre-provisioned with a default password: "${DEFAULT_PASSWORD}". You are highly recommended to change this temporary credential immediately upon your first successful login.`
    },
    {
      category: "Shift & Attendance",
      q: "Why am I seeing 'Your shift is not yet started'?",
      a: "The HRMS restricts logins to active shift schedules. If you attempt to log in prior to your scheduled shift start time, the system requires an 'Early Login' approval. You can submit an 'Login Request' directly on this page for your Team Leader's review."
    },
    {
      category: "Shift & Attendance",
      q: "What happens if I log in after my shift start time?",
      a: "If you log in after your assigned shift start time (plus grace period), your session will be recorded as a 'Late Login' in red for your Team Leader and Manager."
    },
    {
      category: "Shift & Attendance",
      q: "How do Login Requests get approved?",
      a: "Once you submit an Login justification with your Team Leader (TL) ID, your TL receives a real-time notification on their management dashboard. Once they review and click 'Approve', your Login request is granted."
    },
    {
      category: "Technical Issues",
      q: "Which browsers and devices are officially supported?",
      a: "Mercure HRMS is optimized for all modern web browsers including Google Chrome, Apple Safari, Mozilla Firefox, and Microsoft Edge. For full security features, we recommend running on the latest updated desktop version."
    },
    {
      category: "Technical Issues",
      q: "Why did my session expire automatically?",
      a: "To ensure enterprise data protection, the HRMS enforces an automatic session timeout after 30 minutes of complete inactivity. Simply refresh the page and sign back in to resume your active session."
    }
  ];

  const supportChannels = [
    { name: "IT Support Desk", detail: "ext. 402 / support@mercuresolutions.com", action: "mailto:support@mercuresolutions.com" },
    { name: "HR Escalations", detail: "+1 (800) 555-MERCURE", action: "tel:+18005556372" }
  ];

  const privacySections = [
    {
      title: "1. Data Collection & Processing Scope",
      content: "We securely gather and log essential operational records necessary to administer standard workforce functions. This includes full name, employee identifiers, corporate email, role assignments, team hierarchies, real-time login presence, and exact timestamps of daily shift sessions. Early login submissions record specific business reasons purely for auditable approval trails."
    },
    {
      title: "2. Ultimate Use & Purpose of Data",
      content: "All collected employee metrics are processed strictly for secure user authentication, automatic shift-scheduling synchronizations, time-tracking validation, shift compilation for payroll processing, and organizational hierarchy directory traversal."
    },
    {
      title: "3. Enterprise-Grade Security & Encrypted Storage",
      content: "All personal files, operational history, and session records are encrypted both in transit (using TLS 1.3) and at rest (using AES-256 standard encryption keys). Programmatic access is gated behind strict Role-Based Access Controls (RBAC) to ensure only authorized personnel can query specific datasets."
    },
    {
      title: "4. Employee Access & Correction Rights",
      content: "In compliance with standard global privacy regulations, all employees retain full transparent visibility into their own profile logs, payroll sheets, and time-tracking audits. Corrective requests or record adjustments can be requested online or routed directly to HR Onboarding Officers."
    }
  ];

  // If already logged in, redirect to dashboard immediately
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("isLoggedIn");
    const role = sessionStorage.getItem("userRole");
    if (isLoggedIn === "true" && role) {
      const dashPath = role === "manager" ? "/manager/dashboard" : `/${role}/dashboard`;
      navigate(dashPath, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const authData = await loginUser(username, password);
      const user = authData.user;
      const token = authData.access_token || authData.token;

      // Store session data
      sessionStorage.removeItem("shift_user_logged_out");
      sessionStorage.removeItem("shift_autostarted");
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("userId", String(user.id));
      sessionStorage.setItem("userName", user.name || user.full_name);
      sessionStorage.setItem("employeeId", user.employee_id || "");

      // Map role for routing 
      let role = (user.role || 'employee').toLowerCase().replace(/[_\s]+/g, '');
      if (['requiter', 'recruiting'].includes(role)) role = 'recruiter';
      if (['itdepartment', 'itadmin', 'itsupport'].includes(role)) role = 'it';
      sessionStorage.setItem("userRole", role);

      // Record login presence for ALL roles (so Manager can see who's online)
      const allEmps = await getEmployees();
      const empRecord = Array.isArray(allEmps) ? allEmps.find((e: any) => String(e.id) === String(user.id) || String(e.user_id) === String(user.id) || e.email === user.email) : null;
      const emp_id_to_log = empRecord?.employee_id || user.employee_id || user.id;
      await recordLoginPresence(emp_id_to_log, user.name || user.full_name, role, empRecord?.department || '');

      // Track full shift session for everyone EXCEPT the Manager
      if (role !== 'manager') {
        const res = await startShiftSession(0); // 0 = Auto-detect assigned shift
        if (res && !res.success) {
          // 🔒 SECURITY PROTECTION: Clear session tokens so page refresh (F5) cannot bypass approval!
          sessionStorage.clear();

          const isPending = res.message?.toLowerCase().includes('pending');
          const isLate = res.message?.toLowerCase().includes('late');
          setError(res.message || "Your shift has not started yet. Early/Late login approval required.");
          setEarlyLoginState({
            show: !isPending, // Hide request form if already pending
            type: isLate ? 'late' : 'early',
            emp_id: user.employee_id || user.id,
            name: user.name || user.full_name,
            userId: user.id,
            reason: ""
          });
          setLoading(false);
          return;
        }
      }

      // Store additional profile info if found
      if (empRecord) {
        sessionStorage.setItem("department", empRecord.department || "Not Assigned");
        sessionStorage.setItem("joinDate", empRecord.joining_date || "");

        // Resolve Manager Name if only ID exists
        let mgrName = empRecord.reporting_to || empRecord.reporting_manager;
        if (!mgrName && empRecord.reporting_to_id) {
          const mgr = Array.isArray(allEmps) ? allEmps.find((e: any) => e.employee_id === empRecord.reporting_to_id) : null;
          if (mgr) mgrName = mgr.name || `${mgr.first_name} ${mgr.last_name || ''}`.trim();
          else mgrName = empRecord.reporting_to_id;
        }
        sessionStorage.setItem("reportingTo", mgrName || "");
      }

      const dashboardPath = role === "manager" ? "/manager/dashboard" : `/${role}/dashboard`;
      await initStorage();
      navigate(dashboardPath, { replace: true });
    } catch (err: any) {
      sessionStorage.clear();
      setError(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("This will clear all local data and restore demo accounts. Continue?")) {
      sessionStorage.clear();
      window.location.reload();
    }
  };

  // Forgot Password Steps (API Driven)
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await requestPasswordReset(forgotEmail);

      // In this stabilized demo, backend returns token directly for convenience
      if (res.token) {
        console.log("[AUTH] Demo bypass: Reset token received:", res.token);
        // We auto-fill it or let user see it if they are in dev
      }

      setView("verify");
      setSuccessMsg(res.message || `Security token sent to ${forgotEmail}`);
    } catch (err: any) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await verifyResetToken(forgotEmail, verificationCode);
      setView("reset");
      setSuccessMsg("Token verified! Please set your new password.");
    } catch (err: any) {
      setError(err.message || "Invalid or expired security token.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await resetPassword(forgotEmail, verificationCode, newPassword);
      setSuccessMsg("Password reset successfully! You can now log in.");
      setView("login");
      setUsername(forgotEmail.split('@')[0]);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Session may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (role: string) => {
    const demos: any = {
      manager: { u: "manager", p: DEFAULT_PASSWORD },
    };
    if (demos[role]) {
      setUsername(demos[role].u);
      setPassword(demos[role].p);
    }
  };

  if (showSplash) {
    return (
      <div style={{
        width: "100vw", height: "100vh", background: "#000", display: "flex", justifyContent: "center", alignItems: "center",
        flexDirection: "column", animation: "fadeIn 0.5s ease-in-out"
      }}>
        <div style={{ transform: "scale(1.5)", animation: "pulse 2s infinite" }}>
          <Logo width={200} showTagline={true} />
        </div>
        <style>{`
          @keyframes pulse {
            0% { transform: scale(1.5); opacity: 0.8; }
            50% { transform: scale(1.55); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0.8; }
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      width: "100vw",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      background: "#000",
      position: "relative",
      overflowY: "auto",
      padding: "40px 20px",
      animation: "fadeIn 0.8s ease-out"
    }}>
      {/* Decorative Gradients */}
      <div style={{
        position: "absolute",
        top: "-10%",
        left: "-10%",
        width: "40%",
        height: "40%",
        background: "radial-gradient(circle, rgba(10, 132, 255, 0.15) 0%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        right: "-10%",
        width: "50%",
        height: "50%",
        background: "radial-gradient(circle, rgba(57, 211, 83, 0.08) 0%, transparent 70%)",
        filter: "blur(80px)",
        pointerEvents: "none"
      }} />

      <div className="glass-card" style={{
        width: "420px",
        padding: "40px 35px",
        borderRadius: "24px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        zIndex: 1,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        position: 'relative'
      }}>

        {/* Back Button for Forgot Flow */}
        {view !== "login" && (
          <button
            onClick={() => { setView("login"); setError(""); setSuccessMsg(""); }}
            style={{ position: 'absolute', top: '25px', left: '25px', background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}
          >
            <FaChevronLeft size={10} /> Back
          </button>
        )}

        <div style={{ marginBottom: "30px", display: "flex", justifyContent: "center" }}>
          <Logo width={180} showTagline={false} />
        </div>

        {/* Dynamic Title and Subtitle based on View */}
        <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "6px", color: "#fff" }}>
          {view === "login" && "Welcome back"}
          {view === "forgot" && "Reset Password"}
          {view === "verify" && "Verify Code"}
          {view === "reset" && "Create New Password"}
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "25px", fontSize: "14px" }}>
          {view === "login" && "Sign in to your Mercure HRMS account"}
          {view === "forgot" && "Enter your email to receive a recovery code"}
          {view === "verify" && `Enter 6-digit code sent to your email`}
          {view === "reset" && "Must be at least 8 characters long"}
        </p>

        {/* Global Notifications */}
        {error && (
          <div style={{ background: "rgba(255, 69, 58, 0.12)", color: "#ff453a", padding: "12px 14px", borderRadius: "12px", marginBottom: "15px", fontSize: "13px", border: "1px solid rgba(255, 69, 58, 0.2)", display: "flex", alignItems: "center", gap: "10px" }}>
            <FaShieldAlt /> {error}
          </div>
        )}
        {successMsg && !error && (
          <div style={{ background: "rgba(48, 209, 88, 0.12)", color: "#30d158", padding: "12px 14px", borderRadius: "12px", marginBottom: "15px", fontSize: "13px", border: "1px solid rgba(48, 209, 88, 0.2)", display: "flex", alignItems: "center", gap: "10px" }}>
            💡 {successMsg}
          </div>
        )}

        {/* CONTENT RENDERING */}
        {view === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Username</label>
              <div style={{ position: "relative" }}>
                <FaEnvelope style={iconStyle} />
                <input type="text" placeholder="Enter Username" className="glass-input" value={username} onChange={(e) => setUsername(e.target.value)} required style={fieldStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.background = "rgba(41, 151, 255, 0.1)";
                    e.currentTarget.style.borderColor = "var(--accent-blue)";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(41, 151, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={{ ...labelStyle, marginBottom: "8px" }}>Password</label>
              <div style={{ position: "relative" }}>
                <FaLock style={iconStyle} />
                <input type="password" placeholder="••••••••" className="glass-input" value={password} onChange={(e) => setPassword(e.target.value)} required style={fieldStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.background = "rgba(41, 151, 255, 0.1)";
                    e.currentTarget.style.borderColor = "var(--accent-blue)";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(41, 151, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <div style={{ background: 'rgba(10,132,255,0.05)', border: '1px solid rgba(10,132,255,0.2)', borderRadius: '15px', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              💡 New employees use <b>{DEFAULT_PASSWORD}</b> as default password.
            </div>

            <button type="submit" className="apple-btn" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(41, 151, 255, 0.4)"; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(41, 151, 255, 0.3)"; } }}
            >
              {loading ? "Authenticating..." : <><span>Sign In</span> <FaArrowRight size={14} /></>}
            </button>


          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgotRequest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <FaEnvelope style={iconStyle} />
                <input type="email" placeholder="Enter your work email" className="glass-input" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required style={fieldStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.background = "rgba(41, 151, 255, 0.1)";
                    e.currentTarget.style.borderColor = "var(--accent-blue)";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(41, 151, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>
            <button type="submit" className="apple-btn" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(41, 151, 255, 0.4)"; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(41, 151, 255, 0.3)"; } }}
            >
              {loading ? "Processing..." : "Continue"}
            </button>
          </form>
        )}

        {view === "verify" && (
          <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Verification Code</label>
              <div style={{ position: 'relative' }}>
                <FaKey style={iconStyle} />
                <input type="text" maxLength={6} placeholder="123456" className="glass-input" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required style={{ ...fieldStyle, letterSpacing: '8px', textAlign: 'center', paddingLeft: '16px' }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = "rgba(41, 151, 255, 0.1)";
                    e.currentTarget.style.borderColor = "var(--accent-blue)";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(41, 151, 255, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>
            <button type="submit" className="apple-btn" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(41, 151, 255, 0.4)"; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(41, 151, 255, 0.3)"; } }}
            >
              Verify Code
            </button>
          </form>
        )}

        {view === "reset" && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>New Password</label>
              <input type="password" placeholder="Min. 8 characters" className="glass-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ ...fieldStyle, paddingLeft: '20px' }}
                onFocus={(e) => {
                  e.currentTarget.style.background = "rgba(41, 151, 255, 0.1)";
                  e.currentTarget.style.borderColor = "var(--accent-blue)";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(41, 151, 255, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" placeholder="Repeat password" className="glass-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ ...fieldStyle, paddingLeft: '20px' }}
                onFocus={(e) => {
                  e.currentTarget.style.background = "rgba(41, 151, 255, 0.1)";
                  e.currentTarget.style.borderColor = "var(--accent-blue)";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(41, 151, 255, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <button type="submit" className="apple-btn" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(41, 151, 255, 0.4)"; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(41, 151, 255, 0.3)"; } }}
            >
              Reset & Continue
            </button>
          </form>
        )}

        {/* Early / Late Login Request UI */}
        {earlyLoginState.show && (
          <div style={{ marginTop: '20px', padding: '20px', borderRadius: '16px', background: earlyLoginState.type === 'late' ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 159, 10, 0.1)', border: `1px solid ${earlyLoginState.type === 'late' ? 'rgba(255, 69, 58, 0.2)' : 'rgba(255, 159, 10, 0.2)'}` }}>
            <h4 style={{ color: earlyLoginState.type === 'late' ? '#ff453a' : '#ff9f0a', marginBottom: '10px', fontSize: '14px' }}>
              {earlyLoginState.type === 'late' ? "Submit Late Login Request" : "Submit Early Login Request"}
            </h4>
            <textarea
              placeholder={earlyLoginState.type === 'late' ? "Why are you logging in after shift time? (e.g. Traffic, Medical issue, Personal emergency)" : "Why are you logging in before shift time? (e.g. Critical deployment, Server emergency)"}
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px', minHeight: '80px', marginBottom: '12px' }}
              value={earlyLoginState.reason}
              onChange={(e) => setEarlyLoginState({ ...earlyLoginState, reason: e.target.value })}
            />
            <button
              onClick={async () => {
                const allEmps = await getEmployees();
                const me = allEmps.find((e: any) => e.id === earlyLoginState.userId || e.user_id === earlyLoginState.userId);

                const now = new Date();
                const todayDate = now.toISOString().split('T')[0];
                const currentTime = now.toTimeString().substring(0, 5); // HH:MM

                await requestEarlyLogin({
                  employee_id: earlyLoginState.emp_id,
                  employee_name: earlyLoginState.name,
                  tl_id: me?.reporting_to_id || '',
                  reason: `${earlyLoginState.type === 'late' ? '[LATE LOGIN] ' : '[EARLY LOGIN] '}${earlyLoginState.reason}`,
                  date: todayDate,
                  requested_start_time: currentTime
                });
                setSuccessMsg(`Request submitted! Please wait for TL approval before trying again.`);
                setEarlyLoginState({ ...earlyLoginState, show: false });
              }}
              className="apple-btn"
              style={{ width: '100%', padding: '10px', background: earlyLoginState.type === 'late' ? '#ff453a' : '#ff9f0a', color: '#fff', fontWeight: 'bold' }}
            >
              Submit Request
            </button>
          </div>
        )}


      </div>

      <div style={{ marginTop: "40px", display: "flex", gap: "30px", fontSize: "13px", color: "var(--text-tertiary)", zIndex: 1 }}>
        <span
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", transition: "color 0.2s" }}
          onClick={() => setModalView("help")}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-blue)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
        >
          <FaQuestionCircle /> Help Center
        </span>
        <span
          style={{ cursor: "pointer", transition: "color 0.2s" }}
          onClick={() => setModalView("privacy")}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-blue)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
        >
          Privacy Policy
        </span>
        <span>© 2026 Mercure Solutions</span>
      </div>

      {modalView && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "20px",
          animation: "modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
          onClick={() => setModalView(null)}
        >
          <div style={{
            width: "100%",
            maxWidth: "640px",
            maxHeight: "85vh",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "24px",
            boxShadow: "0 30px 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(14, 165, 233, 0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "modalScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            position: "relative"
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "24px 32px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(30, 41, 59, 0.4)"
            }}>
              <h3 style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#fff",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                {modalView === "help" ? (
                  <>
                    <FaQuestionCircle style={{ color: "var(--accent-blue)" }} />
                    <span>Help Center & FAQ</span>
                  </>
                ) : (
                  <>
                    <FaShieldAlt style={{ color: "#30d158" }} />
                    <span>Privacy & Data Protection Policy</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setModalView(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 69, 58, 0.15)";
                  e.currentTarget.style.color = "#ff453a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{
              padding: "32px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "24px"
            }}
              className="modal-scroll"
            >
              {modalView === "help" ? (
                <>
                  {/* Search Bar */}
                  <div style={{ position: "relative" }}>
                    <FaSearch style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-tertiary)"
                    }} />
                    <input
                      type="text"
                      placeholder="Search help articles (e.g. password, early login...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px 16px 14px 44px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "14px",
                        color: "#fff",
                        fontSize: "14px",
                        outline: "none",
                        transition: "all 0.2s"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent-blue)";
                        e.currentTarget.style.background = "rgba(14, 165, 233, 0.05)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                      }}
                    />
                  </div>

                  {/* Support Channels */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginTop: "4px"
                  }}>
                    {supportChannels.map((channel, idx) => (
                      <a
                        key={idx}
                        href={channel.action}
                        style={{
                          padding: "16px",
                          background: "rgba(10, 132, 255, 0.06)",
                          border: "1px solid rgba(10, 132, 255, 0.15)",
                          borderRadius: "16px",
                          textDecoration: "none",
                          color: "inherit",
                          transition: "all 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.background = "rgba(10, 132, 255, 0.12)";
                          e.currentTarget.style.borderColor = "rgba(10, 132, 255, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.background = "rgba(10, 132, 255, 0.06)";
                          e.currentTarget.style.borderColor = "rgba(10, 132, 255, 0.15)";
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                          {idx === 0 ? <FaEnvelope style={{ color: "var(--accent-blue)" }} /> : <FaPhoneAlt style={{ color: "#30d158" }} />}
                          {channel.name}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{channel.detail}</span>
                      </a>
                    ))}
                  </div>

                  {/* FAQ List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-secondary)", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Frequently Asked Questions
                    </h4>
                    {faqs.filter(faq =>
                      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      faq.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((faq, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "20px",
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          borderRadius: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}
                      >
                        <span style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "var(--accent-blue)",
                          background: "rgba(14, 165, 233, 0.1)",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          alignSelf: "flex-start"
                        }}>
                          {faq.category}
                        </span>
                        <h5 style={{ fontSize: "15px", fontWeight: "600", color: "#fff", margin: 0 }}>
                          {faq.q}
                        </h5>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                          {faq.a}
                        </p>
                      </div>
                    ))}
                    {faqs.filter(faq =>
                      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-tertiary)" }}>
                          <FaInfoCircle size={28} style={{ marginBottom: "12px", opacity: 0.5 }} />
                          <p style={{ margin: 0, fontSize: "14px" }}>No matching help articles found. Please try a different query.</p>
                        </div>
                      )}
                  </div>
                </>
              ) : (
                <>
                  {/* Privacy Policy Commitment Banner */}
                  <div style={{
                    padding: "20px",
                    background: "rgba(48, 209, 88, 0.06)",
                    border: "1px solid rgba(48, 209, 88, 0.15)",
                    borderRadius: "18px",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start"
                  }}>
                    <FaShieldAlt size={22} style={{ color: "#30d158", flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#30d158", margin: "0 0 4px 0" }}>
                        Our Security & Privacy Commitment
                      </h4>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
                        We prioritize absolute security of employee credentials, timesheet records, and identity logs. Your work-tracking data is heavily encrypted and never shared externally.
                      </p>
                    </div>
                  </div>

                  {/* Privacy Policy Sections */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {privacySections.map((sec, idx) => (
                      <div
                        key={idx}
                        style={{
                          paddingBottom: idx !== privacySections.length - 1 ? "20px" : "0",
                          borderBottom: idx !== privacySections.length - 1 ? "1px solid rgba(255, 255, 255, 0.06)" : "none"
                        }}
                      >
                        <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#fff", margin: "0 0 8px 0" }}>
                          {sec.title}
                        </h4>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.6" }}>
                          {sec.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Policy Footer Actions */}
                  <div style={{
                    marginTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "var(--text-tertiary)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    paddingTop: "20px"
                  }}>
                    <span>Last Updated: May 2026</span>
                    <span
                      style={{ color: "var(--accent-blue)", cursor: "pointer", fontWeight: "600" }}
                      onClick={() => window.print()}
                    >
                      Print / Save Agreement
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <style>{`
            @keyframes modalFadeIn {
              from { opacity: 0; backdrop-filter: blur(0px); }
              to { opacity: 1; backdrop-filter: blur(12px); }
            }
            @keyframes modalScaleIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .modal-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .modal-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .modal-scroll::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 3px;
            }
            .modal-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.2);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

// STYLES
const inputGroupStyle: React.CSSProperties = { textAlign: "left" };
const labelStyle: React.CSSProperties = { fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", display: "block", letterSpacing: "0.5px" };
const iconStyle: React.CSSProperties = { position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-blue)", fontSize: "16px", zIndex: 10 };
const fieldStyle: React.CSSProperties = {
  paddingLeft: "48px", height: "54px", background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid var(--border-light)", borderRadius: "var(--input-radius)", fontSize: "15px",
  color: "#fff", transition: "all 0.3s ease", width: "100%"
};
const btnStyle: React.CSSProperties = {
  marginTop: "20px", width: "100%", height: "54px", fontSize: "16px", fontWeight: "700",
  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
  background: "var(--accent-gradient)",
  boxShadow: "0 10px 25px -5px rgba(14, 165, 233, 0.4)",
  color: "#fff", borderRadius: "var(--input-radius)",
  border: "none",
  transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  letterSpacing: "0.5px"
};
const pillStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-light)",
  color: "var(--text-secondary)", padding: "8px 16px", borderRadius: "20px",
  fontSize: "11px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s"
};
