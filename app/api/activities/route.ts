import { NextRequest, NextResponse } from "next/server"; import { getData, id, saveData, audit } from "@/lib/store"; import { currentUser,requireRole } from "@/lib/auth"; import { dependencyErrors } from "@/lib/scheduling";
export async function POST(req: NextRequest) { try{const body = await req.json(); const data = await getData(); const user=currentUser(data,req.headers.get("authorization"));requireRole(user,["ADMIN","CLIENT","CONSULTANT","CONTRACTOR"]);const project=data.projects.find(p=>p.id===body.projectId&&p.tenantId===user.tenantId);if(!project)throw new Error("Project not found");const activity = { id:id(), dependencyIds:[], progress:0, status:"NOT_STARTED" as const, retentionPct:0, gstPct:18, ...body };const errors=dependencyErrors([...data.activities.filter(a=>a.projectId===project.id),activity]);if(errors.length)throw new Error(errors.join('; '));data.activities.push(activity); await audit(data,{tenantId:project.tenantId,actorId:user.id,action:"CREATE",entity:"activity",entityId:activity.id,after:activity}); await saveData(data); return NextResponse.json(activity,{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Request failed"},{status:403});} }

export async function PATCH(req: NextRequest) {
  try {
    const patchBody = await req.json();
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    requireRole(user, ["ADMIN", "CLIENT", "CONSULTANT", "CONTRACTOR"]);

    const activity = data.activities.find(a => a.id === patchBody.id);
    if (!activity) throw new Error("Activity not found");
    const project = data.projects.find(p => p.id === activity.projectId && p.tenantId === user.tenantId);
    if (!project) throw new Error("Project access denied");
    if (!patchBody.plannedStart || !patchBody.plannedEnd) throw new Error("plannedStart and plannedEnd are required");

    const oldStart = new Date(`${activity.plannedStart}T00:00:00Z`).getTime();
    const newStart = new Date(`${patchBody.plannedStart}T00:00:00Z`).getTime();
    const deltaDays = Math.round((newStart - oldStart) / 86400000);

    const shiftDate = (dateStr: string, days: number) => {
      const d = new Date(`${dateStr}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().split("T")[0];
    };

    const siblings = data.activities.filter(a => a.projectId === activity.projectId);
    const children = new Map<string, string[]>();
    for (const a of siblings) {
      for (const dep of a.dependencyIds) {
        if (!children.has(dep)) children.set(dep, []);
        children.get(dep)!.push(a.id);
      }
    }

    activity.plannedStart = patchBody.plannedStart;
    activity.plannedEnd = patchBody.plannedEnd;

    const shiftedIds = [activity.id];
    if (deltaDays !== 0) {
      const visited = new Set([activity.id]);
      const queue = [activity.id];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const childId of children.get(cur) || []) {
          if (visited.has(childId)) continue;
          visited.add(childId);
          const child = siblings.find(a => a.id === childId);
          if (child) {
            child.plannedStart = shiftDate(child.plannedStart, deltaDays);
            child.plannedEnd = shiftDate(child.plannedEnd, deltaDays);
            shiftedIds.push(child.id);
          }
          queue.push(childId);
        }
      }
    }

    await audit(data, { tenantId: project.tenantId, actorId: user.id, action: "RESCHEDULE", entity: "activity", entityId: activity.id, after: { activity, shiftedIds } });
    await saveData(data);
    return NextResponse.json({ activity, shiftedIds });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("id");
    if (!activityId) throw new Error("ID parameter is required");
    
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    requireRole(user, ["ADMIN", "CLIENT", "CONSULTANT", "CONTRACTOR"]);

    const idx = data.activities.findIndex(a => a.id === activityId);
    if (idx === -1) throw new Error("Activity not found");
    const activity = data.activities[idx];

    const project = data.projects.find(p => p.id === activity.projectId && p.tenantId === user.tenantId);
    if (!project) throw new Error("Project access denied");

    data.activities.splice(idx, 1);
    data.stages = data.stages.filter(s => s.activityId !== activityId);
    data.siteUpdates = data.siteUpdates.filter(s => s.activityId !== activityId);
    data.delays = data.delays.filter(d => d.activityId !== activityId);
    data.invoices = data.invoices.filter(i => i.activityId !== activityId);

    await audit(data, {
      tenantId: project.tenantId,
      actorId: user.id,
      action: "DELETE",
      entity: "activity",
      entityId: activityId,
      before: activity
    });

    await saveData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 403 }
    );
  }
}
