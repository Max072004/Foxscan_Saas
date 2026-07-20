import { NextRequest, NextResponse } from "next/server"; import { getData, id, saveData, audit } from "@/lib/store"; import { currentUser,requireRole } from "@/lib/auth"; import { dependencyErrors } from "@/lib/scheduling";
export async function POST(req: NextRequest) { try{const body = await req.json(); const data = await getData(); const user=currentUser(data,req.headers.get("authorization"));requireRole(user,["ADMIN","CLIENT","CONSULTANT","CONTRACTOR"]);const project=data.projects.find(p=>p.id===body.projectId&&p.tenantId===user.tenantId);if(!project)throw new Error("Project not found");const activity = { id:id(), dependencyIds:[], progress:0, status:"NOT_STARTED" as const, retentionPct:0, gstPct:18, ...body };const errors=dependencyErrors([...data.activities.filter(a=>a.projectId===project.id),activity]);if(errors.length)throw new Error(errors.join('; '));data.activities.push(activity); await audit(data,{tenantId:project.tenantId,actorId:user.id,action:"CREATE",entity:"activity",entityId:activity.id,after:activity}); await saveData(data); return NextResponse.json(activity,{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Request failed"},{status:403});} }

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
