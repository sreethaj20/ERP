import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import GlassCard from "../../components/GlassCard";
import { FaUserShield, FaKey, FaBan, FaCheckCircle } from "react-icons/fa";
import { managerGetRoleAssignments as getRoleAssignments, getEmployees, managerUpdateRoleAssignment as updateRoleAssignment } from "../../utils/storage";

interface User {
  id: number;
  full_name: string;
  email: string;
  role_id: number;
  is_active: boolean;
  last_login?: string;
}

const ROLE_MAP: { [key: number]: string } = {
  1: "Manager",
  2: "HR",
  3: "Recruiter",
  4: "Team Leader",
  5: "IT Support",
  6: "Employee"
};

export default function RoleAccessControl() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const assignments = await getRoleAssignments();
      const employees = await getEmployees();

      // Ensure they are arrays
      const assignmentsList = Array.isArray(assignments) ? assignments : [];
      const employeesList = Array.isArray(employees) ? employees : [];

      // Merge for display
      const merged: User[] = assignmentsList.map((a: any) => {
        const emp = employeesList.find((e: any) => e.employee_id === a.employee_id);
        const roleId = Number(Object.keys(ROLE_MAP).find(k => ROLE_MAP[Number(k)].toLowerCase() === (a.role_type || a.role_name)?.toLowerCase())) || 6;

        return {
          id: a.id,
          full_name: emp?.first_name ? `${emp.first_name} ${emp.last_name}` : (emp?.name || a.employee_id),
          email: emp?.email || "N/A",
          role_id: roleId,
          is_active: a.is_active,
          last_login: a.updated_at
        };
      });

      setUsers(merged);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleStatus = async (id: number, current_status: boolean) => {
    try {
      await updateRoleAssignment(id, { is_active: !current_status });
      await loadData();
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  return (
    <>
      <Header role="Manager" title="Security & Access" />

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Role Access Control</h1>
        <p className="subtitle">Manage system privileges, authentication status, and security protocols</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <GlassCard title="Authorization Registry" subtitle="Active Directory Users">
          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-secondary)", fontSize: "11px" }}>
                  <th style={{ padding: "15px" }}>USER / ROLE</th>
                  <th style={{ padding: "15px" }}>LOGIN EMAIL</th>
                  <th style={{ padding: "15px" }}>ACCESS STATUS</th>
                  <th style={{ padding: "15px" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Loading directory...</td></tr> : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border-light)", fontSize: "13px", opacity: u.is_active ? 1 : 0.6 }}>
                    <td style={{ padding: "15px" }}>
                      <div style={{ fontWeight: '700' }}>{u.full_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>
                        <FaUserShield style={{ marginRight: '5px' }} /> {ROLE_MAP[u.role_id] || "Unknown Role"}
                      </div>
                    </td>
                    <td style={{ padding: "15px" }}>
                      <span style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>{u.email}</span>
                    </td>
                    <td style={{ padding: "15px" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.is_active ? '#30d158' : '#ff453a' }} />
                        <span style={{ color: u.is_active ? '#30d158' : '#ff453a', fontWeight: 'bold', fontSize: '11px' }}>
                          {u.is_active ? 'ACTIVE' : 'REVOKED'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "15px" }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {u.is_active ? (
                          <button onClick={() => toggleStatus(u.id, u.is_active)} className="apple-btn" style={{ padding: '8px 12px', background: 'rgba(255,69,58,0.1)', color: '#ff453a', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaBan /> Revoke Access
                          </button>
                        ) : (
                          <button onClick={() => toggleStatus(u.id, u.is_active)} className="apple-btn" style={{ padding: '8px 12px', background: 'rgba(48,209,88,0.1)', color: '#30d158', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaCheckCircle /> Reinstate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <GlassCard title="Security Protocols" subtitle="System-wide constraints">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div style={protocolRow}>
                <span>Force Multi-Factor (MFA)</span>
                <div style={{ width: '30px', height: '16px', background: 'var(--accent-blue)', borderRadius: '10px', position: 'relative' }}>
                  <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }} />
                </div>
              </div>
              <div style={protocolRow}>
                <span>IP Range Restriction</span>
                <div style={{ width: '30px', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', position: 'relative' }}>
                  <div style={{ width: '12px', height: '12px', background: 'white', borderRadius: '50%', position: 'absolute', left: '2px', top: '2px' }} />
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Audit Vault" subtitle="Traceability export">
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Generate a report of all role changes and logins for compliance auditing.
            </p>
            <button className="apple-btn" style={{ width: '100%', gap: '10px' }}>
              <FaKey /> Export Sealed Audit Report
            </button>
          </GlassCard>
        </div>
      </div>
    </>
  );
}

const protocolRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
  fontSize: '13px', color: 'var(--text-primary)'
};
