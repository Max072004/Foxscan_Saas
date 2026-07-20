import { NextRequest, NextResponse } from "next/server";
import { getData, id, saveData, audit } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await getData();

  let assignedStageId = undefined;
  if (body.activityId) {
    const activeStage = data.stages.find(
      (s: any) => s.activityId === body.activityId && s.state !== "PAID"
    );
    if (activeStage) {
      assignedStageId = activeStage.id;
    }
  }

  const update = {
    id: id(),
    attachments: [],
    date: new Date().toISOString(),
    ...body,
    stageId: body.stageId || assignedStageId,
  };

  data.siteUpdates.push(update);
  const tenantId = data.projects.find((p) => p.id === update.projectId)?.tenantId || "";
  await audit(data, {
    tenantId,
    actorId: update.authorId,
    action: "CREATE",
    entity: "site_update",
    entityId: update.id,
    after: update,
  });
  await saveData(data);
  return NextResponse.json(update, { status: 201 });
}
