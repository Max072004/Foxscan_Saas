"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { criticalPath } from "@/lib/scheduling";
import { AlertTriangle, Flag, CalendarDays, GanttChartSquare, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

interface TimelineProps {
  activities: any[];
  token: string;
  projectId: string;
  reload: () => Promise<void>;
}

const DAY_MS = 86400000;
const toDateOnly = (d: Date) => d.toISOString().split("T")[0];

export default function Timeline({ activities, token, projectId, reload }: TimelineProps) {
  const [view, setView] = useState<"gantt" | "calendar">("gantt");
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayLabel, setHolidayLabel] = useState("");
  const [showHolidayPanel, setShowHolidayPanel] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [drag, setDrag] = useState<{ id: string; startX: number; pxPerDay: number; deltaDays: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const cp = criticalPath(activities);
  const critical = new Set(cp.path);
  const sorted = [...activities].sort((a, b) => a.sequence - b.sequence);

  const allDates = activities.flatMap((a) => [new Date(a.plannedStart), new Date(a.plannedEnd)]);
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / DAY_MS));

  const getPosition = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.max(0, Math.min(100, ((d.getTime() - minDate.getTime()) / (totalDays * DAY_MS)) * 100));
  };
  const getWidth = (start: string, end: string) => Math.max(3, getPosition(end) - getPosition(start));

  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/holidays?projectId=${projectId}`, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setHolidays)
      .catch(() => undefined);
  }, [token, projectId]);

  const addHoliday = async () => {
    if (!holidayDate || !holidayLabel) return;
    const r = await fetch("/api/holidays", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId, date: holidayDate, label: holidayLabel }),
    });
    if (r.ok) {
      const h = await r.json();
      setHolidays((prev) => [...prev, h]);
      setHolidayDate("");
      setHolidayLabel("");
    }
  };

  const removeHoliday = async (id: string) => {
    const r = await fetch(`/api/holidays?id=${id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
    if (r.ok) setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  // --- Drag-to-reschedule ---
  const startDrag = (e: React.MouseEvent, activityId: string) => {
    if (!token) return;
    e.preventDefault();
    const trackWidth = trackRef.current?.getBoundingClientRect().width || 1;
    const pxPerDay = trackWidth / totalDays;
    setDrag({ id: activityId, startX: e.clientX, pxPerDay, deltaDays: 0 });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - drag.startX;
      const deltaDays = Math.round(deltaPx / drag.pxPerDay);
      setDrag((d) => (d ? { ...d, deltaDays } : d));
    };
    const onUp = async () => {
      setDrag((current) => {
        if (current && current.deltaDays !== 0) {
          const activity = activities.find((a) => a.id === current.id);
          if (activity) {
            const newStart = toDateOnly(new Date(new Date(activity.plannedStart).getTime() + current.deltaDays * DAY_MS));
            const newEnd = toDateOnly(new Date(new Date(activity.plannedEnd).getTime() + current.deltaDays * DAY_MS));
            fetch("/api/activities", {
              method: "PATCH",
              headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
              body: JSON.stringify({ id: current.id, plannedStart: newStart, plannedEnd: newEnd }),
            }).then((r) => { if (r.ok) reload(); });
          }
        }
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, activities, token, reload]);

  // --- Calendar month view ---
  const monthLabel = calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
    return cells;
  }, [calendarMonth]);

  const activitiesOnDay = (date: Date) => {
    const t = date.getTime();
    return sorted.filter((a) => {
      const s = new Date(a.plannedStart).setHours(0, 0, 0, 0);
      const e = new Date(a.plannedEnd).setHours(0, 0, 0, 0);
      return t >= s && t <= e;
    });
  };

  return (
    <div className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--sp-3)" }}>
        <div>
          <h2 className="page-title">Project Timeline</h2>
          <p className="page-description">
            Critical path: {cp.duration} planned days. {token ? "Drag a bar to reschedule — dependents shift automatically." : "Sign in to drag-reschedule activities."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <button
              onClick={() => setView("gantt")}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "var(--text-xs)", fontWeight: 600, border: "none", cursor: "pointer", background: view === "gantt" ? "var(--brand-charcoal)" : "var(--bg-card)", color: view === "gantt" ? "white" : "var(--ink)" }}
            >
              <GanttChartSquare size={14} /> Gantt
            </button>
            <button
              onClick={() => setView("calendar")}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "var(--text-xs)", fontWeight: 600, border: "none", cursor: "pointer", background: view === "calendar" ? "var(--brand-charcoal)" : "var(--bg-card)", color: view === "calendar" ? "white" : "var(--ink)" }}
            >
              <CalendarDays size={14} /> Calendar
            </button>
          </div>
          <button className="btn-secondary" onClick={() => setShowHolidayPanel((s) => !s)} style={{ fontSize: "var(--text-xs)" }}>
            Holidays ({holidays.length})
          </button>
        </div>
      </div>

      {showHolidayPanel && (
        <div className="card" style={{ marginTop: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
          <h3>Working-Day Calendar</h3>
          <p className="muted" style={{ fontSize: "var(--text-xs)", marginBottom: "var(--sp-3)" }}>Holidays are shaded on the Gantt timeline below.</p>
          {!token && <p className="muted" style={{ fontSize: "var(--text-xs)" }}>Sign in to add or remove holidays.</p>}
          <div style={{ display: "flex", gap: "var(--sp-2)", marginBottom: "var(--sp-3)", flexWrap: "wrap" }}>
            <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
            <input value={holidayLabel} onChange={(e) => setHolidayLabel(e.target.value)} placeholder="e.g. Ganesh Chaturthi" style={{ flex: 1, minWidth: "160px" }} />
            <button className="btn-primary" onClick={addHoliday} disabled={!token || !holidayDate || !holidayLabel} style={{ fontSize: "var(--text-xs)" }}>
              <Plus size={14} /> Add
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            {holidays.length === 0 ? (
              <p className="muted" style={{ fontSize: "var(--text-xs)" }}>No holidays configured for this project yet.</p>
            ) : (
              holidays
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((h) => (
                  <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg)", borderRadius: "6px", fontSize: "var(--text-xs)" }}>
                    <span><strong>{new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong> — {h.label}</span>
                    <button onClick={() => removeHoliday(h.id)} disabled={!token} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)" }}>
                      <X size={14} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {view === "gantt" ? (
        <>
          <div className="card" style={{ marginTop: "var(--sp-4)" }}>
            <div className="gantt">
              <div className="gantt-row" style={{ borderBottom: "2px solid var(--line)" }}>
                <div className="gantt-label" style={{ fontWeight: 700, fontSize: "var(--text-xs)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Activity
                </div>
                <div className="gantt-track" ref={trackRef} style={{ background: "transparent", display: "flex", justifyContent: "space-between", position: "relative" }}>
                  {holidays.map((h) => {
                    const pos = getPosition(h.date);
                    if (pos < 0 || pos > 100) return null;
                    return (
                      <div key={h.id} title={h.label} style={{ position: "absolute", left: `${pos}%`, top: 0, bottom: 0, width: "2px", background: "rgba(217, 56, 58, 0.35)" }} />
                    );
                  })}
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

              {sorted.map((a) => {
                const isCritical = critical.has(a.id);
                const barClass = a.status === "PAID" ? "completed" : isCritical ? "critical" : "";
                const activeDrag = drag && drag.id === a.id ? drag : null;
                const dragOffsetPct = activeDrag ? (activeDrag.deltaDays * activeDrag.pxPerDay / (trackRef.current?.getBoundingClientRect().width || 1)) * 100 : 0;

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
                        onMouseDown={(e) => startDrag(e, a.id)}
                        title={token ? "Drag to reschedule" : undefined}
                        style={{
                          left: `calc(${getPosition(a.plannedStart)}% + ${dragOffsetPct}%)`,
                          width: `${getWidth(a.plannedStart, a.plannedEnd)}%`,
                          cursor: token ? "grab" : undefined,
                          opacity: activeDrag ? 0.75 : 1,
                          boxShadow: activeDrag ? "0 0 0 2px var(--brand-yellow)" : undefined,
                        }}
                      >
                        {activeDrag && activeDrag.deltaDays !== 0 ? `${activeDrag.deltaDays > 0 ? "+" : ""}${activeDrag.deltaDays}d` : a.progress > 0 ? `${a.progress}%` : null}
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
        </>
      ) : (
        <div className="card" style={{ marginTop: "var(--sp-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
            <button className="btn-secondary" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={{ padding: "6px 10px" }}>
              <ChevronLeft size={16} />
            </button>
            <h3 style={{ margin: 0 }}>{monthLabel}</h3>
            <button className="btn-secondary" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={{ padding: "6px 10px" }}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--line-light)", border: "1px solid var(--line-light)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={{ background: "var(--bg)", padding: "6px", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--muted)", textAlign: "center" }}>{d}</div>
            ))}
            {calendarCells.map((cell, i) => {
              if (!cell.date) return <div key={i} style={{ background: "var(--bg-card)", minHeight: "90px" }} />;
              const dayActivities = activitiesOnDay(cell.date);
              const isHoliday = holidaySet.has(toDateOnly(cell.date));
              const isToday = toDateOnly(cell.date) === toDateOnly(new Date());
              return (
                <div key={i} style={{ background: isHoliday ? "rgba(217,56,58,0.05)" : "var(--bg-card)", minHeight: "90px", padding: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: isToday ? 800 : 600, color: isToday ? "var(--brand-yellow-hover)" : "var(--muted)" }}>
                    {cell.date.getDate()}
                  </span>
                  {dayActivities.slice(0, 3).map((a) => (
                    <div key={a.id} title={a.name} style={{ fontSize: "10px", padding: "1px 4px", borderRadius: "3px", background: critical.has(a.id) ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.1)", color: critical.has(a.id) ? "var(--warning)" : "var(--info)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.name}
                    </div>
                  ))}
                  {dayActivities.length > 3 && <span style={{ fontSize: "9px", color: "var(--muted)" }}>+{dayActivities.length - 3} more</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
