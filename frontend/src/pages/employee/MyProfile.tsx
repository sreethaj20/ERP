import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import {
  getMyProfile, updateMyProfile, getMyPreboarding, getMyOnboarding, getMyOffboarding
} from "../../services/employeeService";
import {
  FaEnvelope, FaPhone, FaIdCard, FaBuilding, FaUserTie, FaCalendarAlt,
  FaEdit, FaBriefcase, FaMapMarkerAlt, FaCircle, FaClock, FaSave,
  FaTimes, FaShieldAlt, FaUniversity, FaHeartbeat, FaUser, FaKey,
  FaGlobe, FaHome, FaExclamationCircle, FaFingerprint, FaCamera, FaSignOutAlt
} from "react-icons/fa";
import { formatLongExperience } from "../../utils/dateHelpers";
import { initiateOffboarding } from "../../utils/storage";
import { changePassword } from "../../services/authService";
import { FaTicketAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function MyProfile() {
  const userId = sessionStorage.getItem("userId") || "";
  const employeeId = sessionStorage.getItem("employeeId") || "";
  const [currentUser, setCurrentUser] = useState<any>({});
  const [preboarding, setPreboarding] = useState<any>({});
  const [onboarding, setOnboarding] = useState<any>({});
  const [offboarding, setOffboarding] = useState<any>({});

  const [activeTab, setActiveTab] = useState<"personal" | "employment" | "account" | "emergency" | "bank">("personal");
  const [isEditing, setIsEditing] = useState(false);

  // States for editable fields
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPersonalEmail, setEditPersonalEmail] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editMaritalStatus, setEditMaritalStatus] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRole = (currentUser.role || sessionStorage.getItem("userRole") || "Employee").toLowerCase().replace(/[\s_]+/g, '');
  const canEditRole = ['manager', 'hr', 'admin'].includes(userRole);
  const isSelf = String(currentUser.id) === String(sessionStorage.getItem("userId")) || String(currentUser.user_id) === String(sessionStorage.getItem("userId"));

  // POLICY: Standard employees can ONLY edit Name and Photo.
  // Administrative roles (HR/Manager) can edit demographic fields.
  const canEditDemographics = canEditRole;
  const canEditIdentity = isSelf || canEditRole;

  const navigate = useNavigate();
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdData, setPwdData] = useState({ old: "", new: "", confirm: "" });
  const [pwdStatus, setPwdStatus] = useState<any>(null);

  const experience = formatLongExperience(currentUser.join_date || currentUser.joining_date || "—");

  useEffect(() => {
    const refresh = async () => {
      try {
        const emp = await getMyProfile();
        setCurrentUser(emp);

        // Update local edit states when user data is loaded
        if (!isEditing) {
          setEditName(emp.name || emp.full_name || sessionStorage.getItem("userName") || "");
          setEditPhoto(emp.profile_photo_url || emp.photo || "");
          setEditPhone(emp.phone || emp.personal_mobile || "");
          setEditEmail(emp.email || "");
          setEditPersonalEmail(emp.personal_email || "");
          setEditDob(emp.dob || emp.date_of_birth || "");
          setEditGender(emp.gender || "");
          setEditBloodGroup(emp.blood_group || "");
          setEditMaritalStatus(emp.marital_status || "");
          setEditAddress(emp.address || emp.current_address || "");
        }

        const [preRes, onbRes, offRes] = await Promise.all([
          getMyPreboarding(),
          getMyOnboarding(),
          getMyOffboarding()
        ]);
        
        // Handle array responses from service
        setPreboarding((Array.isArray(preRes) ? preRes[0] : preRes) || {});
        setOnboarding((Array.isArray(onbRes) ? onbRes[0] : onbRes) || {});
        setOffboarding((Array.isArray(offRes) ? offRes[0] : offRes) || {});
      } catch (e) {
        console.error("Profile refresh failed:", e);
      }
    };
    refresh();
  }, [userId, isEditing]);

  const handleSave = async () => {
    try {
      const updates: any = {
        name: editName,
        profile_photo_url: editPhoto,
      };

      if (canEditDemographics) {
        Object.assign(updates, {
          phone: editPhone,
          personal_email: editPersonalEmail,
          dob: editDob,
          gender: editGender,
          blood_group: editBloodGroup,
          marital_status: editMaritalStatus,
        });
      }

      await updateMyProfile(updates);
      setIsEditing(false);
      alert("✅ Profile updated successfully!");
    } catch (e) {
      console.error("Failed to update profile:", e);
      alert("❌ Failed to update profile via API.");
    }
  };

  const handleCancel = () => {
    setEditName(currentUser.name || currentUser.full_name || "");
    setEditPhoto(currentUser.photo || "");
    setEditPhone(currentUser.phone || currentUser.personal_mobile || "");
    setEditPersonalEmail(currentUser.personal_email || "");
    setEditDob(currentUser.dob || "");
    setEditGender(currentUser.gender || "");
    setEditBloodGroup(currentUser.blood_group || "");
    setEditMaritalStatus(currentUser.marital_status || "");
    setIsEditing(false);
  };


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Photo must be under 2 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const maskAccount = (acc: string) => {
    if (!acc || acc.length < 5) return acc || "—";
    return "••••" + acc.slice(-4);
  };

  const tabs = [
    { key: "personal", label: "Personal", icon: <FaUser size={12} /> },
    { key: "employment", label: "Employment", icon: <FaBriefcase size={12} /> },
    { key: "account", label: "Account & Security", icon: <FaKey size={12} /> },
    { key: "emergency", label: "Emergency Contact", icon: <FaHeartbeat size={12} /> },
    { key: "bank", label: "Bank & Finance", icon: <FaUniversity size={12} /> },
  ];

  const roleBadgeColor = (() => {
    const r = (userRole || '').toLowerCase().replace(/\s+/g, '');
    if (r === 'manager') return '#ff9f0a';
    if (r === 'hr') return '#0a84ff';
    if (r === 'teamleader') return '#bf5af2';
    if (r === 'recruiter') return '#30d158';
    if (r === 'it' || r === 'itdepartment') return '#64d2ff';
    return '#0a84ff';
  })();

  const displayName = isEditing ? editName : (currentUser.name || currentUser.full_name || sessionStorage.getItem("userName") || "User");
  const displayPhoto = isEditing ? editPhoto : (currentUser.photo || "");

  return (
    <div className="dashboard-container">
      <Header role={userRole} title="Profile Settings" />

      {/* ─── HERO PROFILE CARD ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '28px',
        padding: '30px 35px', marginBottom: '30px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '24px', border: '1px solid var(--border-light)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: `linear-gradient(90deg, ${roleBadgeColor}, ${roleBadgeColor}66, transparent)`
        }} />

        {/* Avatar with Photo Upload */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {displayPhoto ? (
            <img
              src={displayPhoto}
              alt={displayName}
              style={{
                width: '110px', height: '110px', borderRadius: '28px',
                objectFit: 'cover',
                boxShadow: `0 12px 30px ${roleBadgeColor}40`,
                border: `3px solid ${roleBadgeColor}50`
              }}
            />
          ) : (
            <div style={{
              width: '110px', height: '110px', borderRadius: '28px',
              background: `linear-gradient(135deg, ${roleBadgeColor}, ${roleBadgeColor}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '44px', fontWeight: '700', color: 'white',
              boxShadow: `0 12px 30px ${roleBadgeColor}40`
            }}>
              {(displayName || "U").charAt(0).toUpperCase()}
            </div>
          )}
          {isEditing && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: '-4px', right: '-4px',
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: roleBadgeColor, border: '3px solid #1a1a2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', fontSize: '13px'
                }}
                title="Upload Photo"
              >
                <FaCamera />
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{ ...editInputStyle, fontSize: '28px', fontWeight: '700', width: '100%', maxWidth: '400px' }}
              placeholder="Enter your name"
            />
          ) : (
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.5px' }}>{displayName}</h1>
          )}
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {currentUser.designation || "Employee"} • {currentUser.department || "General"}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
              background: `${roleBadgeColor}18`, color: roleBadgeColor, border: `1px solid ${roleBadgeColor}30`,
              textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              {userRole}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
              background: currentUser.status === 'Active' ? 'rgba(48,209,88,0.12)' : 'rgba(255,159,10,0.12)',
              color: currentUser.status === 'Active' ? '#30d158' : '#ff9f0a'
            }}>
              <FaCircle size={6} /> {currentUser.status || 'Active'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaIdCard size={11} /> {currentUser.employee_id || employeeId || userId}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaClock size={11} /> {experience}
            </span>
          </div>
          {isEditing && (
            <div style={{
              marginTop: '10px', fontSize: '11px', color: 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <FaExclamationCircle size={11} color="#ff9f0a" />
              {canEditDemographics
                ? <span>You can update <strong style={{ color: '#ff9f0a' }}>Personal Details</strong>. Employment details are managed by HR.</span>
                : <span>You can only update your <strong style={{ color: '#ff9f0a' }}>Name</strong> and <strong style={{ color: '#ff9f0a' }}>Photo</strong>. For other changes, please <strong style={{ color: 'var(--accent-blue)', cursor: 'pointer' }} onClick={() => navigate('/employee/support')}>Raise a Ticket</strong>.</span>
              }
            </div>
          )}
        </div>

        {/* Edit Button */}
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="apple-btn"
            style={{ background: 'rgba(255,255,255,0.06)', gap: '8px', flexShrink: 0 }}
          >
            <FaEdit /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button onClick={handleSave} className="apple-btn" style={{ background: '#30d158', color: '#fff', border: 'none', gap: '6px' }}>
              <FaSave /> Save
            </button>
            <button onClick={handleCancel} className="apple-btn" style={{ background: 'rgba(255,69,58,0.12)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.2)', gap: '6px' }}>
              <FaTimes /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* ─── TAB NAVIGATION ─── */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '24px',
        background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
        padding: '5px', border: '1px solid var(--border-light)'
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '12px',
              border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: activeTab === t.key ? roleBadgeColor : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: PERSONAL INFORMATION ─── */}
      {activeTab === "personal" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <GlassCard title="Identity & Contact" subtitle="Core personal details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '10px' }}>
              <ProfileField icon={<FaEnvelope color="#30d158" />} label="Official Email" value={currentUser.email} />
              <ProfileField
                icon={<FaEnvelope color="#bf5af2" />}
                label="Personal Email"
                value={isEditing && canEditDemographics ? editPersonalEmail : currentUser.personal_email}
                isEditable={isEditing && canEditDemographics}
                onEdit={setEditPersonalEmail}
              />
              <ProfileField
                icon={<FaPhone color="#64d2ff" />}
                label="Mobile Number"
                value={isEditing && canEditDemographics ? editPhone : (currentUser.phone || currentUser.personal_mobile)}
                isEditable={isEditing && canEditDemographics}
                onEdit={setEditPhone}
              />
              <ProfileField
                icon={<FaCalendarAlt color="#ff9f0a" />}
                label="Date of Birth"
                value={isEditing && canEditDemographics ? editDob : currentUser.dob}
                isEditable={isEditing && canEditDemographics}
                onEdit={setEditDob}
                type="date"
              />
            </div>
          </GlassCard>

          <GlassCard title="Demographic Info" subtitle="Personal identity details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '10px' }}>
              <ProfileField
                icon={<FaUser color="#0a84ff" />}
                label="Gender"
                value={isEditing && canEditDemographics ? editGender : currentUser.gender}
                isEditable={isEditing && canEditDemographics}
                onEdit={setEditGender}
              />
              <ProfileField
                icon={<FaHeartbeat color="#ff453a" />}
                label="Blood Group"
                value={isEditing && canEditDemographics ? editBloodGroup : currentUser.blood_group}
                isEditable={isEditing && canEditDemographics}
                onEdit={setEditBloodGroup}
              />
              <ProfileField
                icon={<FaShieldAlt color="#30d158" />}
                label="Marital Status"
                value={isEditing && canEditDemographics ? editMaritalStatus : currentUser.marital_status}
                isEditable={isEditing && canEditDemographics}
                onEdit={setEditMaritalStatus}
              />
              <ProfileField icon={<FaGlobe color="#ff9f0a" />} label="Nationality" value={currentUser.nationality || "Indian"} />
            </div>
          </GlassCard>

          <div style={{ gridColumn: 'span 2' }}>
            <GlassCard title="Address Information" subtitle="Residential details for records">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 30px', marginTop: '10px' }}>
                <ProfileField icon={<FaHome color="#bf5af2" />} label="Permanent Address" value={currentUser.permanent_address || preboarding?.permanent_address} />
                <ProfileField icon={<FaMapMarkerAlt color="#ff453a" />} label="Current Address" value={currentUser.current_address || preboarding?.current_address} />
                <ProfileField icon={<FaBuilding color="#64d2ff" />} label="City" value={currentUser.city || preboarding?.city} />
                <ProfileField icon={<FaMapMarkerAlt color="#30d158" />} label="State" value={currentUser.state || preboarding?.state} />
                <ProfileField icon={<FaFingerprint color="#ff9f0a" />} label="PIN Code" value={currentUser.postal_code || preboarding?.pincode} />
                <ProfileField icon={<FaGlobe color="#0a84ff" />} label="Country" value={currentUser.country || preboarding?.country || "India"} />
              </div>
              <HRNote />
            </GlassCard>
          </div>
        </div>
      )}

      {/* ─── TAB: EMPLOYMENT ─── */}
      {activeTab === "employment" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <GlassCard title="Organizational Assignment" subtitle="Your position in the company">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '10px' }}>
              <ProfileField icon={<FaIdCard color="#0a84ff" />} label="Employee ID" value={currentUser.employee_id || employeeId || userId} />
              <ProfileField icon={<FaBuilding color="#64d2ff" />} label="Department" value={currentUser.department} />
              <ProfileField icon={<FaBriefcase color="#bf5af2" />} label="Designation" value={currentUser.designation} />
              <ProfileField icon={<FaUserTie color="#ff9f0a" />} label="Reports To" value={currentUser.reporting_to} />
            </div>
          </GlassCard>

          <GlassCard title="Work Details" subtitle="Employment configuration">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '10px' }}>
              <ProfileField icon={<FaBriefcase color="#30d158" />} label="Employment Type" value={currentUser.employment_type || "Full-time"} />
              <ProfileField icon={<FaCalendarAlt color="#0a84ff" />} label="Joining Date" value={currentUser.join_date || currentUser.joining_date} />
              <ProfileField icon={<FaMapMarkerAlt color="#ff453a" />} label="Work Location" value={currentUser.joining_location || currentUser.work_location} />
              <ProfileField icon={<FaClock color="#bf5af2" />} label="Experience" value={experience} />
              <ProfileField icon={<FaBuilding color="#64d2ff" />} label="Work Mode" value={currentUser.work_mode || "Onsite"} />
              <ProfileField icon={<FaClock color="#ff9f0a" />} label="Shift Type" value={currentUser.shift_type || "General"} />
            </div>
            <HRNote />
          </GlassCard>

          {(currentUser.cost_center || currentUser.business_unit || currentUser.grade_level) ? (
            <div style={{ gridColumn: 'span 2' }}>
              <GlassCard title="Administrative Details" subtitle="Cost center and grading">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 30px', marginTop: '10px' }}>
                  <ProfileField icon={<FaBuilding color="#30d158" />} label="Cost Center" value={currentUser.cost_center} />
                  <ProfileField icon={<FaBriefcase color="#0a84ff" />} label="Business Unit" value={currentUser.business_unit} />
                  <ProfileField icon={<FaShieldAlt color="#ff9f0a" />} label="Grade Level" value={currentUser.grade_level} />
                </div>
              </GlassCard>
            </div>
          ) : null}

          {isSelf && (
            <div style={{ gridColumn: 'span 2' }}>
              <GlassCard title="Employee Lifecycle" subtitle="Manage your journey with the organization">
                <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Resignation & Offboarding</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Initiate your separation process formally through the portal.</div>
                  </div>
                  <button
                    className="apple-btn"
                    style={{
                      background: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.2)',
                      opacity: offboarding && offboarding.status === 'Pending' ? 0.5 : 1
                    }}
                    onClick={async () => {
                      if (offboarding && offboarding.status === 'Pending') return;
                      if (confirm("Are you sure you want to initiate your resignation? This action will notify your HR and Reporting Manager.")) {
                        const reason = prompt("Please provide a reason for resignation:");
                        if (reason) {
                          try {
                            await (window as any).initiateOffboarding({ reason, exit_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] });
                            alert("Resignation submitted successfully.");
                          } catch (e) {
                            // Fallback if global not set
                            await initiateOffboarding({ reason, exit_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] });
                          }
                          window.location.reload();
                        }
                      }
                    }}
                  >
                    <FaSignOutAlt /> {offboarding && (offboarding.status === 'Pending' || !offboarding.completed) ? "Resignation Pending" : "Initiate Resignation"}
                  </button>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: ACCOUNT & SECURITY ─── */}
      {activeTab === "account" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <GlassCard title="Login Credentials" subtitle="Your system access information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '10px' }}>
              <ProfileField icon={<FaKey color="#ff9f0a" />} label="Login Email" value={currentUser.email} />
              <ProfileField icon={<FaShieldAlt color="#30d158" />} label="Password" value="••••••••••" />
              <ProfileField icon={<FaIdCard color="#0a84ff" />} label="User ID" value={currentUser.employee_id || employeeId || userId} />
              <ProfileField icon={<FaUser color="#bf5af2" />} label="Active Role" value={(userRole || 'Employee').toUpperCase()} />
            </div>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => setShowPwdModal(true)}
                className="apple-btn"
                style={{
                  width: '100%', background: 'rgba(255,159,10,0.1)', color: '#ff9f0a',
                  border: '1px solid rgba(255,159,10,0.2)', gap: '8px'
                }}
              >
                <FaKey /> Change Password
              </button>
            </div>
          </GlassCard>

          <GlassCard title="Session & Access" subtitle="Security and compliance status">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <SecurityRow label="Portal Access" status={true} detail="Login enabled" />
              <SecurityRow label="Two-Factor Auth" status={false} detail="Not configured" />
              <SecurityRow label="Onboarding Verified" status={!!onboarding?.identity_verified} detail={onboarding?.identity_verified ? "Verified by HR" : "Pending verification"} />
              <SecurityRow label="IT Access Provisioned" status={!!onboarding?.it_access_granted} detail={onboarding?.it_access_granted ? "Active" : "Awaiting IT clearance"} />

              <div style={{
                padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-light)', marginTop: '8px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '8px' }}>
                  Last Activity
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Current session started at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              </div>
            </div>
          </GlassCard>

          <div style={{ gridColumn: 'span 2' }}>
            <GlassCard title="Compliance Status" subtitle="Policy acknowledgments and document verification">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' }}>
                <ComplianceCard label="Policy Acknowledged" done={!!preboarding.policy_acknowledged} />
                <ComplianceCard label="NDA Signed" done={!!preboarding.nda_signed} />
                <ComplianceCard label="Code of Conduct" done={!!preboarding.code_of_conduct_signed} />
                <ComplianceCard label="Documents Verified" done={!!preboarding.documents_verified || !!onboarding?.identity_verified} />
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ─── TAB: EMERGENCY CONTACT ─── */}
      {activeTab === "emergency" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <GlassCard title="Primary Emergency Contact" subtitle="Person to contact in case of emergency">
            <div style={{
              padding: '20px', marginTop: '16px', borderRadius: '16px',
              background: 'rgba(255,69,58,0.04)', border: '1px solid rgba(255,69,58,0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'rgba(255,69,58,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FaExclamationCircle color="#ff453a" size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Emergency Contact
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                    {currentUser.emergency_contact_name || preboarding.emergency_contact_name || "Not Provided"}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                <ProfileField icon={<FaUser color="#ff453a" />} label="Contact Name" value={currentUser.emergency_contact_name || preboarding.emergency_contact_name} />
                <ProfileField icon={<FaPhone color="#ff9f0a" />} label="Phone Number" value={currentUser.emergency_contact_phone || preboarding.emergency_contact_phone} />
                <ProfileField icon={<FaHeartbeat color="#bf5af2" />} label="Relationship" value={currentUser.emergency_contact_relation || preboarding.emergency_contact_relation} />
              </div>
            </div>
            <HRNote text="Emergency contact details can only be updated by HR through the Employee Master." />
          </GlassCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <GlassCard title="Why Emergency Contacts Matter" subtitle="Company policy compliance">
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <PolicyNote icon="🏥" title="Medical Emergencies" desc="Your designated contact will be notified in case of any medical incident at the workplace." />
                <PolicyNote icon="🔐" title="Security Protocol" desc="Required by company policy for all employees. Must be updated annually." />
                <PolicyNote icon="⚡" title="Quick Response" desc="Ensures fastest possible response when you need help. Keep numbers up to date." />
              </div>
            </GlassCard>

            {!preboarding.emergency_contact_name && (
              <div style={{
                padding: '20px', borderRadius: '16px',
                background: 'rgba(255,159,10,0.08)', border: '1px dashed rgba(255,159,10,0.3)',
                textAlign: 'center'
              }}>
                <FaExclamationCircle color="#ff9f0a" size={24} />
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#ff9f0a', marginTop: '10px' }}>
                  Emergency Contact Missing
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                  Please contact your HR representative to add your emergency contact details.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: BANK & FINANCE ─── */}
      {activeTab === "bank" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <GlassCard title="Bank Account Details" subtitle="Salary disbursement account">
            <div style={{
              padding: '20px', marginTop: '16px', borderRadius: '16px',
              background: 'rgba(10,132,255,0.04)', border: '1px solid rgba(10,132,255,0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'rgba(10,132,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FaUniversity color="#0a84ff" size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                    {currentUser.bank_name || preboarding?.bank_name || "Bank Not Specified"}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    A/C: {maskAccount(currentUser.bank_account_number || preboarding?.bank_account_number)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                <ProfileField icon={<FaUniversity color="#0a84ff" />} label="Bank Name" value={currentUser.bank_name || preboarding?.bank_name} />
                <ProfileField icon={<FaIdCard color="#30d158" />} label="Account Number" value={maskAccount(currentUser.bank_account_number || preboarding?.bank_account_number)} />
                <ProfileField icon={<FaFingerprint color="#ff9f0a" />} label="IFSC Code" value={currentUser.bank_ifsc_code || preboarding?.bank_ifsc_code} />
              </div>
            </div>
            <HRNote text="Bank details are read-only and can only be updated by HR for security compliance." />
          </GlassCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <GlassCard title="Payroll Information" subtitle="Compensation configuration">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '10px' }}>
                <ProfileField icon={<FaIdCard color="#bf5af2" />} label="PF Registration" value={currentUser.pf_registered || onboarding?.pf_registered ? "Enrolled" : "Pending"} />
                <ProfileField icon={<FaShieldAlt color="#30d158" />} label="ESI Status" value={currentUser.esi_registered || onboarding?.esi_registered ? "Enrolled" : "Pending"} />
                <ProfileField icon={<FaHeartbeat color="#ff453a" />} label="Insurance" value={currentUser.insurance_enrolled || onboarding?.insurance_enrolled ? "Active" : "Not Enrolled"} />
                <ProfileField icon={<FaUniversity color="#0a84ff" />} label="Payroll ID" value={currentUser.payroll_id_created || onboarding?.payroll_id_created ? "Generated" : "Awaiting"} />
              </div>
            </GlassCard>

            <GlassCard title="Tax & Deductions" subtitle="Annual declarations">
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <TaxRow label="Income Tax Regime" value="New Regime" />
                <TaxRow label="TDS Status" value="Active" />
                <TaxRow label="Investment Declaration" value="Pending" color="#ff9f0a" />
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div style={{
        marginTop: '30px', padding: '16px 20px', borderRadius: '14px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)',
        fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        <FaShieldAlt color="#0a84ff" size={14} />
        {canEditRole ? (
          <span>
            As a Manager, you can edit your <strong style={{ color: '#fff' }}>Personal Details</strong>.
            Employment, Bank, and Emergency Contact details are managed by <strong style={{ color: '#0a84ff' }}>HR</strong>.
          </span>
        ) : (
          <span>
            You can only edit your <strong style={{ color: '#fff' }}>Name</strong> and <strong style={{ color: '#fff' }}>Photo</strong>.
            For changes to other details (email, phone, address, bank, emergency contact, etc.), please raise a request with your <strong style={{ color: 'var(--accent-blue)', cursor: 'pointer' }} onClick={() => navigate('/employee/support')}>HR Representative</strong>.
          </span>
        )}
      </div>
      {/* Change Password Modal */}
      {showPwdModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{ width: "100%", maxWidth: "400px" }}>
            <GlassCard title="Security Update" subtitle="Choose a strong new password">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
                {pwdStatus && (
                  <div style={{ padding: "10px", borderRadius: "8px", background: pwdStatus.type === "success" ? "rgba(48,209,88,0.1)" : "rgba(255,69,58,0.1)", color: pwdStatus.type === "success" ? "#30d158" : "#ff453a", fontSize: "12px", border: "1px solid" }}>
                    {pwdStatus.text}
                  </div>
                )}
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: "700" }}>Current Password</label>
                  <input type="password" value={pwdData.old} onChange={e => setPwdData({ ...pwdData, old: e.target.value })} style={editInputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: "700" }}>New Password</label>
                  <input type="password" value={pwdData.new} onChange={e => setPwdData({ ...pwdData, new: e.target.value })} style={editInputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: "700" }}>Confirm New Password</label>
                  <input type="password" value={pwdData.confirm} onChange={e => setPwdData({ ...pwdData, confirm: e.target.value })} style={editInputStyle} />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    onClick={async () => {
                      if (!pwdData.old || !pwdData.new || !pwdData.confirm) return setPwdStatus({ type: "error", text: "Fill all fields" });
                      if (pwdData.new !== pwdData.confirm) return setPwdStatus({ type: "error", text: "Passwords do not match" });
                      try {
                        await changePassword(pwdData.old, pwdData.new);
                        setPwdStatus({ type: "success", text: "Password updated! Use it for your next login." });
                        setTimeout(() => setShowPwdModal(false), 2000);
                      } catch (e: any) {
                        setPwdStatus({ type: "error", text: e.message || "Failed to update password" });
                      }
                    }}
                    className="apple-btn" style={{ flex: 1, background: "var(--accent-blue)", color: "#fff" }}
                  >Update Password</button>
                  <button onClick={() => setShowPwdModal(false)} className="apple-btn" style={{ flex: 1, background: "rgba(255,255,255,0.05)" }}>Cancel</button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SUB-COMPONENTS ─── */

const ProfileField = ({ icon, label, value, isEditable, onEdit, type = "text" }: any) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '13px 0', borderBottom: '1px solid var(--border-light)',
    fontSize: '14px'
  }}>
    <div style={{ width: '20px', textAlign: 'center', flexShrink: 0 }}>{icon}</div>
    <div style={{ minWidth: '130px', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600', flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {isEditable ? (
        <input
          type={type}
          value={value || ""}
          onChange={e => onEdit(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--accent-blue)',
            borderRadius: '6px',
            color: '#fff',
            padding: '4px 8px',
            outline: 'none',
            width: '100%',
            fontSize: '13px'
          }}
        />
      ) : (
        <>
          <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: value ? '500' : '400' }}>
            {value || "—"}
          </span>
          {/* If we are in edit mode but THIS specific field is not editable for the user */}
          {window.location.href.includes('profile') && !isEditable && (
            <FaTicketAlt
              size={10}
              color="var(--text-tertiary)"
              style={{ cursor: 'pointer', opacity: 0.5 }}
              title="Request Change"
              onClick={() => window.location.href = '/employee/support'}
            />
          )}
        </>
      )}
    </div>
  </div>
);

const HRNote = ({ text }: { text?: string }) => (
  <div style={{
    marginTop: '14px', padding: '12px 14px', borderRadius: '10px',
    background: 'rgba(10,132,255,0.04)', border: '1px solid rgba(10,132,255,0.12)',
    fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px'
  }}>
    <FaShieldAlt color="#0a84ff" size={12} style={{ flexShrink: 0 }} />
    {text || "These details are managed by HR. Contact your HR representative for any changes."}
  </div>
);

const SecurityRow = ({ label, status, detail }: { label: string; status: boolean; detail: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)'
  }}>
    <div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{detail}</div>
    </div>
    <span style={{
      padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '700',
      background: status ? 'rgba(48,209,88,0.12)' : 'rgba(255,159,10,0.12)',
      color: status ? '#30d158' : '#ff9f0a'
    }}>
      {status ? 'ACTIVE' : 'PENDING'}
    </span>
  </div>
);

const ComplianceCard = ({ label, done }: { label: string; done: boolean }) => (
  <div style={{
    padding: '18px', borderRadius: '14px', textAlign: 'center',
    background: done ? 'rgba(48,209,88,0.06)' : 'rgba(255,159,10,0.06)',
    border: `1px solid ${done ? 'rgba(48,209,88,0.15)' : 'rgba(255,159,10,0.15)'}`
  }}>
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{done ? '✅' : '⏳'}</div>
    <div style={{ fontSize: '12px', fontWeight: '600', color: done ? '#30d158' : '#ff9f0a' }}>{label}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{done ? 'Completed' : 'Pending'}</div>
  </div>
);

const PolicyNote = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div style={{
    display: 'flex', gap: '12px', padding: '14px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)'
  }}>
    <div style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>{desc}</div>
    </div>
  </div>
);

const TaxRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: '13px'
  }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontWeight: '700', color: color || '#30d158' }}>{value}</span>
  </div>
);

const editInputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--accent-blue)',
  borderRadius: '10px',
  color: '#fff',
  padding: '8px 14px',
  outline: 'none'
};
