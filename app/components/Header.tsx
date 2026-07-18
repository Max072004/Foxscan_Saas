"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Menu, ChevronDown, LogIn, KeyRound, User } from "lucide-react";
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
          <Menu />
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
        <button className="header-icon-btn" aria-label="Notifications">
          <Bell />
          {notificationCount > 0 && <span className="notification-dot" />}
        </button>

        {/* User Menu */}
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
            <ChevronDown size={14} style={{ color: "var(--muted)" }} />
          </button>

          {menuOpen && (
            <div className="user-menu-dropdown">
              {/* User Info */}
              <div className="user-menu-section">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-2)" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "var(--radius-full)",
                    background: "var(--brand-yellow)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: "var(--text-sm)",
                    color: "var(--brand-charcoal)",
                  }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{userName}</div>
                    <div className="muted">{token ? "Authenticated" : "Not signed in"}</div>
                  </div>
                  <FoxscanLogo size={24} />
                </div>
              </div>

              {/* Role Selector */}
              <div className="user-menu-section">
                <div className="user-menu-section-label">Active Role</div>
                <select
                  value={role}
                  onChange={(e) => onRoleChange(e.target.value as Role)}
                  style={{
                    width: "100%",
                    padding: "var(--sp-2) var(--sp-3)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    background: "var(--bg)",
                    cursor: "pointer",
                  }}
                >
                  {(["ADMIN", "CLIENT", "CONSULTANT", "MANUFACTURER", "CONTRACTOR"] as Role[]).map(
                    (r) => (
                      <option key={r}>{r}</option>
                    )
                  )}
                </select>
              </div>

              {/* Authentication */}
              <div className="user-menu-section">
                <div className="user-menu-section-label">Authentication</div>
                <div style={{ display: "grid", gap: "var(--sp-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                    <User size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    <input
                      aria-label="Login email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Email or phone"
                      style={{
                        flex: 1,
                        padding: "var(--sp-2) var(--sp-3)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius)",
                        fontSize: "var(--text-sm)",
                        background: "var(--bg)",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", flex: 1 }}>
                      <KeyRound size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                      <input
                        aria-label="OTP"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="OTP code"
                        style={{
                          flex: 1,
                          padding: "var(--sp-2) var(--sp-3)",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius)",
                          fontSize: "var(--text-sm)",
                          background: "var(--bg)",
                        }}
                      />
                    </div>
                    <button
                      className="btn-secondary"
                      onClick={request}
                      style={{ fontSize: "var(--text-xs)", whiteSpace: "nowrap" }}
                    >
                      Get OTP
                    </button>
                  </div>
                  <button className="btn-primary" onClick={verify} style={{ width: "100%" }}>
                    <LogIn size={14} />
                    Sign In
                  </button>
                  {message && (
                    <small
                      style={{
                        color: message.includes("Signed in") ? "var(--success)" : "var(--muted)",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      {message}
                    </small>
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
