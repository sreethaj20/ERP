import React from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";

interface PageTemplateProps {
  role: string;
  title: string;
  subtitle?: string;
  activeNav?: string;
  children?: React.ReactNode;
}

export default function PageTemplate({ role, title, subtitle, activeNav, children }: PageTemplateProps) {
  return (
    <div className="dashboard-container">
      <Header role={role} />

      <div style={{ marginTop: "35px" }}>
        <h1 style={{ fontSize: "50px" }}>{title}</h1>
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </div>

      <div style={{ marginTop: "40px" }}>
        {children || (
          <div className="glass-card">
            <h2 style={{ margin: 0 }}>Page Content</h2>
            <p style={{ color: "rgba(255,255,255,0.5)" }}>
              This module page is ready. API integration will be added.
            </p>
          </div>
        )}
      </div>

      <BottomNav role={role} active={activeNav} />
    </div>
  );
}
