import { addHours } from "date-fns";
import type { Activity, Role, Stage, WorkflowState, Project } from "./domain";
import { id } from "./store";
const expectedRole: Record<WorkflowState, Role | null> = { CONTRACTOR: "CONTRACTOR", MANUFACTURER: "MANUFACTURER", CONSULTANT: "CONSULTANT", CLIENT: "CLIENT", AWAITING_RECEIPT: "CONTRACTOR", PAID: null, REWORK: "CONTRACTOR" };
export function createStage(activity: Activity, project: Project, actorId: string, evidence: string[], checklist: Record<string, boolean>, tatHours = 48): Stage {
  let initialState: WorkflowState = "MANUFACTURER";
  if (!project.manufacturerId) {
    if (project.consultantId) {
      initialState = "CONSULTANT";
    } else {
      initialState = "CLIENT";
    }
  }
  const raisedAt = new Date().toISOString(); 
  return { id: id(), activityId: activity.id, state: initialState, raisedAt, dueAt: addHours(new Date(), tatHours).toISOString(), submittedBy: actorId, evidence, checklist, comments: [], decisions: [{ id: id(), actorId, role: "CONTRACTOR", decision: "RAISED", createdAt: raisedAt }], amountDue: calculateDue(activity) };
}
export function decide(stage: Stage, project: Project, actorId: string, role: Role, action: "APPROVE" | "RETURN", note?: string, tatHours = 48): Stage {
  if (expectedRole[stage.state] !== role) throw new Error(`Only the ${expectedRole[stage.state]} role can act at this step.`);
  const now = new Date().toISOString();
  if (action === "RETURN") { stage.state = "REWORK"; stage.comments.push({ id: id(), actorId, text: note || "Returned for rework", createdAt: now, kind: "RETURN_REASON" }); stage.decisions.push({ id: id(), actorId, role, decision: "RETURNED", createdAt: now, note }); return stage; }
  
  let nextState: WorkflowState = "PAID";
  if (stage.state === "MANUFACTURER") {
    nextState = project.consultantId ? "CONSULTANT" : "CLIENT";
  } else if (stage.state === "CONSULTANT") {
    nextState = "CLIENT";
  } else if (stage.state === "CLIENT") {
    nextState = "AWAITING_RECEIPT";
  } else if (stage.state === "AWAITING_RECEIPT") {
    nextState = "PAID";
  }
  
  stage.decisions.push({ id: id(), actorId, role, decision: stage.state === "CLIENT" ? "PAYMENT_RELEASED" : "APPROVED", createdAt: now, note });
  stage.state = nextState;
  if (nextState !== "PAID") {
    stage.dueAt = addHours(new Date(), tatHours).toISOString();
  }
  return stage;
}
export function calculateDue(activity: Activity) { const base = activity.paymentValue; const retention = base * activity.retentionPct / 100; return Math.max(0, base + base * activity.gstPct / 100 - retention); }
