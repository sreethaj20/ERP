import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

interface NoticePeriodData {
  is_on_notice: boolean;
  last_working_day: string | null;
  remaining_days: number;
  notice_period_days: number;
  reason: string;
  status: string;
  is_expired: boolean;
}

interface Props {
  noticePeriod: NoticePeriodData | null | undefined;
}

export default function NoticePeriodBanner({ noticePeriod }: Props) {
  if (!noticePeriod || !noticePeriod.is_on_notice) return null;

  const np = noticePeriod;
  const totalDays = np.notice_period_days || 60;
  const remaining = np.remaining_days !== undefined ? np.remaining_days : 0;
  const elapsed = Math.max(0, totalDays - remaining);
  const progress = Math.min(Math.max(0, (elapsed / totalDays) * 100), 100);
  const isUrgent = remaining <= 7;
  const lastDay = np.last_working_day
    ? new Date(np.last_working_day + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "TBD";

  return (
    <div
      style={{
        background: isUrgent
          ? "linear-gradient(135deg, rgba(255,69,58,0.12), rgba(255,159,10,0.08))"
          : "linear-gradient(135deg, rgba(255,159,10,0.10), rgba(10,132,255,0.06))",
        border: `1px solid ${isUrgent ? "rgba(255,69,58,0.3)" : "rgba(255,159,10,0.25)"}`,
        borderRadius: "16px",
        padding: "24px 28px",
        marginTop: "20px",
        marginBottom: "8px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: isUrgent ? "rgba(255,69,58,0.08)" : "rgba(255,159,10,0.06)",
          filter: "blur(30px)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: isUrgent ? "rgba(255,69,58,0.15)" : "rgba(255,159,10,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FaExclamationTriangle size={20} color={isUrgent ? "#ff453a" : "#ff9f0a"} />
        </div>
        <div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
            Notice Period Active
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Last working day: <b style={{ color: isUrgent ? "#ff453a" : "#ff9f0a" }}>{lastDay}</b>
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "center" }}>
          <div
            style={{
              fontSize: "42px",
              fontWeight: "800",
              color: isUrgent ? "#ff453a" : "#ff9f0a",
              lineHeight: "1",
            }}
          >
            {remaining}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-secondary)",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Days Left
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "6px",
          borderRadius: "3px",
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "3px",
            width: `${progress}%`,
            background: isUrgent
              ? "linear-gradient(90deg, #ff9f0a, #ff453a)"
              : "linear-gradient(90deg, #30d158, #ff9f0a)",
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "8px",
          fontSize: "11px",
          color: "var(--text-secondary)",
        }}
      >
        <span>Notice started</span>
        <span>
          {elapsed} of {totalDays} days elapsed
        </span>
      </div>
    </div>
  );
}
