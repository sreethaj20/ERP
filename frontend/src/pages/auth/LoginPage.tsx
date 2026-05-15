import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import { FaArrowRight, FaQuestionCircle, FaShieldAlt, FaEnvelope, FaLock, FaKey, FaChevronLeft } from "react-icons/fa";
import { getEmployees, getRoleAssignments, DEFAULT_PASSWORD, initStorage, recordLoginPresence, startShiftSession, requestEarlyLogin } from "../../utils/storage";
import { loginUser, requestPasswordReset, verifyResetToken, resetPassword } from "../../services/authService";

type AuthView = "login" | "forgot" | "verify" | "reset";

export default function LoginPage() {
  const navigate = useNavigate();

  // Core States
  const [email, setEmail] = useState("");
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
  const [earlyLoginState, setEarlyLoginState] = useState({ show: false, emp_id: '', name: '', userId: '', reason: '' });

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
      const authData = await loginUser(email, password);
      const user = authData.user;
      const token = authData.access_token || authData.token;

      // Store session data
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
          if (res.early_login_required) {
            setError(res.message || "Your shift is not yet started");
            setEarlyLoginState({
              show: true,
              emp_id: user.employee_id || user.id,
              name: user.name || user.full_name,
              userId: user.id,
              reason: ""
            });
            setLoading(false);
            return;
          }
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
      setError(err.message || "Invalid email address or password.");
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
      setEmail(forgotEmail);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Session may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (role: string) => {
    const demos: any = {
      manager: { u: "manager@test.com", p: DEFAULT_PASSWORD },
    };
    if (demos[role]) {
      setEmail(demos[role].u);
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
              <label style={labelStyle}>Work Email (Username)</label>
              <div style={{ position: "relative" }}>
                <FaEnvelope style={iconStyle} />
                <input type="email" placeholder="name@company.com" className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} required style={fieldStyle}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={labelStyle}>Password</label>
                <button type="button" onClick={() => { setView("forgot"); setError(""); setSuccessMsg(""); }} style={{ background: 'none', border: 'none', fontSize: "12px", color: "var(--accent-blue)", textDecoration: "none", fontWeight: "500", transition: "opacity 0.2s", cursor: 'pointer', padding: 0 }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>Forgot?</button>
              </div>
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

            <div style={{ textAlign: "center", marginTop: "15px", display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleReset}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
              >
                Reset Application Data
              </button>
            </div>
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

        {/* Early Login Request UI */}
        {earlyLoginState.show && (
          <div style={{ marginTop: '20px', padding: '20px', borderRadius: '16px', background: 'rgba(255, 159, 10, 0.1)', border: '1px solid rgba(255, 159, 10, 0.2)' }}>
            <h4 style={{ color: '#ff9f0a', marginBottom: '10px', fontSize: '14px' }}>Submit Early Login Request</h4>
            <textarea
              placeholder="Why are you logging in more than 2h early? (e.g. Server emergency, High priority task)"
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px', minHeight: '80px', marginBottom: '12px' }}
              value={earlyLoginState.reason}
              onChange={(e) => setEarlyLoginState({ ...earlyLoginState, reason: e.target.value })}
            />
            <button
              onClick={async () => {
                const allEmps = await getEmployees();
                const me = allEmps.find((e: any) => e.id === earlyLoginState.userId || e.user_id === earlyLoginState.userId);

                await requestEarlyLogin({
                  employee_id: earlyLoginState.emp_id,
                  employee_name: earlyLoginState.name,
                  tl_id: me?.reporting_to_id || '',
                  reason: earlyLoginState.reason
                });
                setSuccessMsg("Request submitted! Please wait for TL approval before trying again.");
                setEarlyLoginState({ ...earlyLoginState, show: false });
              }}
              className="apple-btn"
              style={{ width: '100%', padding: '10px', background: '#ff9f0a', color: '#000', fontWeight: 'bold' }}
            >
              Submit Request
            </button>
          </div>
        )}

        {/* Demo Section (only on login) */}
        {view === "login" && (
          <div style={{ marginTop: "30px", paddingTop: "25px", borderTop: "1px solid var(--border-light)" }}>
            <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "12px" }}>Quick Access</p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setDemoUser('manager')} style={pillStyle}>Manager Login</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: "40px", display: "flex", gap: "30px", fontSize: "13px", color: "var(--text-tertiary)", zIndex: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FaQuestionCircle /> Help Center</span>
        <span>Privacy Policy</span>
        <span>© 2026 Mercure Solutions</span>
      </div>
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
