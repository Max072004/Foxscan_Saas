"use client";

import { useState } from "react";
import type { AppData } from "@/lib/domain";
import { ShieldCheck, CalendarClock, Plus, CheckCircle2, AlertOctagon, Gavel } from "lucide-react";

interface AssuranceProps {
  data: AppData;
  token: string;
  projectId: string;
  contractorId?: string;
  reload: () => Promise<void>;
}

const DLP_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
  INSPECTION_DUE: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  OVERDUE: { color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
  CLOSED: { color: "#1B8755", bg: "rgba(27,135,85,0.08)" },
};

const WARRANTY_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: "#1B8755", bg: "rgba(27,135,85,0.08)" },
  EXPIRING: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  EXPIRED: { color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
};

const DISPUTE_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  OPEN: { color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
  UNDER_REVIEW: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  RESOLVED: { color: "#1B8755", bg: "rgba(27,135,85,0.08)" },
  CLOSED: { color: "#64748B", bg: "rgba(100,116,139,0.08)" },
};

const DISPUTE_CATEGORIES = ["QUALITY", "PAYMENT", "SCOPE", "DELAY", "SAFETY", "OTHER"] as const;

export default function Assurance({ data, token, projectId, contractorId, reload }: AssuranceProps) {
  const [error, setError] = useState("");

  // DLP form state
  const [dlpStartsOn, setDlpStartsOn] = useState("");
  const [dlpEndsOn, setDlpEndsOn] = useState("");
  const [dlpInspectionDue, setDlpInspectionDue] = useState("");
  const [dlpRetention, setDlpRetention] = useState("");
  const [dlpSubmitting, setDlpSubmitting] = useState(false);

  // Warranty form state
  const [wProvider, setWProvider] = useState("");
  const [wType, setWType] = useState<"MANUFACTURER" | "WORKMANSHIP">("MANUFACTURER");
  const [wReference, setWReference] = useState("");
  const [wStartsOn, setWStartsOn] = useState("");
  const [wEndsOn, setWEndsOn] = useState("");
  const [wCoverage, setWCoverage] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  // Dispute form state
  const [dCategory, setDCategory] = useState<(typeof DISPUTE_CATEGORIES)[number]>("QUALITY");
  const [dTitle, setDTitle] = useState("");
  const [dDescription, setDDescription] = useState("");
  const [dSubmitting, setDSubmitting] = useState(false);

  const dlpCases = data.dlpCases.filter((c) => c.projectId === projectId);
  const warranties = data.warranties.filter((w) => w.projectId === projectId);
  const disputes = data.disputes.filter((d) => d.projectId === projectId);

  const authedPost = async (url: string, body: unknown) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const b = await r.json().catch(() => null);
      throw new Error(b?.error || "Request failed");
    }
    return r.json();
  };

  const authedPatch = async (url: string, body: unknown) => {
    const r = await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const b = await r.json().catch(() => null);
      throw new Error(b?.error || "Request failed");
    }
    return r.json();
  };

  const submitDlp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!contractorId) { setError("This project has no contractor assigned yet."); return; }
    if (!dlpStartsOn || !dlpEndsOn || !dlpInspectionDue || !dlpRetention) { setError("All DLP fields are required."); return; }
    setDlpSubmitting(true);
    try {
      await authedPost("/api/dlp", {
        projectId,
        contractorId,
        startsOn: dlpStartsOn,
        endsOn: dlpEndsOn,
        inspectionDueOn: dlpInspectionDue,
        retentionAmount: Number(dlpRetention),
      });
      setDlpStartsOn(""); setDlpEndsOn(""); setDlpInspectionDue(""); setDlpRetention("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start DLP case");
    } finally {
      setDlpSubmitting(false);
    }
  };

  const closeDlp = async (id: string) => {
    setError("");
    try {
      await authedPatch("/api/dlp", { id, status: "CLOSED" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close DLP case");
    }
  };

  const submitWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!wProvider || !wReference || !wStartsOn || !wEndsOn || !wCoverage) { setError("All warranty fields are required."); return; }
    setWSubmitting(true);
    try {
      await authedPost("/api/warranties", {
        projectId,
        provider: wProvider,
        type: wType,
        reference: wReference,
        startsOn: wStartsOn,
        endsOn: wEndsOn,
        coverage: wCoverage,
      });
      setWProvider(""); setWReference(""); setWStartsOn(""); setWEndsOn(""); setWCoverage("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register warranty");
    } finally {
      setWSubmitting(false);
    }
  };

  const submitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!dTitle || !dDescription) { setError("Title and description are required."); return; }
    setDSubmitting(true);
    try {
      await authedPost("/api/disputes", {
        projectId,
        category: dCategory,
        title: dTitle,
        description: dDescription,
        evidenceIds: [],
      });
      setDTitle(""); setDDescription("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to raise dispute");
    } finally {
      setDSubmitting(false);
    }
  };

  const transitionDispute = async (id: string, status: "UNDER_REVIEW" | "RESOLVED" | "CLOSED") => {
    setError("");
    try {
      await authedPatch("/api/disputes", { id, status });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update dispute");
    }
  };

  return (
    <div className="animate-fade">
      <h2 className="page-title">DLP, Warranties &amp; Disputes</h2>
      <p className="page-description">Defect liability tracking, warranty register, and formal dispute resolution</p>

      {error && (
        <div style={{ color: "var(--error)", fontSize: "var(--text-sm)", marginBottom: "var(--sp-4)" }}>{error}</div>
      )}
      {!token && (
        <div className="alert" style={{ marginBottom: "var(--sp-4)", fontSize: "var(--text-sm)" }}>
          Sign in (top right) to create or update DLP cases, warranties, and disputes. Viewing is available in guest mode.
        </div>
      )}

      {/* DLP Section */}
      <div className="grid two" style={{ marginBottom: "var(--sp-6)" }}>
        <form className="card form" onSubmit={submitDlp}>
          <h3><span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}><CalendarClock size={16} />Start DLP Case</span></h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Starts On</label>
              <input type="date" value={dlpStartsOn} onChange={(e) => setDlpStartsOn(e.target.value)} required />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Ends On</label>
              <input type="date" value={dlpEndsOn} onChange={(e) => setDlpEndsOn(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Inspection Due</label>
            <input type="date" value={dlpInspectionDue} onChange={(e) => setDlpInspectionDue(e.target.value)} required />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Retention Amount Held (₹)</label>
            <input type="number" min="0" value={dlpRetention} onChange={(e) => setDlpRetention(e.target.value)} required />
          </div>
          <button className="btn-primary" disabled={!token || dlpSubmitting} type="submit">
            <Plus size={14} />
            {dlpSubmitting ? "Starting…" : "Start DLP Case"}
          </button>
        </form>

        <div className="card">
          <h3><span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}><CalendarClock size={16} />DLP Cases ({dlpCases.length})</span></h3>
          {dlpCases.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}><p className="muted">No DLP cases yet.</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {dlpCases.map((c) => {
                const sc = DLP_STATUS_COLORS[c.status] || DLP_STATUS_COLORS.ACTIVE;
                return (
                  <div key={c.id} style={{ padding: "12px 14px", border: "1px solid var(--line-light)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>₹{c.retentionAmount.toLocaleString("en-IN")} retention held</span>
                      <span className="badge" style={{ background: sc.bg, color: sc.color, fontSize: "10px", fontWeight: 700 }}>{c.status.replace("_", " ")}</span>
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginBottom: "8px" }}>
                      {new Date(c.startsOn).toLocaleDateString("en-IN")} – {new Date(c.endsOn).toLocaleDateString("en-IN")} · Inspection due {new Date(c.inspectionDueOn).toLocaleDateString("en-IN")}
                    </div>
                    {c.status !== "CLOSED" && (
                      <button className="btn-sm" onClick={() => closeDlp(c.id)} disabled={!token} style={{ fontSize: "11px", padding: "4px 12px", background: "var(--success)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}>
                        <CheckCircle2 size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                        Close DLP Case
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Warranty Section */}
      <div className="grid two" style={{ marginBottom: "var(--sp-6)" }}>
        <form className="card form" onSubmit={submitWarranty}>
          <h3><span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}><ShieldCheck size={16} />Register Warranty</span></h3>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Provider</label>
            <input value={wProvider} onChange={(e) => setWProvider(e.target.value)} placeholder="e.g. Asian Paints" required />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Type</label>
            <select value={wType} onChange={(e) => setWType(e.target.value as "MANUFACTURER" | "WORKMANSHIP")}>
              <option value="MANUFACTURER">Manufacturer Warranty</option>
              <option value="WORKMANSHIP">Contractor Workmanship Warranty</option>
            </select>
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Reference No.</label>
            <input value={wReference} onChange={(e) => setWReference(e.target.value)} placeholder="e.g. AP-WRT-2026-004" required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Starts On</label>
              <input type="date" value={wStartsOn} onChange={(e) => setWStartsOn(e.target.value)} required />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Ends On</label>
              <input type="date" value={wEndsOn} onChange={(e) => setWEndsOn(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Coverage</label>
            <textarea value={wCoverage} onChange={(e) => setWCoverage(e.target.value)} placeholder="Describe what's covered…" rows={2} style={{ resize: "vertical" }} required />
          </div>
          <button className="btn-primary" disabled={!token || wSubmitting} type="submit">
            <Plus size={14} />
            {wSubmitting ? "Registering…" : "Register Warranty"}
          </button>
        </form>

        <div className="card">
          <h3><span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}><ShieldCheck size={16} />Warranties ({warranties.length})</span></h3>
          {warranties.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}><p className="muted">No warranties registered yet.</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {warranties.map((w) => {
                const sc = WARRANTY_STATUS_COLORS[w.status] || WARRANTY_STATUS_COLORS.ACTIVE;
                return (
                  <div key={w.id} style={{ padding: "12px 14px", border: "1px solid var(--line-light)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{w.provider}</span>
                      <span className="badge" style={{ background: sc.bg, color: sc.color, fontSize: "10px", fontWeight: 700 }}>{w.status}</span>
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginBottom: "4px" }}>
                      {w.type === "MANUFACTURER" ? "Manufacturer" : "Workmanship"} · Ref {w.reference} · Expires {new Date(w.endsOn).toLocaleDateString("en-IN")}
                    </div>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-secondary)" }}>{w.coverage}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dispute Section */}
      <div className="grid two">
        <form className="card form" onSubmit={submitDispute}>
          <h3><span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}><Gavel size={16} />Raise Dispute</span></h3>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Category</label>
            <select value={dCategory} onChange={(e) => setDCategory(e.target.value as (typeof DISPUTE_CATEGORIES)[number])}>
              {DISPUTE_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Title</label>
            <input value={dTitle} onChange={(e) => setDTitle(e.target.value)} placeholder="Short summary" required />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Description</label>
            <textarea value={dDescription} onChange={(e) => setDDescription(e.target.value)} placeholder="Describe the issue in detail…" rows={3} style={{ resize: "vertical" }} required />
          </div>
          <button className="btn-primary" disabled={!token || dSubmitting} type="submit">
            <AlertOctagon size={14} />
            {dSubmitting ? "Raising…" : "Raise Dispute"}
          </button>
        </form>

        <div className="card">
          <h3><span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}><Gavel size={16} />Disputes ({disputes.length})</span></h3>
          {disputes.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}><p className="muted">No disputes raised — clean record.</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {disputes.map((d) => {
                const sc = DISPUTE_STATUS_COLORS[d.status] || DISPUTE_STATUS_COLORS.OPEN;
                return (
                  <div key={d.id} style={{ padding: "12px 14px", border: "1px solid var(--line-light)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{d.title}</span>
                      <span className="badge" style={{ background: sc.bg, color: sc.color, fontSize: "10px", fontWeight: 700 }}>{d.status.replace("_", " ")}</span>
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginBottom: "6px" }}>{d.category}</div>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-secondary)", marginBottom: "8px" }}>{d.description}</p>
                    {d.resolution && (
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--success)", marginBottom: "8px" }}><strong>Resolution:</strong> {d.resolution}</p>
                    )}
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      {d.status === "OPEN" && (
                        <button className="btn-sm" onClick={() => transitionDispute(d.id, "UNDER_REVIEW")} disabled={!token} style={{ fontSize: "11px", padding: "4px 10px", background: "var(--warning)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}>Start Review</button>
                      )}
                      {d.status === "UNDER_REVIEW" && (
                        <button className="btn-sm" onClick={() => transitionDispute(d.id, "RESOLVED")} disabled={!token} style={{ fontSize: "11px", padding: "4px 10px", background: "var(--success)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}>Mark Resolved</button>
                      )}
                      {(d.status === "OPEN" || d.status === "UNDER_REVIEW" || d.status === "RESOLVED") && (
                        <button className="btn-sm" onClick={() => transitionDispute(d.id, "CLOSED")} disabled={!token} style={{ fontSize: "11px", padding: "4px 10px", background: "var(--muted)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}>Close</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
