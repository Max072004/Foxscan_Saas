"use client";

import { criticalPath } from "@/lib/scheduling";
import { AlertTriangle, Flag } from "lucide-react";

interface TimelineProps {
  activities: any[];
}

export default function Timeline({ activities }: TimelineProps) {
  const cp = criticalPath(activities);
  const critical = new Set(cp.path);
  const sorted = [...activities].sort((a, b) => a.sequence - b.sequence);

  // Calculate date range for gantt positioning
  const allDates = activities.flatMap((a) => [new Date(a.plannedStart), new Date(a.plannedEnd)]);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000));

  const getPosition = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.max(0, Math.min(100, ((d.getTime() - minDate.getTime()) / (totalDays * 86400000)) * 100));
  };

  const getWidth = (start: string, end: string) => {
    return Math.max(3, getPosition(end) - getPosition(start));
  };

  return (
    <div className="animate-fade">
      <h2 className="page-title">Project Timeline</h2>
      <p className="page-description">
        Critical path: {cp.duration} planned days. Dependencies are validated server-side.
      </p>

      {/* Gantt Chart */}
      <div className="card">
        <div className="gantt">
          {/* Header */}
          <div className="gantt-row" style={{ borderBottom: "2px solid var(--line)" }}>
            <div className="gantt-label" style={{ fontWeight: 700, fontSize: "var(--text-xs)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Activity
            </div>
            <div className="gantt-track" style={{ background: "transparent", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                {minDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                {maxDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="gantt-meta" style={{ fontWeight: 700, fontSize: "var(--text-xs)", color: "var(--muted)", textTransform: "uppercase" }}>
              Status
            </div>
          </div>

          {/* Rows */}
          {sorted.map((a) => {
            const isCritical = critical.has(a.id);
            const barClass = a.status === "PAID" ? "completed" : isCritical ? "critical" : "";

            return (
              <div className="gantt-row" key={a.id} style={isCritical ? { background: "rgba(245, 158, 11, 0.04)" } : undefined}>
                <div className="gantt-label">
                  <span className="sequence">{a.sequence}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </span>
                  {isCritical && (
                    <Flag size={12} style={{ color: "var(--warning)", flexShrink: 0 }} />
                  )}
                </div>
                <div className="gantt-track">
                  <div
                    className={`gantt-bar ${barClass}`}
                    style={{
                      left: `${getPosition(a.plannedStart)}%`,
                      width: `${getWidth(a.plannedStart, a.plannedEnd)}%`,
                    }}
                  >
                    {a.progress > 0 && `${a.progress}%`}
                  </div>
                </div>
                <div className="gantt-meta">
                  <span className={`badge ${a.status}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Table */}
      <div className="card" style={{ marginTop: "var(--sp-4)" }}>
        <h3>Schedule Details</h3>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Activity</th>
                <th>Planned Start</th>
                <th>Planned End</th>
                <th>Dependencies</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} style={critical.has(a.id) ? { background: "rgba(245, 158, 11, 0.04)" } : undefined}>
                  <td style={{ fontWeight: 700, color: "var(--muted)" }}>{a.sequence}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                      {a.name}
                      {critical.has(a.id) && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--warning)", fontWeight: 600 }}>
                          CRITICAL
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{new Date(a.plannedStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</td>
                  <td>{new Date(a.plannedEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</td>
                  <td>{a.dependencyIds.length || "—"}</td>
                  <td>
                    <div className="progress-labeled">
                      <div className="progress" style={{ width: 60 }}>
                        <span style={{ width: `${a.progress}%` }} />
                      </div>
                      <span className="progress-pct">{a.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${a.status}`}>{a.status.replace("_", " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
