"use client";

import { useState } from "react";
import type { AppData } from "@/lib/domain";
import { AlertTriangle, Plus, CheckCircle2, Clock } from "lucide-react";

interface DelaysProps {
  data: AppData;
  token: string;
  projectId: string;
  reload: () => Promise<void>;
}

const DELAY_REASONS = [
  { value: "WEATHER", label: "Weather" },
  { value: "MATERIAL_SHORTAGE", label: "Material Shortage" },
  { value: "MANPOWER", label: "Manpower" },
  { value: "SOCIETY_ACCESS", label: "Society Access" },
  { value: "SCOPE_CHANGE", label: "Change of Scope" },
  { value: "OTHER", label: "Other" },
] as const;

const REASON_COLORS: Record<string, { color: string; bg: string }> = {
  WEATHER: { color: "#3B82F6", bg: "rgba(59, 130, 246, 0.08)" },
  MATERIAL_SHORTAGE: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)" },
  MANPOWER: { color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.08)" },
  SOCIETY_ACCESS: { color: "#EC4899", bg: "rgba(236, 72, 153, 0.08)" },
  SCOPE_CHANGE: { color: "#6366F1", bg: "rgba(99, 102, 241, 0.08)" },
  OTHER: { color: "#64748B", bg: "rgba(100, 116, 139, 0.08)" },
};

export default function Delays({ data, token, projectId, reload }: DelaysProps) {
  const [activityId, setActivityId] = useState("");
  const [reason, setReason] = useState("WEATHER");
  const [impactDays, setImpactDays] = useState("1");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [targetClose, setTargetClose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activities = data.activities.filter((a) => a.projectId === projectId);
  const delays = data.delays.filter((d) => {
    const act = data.activities.find((a) => a.id === d.activityId);
    return act?.projectId === projectId;
  });

  const openDelays = delays.filter((d) => !d.resolvedAt);
  const resolvedDelays = delays.filter((d) => d.resolvedAt);
  const totalImpactDays = openDelays.reduce((s, d) => s + d.impactDays, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!activityId) { setError("Please select an activity."); return; }
    if (!impactDays || Number(impactDays) < 1) { setError("Impact days must be at least 1."); return; }
    if (!targetClose) { setError("Please set a target close date."); return; }

    setSubmitting(true);
    try {
      const r = await fetch("/api/delays", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          activityId,
          reason,
          impactDays: Number(impactDays),
          mitigationPlan,
          targetClose,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error || "Failed to create delay");
      }
      setActivityId("");
      setReason("WEATHER");
      setImpactDays("1");
      setMitigationPlan("");
      setTargetClose("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create delay");
    } finally {
      setSubmitting(false);
    }
  };

  const resolve = async (delayId: string) => {
    await fetch("/api/delays", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ delayId, action: "resolve" }),
    });
    await reload();
  };

  const getActivityName = (aId: string) =>
    data.activities.find((a) => a.id === aId)?.name || "Unknown";

  const getReasonLabel = (r: string) =>
    DELAY_REASONS.find((dr) => dr.value === r)?.label || r;

  return (
    <div className="animate-fade">
      <h2 className="page-title">Delays</h2>
      <p className="page-description">Track and manage project delays, causes, and mitigation plans</p>

      {/* Summary KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-4)", marginBottom: "var(--sp-5)" }}>
        <div className="card" style={{ padding: "16px 20px", textAlign: "center" }}>
          <div className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Open Delays</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: openDelays.length > 0 ? "var(--error)" : "var(--success)" }}>{openDelays.length}</div>
        </div>
        <div className="card" style={{ padding: "16px 20px", textAlign: "center" }}>
          <div className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Total Impact</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--warning)" }}>{totalImpactDays} days</div>
        </div>
        <div className="card" style={{ padding: "16px 20px", textAlign: "center" }}>
          <div className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Resolved</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--success)" }}>{resolvedDelays.length}</div>
        </div>
      </div>

      <div className="grid two">
        {/* Create Delay Form */}
        <form className="card form" onSubmit={submit}>
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <Plus size={16} />
              Log New Delay
            </span>
          </h3>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Activity</label>
            <select value={activityId} onChange={(e) => setActivityId(e.target.value)} required>
              <option value="">Select activity…</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} required>
              {DELAY_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Impact (days)</label>
              <input
                type="number"
                value={impactDays}
                onChange={(e) => setImpactDays(e.target.value)}
                min="1"
                required
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Target Close Date</label>
              <input
                type="date"
                value={targetClose}
                onChange={(e) => setTargetClose(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Mitigation Plan</label>
            <textarea
              value={mitigationPlan}
              onChange={(e) => setMitigationPlan(e.target.value)}
              placeholder="Describe the mitigation strategy…"
              rows={3}
              style={{ resize: "vertical" }}
            />
          </div>

          {error && (
            <div style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>
              {error}
            </div>
          )}

          <button className="btn-primary" disabled={!token || submitting} type="submit">
            <AlertTriangle size={14} />
            {submitting ? "Logging…" : "Log Delay"}
          </button>
          {!token && <small className="muted">Sign in to log delays.</small>}
        </form>

        {/* Open Delays List */}
        <div className="card">
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <Clock size={16} />
              Open Delays ({openDelays.length})
            </span>
          </h3>

          {openDelays.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 0" }}>
              <CheckCircle2 size={32} style={{ color: "var(--success)", opacity: 0.6 }} />
              <p style={{ fontSize: "var(--text-sm)", marginTop: "var(--sp-2)" }}>No open delays — project is on track!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {openDelays.map((d) => {
                const rc = REASON_COLORS[d.reason] || REASON_COLORS.OTHER;
                const isOverdue = new Date(d.targetClose) < new Date();
                return (
                  <div
                    key={d.id}
                    style={{
                      padding: "14px 16px",
                      border: `1px solid ${isOverdue ? "rgba(239, 68, 68, 0.2)" : "var(--line-light)"}`,
                      borderRadius: "8px",
                      background: isOverdue ? "rgba(239, 68, 68, 0.03)" : "var(--bg)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--ink)" }}>
                        {getActivityName(d.activityId)}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: rc.bg,
                          color: rc.color,
                          fontWeight: 600,
                          fontSize: "10px",
                          padding: "2px 8px",
                        }}
                      >
                        {getReasonLabel(d.reason)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-4)", fontSize: "var(--text-xs)", color: "var(--muted)", marginBottom: "6px" }}>
                      <span>Impact: <strong style={{ color: "var(--error)" }}>{d.impactDays} days</strong></span>
                      <span>Target: <strong>{new Date(d.targetClose).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</strong></span>
                      {isOverdue && <span style={{ color: "var(--error)", fontWeight: 700 }}>OVERDUE</span>}
                    </div>
                    {d.mitigationPlan && (
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-secondary)", lineHeight: "1.5", marginBottom: "8px" }}>
                        {d.mitigationPlan}
                      </p>
                    )}
                    <button
                      className="btn-sm"
                      onClick={() => resolve(d.id)}
                      disabled={!token}
                      style={{
                        fontSize: "11px",
                        padding: "4px 12px",
                        background: "var(--success)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                      Mark Resolved
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resolved Delays */}
      {resolvedDelays.length > 0 && (
        <div className="card" style={{ marginTop: "var(--sp-5)" }}>
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <CheckCircle2 size={16} />
              Resolved Delays ({resolvedDelays.length})
            </span>
          </h3>
          <div style={{ display: "grid", gap: "var(--sp-2)" }}>
            {resolvedDelays.map((d) => {
              const rc = REASON_COLORS[d.reason] || REASON_COLORS.OTHER;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "var(--bg)",
                    borderRadius: "6px",
                    border: "1px solid var(--line-light)",
                    opacity: 0.8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                    <CheckCircle2 size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--ink)" }}>
                        {getActivityName(d.activityId)}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginLeft: "var(--sp-2)" }}>
                        {d.impactDays}d · {getReasonLabel(d.reason)}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                    Resolved {d.resolvedAt ? new Date(d.resolvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
