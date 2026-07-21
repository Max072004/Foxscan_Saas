"use client";

import { useState } from "react";
import type { AppData } from "@/lib/domain";
import { FileSpreadsheet, Plus, Trophy, X } from "lucide-react";

interface QuotationsProps {
  data: AppData;
  token: string;
  projectId: string;
  reload: () => Promise<void>;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  INVITED: { bg: "rgba(100,116,139,0.08)", color: "#64748B" },
  SUBMITTED: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6" },
  AWARDED: { bg: "rgba(27,135,85,0.1)", color: "var(--success)" },
  REJECTED: { bg: "rgba(217,56,58,0.08)", color: "var(--error)" },
};

export default function Quotations({ data, token, projectId, reload }: QuotationsProps) {
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const quotations = data.quotations
    .filter((q) => q.projectId === projectId)
    .sort((a, b) => a.amount - b.amount);
  const lowest = quotations.filter((q) => q.status !== "REJECTED").reduce((min, q) => (q.amount < min ? q.amount : min), Infinity);
  const awarded = quotations.find((q) => q.status === "AWARDED");

  const authed = async (method: "POST" | "PATCH", bodyObj: unknown) => {
    const r = await fetch("/api/quotations", {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(bodyObj),
    });
    if (!r.ok) {
      const b = await r.json().catch(() => null);
      throw new Error(b?.error || "Request failed");
    }
    return r.json();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!vendorName || !amount) { setError("Vendor name and amount are required."); return; }
    setSubmitting(true);
    try {
      await authed("POST", { projectId, vendorName, vendorContact: vendorContact || undefined, amount: Number(amount), notes: notes || undefined });
      setVendorName(""); setVendorContact(""); setAmount(""); setNotes("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const award = async (qid: string) => {
    setError("");
    try {
      await authed("PATCH", { id: qid, status: "AWARDED" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to award");
    }
  };

  const reject = async (qid: string) => {
    setError("");
    try {
      await authed("PATCH", { id: qid, status: "REJECTED" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  return (
    <div className="animate-fade">
      <h2 className="page-title">Quotations & Award</h2>
      <p className="page-description">Invite vendors to quote, compare side-by-side, and award the contract.</p>

      {!token && (
        <div className="alert" style={{ marginBottom: "var(--sp-4)", fontSize: "var(--text-sm)" }}>
          Sign in to record quotations or award a vendor. Viewing is available in guest mode.
        </div>
      )}
      {error && <div style={{ color: "var(--error)", fontSize: "var(--text-sm)", marginBottom: "var(--sp-4)" }}>{error}</div>}
      {awarded && (
        <div className="card" style={{ marginBottom: "var(--sp-4)", background: "rgba(27,135,85,0.05)", border: "1px solid rgba(27,135,85,0.2)", display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <Trophy size={18} style={{ color: "var(--success)" }} />
          <span style={{ fontSize: "var(--text-sm)" }}>
            <strong>{awarded.vendorName}</strong> awarded the contract at ₹{awarded.amount.toLocaleString("en-IN")}.
          </span>
        </div>
      )}

      <div className="grid two" style={{ gridTemplateColumns: "1fr 2fr", alignItems: "flex-start" }}>
        <form className="card form" onSubmit={submit}>
          <h3><span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}><Plus size={16} />Record a Quotation</span></h3>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Vendor Name</label>
            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Apex Coatings" required />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Vendor Contact</label>
            <input value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} placeholder="Phone or email" />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Quoted Amount (₹)</label>
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope notes, exclusions, timeline…" rows={3} style={{ resize: "vertical" }} />
          </div>
          <button className="btn-primary" disabled={!token || submitting} type="submit">
            <FileSpreadsheet size={14} />
            {submitting ? "Saving…" : "Add Quotation"}
          </button>
        </form>

        <div className="card">
          <h3>Side-by-Side Comparison ({quotations.length})</h3>
          {quotations.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 0" }}><p className="muted">No quotations recorded yet.</p></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Contact</th>
                    <th>Amount</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => {
                    const style = STATUS_STYLE[q.status];
                    const isLowest = q.amount === lowest && q.status !== "REJECTED";
                    return (
                      <tr key={q.id}>
                        <td style={{ fontWeight: 700 }}>{q.vendorName}</td>
                        <td className="muted" style={{ fontSize: "var(--text-xs)" }}>{q.vendorContact || "—"}</td>
                        <td style={{ fontWeight: 700, color: isLowest ? "var(--success)" : undefined }}>
                          ₹{q.amount.toLocaleString("en-IN")} {isLowest && "★"}
                        </td>
                        <td className="muted" style={{ fontSize: "var(--text-xs)", maxWidth: "220px" }}>{q.notes || "—"}</td>
                        <td>
                          <span className="badge" style={{ background: style.bg, color: style.color, fontWeight: 700 }}>{q.status}</span>
                        </td>
                        <td>
                          {q.status !== "AWARDED" && q.status !== "REJECTED" && (
                            <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                              <button className="btn-sm" onClick={() => award(q.id)} disabled={!token} style={{ fontSize: "11px", padding: "4px 10px", background: "var(--success)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}>
                                Award
                              </button>
                              <button className="btn-sm" onClick={() => reject(q.id)} disabled={!token} style={{ fontSize: "11px", padding: "4px 8px", background: "transparent", color: "var(--error)", border: "1px solid var(--error)", borderRadius: "4px", cursor: "pointer" }}>
                                <X size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
