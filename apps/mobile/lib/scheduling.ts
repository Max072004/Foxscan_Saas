// WARNING: This file contains schedule-slippage calculation logic.
// There is a duplicate copy of `calculateProjectSlippage` in `lib/scheduling.ts` (root)
// due to Metro bundler boundaries. If you modify this logic, update BOTH files.

export type TatTier = "ON_TRACK" | "WARNING" | "OVERDUE" | "ESCALATED";

/**
 * Graduated TAT status for a stage's current review step.
 * Window is [last decision timestamp (or raisedAt), dueAt] — dueAt is always
 * reset to (window start + tatHours) on every transition, so this needs no
 * extra schema field to recover the window's start.
 */
export function tatStatus(stage: any, now = new Date()): { pct: number; tier: TatTier } {
  if (stage.state === "PAID" || stage.state === "REWORK") return { pct: 0, tier: "ON_TRACK" };
  const lastDecision = stage.decisions?.[stage.decisions.length - 1];
  const windowStart = new Date(lastDecision ? lastDecision.createdAt : stage.raisedAt).getTime();
  const windowEnd = new Date(stage.dueAt).getTime();
  const span = Math.max(1, windowEnd - windowStart);
  const pct = Math.round(((now.getTime() - windowStart) / span) * 100);
  const tier: TatTier = pct >= 150 ? "ESCALATED" : pct >= 100 ? "OVERDUE" : pct >= 50 ? "WARNING" : "ON_TRACK";
  return { pct, tier };
}

export function calculateProjectSlippage(
  project: any,
  activities: any[],
  stages: any[]
): {
  slippageDays: number;
  projectedEndDate: string;
  status: "AHEAD" | "BEHIND" | "ON_TRACK";
} {
  if (!project || !project.endDate) {
    return { slippageDays: 0, projectedEndDate: "", status: "ON_TRACK" };
  }
  const sorted = [...activities].sort((a, b) => a.sequence - b.sequence);
  let completedSlippage = 0;
  let maxActiveOverdue = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activityToStage = new Map<string, any>();
  for (const s of stages) {
    activityToStage.set(s.activityId, s);
  }

  for (let i = 0; i < sorted.length; i++) {
    const act = sorted[i];
    const plannedEnd = new Date(act.plannedEnd);
    plannedEnd.setHours(0, 0, 0, 0);

    if (act.status === "PAID") {
      const stage = activityToStage.get(act.id);
      if (stage && stage.decisions && stage.decisions.length > 0) {
        const lastDecision = stage.decisions[stage.decisions.length - 1];
        const actualEnd = new Date(lastDecision.createdAt);
        actualEnd.setHours(0, 0, 0, 0);
        
        const diff = Math.floor((actualEnd.getTime() - plannedEnd.getTime()) / 86400000);
        completedSlippage += diff;
      }
    } else {
      if (today > plannedEnd) {
        const diff = Math.floor((today.getTime() - plannedEnd.getTime()) / 86400000);
        if (diff > maxActiveOverdue) {
          maxActiveOverdue = diff;
        }
      }
    }
  }

  const totalSlippage = completedSlippage + maxActiveOverdue;

  const projEndDateObj = new Date(project.endDate);
  projEndDateObj.setDate(projEndDateObj.getDate() + totalSlippage);
  const projectedEndDate = projEndDateObj.toISOString().split("T")[0];

  return {
    slippageDays: totalSlippage,
    projectedEndDate,
    status: totalSlippage > 0 ? "BEHIND" : totalSlippage < 0 ? "AHEAD" : "ON_TRACK"
  };
}
