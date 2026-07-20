"use client";

import { useState } from "react";
import { Building2, Plus, MapPin, Ruler, Calendar } from "lucide-react";

interface SetupProps {
  project: any;
  token: string;
  reload: () => Promise<void>;
}

export default function Setup({ project, token, reload }: SetupProps) {
  const [name, setName] = useState("");
  const [paymentValue, setPaymentValue] = useState("");
  const [gstPct, setGstPct] = useState("18");
  const [retentionPct, setRetentionPct] = useState("5");
  const [validationError, setValidationError] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const pv = Number(paymentValue);
    const gst = Number(gstPct);
    const ret = Number(retentionPct);

    if (!pv || pv <= 0) {
      setValidationError("Payment value must be greater than 0.");
      return;
    }
    if (isNaN(gst) || gst < 0 || gst > 100) {
      setValidationError("GST % must be between 0 and 100.");
      return;
    }
    if (isNaN(ret) || ret < 0 || ret > 100) {
      setValidationError("Retention % must be between 0 and 100.");
      return;
    }

    const r = await fetch("/api/activities", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        projectId: project.id,
        name,
        sequence: 99,
        plannedStart: project.startDate,
        plannedEnd: project.endDate,
        paymentMode: "FIXED",
        paymentValue: pv,
        gstPct: gst,
        retentionPct: ret,
      }),
    });
    if (r.ok) {
      setName("");
      setPaymentValue("");
      setGstPct("18");
      setRetentionPct("5");
      reload();
    }
  };

  return (
    <div className="animate-fade">
      <h2 className="page-title">Project Setup</h2>
      <p className="page-description">Society records, building inventory, and activity configuration</p>

      <div className="grid two">
        {/* Project Info */}
        <section className="card">
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <Building2 size={16} />
              Society & Project
            </span>
          </h3>
          <div style={{ display: "grid", gap: "var(--sp-4)" }}>
            <div>
              <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--sp-1)" }}>
                {project.name}
              </div>
              <div className="muted">{project.scope}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <MapPin size={14} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="muted">Address</div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{project.address}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Building2 size={14} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="muted">Buildings</div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{project.buildings}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Ruler size={14} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="muted">Area</div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{project.areaSqft.toLocaleString()} sq.ft</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Calendar size={14} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="muted">Duration</div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                    {new Date(project.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    {" – "}
                    {new Date(project.endDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="alert" style={{ marginTop: "var(--sp-4)" }}>
            Project setup supports tenant-scoped society records, building inventory, BOQ line items and signed contract document versions.
          </div>
        </section>

        {/* Add Activity */}
        <form className="card form" onSubmit={create}>
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <Plus size={16} />
              Add Scheduled Activity
            </span>
          </h3>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>
              Activity Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primer application"
              required
            />
          </div>
          <div>
            <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>
              Payment Value (₹)
            </label>
            <input
              type="number"
              value={paymentValue}
              onChange={(e) => setPaymentValue(e.target.value)}
              placeholder="e.g. 150000"
              min="1"
              step="0.01"
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>
                GST %
              </label>
              <input
                type="number"
                value={gstPct}
                onChange={(e) => setGstPct(e.target.value)}
                placeholder="18"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: "var(--sp-1)" }}>
                Retention %
              </label>
              <input
                type="number"
                value={retentionPct}
                onChange={(e) => setRetentionPct(e.target.value)}
                placeholder="5"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          </div>
          {validationError && (
            <div style={{ color: "var(--danger)", fontSize: "var(--text-sm)", marginTop: "var(--sp-1)" }}>
              {validationError}
            </div>
          )}
          <button className="btn-primary" disabled={!token} type="submit">
            <Plus size={14} />
            Add Activity
          </button>
          <small className="muted">Sign in to perform protected changes.</small>
        </form>
      </div>
    </div>
  );
}

