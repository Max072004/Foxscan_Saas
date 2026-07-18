import { addHours } from "date-fns";
import type { Activity, Role, Stage, WorkflowState } from "./domain";
import { id } from "./store";
const next: Record<Exclude<WorkflowState, "PAID" | "REWORK">, WorkflowState> = { CONTRACTOR: "MANUFACTURER", MANUFACTURER: "CONSULTANT", CONSULTANT: "CLIENT", CLIENT: "PAID" };
const expectedRole: Record<WorkflowState, Role | null> = { CONTRACTOR: "CONTRACTOR", MANUFACTURER: "MANUFACTURER", CONSULTANT: "CONSULTANT", CLIENT: "CLIENT", PAID: null, REWORK: "CONTRACTOR" };
export function createStage(activity: Activity, actorId: string, evidence: string[], checklist: Record<string, boolean>, tatHours = 24): Stage {
 const raisedAt = new Date().toISOString(); return { id: id(), activityId: activity.id, state: "MANUFACTURER", raisedAt, dueAt: addHours(new Date(), tatHours).toISOString(), submittedBy: actorId, evidence, checklist, comments: [], decisions: [{ id: id(), actorId, role: "CONTRACTOR", decision: "RAISED", createdAt: raisedAt }], amountDue: calculateDue(activity) };
}
export function decide(stage: Stage, actorId: string, role: Role, action: "APPROVE" | "RETURN", note?: string): Stage {
 if (expectedRole[stage.state] !== role) throw new Error(`Only the ${expectedRole[stage.state]} role can act at this step.`);
 const now = new Date().toISOString();
 if (action === "RETURN") { stage.state = "REWORK"; stage.comments.push({ id: id(), actorId, text: note || "Returned for rework", createdAt: now, kind: "RETURN_REASON" }); stage.decisions.push({ id: id(), actorId, role, decision: "RETURNED", createdAt: now, note }); return stage; }
 stage.decisions.push({ id: id(), actorId, role, decision: stage.state === "CLIENT" ? "PAYMENT_RELEASED" : "APPROVED", createdAt: now, note }); stage.state = next[stage.state as keyof typeof next]; return stage;
}
export function calculateDue(activity: Activity) { const base = activity.paymentMode === "PERCENTAGE" ? activity.paymentValue : activity.paymentValue; const retention = base * activity.retentionPct / 100; return Math.max(0, base + base * activity.gstPct / 100 - retention); }
