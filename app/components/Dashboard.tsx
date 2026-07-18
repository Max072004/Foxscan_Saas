"use client";

import type { AppData } from "@/lib/domain";
import {
  TrendingUp,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  CalendarClock,
  Activity,
  Clock,
  Users,
  Flag,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { FoxscanLogo } from "./Sidebar";

interface DashboardProps {
  data: AppData;
  activities: any[];
  stages: any[];
}

export default function Dashboard({ data, activities, stages }: DashboardProps) {
  const project = data.projects[0];
  const paid = activities.filter((a) => a.status === "PAID").length;
  const completed = activities.filter((a) => a.progress === 100).length;
  const inProgress = activities.filter((a) => a.progress > 0 && a.progress < 100).length;
  const notStarted = activities.filter((a) => a.progress === 0).length;
  const progress = Math.round(
    activities.reduce((s, a) => s + a.progress, 0) / Math.max(1, activities.length)
  );
  const pendingApprovals = stages.filter(
    (s) => !["PAID", "REWORK"].includes(s.state)
  ).length;
  const contractValue = project?.contractValue || 0;
  const totalPaid = activities
    .filter((a) => a.status === "PAID")
    .reduce((s, a) => {
      const base = a.paymentValue;
      return s + base + (base * a.gstPct) / 100 - (base * a.retentionPct) / 100;
    }, 0);
  const budgetPct = contractValue > 0 ? Math.round((totalPaid / contractValue) * 100) : 0;

  const startDate = project ? new Date(project.startDate) : new Date();
  const endDate = project ? new Date(project.endDate) : new Date();
  const today = new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
  const elapsed = Math.ceil((today.getTime() - startDate.getTime()) / 86400000);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000));
  const timeProgress = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0;

  return (
    <div className="animate-fade">
      {/* Welcome Banner */}
      <div className="card" style={{ marginBottom: "var(--sp-5)", background: "linear-gradient(135deg, var(--brand-charcoal) 0%, #2A3040 100%)", border: "none", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-6)" }}>
        <div>
          <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, marginBottom: "var(--sp-1)", letterSpacing: "-0.02em" }}>
            {project.name}
          </div>
          <div style={{ fontSize: "var(--text-sm)", opacity: 0.6, marginBottom: "var(--sp-3)" }}>
            {project.address} · {project.scope}
          </div>
          <div style={{ display: "flex", gap: "var(--sp-4)", flexWrap: "wrap" }}>
            <MiniStat label="Progress" value={`${progress}%`} />
            <MiniStat label="Budget Used" value={`${budgetPct}%`} />
            <MiniStat label="Days Left" value={String(daysRemaining)} />
            <MiniStat label="Activities" value={`${completed}/${activities.length}`} />
          </div>
        </div>
        <div style={{ flexShrink: 0, opacity: 0.15 }}>
          <FoxscanLogo size={80} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid" style={{ marginBottom: "var(--sp-5)" }}>
        <KpiCard icon={TrendingUp} iconClass="yellow" label="Project Progress" value={`${progress}%`} trend={progress > 0 ? "up" : undefined} trendText={progress > 0 ? `${completed} done` : undefined} />
        <KpiCard icon={Wallet} iconClass="green" label="Budget Utilization" value={`${budgetPct}%`} trend={budgetPct <= progress ? "up" : "down"} trendText={budgetPct <= progress ? "On track" : "Over budget"} />
        <KpiCard icon={CheckCircle2} iconClass="blue" label="Completed" value={`${completed}/${activities.length}`} />
        <KpiCard icon={AlertTriangle} iconClass="orange" label="Pending Approvals" value={String(pendingApprovals)} />
        <KpiCard icon={IndianRupee} iconClass="green" label="Contract Value" value={`₹${(contractValue / 100000).toFixed(1)}L`} />
        <KpiCard icon={CalendarClock} iconClass="red" label="Days Remaining" value={String(daysRemaining)} trend={daysRemaining < 30 ? "down" : undefined} trendText={daysRemaining < 30 ? "Ending soon" : undefined} />
      </div>

      {/* Charts + Alerts Row */}
      <div className="grid two" style={{ marginBottom: "var(--sp-5)" }}>
        {/* Progress Donut + Activity Bar */}
        <div className="card">
          <h3>Overall Progress</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-6)", marginBottom: "var(--sp-5)" }}>
            <DonutChart percentage={progress} size={130} />
            <div style={{ display: "grid", gap: "var(--sp-3)", flex: 1 }}>
              <LegendRow color="var(--success)" label="Completed" value={completed} total={activities.length} />
              <LegendRow color="var(--brand-yellow)" label="In Progress" value={inProgress} total={activities.length} />
              <LegendRow color="var(--line)" label="Not Started" value={notStarted} total={activities.length} />
            </div>
          </div>

          {/* Timeline progress */}
          <div style={{ padding: "var(--sp-3)", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--line-light)" }}>
            <div className="row" style={{ marginBottom: "var(--sp-2)" }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted)" }}>PROJECT TIMELINE</span>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>{timeProgress}% elapsed</span>
            </div>
            <div className="progress" style={{ height: 4 }}>
              <span style={{ width: `${timeProgress}%`, background: timeProgress > progress ? "var(--error)" : "var(--success)" }} />
            </div>
            <div className="row" style={{ marginTop: "var(--sp-1)" }}>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{startDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{endDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </div>

        {/* Payment Progress */}
        <div className="card">
          <h3>Payment Progress</h3>
          <div style={{ marginBottom: "var(--sp-4)" }}>
            <div className="row" style={{ marginBottom: "var(--sp-2)" }}>
              <span className="muted">Total Paid</span>
              <span style={{ fontWeight: 800, fontSize: "var(--text-xl)", letterSpacing: "-0.02em" }}>
                ₹{(totalPaid / 100000).toFixed(1)}L
              </span>
            </div>
            <div className="progress progress-thick">
              <span style={{ width: `${budgetPct}%`, background: "var(--success)" }} />
            </div>
            <div className="row" style={{ marginTop: "var(--sp-1)" }}>
              <small className="muted">₹0</small>
              <small className="muted">₹{(contractValue / 100000).toFixed(1)}L</small>
            </div>
          </div>

          {/* Payment stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
            <div style={{ padding: "var(--sp-3)", background: "var(--success-light)", borderRadius: "var(--radius)", textAlign: "center" }}>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--success)" }}>{paid}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>Paid</div>
            </div>
            <div style={{ padding: "var(--sp-3)", background: "var(--warning-light)", borderRadius: "var(--radius)", textAlign: "center" }}>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--warning)" }}>{activities.length - paid}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>Pending</div>
            </div>
          </div>

          <div style={{ marginTop: "var(--sp-3)" }}>
            <div className="row" style={{ fontSize: "var(--text-sm)" }}>
              <span className="muted">Retention held</span>
              <span style={{ fontWeight: 700 }}>
                ₹{(activities.reduce((s, a) => s + (a.paymentValue * a.retentionPct) / 100, 0) / 100000).toFixed(1)}L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart + Alerts */}
      <div className="grid two" style={{ marginBottom: "var(--sp-5)" }}>
        {/* Activity Completion Chart */}
        <div className="card">
          <h3>Activity Completion</h3>
          <div className="bar-chart">
            {activities
              .sort((a, b) => a.sequence - b.sequence)
              .map((a) => (
                <div className="bar-chart-col" key={a.id}>
                  <div className="bar-chart-value">{a.progress}%</div>
                  <div
                    className="bar-chart-bar"
                    style={{
                      height: `${Math.max(4, a.progress)}%`,
                      background:
                        a.progress === 100
                          ? "var(--success)"
                          : a.progress > 0
                          ? "var(--brand-yellow)"
                          : "var(--line)",
                    }}
                  />
                  <div className="bar-chart-label">{a.name.split(" ")[0]}</div>
                </div>
              ))}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="card">
          <h3>Attention Needed</h3>
          {stages.filter((s) => s.state !== "PAID").length > 0 ? (
            <div className="list">
              {stages
                .filter((s) => s.state !== "PAID")
                .map((s) => {
                  const a = activities.find((x: any) => x.id === s.activityId);
                  const isOverdue = new Date(s.dueAt) < new Date();
                  return (
                    <div className={`alert${isOverdue ? " alert-error" : ""}`} key={s.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-1)" }}>
                        {isOverdue ? <Clock size={14} /> : <AlertTriangle size={14} />}
                        <b style={{ fontSize: "var(--text-sm)" }}>{a?.name || "Activity"}</b>
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                        Awaiting <span className={`badge ${s.state}`}>{s.state}</span>
                        {" · "}Due {new Date(s.dueAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "var(--sp-6) var(--sp-4)" }}>
              <CheckCircle2 />
              <p>All clear! No stages awaiting review.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Team + Milestones + Activity Feed */}
      <div className="grid three" style={{ marginBottom: "var(--sp-5)" }}>
        {/* Team Members */}
        <div className="card">
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <Users size={15} />
              Project Team
            </span>
          </h3>
          <div style={{ display: "grid", gap: "var(--sp-2)" }}>
            {data.users.map((u) => (
              <div className="team-member" key={u.id}>
                <div className={`team-avatar ${u.role.toLowerCase()}`}>
                  {u.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>{u.role}</div>
                </div>
                <div className={`status-dot ${u.active ? "green" : "gray"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="card">
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <Flag size={15} />
              Upcoming Milestones
            </span>
          </h3>
          <div style={{ display: "grid", gap: "var(--sp-2)" }}>
            {activities
              .filter((a) => a.status !== "PAID")
              .sort((a, b) => a.sequence - b.sequence)
              .slice(0, 4)
              .map((a, i) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", padding: "var(--sp-2) var(--sp-3)", border: "1px solid var(--line-light)", borderRadius: "var(--radius)", transition: "all var(--transition-fast)" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "var(--radius-full)",
                    background: i === 0 ? "var(--brand-yellow-light)" : "var(--bg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "var(--text-xs)", fontWeight: 700, color: i === 0 ? "var(--brand-yellow)" : "var(--muted)", flexShrink: 0,
                  }}>
                    {a.sequence}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                      Due {new Date(a.plannedEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="progress" style={{ width: 40, height: 4 }}>
                    <span style={{ width: `${a.progress}%` }} />
                  </div>
                </div>
              ))}
            {activities.filter((a) => a.status !== "PAID").length === 0 && (
              <div className="empty-state" style={{ padding: "var(--sp-4)" }}>
                <CheckCircle2 size={20} />
                <p style={{ fontSize: "var(--text-xs)" }}>All milestones completed!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card">
          <h3>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <Activity size={15} />
              Recent Activity
            </span>
          </h3>
          {data.audits.length > 0 ? (
            <div style={{ display: "grid", gap: "var(--sp-2)" }}>
              {data.audits
                .slice(-6)
                .reverse()
                .map((a) => {
                  const actor = data.users.find((u) => u.id === a.actorId);
                  return (
                    <div key={a.id} style={{ display: "flex", gap: "var(--sp-3)", padding: "var(--sp-2) 0", borderBottom: "1px solid var(--line-light)" }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "var(--radius-full)", marginTop: 6, flexShrink: 0,
                        background: a.action === "APPROVE" ? "var(--success)" : a.action === "RETURN" ? "var(--error)" : "var(--brand-yellow)",
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                          {a.action.charAt(0) + a.action.slice(1).toLowerCase().replace("_", " ")}
                        </div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                          {actor?.name || "System"} · {a.entity} · {new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "var(--subtle)", alignSelf: "center" }}>
                        {a.hash.slice(0, 6)}
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "var(--sp-4)" }}>
              <Activity size={20} />
              <p style={{ fontSize: "var(--text-xs)" }}>No activity recorded yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Site Updates Preview */}
      {data.siteUpdates.length > 0 && (
        <div className="card">
          <h3>Latest Site Updates</h3>
          <div style={{ display: "grid", gap: "var(--sp-3)" }}>
            {data.siteUpdates.slice(-3).reverse().map((s) => {
              const author = data.users.find((u) => u.id === s.authorId);
              return (
                <div key={s.id} style={{ display: "flex", gap: "var(--sp-3)", padding: "var(--sp-3)", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--line-light)" }}>
                  <div className="feed-avatar" style={{ width: 32, height: 32, fontSize: "var(--text-xs)" }}>
                    {(author?.name || "U").charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{author?.name || "User"}</div>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-secondary)", marginTop: 2 }}>{s.workDone}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: "var(--sp-1)" }}>
                      {new Date(s.date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Sub-components --- */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "var(--text-xs)", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: "var(--text-lg)", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function KpiCard({ icon: Icon, iconClass, label, value, trend, trendText }: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: string;
  trend?: "up" | "down";
  trendText?: string;
}) {
  return (
    <div className="kpi-card">
      <div className={`kpi-card-icon ${iconClass}`}>
        <Icon size={18} />
      </div>
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value}</div>
      {trend && (
        <div className={`kpi-card-trend ${trend}`}>
          {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trendText}
        </div>
      )}
    </div>
  );
}

function DonutChart({ percentage, size = 120 }: { percentage: number; size?: number }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="donut-chart" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line-light)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={percentage === 100 ? "var(--success)" : "var(--brand-yellow)"}
          strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="donut-label">
        <div className="donut-label-value">{percentage}%</div>
        <div className="donut-label-text">Complete</div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{value}</span>
      </div>
      <div className="progress" style={{ height: 3 }}>
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
