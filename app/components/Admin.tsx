"use client";

import { useEffect, useState } from "react";
import type { AppData } from "@/lib/domain";
import {
  Server,
  UserPlus,
  History,
  Shield,
  Wifi,
  WifiOff,
  Mail,
  MessageSquare,
  Bell,
  CreditCard,
  Database,
} from "lucide-react";

interface AdminProps {
  data: AppData;
  token: string;
}

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  email: Mail,
  push: Bell,
  sms: MessageSquare,
  payments: CreditCard,
  storage: Database,
};

export default function Admin({ data, token }: AdminProps) {
  const [items, setItems] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  const invite = async () => {
    const r = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role: "CONSULTANT" }),
    });
    setInviteStatus(
      r.ok ? "Invitation created and dispatched." : (await r.json()).error
    );
  };

  return (
    <div className="animate-fade">
      <h2 className="page-title">Administration</h2>
      <p className="page-description">System health, integrations, user management, and audit trail</p>

      <div className="grid two">
        {/* System Health */}
        <section className="card">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Server size={16} />
                System Health
              </span>
            </h3>
          </div>
          <div className="list">
            {items.map((i) => {
              const ProviderIcon = PROVIDER_ICONS[i.key] || Server;
              return (
                <div className="integration-card" key={i.key}>
                  <div className={`integration-icon ${i.enabled ? "live" : "off"}`}>
                    {i.enabled ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                      <ProviderIcon size={14} style={{ color: "var(--muted)" }} />
                      {i.provider}
                    </div>
                    <div className="muted">{i.detail}</div>
                  </div>
                  <span className={`badge ${i.mode}`}>
                    {i.mode}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Invite User */}
          <div style={{ marginTop: "var(--sp-6)", paddingTop: "var(--sp-4)", borderTop: "1px solid var(--line)" }}>
            <h3>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <UserPlus size={16} />
                Invite User
              </span>
            </h3>
            <div className="row" style={{ gap: "var(--sp-2)" }}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  flex: 1,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  padding: "var(--sp-2) var(--sp-3)",
                  fontSize: "var(--text-sm)",
                }}
              />
              <button className="btn-primary" onClick={invite} disabled={!token || !email}>
                Invite Consultant
              </button>
            </div>
            {inviteStatus && (
              <small className={inviteStatus.includes("created") ? "muted" : ""} style={{ marginTop: "var(--sp-2)", display: "block", color: inviteStatus.includes("created") ? "var(--success)" : "var(--error)" }}>
                {inviteStatus}
              </small>
            )}
          </div>
        </section>

        {/* Audit Trail */}
        <section className="card">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <History size={16} />
                Audit Trail
              </span>
            </h3>
            <span className="badge">{data.audits.length} events</span>
          </div>
          <div className="list">
            {data.audits
              .slice(-10)
              .reverse()
              .map((a) => (
                <div className="item" key={a.id}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--sp-3)" }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "var(--radius-full)",
                      background: a.action === "BOOTSTRAP" ? "var(--info)" : a.action === "APPROVE" ? "var(--success)" : a.action === "RETURN" ? "var(--error)" : "var(--brand-yellow)",
                      marginTop: 6, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                        {a.action}
                      </div>
                      <div className="muted">
                        {a.entity} · {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "monospace", fontSize: "var(--text-xs)",
                      color: "var(--subtle)", background: "var(--bg)",
                      padding: "2px 6px", borderRadius: "var(--radius-sm)",
                    }}>
                      {a.hash.slice(0, 12)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
