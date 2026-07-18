"use client";

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
  const raise = async (a: any) => {
    await fetch("/api/stages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        activityId: a.id,
        actorId,
        evidence: ["site-photo-capture"],
        checklist: { quality_checked: true, area_clean: true },
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
                    <button className="btn-primary" onClick={() => raise(a)} style={{ fontSize: "var(--text-xs)" }}>
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
                      <div className="muted" style={{ marginTop: "var(--sp-1)" }}>
                        {s.comments.filter((c: any) => c.kind === "RETURN_REASON").map((c: any) => c.text).join("; ") || "Returned for rework"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
