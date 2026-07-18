"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Menu, ChevronDown, LogIn, KeyRound, User, Mail, ShieldAlert } from "lucide-react";
import type { Role } from "@/lib/domain";
import { FoxscanLogo } from "./Sidebar";

interface HeaderProps {
  projectName: string;
  projectAddress: string;
  projectStatus: string;
  role: Role;
  onRoleChange: (role: Role) => void;
  token: string;
  onTokenChange: (token: string) => void;
  onMenuToggle: () => void;
  notificationCount: number;
  userName: string;
}

export default function Header({
  projectName,
  projectAddress,
  projectStatus,
  role,
  onRoleChange,
  token,
  onTokenChange,
  onMenuToggle,
  notificationCount,
  userName,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [identifier, setIdentifier] = useState("admin@foxscan.local");
  const [code, setCode] = useState("123456");
  const [message, setMessage] = useState(token ? "Signed in" : "");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const request = async () => {
    const r = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "request", identifier }),
    });
    const d = await r.json();
    setMessage(d.developmentCode ? `Local OTP: ${d.developmentCode}` : d.delivery);
  };

  const verify = async () => {
    const r = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "verify", identifier, code }),
    });
    const d = await r.json();
    if (d.token) {
      onTokenChange(d.token);
      setMessage(`Signed in as ${d.user.name}`);
      setMenuOpen(false);
    } else {
      setMessage(d.error);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <div>
          <div className="header-title">
            {projectName}
            <span
              className={`badge ${projectStatus}`}
              style={{ marginLeft: 8, verticalAlign: "middle" }}
            >
              {projectStatus}
            </span>
          </div>
          <div className="header-subtitle">{projectAddress}</div>
        </div>
      </div>

      <div className="header-right">
        {/* Notification Bell */}
        <button className="header-icon-btn" aria-label="Notifications" style={{ marginRight: 4 }}>
          <Bell size={18} />
          {notificationCount > 0 && <span className="notification-dot" />}
        </button>

        {/* User Menu Trigger */}
        <div className="user-menu-wrapper" ref={menuRef}>
          <button
            className="user-menu-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Account menu"
          >
            <div className="user-menu-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="user-menu-name">{userName}</span>
            <ChevronDown size={14} style={{ opacity: 0.7 }} />
          </button>

          {/* User Menu Dropdown Card */}
          {menuOpen && (
            <div className="user-menu-dropdown">
              {/* Account Profile Summary */}
              <div className="user-menu-section" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "var(--brand-yellow-light)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontWeight: 700, fontSize: "14px",
                  color: "var(--brand-yellow-hover)",
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userName}
                  </div>
                  <div className="muted" style={{ fontSize: "11px" }}>
                    {token ? "Authenticated Session" : "Guest Mode"}
                  </div>
                </div>
                <FoxscanLogo size={24} />
              </div>

              {/* Active Role Selector */}
              <div className="user-menu-section">
                <div className="user-menu-section-label" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "6px" }}>
                  Active Workspace Role
                </div>
                <div style={{ position: "relative" }}>
                  <select
                    value={role}
                    onChange={(e) => onRoleChange(e.target.value as Role)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "13px",
                      fontWeight: 500,
                      background: "var(--bg)",
                      color: "var(--ink)",
                      cursor: "pointer",
                      appearance: "none",
                    }}
                  >
                    {(["ADMIN", "CLIENT", "CONSULTANT", "MANUFACTURER", "CONTRACTOR"] as Role[]).map(
                      (r) => (
                        <option key={r} value={r}>{r}</option>
                      )
                    )}
                  </select>
                  <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.6 }}>
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {/* Authentication Management */}
              <div className="user-menu-section" style={{ borderBottom: "none" }}>
                <div className="user-menu-section-label" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "8px" }}>
                  Workspace Authorization
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                    <div style={{ position: "absolute", left: "10px", opacity: 0.5 }}>
                      <Mail size={13} />
                    </div>
                    <input
                      aria-label="Login email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Email or phone"
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 30px",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        background: "var(--bg)",
                        color: "var(--ink)",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative", flex: 1 }}>
                      <div style={{ position: "absolute", left: "10px", opacity: 0.5 }}>
                        <KeyRound size={13} />
                      </div>
                      <input
                        aria-label="OTP"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="OTP Code"
                        style={{
                          width: "100%",
                          padding: "8px 12px 8px 30px",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "12px",
                          background: "var(--bg)",
                          color: "var(--ink)",
                        }}
                      />
                    </div>
                    <button
                      className="btn-secondary"
                      onClick={request}
                      style={{ fontSize: "11px", height: "34px", padding: "0 10px", fontWeight: 500, whiteSpace: "nowrap" }}
                    >
                      Send OTP
                    </button>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={verify}
                    style={{ width: "100%", height: "34px", fontSize: "12px", gap: "6px" }}
                  >
                    <LogIn size={13} />
                    Verify and Connect
                  </button>
                  {message && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      marginTop: "4px", padding: "6px 8px", borderRadius: "4px",
                      background: message.includes("Signed in") ? "var(--success-light)" : "var(--line-light)",
                      color: message.includes("Signed in") ? "var(--success)" : "var(--muted)",
                      fontSize: "11px",
                    }}>
                      <ShieldAlert size={12} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {message}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
