import React from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaUsers, FaCalendarAlt, FaClipboardList, FaCog } from "react-icons/fa";

type Props = {
  role: string;
  active?: string;
};

export default function BottomNav({ role, active }: Props) {
  const navigate = useNavigate();

  const navStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(15, 20, 30, 0.75)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(14px)",
    padding: "12px 20px",
    borderRadius: "40px",
    display: "flex",
    gap: "18px",
    boxShadow: "0px 10px 40px rgba(0,0,0,0.8)",
    zIndex: 999,
  };

  const btnStyle: React.CSSProperties = {
    width: "55px",
    height: "45px",
    borderRadius: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    color: "rgba(255,255,255,0.7)",
    fontSize: "18px",
  };

  return (
    <div style={navStyle}>
      <div style={btnStyle} onClick={() => navigate(`/${role}/dashboard`)}>
        <FaHome />
      </div>

      <div style={btnStyle} onClick={() => navigate(`/${role}/users`)}>
        <FaUsers />
      </div>

      <div style={btnStyle} onClick={() => navigate(`/${role}/calendar`)}>
        <FaCalendarAlt />
      </div>

      <div style={btnStyle} onClick={() => navigate(`/${role}/tasks`)}>
        <FaClipboardList />
      </div>

      <div style={btnStyle} onClick={() => navigate(`/${role}/settings`)}>
        <FaCog />
      </div>
    </div>
  );
}
