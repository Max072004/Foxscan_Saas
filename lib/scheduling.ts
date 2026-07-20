// WARNING: This file contains schedule-slippage calculation logic.
// There is a duplicate copy of `calculateProjectSlippage` in `apps/mobile/lib/scheduling.ts`
// due to Metro bundler boundaries. If you modify this logic, update BOTH files.

import type { Activity } from "./domain";
const day=(value:string)=>Math.floor(new Date(`${value}T00:00:00Z`).getTime()/86400000);
export function criticalPath(activities:Activity[]){const byId=new Map(activities.map(a=>[a.id,a]));const memo=new Map<string,{duration:number;path:string[]}>();const visit=(id:string):{duration:number;path:string[]}=>{const existing=memo.get(id);if(existing)return existing;const activity=byId.get(id);if(!activity)return{duration:0,path:[]};const predecessor=activity.dependencyIds.map(visit).sort((a,b)=>b.duration-a.duration)[0]||{duration:0,path:[]};const result={duration:predecessor.duration+Math.max(1,day(activity.plannedEnd)-day(activity.plannedStart)+1),path:[...predecessor.path,id]};memo.set(id,result);return result;};return activities.map(a=>visit(a.id)).sort((a,b)=>b.duration-a.duration)[0]||{duration:0,path:[]};}
export function dependencyErrors(activities:Activity[]){const ids=new Set(activities.map(a=>a.id));return activities.flatMap(a=>a.dependencyIds.filter(d=>!ids.has(d)||d===a.id).map(d=>`${a.id} has invalid dependency ${d}`));}

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
