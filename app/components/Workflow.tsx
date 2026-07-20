"use client";

import { useState } from "react";
import type { AppData, Role } from "@/lib/domain";
import { CheckCircle2, RotateCcw, ArrowRight, User, Clock } from "lucide-react";

interface WorkflowProps {
  data: AppData;
  activities: any[];
  stages: any[];
  role: Role;
  actorId: string;
  reload: () => Promise<void>;
}

const COLUMNS: { state: string; label: string; color: string }[] = [
  { state: "MANUFACTURER", label: "Manufacturer Review", color: "var(--warning)" },
  { state: "CONSULTANT", label: "Consultant Approval", color: "var(--info)" },
  { state: "CLIENT", label: "Client Payment", color: "var(--brand-yellow)" },
  { state: "PAID", label: "Completed", color: "var(--success)" },
];

export default function Workflow({ data, activities, stages, role, actorId, reload }: WorkflowProps) {
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [checklist, setChecklist] = useState({
    prep: false,
    coating: false,
    cleanup: false,
    evidence: false
  });

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

  const act = async (s: any, action: string) => {
    await fetch("/api/stages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stageId: s.id,
        actorId,
        role,
        action,
        note: action === "RETURN" ? "Please rectify surface finish." : "Approved in Foxscan",
      }),
    });
    reload();
  };

  const reworkStages = stages.filter((s) => s.state === "REWORK");

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

                return (
                  <div className="item" key={s.id}>
                    <div className="row" style={{ marginBottom: "var(--sp-2)" }}>
                      <b style={{ fontSize: "var(--text-sm)" }}>{a?.name}</b>
                      <span className={`badge ${s.state}`}>{s.state}</span>
                    </div>
                    <div className="muted" style={{ marginBottom: "var(--sp-2)" }}>
                      ₹{s.amountDue.toLocaleString("en-IN")} due · {s.decisions.length} decisions
                    </div>

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
                      <div className="row" style={{ gap: "var(--sp-2)", justifyContent: "flex-start" }}>
                        <button className="btn-primary" onClick={() => act(s, "APPROVE")} style={{ fontSize: "var(--text-xs)" }}>
                          <CheckCircle2 size={14} />
                          {role === "CLIENT" ? "Release Payment" : "Approve"}
                        </button>
                        <button className="btn-danger" onClick={() => act(s, "RETURN")} style={{ fontSize: "var(--text-xs)" }}>
                          <RotateCcw size={14} />
                          Return
                        </button>
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
    </div>
  );
}
