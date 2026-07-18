"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  Clock,
  AlertTriangle,
  Layers,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  PieChart,
  Activity,
  Award,
} from "lucide-react";
import { FoxscanLogo } from "./Sidebar";

interface ReportsProps {
  token: string;
}

export default function Reports({ token }: ReportsProps) {
  const [report, setReport] = useState<any>();

  useEffect(() => {
    if (token)
      fetch("/api/reports", { headers: { authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then(setReport);
  }, [token]);

  if (!token) {
    return (
      <div className="animate-fade">
        <h2 className="page-title">Executive Reports & Intelligence</h2>
        <div className="card" style={{ textAlign: "center", padding: "60px 24px", maxWidth: "600px", margin: "40px auto 0" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <FoxscanLogo size={64} />
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Reports Dashboard Locked</h3>
          <p className="muted" style={{ maxWidth: "420px", margin: "0 auto 20px", fontSize: "13px", lineHeight: "1.5" }}>
            Please authenticate using the workspace menu in the top right to unlock portfolio analytics, financial audits, and completion forecasts.
          </p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="animate-fade">
        <h2 className="page-title">Executive Reports & Intelligence</h2>
        <p className="page-description">Loading workspace insights...</p>
        <div className="kpi-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="skeleton skeleton-kpi" key={i} />
          ))}
        </div>
      </div>
    );
  }

  const progress = Math.round(report.portfolio.progress);
  const tatOnTime = report.tat.total > 0 ? Math.round((report.tat.onTime / report.tat.total) * 100) : 100;
  const contractVal = report.portfolio.contractValue;
  const invoicedPct = contractVal > 0 ? Math.round((report.payments.invoiced / contractVal) * 100) : 0;
  const paidPct = contractVal > 0 ? Math.round((report.payments.paid / contractVal) * 100) : 0;

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
        <div>
          <h2 className="page-title">Executive Intelligence</h2>
          <p className="page-description" style={{ marginBottom: 0 }}>High-fidelity audit of portfolio progress, financial metrics, and operational SLA adherence.</p>
        </div>
        <div style={{ opacity: 0.12, marginRight: "10px" }}><FoxscanLogo size={40} /></div>
      </div>

      {/* KPI Cards Section */}
      <div className="kpi-grid">
        <KpiCard icon={Layers} cls="blue" label="Active Projects" value={String(report.portfolio.projects)} />
        <KpiCard icon={IndianRupee} cls="green" label="Portfolio Capital" value={`₹${fmt(contractVal)}`} />
        <KpiCard icon={TrendingUp} cls="yellow" label="Averaged Progress" value={`${progress}%`} trend="up" trendText={`${progress}% completed`} />
        <KpiCard icon={AlertTriangle} cls="red" label="SLA Violations" value={String(report.tat.overdue)} trend={report.tat.overdue > 0 ? "down" : "up"} trendText={report.tat.overdue > 0 ? "Urgent attention" : "All clean"} />
        <KpiCard icon={IndianRupee} cls="green" label="Total Invoiced" value={`₹${fmt(report.payments.invoiced)}`} />
        <KpiCard icon={IndianRupee} cls="yellow" label="Paid Disbursements" value={`₹${fmt(report.payments.paid)}`} />
        <KpiCard icon={IndianRupee} cls="orange" label="Retention Retained" value={`₹${fmt(report.payments.retention)}`} />
        <KpiCard icon={CalendarClock} cls="red" label="Risk Indicators" value={String(report.delays.length)} />
      </div>

      {/* Primary Row */}
      <div className="grid two-equal">
        {/* Budget vs Actual Horizontal Indicators */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Capital Utilization</h3>
          <div style={{ display: "grid", gap: "16px" }}>
            <BudgetBar label="Total Capital Value" value={contractVal} max={contractVal} color="var(--brand-yellow)" icon={<Target size={13} />} />
            <BudgetBar label="Billed Disbursements" value={report.payments.invoiced} max={contractVal} color="var(--info)" pct={invoicedPct} icon={<BarChart3 size={13} />} />
            <BudgetBar label="Settled Accounts" value={report.payments.paid} max={contractVal} color="var(--success)" pct={paidPct} icon={<IndianRupee size={13} />} />
            <BudgetBar label="Secured Retention" value={report.payments.retention} max={contractVal} color="var(--warning)" icon={<Clock size={13} />} />
          </div>

          <div style={{
            marginTop: "6px",
            padding: "10px 12px",
            background: paidPct <= progress ? "rgba(34, 197, 94, 0.05)" : "rgba(245, 158, 11, 0.05)",
            border: paidPct <= progress ? "1px solid rgba(34, 197, 94, 0.1)" : "1px solid rgba(245, 158, 11, 0.1)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            {paidPct <= progress ? <ArrowUpRight size={14} style={{ color: "var(--success)" }} /> : <ArrowDownRight size={14} style={{ color: "var(--warning)" }} />}
            <span style={{ fontSize: "12px", fontWeight: 600, color: paidPct <= progress ? "var(--success)" : "var(--warning)" }}>
              {paidPct <= progress ? "Financial outflows align with project deliverables." : "Billing advances currently run ahead of construction milestones."}
            </span>
          </div>
        </div>

        {/* Progress Metrics & Completion Forecast */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Compliance & Timeline Outlook</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <DonutChart percentage={progress} size={110} label="Portfolio Progress" color={progress >= 80 ? "var(--success)" : "var(--brand-yellow)"} />
            <div style={{ display: "grid", gap: "10px", flex: 1 }}>
              <ProgressMetric label="Construction Delivery" value={progress} color="var(--brand-yellow)" />
              <ProgressMetric label="Disbursement Consumption" value={paidPct} color={paidPct > progress ? "var(--error)" : "var(--success)"} />
              <ProgressMetric label="SLA Turnaround (TAT)" value={tatOnTime} color={tatOnTime >= 80 ? "var(--success)" : tatOnTime >= 50 ? "var(--warning)" : "var(--error)"} />
            </div>
          </div>

          <div style={{ padding: "12px", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--line-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Award size={13} style={{ color: "var(--brand-yellow)" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Timeline Outlook</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-secondary)", lineHeight: "1.4" }}>
              {progress >= 100
                ? "Closeout reached. Handover documentation pending final registry."
                : progress >= 50
                ? `Construction milestones remain on-track. Approximately ${100 - progress}% workspace actions remaining.`
                : `Early mobilization stage. High density of structural operations scheduled next.`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Analytics Row */}
      <div className="grid two-equal">
        {/* Payment Analytics Bar Chart */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Disbursement Metrics Breakdown</h3>
          <div className="bar-chart" style={{ height: "180px", paddingTop: "0" }}>
            {[
              { label: "Contract", value: contractVal, color: "var(--brand-yellow)" },
              { label: "Billed", value: report.payments.invoiced, color: "var(--info)" },
              { label: "Settled", value: report.payments.paid, color: "var(--success)" },
              { label: "Retention", value: report.payments.retention, color: "var(--warning)" },
              { label: "Remaining", value: Math.max(0, contractVal - report.payments.paid - report.payments.retention), color: "var(--muted)" },
            ].map((item) => {
              const max = contractVal || 1;
              const pct = Math.max(4, (item.value / max) * 100);
              return (
                <div className="bar-chart-col" key={item.label}>
                  <div className="bar-chart-value" style={{ fontSize: "10px", fontWeight: 600 }}>₹{fmt(item.value)}</div>
                  <div
                    className="bar-chart-bar"
                    style={{ height: `${pct}%`, background: item.color, borderRadius: "4px 4px 0 0" }}
                  />
                  <div className="bar-chart-label" style={{ fontSize: "9px", marginTop: "4px" }}>{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA and TAT Performance */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Operational Turnaround Compliance</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <DonutChart percentage={tatOnTime} size={110} label="SLA Adherence" color={tatOnTime >= 80 ? "var(--success)" : tatOnTime >= 50 ? "var(--warning)" : "var(--error)"} />
            <div style={{ display: "grid", gap: "10px", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="muted" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Logged Steps</div>
                  <div style={{ fontWeight: 800, fontSize: "16px" }}>{report.tat.total}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Cleared SLA</div>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--success)" }}>{report.tat.onTime}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Violated SLA</div>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--error)" }}>{report.tat.overdue}</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            <ProgressMetric label="Cleared SLA Percentage" value={tatOnTime} color="var(--success)" />
            <ProgressMetric label="Missed SLA Percentage" value={100 - tatOnTime} color="var(--error)" />
          </div>
        </div>
      </div>

      {/* Row 3: Activity Distribution + Risks */}
      <div className="grid two-equal">
        {/* Activity Distribution */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Operational Status Matrix</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {[
              { label: "Not Mobilized", key: "NOT_STARTED", color: "var(--muted)" },
              { label: "Under Construction", key: "IN_PROGRESS", color: "var(--brand-yellow)" },
              { label: "Submitted for Audit", key: "SUBMITTED", color: "var(--warning)" },
              { label: "Verified & Approved", key: "APPROVED", color: "var(--info)" },
              { label: "Settled Account", key: "PAID", color: "var(--success)" },
            ].map(({ label, key, color }) => {
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--line-light)", paddingBottom: "6px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", fontWeight: 500, flex: 1, color: "var(--ink-secondary)" }}>{label}</span>
                  <span className={`badge ${key}`} style={{ fontSize: "9px", padding: "1px 6px" }}>{key.replace("_", " ")}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delay Events and Risks */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Project Contingency Risks</h3>
          {report.delays.length > 0 ? (
            <div className="list" style={{ gap: "10px" }}>
              {report.delays.map((d: any) => (
                <div className="alert alert-error" key={d.id} style={{ padding: "12px" }}>
                  <div className="row" style={{ marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <AlertTriangle size={13} />
                      <span style={{ fontSize: "13px", fontWeight: 700 }}>{d.reason}</span>
                    </div>
                    <span className="badge OVERDUE">{d.impactDays} Days Delay</span>
                  </div>
                  <p className="muted" style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>{d.mitigationPlan}</p>
                  <div style={{ marginTop: "6px", fontSize: "10px", color: "var(--muted)" }}>
                    Target SLA Resolution: {new Date(d.targetClose).toLocaleDateString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <ArrowUpRight size={20} style={{ color: "var(--success)" }} />
              </div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "2px" }}>Zero Critical Incidents</h4>
              <p className="muted" style={{ maxWidth: "240px", margin: "0 auto", fontSize: "12px" }}>
                No active delays, access blocks, or material shortages reported.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Helpers --- */

function fmt(value: number) {
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function KpiCard({ icon: Icon, cls, label, value, trend, trendText }: {
  icon: React.ElementType;
  cls: string;
  label: string;
  value: string;
  trend?: "up" | "down";
  trendText?: string;
}) {
  return (
    <div className="kpi-card">
      <div className={`kpi-card-icon ${cls}`}><Icon size={16} /></div>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      {trend && trendText && (
        <div className={`kpi-card-trend ${trend}`} style={{ marginTop: "4px" }}>
          {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span>{trendText}</span>
        </div>
      )}
    </div>
  );
}

function DonutChart({ percentage, size = 110, label, color }: { percentage: number; size?: number; label?: string; color?: string }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="donut-chart" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line-light)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color || "var(--brand-yellow)"}
          strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="donut-label">
        <div className="donut-label-value" style={{ fontSize: "16px" }}>{percentage}%</div>
        {label && <div className="donut-label-text" style={{ fontSize: "9px" }}>{label}</div>}
      </div>
    </div>
  );
}

function BudgetBar({ label, value, max, color, pct, icon }: { label: string; value: number; max: number; color: string; pct?: number; icon?: React.ReactNode }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div>
      <div className="row" style={{ marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500, color: "var(--ink-secondary)" }}>
          <span style={{ color }}>{icon}</span>
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>₹{fmt(value)}</span>
          {pct !== undefined && <span className="badge" style={{ fontSize: "9px", padding: "1px 4px" }}>{pct}%</span>}
        </div>
      </div>
      <div className="progress" style={{ height: 4 }}>
        <span style={{ width: `${width}%`, background: color, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function ProgressMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="row" style={{ marginBottom: 3 }}>
        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted)" }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 700 }}>{value}%</span>
      </div>
      <div className="progress" style={{ height: 3 }}>
        <span style={{ width: `${value}%`, background: color, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}
