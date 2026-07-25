"use client";

import { useState } from "react";
import { Building2, Plus, MapPin, Ruler, Calendar, Trash2, AlertTriangle, CheckCircle } from "lucide-react";

interface SetupProps {
  project: any;
  activities?: any[];
  token: string;
  reload: () => Promise<void>;
}

export default function Setup({ project, activities = [], token, reload }: SetupProps) {
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState("14");
  const [paymentPct, setPaymentPct] = useState("10");
  const [gstPct, setGstPct] = useState("18");
  const [retentionPct, setRetentionPct] = useState("5");
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter activities belonging to this project and sort them by sequence / date
  const projectActivities = activities
    .filter((a) => a.projectId === project.id)
    .sort((a, b) => a.sequence - b.sequence);

  // Calculate sequential offsets & percentages
  let currentOffset = 0;
  const processedActivities = projectActivities.map((a) => {
    // Determine duration
    let duration = a.durationDays;
    if (!duration) {
      const start = new Date(a.plannedStart);
      const end = new Date(a.plannedEnd);
      duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    // Determine percentage of contract value
    const pct = project.contractValue > 0 ? (a.paymentValue / project.contractValue) * 100 : 0;
    const startOffset = currentOffset;
    currentOffset += duration;

    return {
      ...a,
      durationDays: duration,
      startOffset,
      paymentPct: pct,
    };
  });

  const totalDuration = processedActivities.reduce((sum, a) => sum + a.durationDays, 0);
  const totalPercentage = processedActivities.reduce((sum, a) => sum + a.paymentPct, 0);

  // Parse project start date to compute sequential plannedStart and plannedEnd dates
  const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    setIsSubmitting(true);

    const dur = parseInt(durationDays);
    const pct = parseFloat(paymentPct);
    const gst = parseFloat(gstPct);
    const ret = parseFloat(retentionPct);

    if (isNaN(dur) || dur <= 0) {
      setValidationError("Duration must be at least 1 day.");
      setIsSubmitting(false);
      return;
    }
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setValidationError("Payment percentage must be between 0% and 100%.");
      setIsSubmitting(false);
      return;
    }
    if (isNaN(gst) || gst < 0 || gst > 100) {
      setValidationError("GST % must be between 0 and 100.");
      setIsSubmitting(false);
      return;
    }
    if (isNaN(ret) || ret < 0 || ret > 100) {
      setValidationError("Retention % must be between 0 and 100.");
      setIsSubmitting(false);
      return;
    }

    // Calculate sequential start and end dates based on current offset
    const calculatedStart = addDays(project.startDate, totalDuration);
    const calculatedEnd = addDays(calculatedStart, dur - 1);
    
    // Calculate direct payment value
    const computedPaymentValue = (pct / 100) * project.contractValue;

    try {
      const r = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          name,
          sequence: projectActivities.length + 1,
          plannedStart: calculatedStart,
          plannedEnd: calculatedEnd,
          durationDays: dur,
          paymentMode: "PERCENTAGE",
          paymentValue: parseFloat(computedPaymentValue.toFixed(2)),
          gstPct: gst,
          retentionPct: ret,
        }),
      });

      if (r.ok) {
        setName("");
        setDurationDays("14");
        setPaymentPct("10");
        setGstPct("18");
        setRetentionPct("5");
        await reload();
      } else {
        const errData = await r.json();
        setValidationError(errData.error || "Failed to create activity.");
      }
    } catch (err) {
      setValidationError("Network error: Could not contact server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (!confirm("Are you sure you want to delete this activity and its associated workflows?")) return;
    try {
      const r = await fetch(`/api/activities?id=${activityId}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      if (r.ok) {
        await reload();
      } else {
        alert("Failed to delete activity.");
      }
    } catch {
      alert("Network error: Failed to delete activity.");
    }
  };

  return (
    <div className="animate-fade" style={{ display: "grid", gap: "var(--sp-6)" }}>
      <div>
        <h2 className="page-title">Project Setup</h2>
        <p className="page-description">Configure workflow milestones, schedule durations, and payment distributions</p>
      </div>

      {/* Budget Allocation warnings */}
      {processedActivities.length > 0 && (
        <div style={{ width: "100%" }}>
          {Math.abs(totalPercentage - 100) > 0.01 ? (
            <div className="card" style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", border: "1px solid var(--warning)", backgroundColor: "rgba(234,172,31,0.05)" }}>
              <AlertTriangle style={{ color: "var(--warning)" }} />
              <div>
                <strong style={{ display: "block" }}>Budget Warning: Incremental Allocation</strong>
                <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
                  Activities currently allocate <strong>{totalPercentage.toFixed(1)}%</strong> of the total contract value. Ensure they add up to <strong>100%</strong> so milestones align with payments.
                </span>
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", border: "1px solid var(--success)", backgroundColor: "rgba(27,135,85,0.05)" }}>
              <CheckCircle style={{ color: "var(--success)" }} />
              <div>
                <strong style={{ display: "block" }}>Budget Verified</strong>
                <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
                  Timeline activities allocate exactly <strong>100%</strong> of the contract value.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid two" style={{ gridTemplateColumns: "1fr 1.25fr" }}>
        {/* Info & Add Form */}
        <div style={{ display: "grid", gap: "var(--sp-4)" }}>
          {/* Project Card */}
          <section className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "var(--text-md)", margin: 0, paddingBottom: "var(--sp-3)", borderBottom: "1px solid var(--border)" }}>
              <Building2 size={16} />
              Project Context
            </h3>
            <div style={{ display: "grid", gap: "var(--sp-3)", marginTop: "var(--sp-3)" }}>
              <div>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>{project.name}</div>
                <div className="muted" style={{ fontSize: "var(--text-sm)" }}>{project.scope}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", fontSize: "var(--text-sm)" }}>
                <div>
                  <span className="muted">Value:</span> <strong>₹{project.contractValue.toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span className="muted">Start:</span> <strong>{project.startDate}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Form */}
          <form className="card form" onSubmit={create}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "var(--text-md)", margin: 0 }}>
              <Plus size={16} />
              Add Scheduled Activity
            </h3>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                Activity Title
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Surface preparation — Wing A"
                required
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                  Duration (Days)
                </label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="e.g. 14"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                  Payment Allocation (%)
                </label>
                <input
                  type="number"
                  value={paymentPct}
                  onChange={(e) => setPaymentPct(e.target.value)}
                  placeholder="e.g. 10"
                  min="0.01"
                  max="100"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                  GST %
                </label>
                <input
                  type="number"
                  value={gstPct}
                  onChange={(e) => setGstPct(e.target.value)}
                  placeholder="18"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div>
                <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                  Retention %
                </label>
                <input
                  type="number"
                  value={retentionPct}
                  onChange={(e) => setRetentionPct(e.target.value)}
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>
            {validationError && (
              <div style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>
                {validationError}
              </div>
            )}
            <button className="btn-primary" disabled={isSubmitting || !token} type="submit" style={{ width: "100%", justifyContent: "center" }}>
              <Plus size={14} />
              Add Activity
            </button>
          </form>
        </div>

        {/* Gantt & Activity Table */}
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "var(--text-md)", margin: 0 }}>
            <Calendar size={16} />
            Sequential Gantt Timeline
          </h3>

          {processedActivities.length > 0 ? (
            <div style={{ display: "grid", gap: "var(--sp-4)" }}>
              {/* Gantt Bars Display */}
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--sp-4)", backgroundColor: "#1A1D24", color: "#FFFFFF" }}>
                <div style={{ display: "grid", gap: "var(--sp-3)" }}>
                  {processedActivities.map((a) => {
                    const leftPct = totalDuration > 0 ? (a.startOffset / totalDuration) * 100 : 0;
                    const widthPct = totalDuration > 0 ? (a.durationDays / totalDuration) * 100 : 100;

                    return (
                      <div key={a.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "center", gap: "var(--sp-3)" }}>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.name}>
                          {a.name}
                        </div>
                        <div style={{ position: "relative", height: "18px", width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "9px", overflow: "hidden" }}>
                          <div
                            style={{
                              position: "absolute",
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              height: "100%",
                              backgroundColor: "var(--primary)",
                              borderRadius: "9px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span style={{ fontSize: "9px", fontWeight: 800, color: "var(--brand-charcoal, #1A1D24)" }}>
                              {a.durationDays}d
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "var(--sp-4)", paddingTop: "var(--sp-2)", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)" }}>
                  <span>Start Offset: 0d</span>
                  <span>Total Duration: {totalDuration} days</span>
                </div>
              </div>

              {/* Action List Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "var(--sp-2) 0" }}>Activity</th>
                      <th style={{ padding: "var(--sp-2) 0" }}>Duration</th>
                      <th style={{ padding: "var(--sp-2) 0" }}>Payment</th>
                      <th style={{ padding: "var(--sp-2) 0", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedActivities.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "var(--sp-2) 0", fontWeight: 600 }}>{a.name}</td>
                        <td style={{ padding: "var(--sp-2) 0" }}>{a.durationDays} days</td>
                        <td style={{ padding: "var(--sp-2) 0" }}>
                          {a.paymentPct.toFixed(1)}% <span className="muted" style={{ fontSize: "var(--text-xs)" }}>(₹{a.paymentValue.toLocaleString("en-IN")})</span>
                        </td>
                        <td style={{ padding: "var(--sp-2) 0", textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => deleteActivity(a.id)}
                            style={{ padding: "var(--sp-1) var(--sp-2)", fontSize: "var(--text-xs)", display: "inline-flex", alignItems: "center", gap: "var(--sp-1)" }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="muted" style={{ textAlign: "center", padding: "var(--sp-6)" }}>
              No activities planned for this project yet. Use the form to start building the Gantt chart plan.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
