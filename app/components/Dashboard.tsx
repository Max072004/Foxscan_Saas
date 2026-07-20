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
  Image as ImageIcon,
} from "lucide-react";
import type { Role } from "@/lib/domain";
import { FoxscanLogo } from "./Sidebar";
import { calculateProjectSlippage } from "@/lib/scheduling";

interface DashboardProps {
  data: AppData;
  activities: any[];
  stages: any[];
  role: Role;
}

export default function Dashboard({ data, activities, stages, role }: DashboardProps) {
  const project = data.projects[0];
  const slippageInfo = calculateProjectSlippage(project, activities, stages);
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

  // Extract photos from document records or updates
  const photos = data.documents.filter(
    (d) => d.type === "PHOTO" || d.tags.includes("photo") || d.tags.includes("image")
  );

  // Role-based visibility flags
  const isAdmin = role === "ADMIN";
  const isContractor = role === "CONTRACTOR";
  const isManufacturer = role === "MANUFACTURER";
  const isConsultant = role === "CONSULTANT";
  const isClient = role === "CLIENT";

  const showBanner = true; // all roles see the project banner
  const showKpis = isAdmin || isConsultant;
  const showProgress = isAdmin || isContractor || isConsultant;
  const showFinancial = isAdmin || isClient || isConsultant;
  const showPipeline = isAdmin || isContractor || isConsultant;
  const showPending = true; // all roles see pending operations (filtered below)
  const showTeam = isAdmin || isConsultant;
  const showMilestones = isAdmin || isContractor || isConsultant;
  const showAuditLog = isAdmin;
  const showPhotos = isAdmin || isConsultant || isContractor;
  const showSiteUpdates = isAdmin || isConsultant || isContractor;

  // Filter pending stages based on role
  const pendingStages = stages.filter((s) => {
    if (s.state === "PAID") return false;
    if (isAdmin || isConsultant) return true;
    if (isContractor) return s.state === "REWORK" || s.submittedBy === data.users.find(u => u.role === "CONTRACTOR")?.id;
    if (isManufacturer) return s.state === "MANUFACTURER";
    if (isClient) return s.state === "CLIENT";
    return true;
  });

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Project Banner */}
      <div className="card" style={{
        background: "var(--brand-charcoal)",
        border: "none",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "24px",
        padding: "24px 30px",
        borderRadius: "12px",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--brand-yellow)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px" }}>
            Active Society Workspace
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "4px" }}>
            {project.name}
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "20px" }}>
            {project.address} · {project.scope}
          </p>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <MiniStat label="Progress" value={`${progress}%`} />
            <MiniStat label="Budget Utilization" value={`${budgetPct}%`} />
            <MiniStat label="Schedule Status" value={
              slippageInfo.status === "BEHIND" 
                ? `${slippageInfo.slippageDays}d behind` 
                : slippageInfo.status === "AHEAD" 
                ? `${Math.abs(slippageInfo.slippageDays)}d ahead` 
                : "On track"
            } />
            <MiniStat label="Projected End" value={slippageInfo.projectedEndDate || project.endDate} />
            <MiniStat label="Completed Steps" value={`${completed}/${activities.length}`} />
          </div>
        </div>
        <div style={{ flexShrink: 0, opacity: 0.08, zIndex: 0 }}>
          <FoxscanLogo size={90} />
        </div>
      </div>

      {/* Escalated Delays Alert Box */}
      {(() => {
        const today = new Date();
        const escalated = stages.filter((s) => {
          return s.state !== "PAID" && s.state !== "REWORK" && new Date(s.dueAt) < today;
        });
        if (escalated.length === 0) return null;
        return (
          <div className="card" style={{ border: "1px solid var(--error)", background: "rgba(217, 56, 58, 0.04)", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--error)", fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <AlertTriangle size={18} />
              <span>Escalated Delays (Overdue Approvals)</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginTop: "12px" }}>
              {escalated.map((s) => {
                const act = activities.find((a) => a.id === s.activityId);
                const overdueHours = Math.max(0, Math.floor((today.getTime() - new Date(s.dueAt).getTime()) / 3600000));
                const overdueDays = Math.floor(overdueHours / 24);
                const displayOverdue = overdueDays > 0 
                  ? `${overdueDays}d ${overdueHours % 24}h` 
                  : `${overdueHours}h`;
                return (
                  <div key={s.id} style={{ background: "white", padding: "12px 14px", borderRadius: "6px", border: "1px solid rgba(217, 56, 58, 0.15)" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)" }}>{act?.name || "Stage Ticket"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px" }}>
                      <span className="muted">Stuck with: <strong style={{ color: "var(--ink)" }}>{s.state}</strong></span>
                      <span style={{ color: "var(--error)", background: "rgba(217, 56, 58, 0.08)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>Overdue by {displayOverdue}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* KPI Cards Section */}
      {showKpis && (
      <div className="kpi-grid">
        <KpiCard icon={TrendingUp} iconClass="yellow" label="Project Progress" value={`${progress}%`} trend={progress > 0 ? "up" : undefined} trendText={progress > 0 ? `${completed} done` : undefined} />
        <KpiCard icon={Wallet} iconClass="green" label="Budget Utilization" value={`${budgetPct}%`} trend={budgetPct <= progress ? "up" : "down"} trendText={budgetPct <= progress ? "On track" : "Over budget"} />
        <KpiCard icon={CheckCircle2} iconClass="blue" label="Completed Steps" value={`${completed}/${activities.length}`} />
        <KpiCard icon={AlertTriangle} iconClass="orange" label="Awaiting Approval" value={String(pendingApprovals)} />
        <KpiCard icon={IndianRupee} iconClass="green" label="Contract Value" value={`₹${(contractValue / 100000).toFixed(1)}L`} />
        <KpiCard icon={CalendarClock} iconClass="red" label="Days Remaining" value={String(daysRemaining)} trend={daysRemaining < 30 ? "down" : undefined} trendText={daysRemaining < 30 ? "Closeout phase" : undefined} />
      </div>
      )}

      {/* Primary Analytics Row */}
      {(showProgress || showFinancial) && (
      <div className="grid two">
        {/* Progress Metrics & Overall Health */}
        {showProgress && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Progress Analysis</h3>
            <span className="badge live">Live Update</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
            <DonutChart percentage={progress} size={110} />
            <div style={{ display: "grid", gap: "12px", flex: 1 }}>
              <LegendRow color="var(--success)" label="Completed" value={completed} total={activities.length} />
              <LegendRow color="var(--brand-yellow)" label="In Progress" value={inProgress} total={activities.length} />
              <LegendRow color="var(--line)" label="Not Started" value={notStarted} total={activities.length} />
            </div>
          </div>

          {/* Timeline progress card */}
          <div style={{ padding: "14px", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--line-light)" }}>
            <div className="row" style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.5px" }}>SCHEDULE TIMELINE</span>
              <span style={{ fontSize: "11px", fontWeight: 700 }}>{timeProgress}% Elapsed</span>
            </div>
            <div className="progress" style={{ height: 4 }}>
              <span style={{ width: `${timeProgress}%`, background: timeProgress > progress ? "var(--error)" : "var(--success)" }} />
            </div>
            <div className="row" style={{ marginTop: "6px" }}>
              <span style={{ fontSize: "10px", color: "var(--muted)" }}>Planned: {startDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} — {endDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
            </div>
            <div className="row" style={{ marginTop: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: slippageInfo.status === "BEHIND" ? "var(--error)" : slippageInfo.status === "AHEAD" ? "var(--success)" : "var(--muted)" }}>
                Projected: {slippageInfo.projectedEndDate} ({slippageInfo.status === "BEHIND" ? `${slippageInfo.slippageDays}d behind` : slippageInfo.status === "AHEAD" ? `${Math.abs(slippageInfo.slippageDays)}d ahead` : "on track"})
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Finance and Billing Health */}
        {showFinancial && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Financial Status</h3>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>GST & Retention Inc.</span>
          </div>
          <div>
            <div className="row" style={{ marginBottom: "8px" }}>
              <span className="muted">Total Verified Disbursements</span>
              <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.01em" }}>
                ₹{(totalPaid / 100000).toFixed(2)}L
              </span>
            </div>
            <div className="progress progress-thick" style={{ height: 8 }}>
              <span style={{ width: `${budgetPct}%`, background: "var(--success)" }} />
            </div>
            <div className="row" style={{ marginTop: "6px" }}>
              <small className="muted" style={{ fontSize: "10px" }}>₹0.00</small>
              <small className="muted" style={{ fontSize: "10px" }}>Total Budget: ₹{(contractValue / 100000).toFixed(2)}L</small>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ padding: "12px", background: "var(--success-light)", borderRadius: "8px", border: "1px solid rgba(34, 197, 94, 0.1)" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500, marginBottom: "4px" }}>PAID STAGES</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--success)", lineHeight: 1 }}>{paid}</div>
            </div>
            <div style={{ padding: "12px", background: "var(--warning-light)", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.1)" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500, marginBottom: "4px" }}>UNPAID STAGES</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--warning)", lineHeight: 1 }}>{activities.length - paid}</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--line-light)", paddingTop: "12px" }}>
            <div className="row" style={{ fontSize: "12px" }}>
              <span className="muted">Retention Balance Held</span>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                ₹{(activities.reduce((s, a) => s + (a.paymentValue * a.retentionPct) / 100, 0) / 100000).toFixed(2)}L
              </span>
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {/* Secondary Chart and Critical Alerts */}
      {(showPipeline || showPending) && (
      <div className="grid two">
        {/* Activity Completion Chart */}
        {showPipeline && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ margin: 0 }}>Activity Pipeline Progress</h3>
          <div className="bar-chart" style={{ height: "140px", paddingTop: "0" }}>
            {activities
              .sort((a, b) => a.sequence - b.sequence)
              .map((a) => (
                <div className="bar-chart-col" key={a.id}>
                  <div className="bar-chart-value" style={{ fontSize: "9px", marginBottom: "2px" }}>{a.progress}%</div>
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
                  <div className="bar-chart-label" style={{ fontSize: "9px", marginTop: "4px" }}>{a.name.split(" ")[0]}</div>
                </div>
              ))}
          </div>
        </div>
        )}

        {/* Critical Alerts panel */}
        {showPending && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0 }}>Pending Operations</h3>
          {pendingStages.length > 0 ? (
            <div className="list" style={{ gap: "10px" }}>
              {pendingStages
                .map((s) => {
                  const a = activities.find((x: any) => x.id === s.activityId);
                  const isOverdue = new Date(s.dueAt) < new Date();
                  return (
                    <div className={`alert${isOverdue ? " alert-error" : ""}`} key={s.id} style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isOverdue ? <Clock size={13} /> : <AlertTriangle size={13} />}
                        <span style={{ fontSize: "13px", fontWeight: 700 }}>{a?.name || "Activity"}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Awaiting: <span className={`badge ${s.state}`} style={{ padding: "1px 6px" }}>{s.state}</span></span>
                        <span>Due: {new Date(s.dueAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "20px 0" }}>
              <CheckCircle2 size={32} style={{ color: "var(--success)", opacity: 0.7 }} />
              <p style={{ fontSize: "12px", marginTop: "8px" }}>All stages are fully cleared.</p>
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Team + Milestones + Activity Feed Grid */}
      {(showTeam || showMilestones || showAuditLog) && (
      <div className="grid three">
        {/* Project Team Widget */}
        {showTeam && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Project Partners</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.users.map((u) => (
              <div className="team-member" key={u.id} style={{ border: "1px solid var(--line-light)", padding: "10px", borderRadius: "8px" }}>
                <div className={`team-avatar ${u.role.toLowerCase()}`} style={{ width: "32px", height: "32px", fontSize: "12px" }}>
                  {u.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 500 }}>
                    {u.role}
                  </div>
                </div>
                <div className={`status-dot ${u.active ? "green" : "gray"}`} />
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Upcoming Milestones Widget */}
        {showMilestones && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>Upcoming Milestones</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {activities
              .filter((a) => a.status !== "PAID")
              .sort((a, b) => a.sequence - b.sequence)
              .slice(0, 4)
              .map((a, i) => (
                <div key={a.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px",
                  border: "1px solid var(--line-light)",
                  borderRadius: "8px",
                  background: i === 0 ? "rgba(245, 184, 31, 0.03)" : "transparent"
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: i === 0 ? "var(--brand-yellow-light)" : "var(--bg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, color: i === 0 ? "var(--brand-yellow)" : "var(--muted)", flexShrink: 0,
                  }}>
                    {a.sequence}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                      End: {new Date(a.plannedEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="progress" style={{ width: 36, height: 3, flexShrink: 0 }}>
                    <span style={{ width: `${a.progress}%` }} />
                  </div>
                </div>
              ))}
            {activities.filter((a) => a.status !== "PAID").length === 0 && (
              <div className="empty-state" style={{ padding: "10px 0" }}>
                <CheckCircle2 size={24} style={{ color: "var(--success)", opacity: 0.5 }} />
                <p style={{ fontSize: "11px" }}>All milestones completed.</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Audit Log / Recent Activity Widget */}
        {showAuditLog && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>System Log Trail</h3>
          {data.audits.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.audits
                .slice(-5)
                .reverse()
                .map((a) => {
                  const actor = data.users.find((u) => u.id === a.actorId);
                  return (
                    <div key={a.id} style={{ display: "flex", gap: "10px", paddingBottom: "8px", borderBottom: "1px solid var(--line-light)" }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", marginTop: "6px", flexShrink: 0,
                        background: a.action === "APPROVE" ? "var(--success)" : a.action === "RETURN" ? "var(--error)" : "var(--brand-yellow)",
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>{a.action}</div>
                        <div style={{ fontSize: "10px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {actor?.name || "System"} · {a.entity}
                        </div>
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: "9px", color: "var(--subtle)", alignSelf: "center" }}>
                        {a.hash.slice(0, 5)}
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "10px 0" }}>
              <p style={{ fontSize: "11px" }}>No activity logs recorded.</p>
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Project Photos Gallery Widget */}
      {showPhotos && photos.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Project Document Photos</h3>
            <span className="badge">{photos.length} Photos Available</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
            {photos.map((ph) => (
              <div key={ph.id} style={{
                border: "1px solid var(--line-light)",
                borderRadius: "8px",
                padding: "10px",
                background: "var(--bg)",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <div style={{
                  height: "100px",
                  background: "var(--brand-charcoal-light)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--brand-yellow)",
                  opacity: 0.8
                }}>
                  <ImageIcon size={24} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>
                    {ph.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                    Version v{ph.version}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Site Updates */}
      {showSiteUpdates && data.siteUpdates.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3>Latest Site Logs</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {data.siteUpdates.slice(-3).reverse().map((s) => {
              const author = data.users.find((u) => u.id === s.authorId);
              return (
                <div key={s.id} style={{ display: "flex", gap: "12px", padding: "12px", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--line-light)" }}>
                  <div className="feed-avatar" style={{ width: 30, height: 30, fontSize: "11px", background: "var(--brand-yellow-light)", color: "var(--brand-yellow-hover)" }}>
                    {(author?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>{author?.name || "Member"}</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>{new Date(s.date).toLocaleDateString("en-IN")}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--ink-secondary)", marginTop: "4px", lineHeight: "1.4" }}>{s.workDone}</p>
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

/* --- Helpers --- */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "10px", opacity: 0.6, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 800, color: "white" }}>{value}</div>
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
        <Icon size={16} />
      </div>
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

function DonutChart({ percentage, size = 110 }: { percentage: number; size?: number }) {
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
          stroke={percentage === 100 ? "var(--success)" : "var(--brand-yellow)"}
          strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="donut-label">
        <div className="donut-label-value" style={{ fontSize: "16px" }}>{percentage}%</div>
        <div className="donut-label-text" style={{ fontSize: "9px" }}>Done</div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink-secondary)" }}>{label}</span>
        </div>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>{value}</span>
      </div>
      <div className="progress" style={{ height: 3 }}>
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
