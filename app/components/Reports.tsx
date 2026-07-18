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
        <h2 className="page-title">Reports & Analytics</h2>
        <div className="card" style={{ textAlign: "center", padding: "var(--sp-16) var(--sp-6)" }}>
          <div style={{ opacity: 0.1, marginBottom: "var(--sp-4)" }}><FoxscanLogo size={64} /></div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--sp-2)" }}>Sign in to unlock analytics</div>
          <p className="muted" style={{ maxWidth: 400, margin: "0 auto" }}>
            Portfolio analytics, financial dashboards, and performance metrics require authentication.
          </p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="animate-fade">
        <h2 className="page-title">Reports & Analytics</h2>
        <p className="page-description">Loading analytics...</p>
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
    <div className="animate-fade">
      {/* Page Header with Logo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-5)" }}>
        <div>
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="page-description" style={{ marginBottom: 0 }}>Portfolio-level insights, financial trends, and performance metrics</p>
        </div>
        <div style={{ opacity: 0.08 }}><FoxscanLogo size={48} /></div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid" style={{ marginBottom: "var(--sp-5)" }}>
        <KpiCard icon={Layers} cls="blue" label="Projects" value={String(report.portfolio.projects)} />
        <KpiCard icon={IndianRupee} cls="green" label="Contract Value" value={`₹${fmt(contractVal)}`} />
        <KpiCard icon={TrendingUp} cls="yellow" label="Portfolio Progress" value={`${progress}%`} trend="up" trendText={`${progress}% done`} />
        <KpiCard icon={AlertTriangle} cls="red" label="Overdue TAT" value={String(report.tat.overdue)} trend={report.tat.overdue > 0 ? "down" : "up"} trendText={report.tat.overdue > 0 ? "Needs attention" : "All clear"} />
        <KpiCard icon={IndianRupee} cls="green" label="Invoiced" value={`₹${fmt(report.payments.invoiced)}`} />
        <KpiCard icon={IndianRupee} cls="yellow" label="Paid" value={`₹${fmt(report.payments.paid)}`} />
        <KpiCard icon={IndianRupee} cls="orange" label="Retention" value={`₹${fmt(report.payments.retention)}`} />
        <KpiCard icon={CalendarClock} cls="red" label="Delay Events" value={String(report.delays.length)} />
      </div>

      {/* Row 1: Budget vs Actual + Progress Trend */}
      <div className="grid two-equal" style={{ marginBottom: "var(--sp-5)" }}>
        {/* Budget vs Actual */}
        <div className="card">
          <h3>Budget vs Actual</h3>
          <div style={{ display: "grid", gap: "var(--sp-4)" }}>
            {/* Contract */}
            <BudgetBar label="Contract Value" value={contractVal} max={contractVal} color="var(--brand-yellow)" icon={<Target size={14} />} />
            {/* Invoiced */}
            <BudgetBar label="Invoiced" value={report.payments.invoiced} max={contractVal} color="var(--info)" pct={invoicedPct} icon={<BarChart3 size={14} />} />
            {/* Paid */}
            <BudgetBar label="Paid" value={report.payments.paid} max={contractVal} color="var(--success)" pct={paidPct} icon={<IndianRupee size={14} />} />
            {/* Retention */}
            <BudgetBar label="Retention Held" value={report.payments.retention} max={contractVal} color="var(--warning)" icon={<Clock size={14} />} />
          </div>

          {/* Variance indicator */}
          <div style={{ marginTop: "var(--sp-4)", padding: "var(--sp-3)", background: paidPct <= progress ? "var(--success-light)" : "var(--warning-light)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            {paidPct <= progress ? <ArrowUpRight size={14} style={{ color: "var(--success)" }} /> : <ArrowDownRight size={14} style={{ color: "var(--warning)" }} />}
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: paidPct <= progress ? "var(--success)" : "var(--warning)" }}>
              {paidPct <= progress ? "Payments tracking below progress — healthy" : "Payments exceeding work progress"}
            </span>
          </div>
        </div>

        {/* Progress Trend (simulated from data) */}
        <div className="card">
          <h3>Progress Trend</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-6)", marginBottom: "var(--sp-4)" }}>
            <DonutChart percentage={progress} size={120} label="Overall" color={progress >= 80 ? "var(--success)" : "var(--brand-yellow)"} />
            <div style={{ display: "grid", gap: "var(--sp-4)", flex: 1 }}>
              <ProgressMetric label="Work Progress" value={progress} color="var(--brand-yellow)" />
              <ProgressMetric label="Budget Consumed" value={paidPct} color={paidPct > progress ? "var(--error)" : "var(--success)"} />
              <ProgressMetric label="TAT Compliance" value={tatOnTime} color={tatOnTime >= 80 ? "var(--success)" : tatOnTime >= 50 ? "var(--warning)" : "var(--error)"} />
            </div>
          </div>

          {/* Completion forecast */}
          <div style={{ padding: "var(--sp-3)", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--line-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
              <Activity size={14} style={{ color: "var(--brand-yellow)" }} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Completion Forecast</span>
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-secondary)" }}>
              {progress >= 100
                ? "Project is complete! All activities finished."
                : progress >= 50
                ? `At current pace, project is on track for completion. ${100 - progress}% remaining work.`
                : `Project is in early stages. ${100 - progress}% of work remains to be completed.`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Payment Analytics + TAT Performance */}
      <div className="grid two-equal" style={{ marginBottom: "var(--sp-5)" }}>
        {/* Payment Analytics Bar Chart */}
        <div className="card">
          <h3>Payment Analytics</h3>
          <div className="bar-chart" style={{ height: 220 }}>
            {[
              { label: "Contract", value: contractVal, color: "var(--brand-yellow)" },
              { label: "Invoiced", value: report.payments.invoiced, color: "var(--info)" },
              { label: "Paid", value: report.payments.paid, color: "var(--success)" },
              { label: "Retention", value: report.payments.retention, color: "var(--warning)" },
              { label: "Outstanding", value: Math.max(0, contractVal - report.payments.paid - report.payments.retention), color: "var(--muted)" },
            ].map((item) => {
              const max = contractVal || 1;
              const pct = Math.max(3, (item.value / max) * 100);
              return (
                <div className="bar-chart-col" key={item.label}>
                  <div className="bar-chart-value" style={{ fontSize: "var(--text-xs)" }}>₹{fmt(item.value)}</div>
                  <div
                    className="bar-chart-bar"
                    style={{ height: `${pct}%`, background: item.color, borderRadius: "var(--radius-sm) var(--radius-sm) 0 0" }}
                  />
                  <div className="bar-chart-label">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TAT Performance */}
        <div className="card">
          <h3>TAT Performance</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-6)", marginBottom: "var(--sp-4)" }}>
            <DonutChart percentage={tatOnTime} size={120} label="On Time" color={tatOnTime >= 80 ? "var(--success)" : tatOnTime >= 50 ? "var(--warning)" : "var(--error)"} />
            <div style={{ display: "grid", gap: "var(--sp-4)", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="muted" style={{ fontSize: "var(--text-xs)" }}>Total Stages</div>
                  <div style={{ fontWeight: 800, fontSize: "var(--text-xl)", letterSpacing: "-0.02em" }}>{report.tat.total}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "var(--text-xs)" }}>On Time</div>
                  <div style={{ fontWeight: 800, fontSize: "var(--text-xl)", color: "var(--success)", letterSpacing: "-0.02em" }}>{report.tat.onTime}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "var(--text-xs)" }}>Overdue</div>
                  <div style={{ fontWeight: 800, fontSize: "var(--text-xl)", color: "var(--error)", letterSpacing: "-0.02em" }}>{report.tat.overdue}</div>
                </div>
              </div>
            </div>
          </div>

          {/* TAT breakdown bars */}
          <div style={{ display: "grid", gap: "var(--sp-3)" }}>
            <ProgressMetric label="On-time rate" value={tatOnTime} color="var(--success)" />
            <ProgressMetric label="Overdue rate" value={100 - tatOnTime} color="var(--error)" />
          </div>
        </div>
      </div>

      {/* Row 3: Activity Distribution + Delays */}
      <div className="grid two-equal">
        {/* Activity Distribution */}
        <div className="card">
          <h3>Activity Distribution</h3>
          <div style={{ display: "grid", gap: "var(--sp-3)" }}>
            {[
              { label: "Not Started", key: "NOT_STARTED", color: "var(--muted)" },
              { label: "In Progress", key: "IN_PROGRESS", color: "var(--brand-yellow)" },
              { label: "Submitted", key: "SUBMITTED", color: "var(--warning)" },
              { label: "Approved", key: "APPROVED", color: "var(--info)" },
              { label: "Paid", key: "PAID", color: "var(--success)" },
            ].map(({ label, key, color }) => {
              // We don't have per-status counts from the report API but we can show the visual pattern
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, flex: 1 }}>{label}</span>
                  <span className={`badge ${key}`}>{key.replace("_", " ")}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "var(--sp-5)", padding: "var(--sp-3)", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--line-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
              <PieChart size={14} style={{ color: "var(--brand-yellow)" }} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Summary</span>
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-secondary)" }}>
              Portfolio has {report.portfolio.projects} project(s) with a combined contract value of ₹{fmt(contractVal)}.
              Overall progress stands at {progress}% with {report.tat.overdue} overdue approval(s).
            </div>
          </div>
        </div>

        {/* Delay Events */}
        <div className="card">
          <h3>Delay Events & Risks</h3>
          {report.delays.length > 0 ? (
            <div className="list">
              {report.delays.map((d: any) => (
                <div className="alert alert-error" key={d.id}>
                  <div className="row" style={{ marginBottom: "var(--sp-1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                      <AlertTriangle size={14} />
                      <b style={{ fontSize: "var(--text-sm)" }}>{d.reason}</b>
                    </div>
                    <span className="badge OVERDUE">{d.impactDays} days</span>
                  </div>
                  <div className="muted">{d.mitigationPlan}</div>
                  <div style={{ marginTop: "var(--sp-2)", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                    Target close: {new Date(d.targetClose).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "var(--sp-8) var(--sp-4)" }}>
              <div style={{ width: 56, height: 56, borderRadius: "var(--radius-full)", background: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--sp-3)" }}>
                <ArrowUpRight size={24} style={{ color: "var(--success)" }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "var(--text-md)", marginBottom: "var(--sp-1)" }}>No Delay Events</div>
              <p className="muted" style={{ maxWidth: 280, margin: "0 auto" }}>
                All activities are progressing within expected timelines. No delays reported.
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
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
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
      <div className={`kpi-card-icon ${cls}`}><Icon size={18} /></div>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      {trend && trendText && (
        <div className={`kpi-card-trend ${trend}`}>
          {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trendText}
        </div>
      )}
    </div>
  );
}

function DonutChart({ percentage, size = 120, label, color }: { percentage: number; size?: number; label?: string; color?: string }) {
  const stroke = 8;
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
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="donut-label">
        <div className="donut-label-value">{percentage}%</div>
        {label && <div className="donut-label-text">{label}</div>}
      </div>
    </div>
  );
}

function BudgetBar({ label, value, max, color, pct, icon }: { label: string; value: number; max: number; color: string; pct?: number; icon?: React.ReactNode }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div>
      <div className="row" style={{ marginBottom: "var(--sp-1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "var(--text-sm)", fontWeight: 500 }}>
          <span style={{ color }}>{icon}</span>
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>₹{fmt(value)}</span>
          {pct !== undefined && <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>({pct}%)</span>}
        </div>
      </div>
      <div className="progress" style={{ height: 6 }}>
        <span style={{ width: `${width}%`, background: color, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function ProgressMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="row" style={{ marginBottom: 3 }}>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--muted)" }}>{label}</span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{value}%</span>
      </div>
      <div className="progress" style={{ height: 4 }}>
        <span style={{ width: `${value}%`, background: color, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}
