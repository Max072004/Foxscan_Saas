"use client";

import { useState } from "react";
import type { AppData, Role } from "@/lib/domain";
import { CheckCircle2, RotateCcw, ArrowRight, User, Clock } from "lucide-react";
import { tatStatus } from "@/lib/scheduling";

const TAT_TIER_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  WARNING: { bg: "rgba(245, 158, 11, 0.08)", color: "var(--warning)", border: "rgba(245, 158, 11, 0.2)", label: "TAT 50%+" },
  OVERDUE: { bg: "rgba(217, 56, 58, 0.08)", color: "var(--error)", border: "rgba(217, 56, 58, 0.2)", label: "OVERDUE" },
  ESCALATED: { bg: "rgba(153, 27, 27, 0.1)", color: "#7F1D1D", border: "rgba(153, 27, 27, 0.3)", label: "ESCALATED" },
};

interface WorkflowProps {
  data: AppData;
  activities: any[];
  stages: any[];
  role: Role;
  actorId: string;
  reload: () => Promise<void>;
}

const CHECKLIST_LABELS: Record<string, string> = {
  prep: "Substrate Prep",
  coating: "Coating Uniformity",
  cleanup: "Housekeeping",
  evidence: "Evidence Logged",
};

function checklistLabel(key: string) {
  return CHECKLIST_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const COLUMNS: { state: string; label: string; color: string }[] = [
  { state: "MANUFACTURER", label: "Manufacturer Review", color: "var(--warning)" },
  { state: "CONSULTANT", label: "Consultant Approval", color: "var(--info)" },
  { state: "CLIENT", label: "Client Payment", color: "var(--brand-yellow)" },
  { state: "PAID", label: "Completed", color: "var(--success)" },
];

export default function Workflow({ data, activities, stages, role, actorId, reload }: WorkflowProps) {
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [returningStageId, setReturningStageId] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [checklist, setChecklist] = useState({
    prep: false,
    coating: false,
    cleanup: false,
    evidence: false
  });
  const [paymentProofStage, setPaymentProofStage] = useState<any>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);

  const submitPaymentProof = async () => {
    setProofError("");
    if (!paymentRef.trim() && !paymentProofFile) {
      setProofError("Enter a reference number or attach a photo of the payment/cheque.");
      return;
    }
    setSubmittingProof(true);
    try {
      let photoUrl: string | undefined;
      if (paymentProofFile) {
        const activity = activities.find((x: any) => x.id === paymentProofStage.activityId);
        const formData = new FormData();
        formData.append("file", paymentProofFile);
        formData.append("projectId", activity?.projectId || "");
        formData.append("activityId", "payments");
        formData.append("filename", paymentProofFile.name);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Photo upload failed");
        photoUrl = (await uploadRes.json()).url;
      }
      const evidencePayload = [paymentRef.trim(), photoUrl].filter(Boolean) as string[];
      await fetch("/api/stages", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stageId: paymentProofStage.id,
          actorId,
          role,
          action: "APPROVE",
          evidence: evidencePayload,
          note: `Payment proof submitted: ${paymentRef.trim() || "photo attached"}`,
        }),
      });
      setPaymentProofStage(null);
      setPaymentRef("");
      setPaymentProofFile(null);
      await reload();
    } catch (err) {
      setProofError(err instanceof Error ? err.message : "Failed to submit payment proof");
    } finally {
      setSubmittingProof(false);
    }
  };

  const raise = async (a: any, checklistObj: any) => {
    await fetch("/api/stages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        activityId: a.id,
        actorId,
        evidence: ["site-photo-capture"],
        checklist: checklistObj,
      }),
    });
    reload();
  };

  const act = async (s: any, action: string, customNote?: string) => {
    await fetch("/api/stages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stageId: s.id,
        actorId,
        role,
        action,
        note: customNote || (action === "RETURN" ? "Returned for rework" : undefined),
      }),
    });
    reload();
  };

  const reworkStages = stages.filter((s) => s.state === "REWORK");
  const receiptStages = stages.filter((s) => s.state === "AWAITING_RECEIPT");

  return (
    <div className="animate-fade">
      <h2 className="page-title">Approval Workflow</h2>
      <p className="page-description">
        Contractor → Manufacturer → Consultant → Client payment release
      </p>

      {/* Workflow Pipeline */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-6)", flexWrap: "wrap" }}>
        {COLUMNS.map((col, i) => (
          <div key={col.state} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "var(--sp-2)",
              padding: "var(--sp-2) var(--sp-3)",
              background: `${col.color}15`,
              border: `1px solid ${col.color}30`,
              borderRadius: "var(--radius)",
              fontSize: "var(--text-sm)", fontWeight: 600, color: col.color,
            }}>
              <span>{stages.filter((s) => s.state === col.state).length}</span>
              <span>{col.label}</span>
            </div>
            {i < COLUMNS.length - 1 && <ArrowRight size={16} style={{ color: "var(--subtle)" }} />}
          </div>
        ))}
      </div>

      <div className="grid two">
        {/* Approval Chain */}
        <section className="card">
          <h3>Active Stages</h3>
          {stages.length > 0 ? (
            <div className="list">
              {stages.map((s) => {
                const a = activities.find((x: any) => x.id === s.activityId);
                const canAct =
                  (["MANUFACTURER", "CONSULTANT", "CLIENT"] as Role[]).includes(role) &&
                  s.state === role;

                const tat = tatStatus(s);
                const tierStyle = TAT_TIER_STYLE[tat.tier];
                return (
                  <div className="item" key={s.id}>
                    <div className="row" style={{ marginBottom: "var(--sp-2)" }}>
                      <b style={{ fontSize: "var(--text-sm)" }}>{a?.name}</b>
                      <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
                        {tierStyle && (
                          <span className="badge" style={{ background: tierStyle.bg, color: tierStyle.color, border: `1px solid ${tierStyle.border}`, fontSize: "10px", fontWeight: 700 }}>
                            {tierStyle.label} · {tat.pct}%
                          </span>
                        )}
                        <span className={`badge ${s.state}`}>{s.state}</span>
                      </div>
                    </div>
                    {tierStyle && (
                      <div className="row" style={{ marginBottom: "var(--sp-2)", gap: "4px", color: tierStyle.color, fontSize: "var(--text-xs)", fontWeight: 700 }}>
                        <Clock size={12} />
                        <span>
                          {tat.tier === "ESCALATED"
                            ? `ESCALATED: Stuck with ${s.state} at ${tat.pct}% of TAT — flagged for admin follow-up`
                            : tat.tier === "OVERDUE"
                              ? `Overdue: ${s.state} has breached its TAT window (${tat.pct}%)`
                              : `Approaching TAT deadline with ${s.state} (${tat.pct}% elapsed)`}
                        </span>
                      </div>
                    )}
                    <div className="muted" style={{ marginBottom: "var(--sp-2)" }}>
                      ₹{s.amountDue.toLocaleString("en-IN")} due · {s.decisions.length} decisions
                    </div>

                    {/* Payment Breakdown: GST + Retention (was previously a flat number only) */}
                    {a && (
                      <div style={{ padding: "10px", background: "var(--bg)", borderRadius: "6px", border: "1px solid var(--line-light)", marginBottom: "var(--sp-3)", fontSize: "var(--text-xs)" }}>
                        <div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase", fontSize: "9px", letterSpacing: "0.5px" }}>
                          Payment Breakdown
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: "3px" }}>
                          <span className="muted">Base value</span>
                          <span>₹{a.paymentValue.toLocaleString("en-IN")}</span>
                          <span className="muted">GST ({a.gstPct}%)</span>
                          <span>+ ₹{Math.round(a.paymentValue * a.gstPct / 100).toLocaleString("en-IN")}</span>
                          <span className="muted">Retention held ({a.retentionPct}%)</span>
                          <span style={{ color: "var(--error)" }}>− ₹{Math.round(a.paymentValue * a.retentionPct / 100).toLocaleString("en-IN")}</span>
                          <span style={{ fontWeight: 700, borderTop: "1px solid var(--line-light)", paddingTop: "3px", marginTop: "2px" }}>Net payable now</span>
                          <span style={{ fontWeight: 700, borderTop: "1px solid var(--line-light)", paddingTop: "3px", marginTop: "2px" }}>₹{s.amountDue.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    )}

                    {/* QA Checklist results (captured on raise, previously never shown to reviewers) */}
                    {s.checklist && (
                      <div style={{ padding: "10px", background: "var(--bg)", borderRadius: "6px", border: "1px solid var(--line-light)", marginBottom: "var(--sp-3)", fontSize: "var(--text-xs)" }}>
                        <div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase", fontSize: "9px", letterSpacing: "0.5px" }}>
                          Contractor QA Checklist
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {Object.keys(s.checklist).length === 0 && (
                            <span className="muted">No checklist recorded.</span>
                          )}
                          {Object.entries(s.checklist).map(([key, value]) => {
                            const ok = !!value;
                            return (
                              <span key={key} style={{
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                padding: "2px 8px", borderRadius: "var(--radius-full)",
                                fontSize: "10px", fontWeight: 600,
                                background: ok ? "rgba(27,135,85,0.08)" : "rgba(217,56,58,0.08)",
                                color: ok ? "var(--success)" : "var(--error)",
                                border: `1px solid ${ok ? "rgba(27,135,85,0.2)" : "rgba(217,56,58,0.2)"}`,
                              }}>
                                {ok ? <CheckCircle2 size={11} /> : "✕"} {checklistLabel(key)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BOQ / material spec reference for Manufacturer verification */}
                    {(() => {
                      const boqItems = (data.boqItems || []).filter(
                        (b: any) => b.activityId === s.activityId || (!b.activityId && b.projectId === a?.projectId)
                      );
                      if (boqItems.length === 0) return null;
                      return (
                        <div style={{ padding: "10px", background: "var(--bg)", borderRadius: "6px", border: "1px solid var(--line-light)", marginBottom: "var(--sp-3)", fontSize: "var(--text-xs)" }}>
                          <div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase", fontSize: "9px", letterSpacing: "0.5px" }}>
                            BOQ / Material Spec Reference
                          </div>
                          {boqItems.map((b: any) => (
                            <div key={b.id} style={{ marginBottom: "4px" }}>
                              <strong>{b.code}</strong> — {b.description} · {b.quantity} {b.unit} @ ₹{b.rate}
                              {b.manufacturer && <span className="muted"> · Brand: {b.manufacturer}</span>}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Site Update Evidence Section */}
                    {(() => {
                      const stageUpdates = data.siteUpdates.filter(su => su.stageId === s.id);
                      if (stageUpdates.length === 0) return null;

                      const returnedDecision = s.decisions.find((d: any) => d.decision === "RETURNED");
                      const returnTime = returnedDecision ? new Date(returnedDecision.createdAt).getTime() : null;

                      const originalUpdates = stageUpdates.filter(su => !returnTime || new Date(su.date).getTime() < returnTime);
                      const reworkUpdates = stageUpdates.filter(su => returnTime && new Date(su.date).getTime() >= returnTime);

                      return (
                        <div style={{ padding: "10px", background: "var(--bg)", borderRadius: "6px", border: "1px solid var(--line-light)", marginBottom: "var(--sp-3)", fontSize: "var(--text-xs)" }}>
                          <div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase", fontSize: "9px", letterSpacing: "0.5px" }}>
                            Attached Site Evidence
                          </div>

                          {originalUpdates.length > 0 && (
                            <div style={{ marginBottom: "8px" }}>
                              <div style={{ fontWeight: 700, color: "var(--muted)", fontSize: "9px", marginBottom: "4px", textTransform: "uppercase" }}>Original Submission:</div>
                              {originalUpdates.map(su => (
                                <div key={su.id} style={{ padding: "6px 8px", background: "white", border: "1px solid var(--line-light)", borderRadius: "4px", marginBottom: "4px" }}>
                                  <p style={{ margin: 0, fontWeight: 500, color: "var(--ink)" }}>{su.workDone}</p>
                                  {su.attachments && su.attachments.length > 0 && (
                                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                                      {su.attachments.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                                          <img src={url} alt="Evidence photo" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--line)" }} />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  {su.voiceNote && (
                                    <div style={{ marginTop: "6px" }}>
                                      <audio src={su.voiceNote} controls style={{ width: "100%", height: "28px" }} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {reworkUpdates.length > 0 && (
                            <div>
                              <div style={{ fontWeight: 700, color: "var(--error)", fontSize: "9px", marginBottom: "4px", textTransform: "uppercase" }}>Rework Remedial Evidence:</div>
                              {reworkUpdates.map(su => (
                                <div key={su.id} style={{ padding: "6px 8px", background: "rgba(217, 56, 58, 0.03)", border: "1px solid rgba(217, 56, 58, 0.12)", borderRadius: "4px", marginBottom: "4px" }}>
                                  <p style={{ margin: 0, fontWeight: 500, color: "var(--ink)" }}>{su.workDone}</p>
                                  {su.attachments && su.attachments.length > 0 && (
                                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                                      {su.attachments.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                                          <img src={url} alt="Rework photo" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px", border: "1px solid rgba(217, 56, 58, 0.15)" }} />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  {su.voiceNote && (
                                    <div style={{ marginTop: "6px" }}>
                                      <audio src={su.voiceNote} controls style={{ width: "100%", height: "28px" }} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Decision Timeline */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)", marginBottom: canAct ? "var(--sp-3)" : 0 }}>
                      {s.decisions.map((d: any, i: number) => (
                        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: "var(--radius-full)", flexShrink: 0,
                            background: d.decision === "RETURNED" ? "var(--error)" : "var(--success)",
                          }} />
                          <span style={{ fontWeight: 600 }}>{d.role}</span>
                          <span>{d.decision.replace("_", " ")}</span>
                          <span>· {new Date(d.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>

                    {canAct && (
                      <div style={{ marginTop: "var(--sp-3)" }}>
                        {returningStageId === s.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", width: "100%" }}>
                            <textarea
                              placeholder="Provide a reason for return (Required)..."
                              value={returnNote}
                              onChange={(e) => setReturnNote(e.target.value)}
                              style={{
                                width: "100%",
                                minHeight: "60px",
                                padding: "var(--sp-2)",
                                borderRadius: "var(--radius)",
                                border: "1px solid var(--error)",
                                fontSize: "var(--text-xs)",
                                background: "var(--bg)",
                                color: "var(--ink)",
                                fontFamily: "var(--font)",
                                resize: "none"
                              }}
                            />
                            <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                              <button
                                className="btn-danger"
                                disabled={!returnNote.trim()}
                                onClick={() => {
                                  act(s, "RETURN", returnNote);
                                  setReturningStageId(null);
                                  setReturnNote("");
                                }}
                                style={{ fontSize: "var(--text-xs)", padding: "4px 10px" }}
                              >
                                Submit Return
                              </button>
                              <button
                                className="btn-ghost"
                                onClick={() => {
                                  setReturningStageId(null);
                                  setReturnNote("");
                                }}
                                style={{ fontSize: "var(--text-xs)", padding: "4px 10px", color: "var(--muted)" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="row" style={{ gap: "var(--sp-2)", justifyContent: "flex-start" }}>
                            <button
                              className="btn-primary"
                              onClick={() => {
                                if (role === "CLIENT") {
                                  setPaymentProofStage(s);
                                  setPaymentRef("");
                                  setPaymentProofFile(null);
                                  setProofError("");
                                } else {
                                  act(s, "APPROVE");
                                }
                              }}
                              style={{ fontSize: "var(--text-xs)" }}
                            >
                              <CheckCircle2 size={14} />
                              {role === "CLIENT" ? "Release Payment" : "Approve"}
                            </button>
                            <button className="btn-danger" onClick={() => setReturningStageId(s.id)} style={{ fontSize: "var(--text-xs)" }}>
                              <RotateCcw size={14} />
                              Return
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Clock />
              <p>No stages in the pipeline. Switch to Contractor role to raise a completed activity.</p>
            </div>
          )}
        </section>

        {/* Raise Stage */}
        <section className="card">
          <h3>Raise a Stage</h3>
          {role !== "CONTRACTOR" ? (
            <div className="empty-state" style={{ padding: "var(--sp-8) var(--sp-4)" }}>
              <User />
              <p>Switch to Contractor role to raise a completed activity for review.</p>
            </div>
          ) : (
            <div className="list">
              {activities
                .filter(
                  (a) =>
                    !stages.some((s) => s.activityId === a.id && s.state !== "PAID") &&
                    a.status !== "PAID"
                )
                .map((a) => (
                  <div className="item" key={a.id}>
                    <b style={{ fontSize: "var(--text-sm)" }}>{a.name}</b>
                    <p className="muted" style={{ margin: "var(--sp-2) 0" }}>
                      Evidence and quality checklist are recorded on submission.
                    </p>
                    <button className="btn-primary" onClick={() => { setSelectedActivity(a); setChecklist({ prep: false, coating: false, cleanup: false, evidence: false }); }} style={{ fontSize: "var(--text-xs)" }}>
                      Raise stage
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Rework items */}
          {reworkStages.length > 0 && (
            <>
              <h3 style={{ marginTop: "var(--sp-5)" }}>Returned for Rework</h3>
              <div className="list">
                {reworkStages.map((s) => {
                  const a = activities.find((x: any) => x.id === s.activityId);
                  return (
                    <div className="alert alert-error" key={s.id}>
                      <b style={{ fontSize: "var(--text-sm)" }}>{a?.name}</b>
                      <div className="muted" style={{ marginTop: "var(--sp-1)", marginBottom: "var(--sp-2)" }}>
                        {s.comments.filter((c: any) => c.kind === "RETURN_REASON").map((c: any) => c.text).join("; ") || "Returned for rework"}
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setSelectedActivity(a);
                          setChecklist({ prep: false, coating: false, cleanup: false, evidence: false });
                        }}
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        Re-submit stage
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Confirm Payment Receipt (Contractor only) */}
          {receiptStages.length > 0 && (
            <>
              <h3 style={{ marginTop: "var(--sp-5)" }}>Confirm Payment Receipt</h3>
              <div className="list">
                {receiptStages.map((s) => {
                  const a = activities.find((x: any) => x.id === s.activityId);
                  return (
                    <div className="item" key={s.id}>
                      <div className="row" style={{ marginBottom: "var(--sp-2)" }}>
                        <b style={{ fontSize: "var(--text-sm)" }}>{a?.name}</b>
                        <span className="badge CLIENT" style={{ backgroundColor: "rgba(27,135,85,0.1)", color: "var(--success)" }}>
                          Payment Proof Uploaded
                        </span>
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginBottom: "var(--sp-3)" }}>
                        Reference: <strong>{s.evidence?.[0] || "Payment Confirmed by Client"}</strong>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => act(s, "APPROVE")}
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        Confirm Receipt & Close Stage
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* WEB QA COMPLIANCE CHECKLIST OVERLAY */}
      {selectedActivity && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "var(--sp-4)"
        }}>
          <div className="card animate-fade" style={{
            maxWidth: "500px", width: "100%", backgroundColor: "var(--card-bg, #FFFFFF)",
            padding: "var(--sp-6)", borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            display: "flex", flexDirection: "column", gap: "var(--sp-4)"
          }}>
            <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>QA Stage Completion Checklist</h3>
            <p className="muted" style={{ fontSize: "var(--text-sm)", margin: 0 }}>
              Ensure these quality checks are completed before raising <strong>{selectedActivity.name}</strong>.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", margin: "var(--sp-2) 0" }}>
              <label style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checklist.prep}
                  onChange={(e) => setChecklist({ ...checklist, prep: e.target.checked })}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <strong style={{ fontSize: "var(--text-sm)", color: "var(--brand-charcoal, #1A1D24)" }}>Substrate Prep</strong>
                  <div className="muted" style={{ fontSize: "var(--text-xs)" }}>Surface is clean, dry, and free of dust/loose paint.</div>
                </div>
              </label>
              
              <label style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checklist.coating}
                  onChange={(e) => setChecklist({ ...checklist, coating: e.target.checked })}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <strong style={{ fontSize: "var(--text-sm)", color: "var(--brand-charcoal, #1A1D24)" }}>Coating Uniformity</strong>
                  <div className="muted" style={{ fontSize: "var(--text-xs)" }}>Material is applied evenly without runs or patches.</div>
                </div>
              </label>
              
              <label style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checklist.cleanup}
                  onChange={(e) => setChecklist({ ...checklist, cleanup: e.target.checked })}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <strong style={{ fontSize: "var(--text-sm)", color: "var(--brand-charcoal, #1A1D24)" }}>Housekeeping</strong>
                  <div className="muted" style={{ fontSize: "var(--text-xs)" }}>Workspace is cleared of scaffolding debris and hazards.</div>
                </div>
              </label>
              
              <label style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checklist.evidence}
                  onChange={(e) => setChecklist({ ...checklist, evidence: e.target.checked })}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <strong style={{ fontSize: "var(--text-sm)", color: "var(--brand-charcoal, #1A1D24)" }}>Evidence Logged</strong>
                  <div className="muted" style={{ fontSize: "var(--text-xs)" }}>Photo and/or voice logs have been attached.</div>
                </div>
              </label>
            </div>
            
            <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "var(--sp-4)" }}>
              <button className="btn-secondary" onClick={() => setSelectedActivity(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!(checklist.prep && checklist.coating && checklist.cleanup && checklist.evidence)}
                onClick={async () => {
                  await raise(selectedActivity, checklist);
                  setSelectedActivity(null);
                  setChecklist({ prep: false, coating: false, cleanup: false, evidence: false });
                }}
              >
                Raise Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Submission Modal */}
      {paymentProofStage && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "var(--sp-4)"
        }}>
          <div className="card animate-fade" style={{
            maxWidth: "460px", width: "100%", backgroundColor: "var(--card-bg, #FFFFFF)",
            padding: "var(--sp-6)", borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            display: "flex", flexDirection: "column", gap: "var(--sp-4)"
          }}>
            <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>Submit Payment Proof</h3>
            <p className="muted" style={{ fontSize: "var(--text-sm)", margin: 0 }}>
              Confirm you have paid ₹{paymentProofStage.amountDue?.toLocaleString("en-IN")} outside the app (bank transfer, cheque, or cash), then provide a reference number and/or a photo as proof. The contractor will confirm receipt before this stage closes.
            </p>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)", fontSize: "var(--text-xs)" }}>Cheque Number / UTR / Transaction Reference</label>
              <input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. Cheque #482931 or IMPS reference"
                style={{ width: "100%", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "var(--sp-2) var(--sp-3)", fontSize: "var(--text-sm)" }}
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)", fontSize: "var(--text-xs)" }}>Payment Screenshot / Cheque Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                style={{ fontSize: "var(--text-xs)" }}
              />
            </div>
            {proofError && <div style={{ color: "var(--error)", fontSize: "var(--text-xs)" }}>{proofError}</div>}
            <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "var(--sp-4)" }}>
              <button className="btn-secondary" onClick={() => setPaymentProofStage(null)} disabled={submittingProof}>Cancel</button>
              <button className="btn-primary" onClick={submitPaymentProof} disabled={submittingProof}>
                {submittingProof ? "Submitting…" : "Submit Proof"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
