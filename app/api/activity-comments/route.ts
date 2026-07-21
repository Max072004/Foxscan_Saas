import { NextRequest, NextResponse } from "next/server";
import { getData, id, saveData, audit } from "@/lib/store";
import { notify } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const activityId = req.nextUrl.searchParams.get("activityId");
  const data = await getData();
  const comments = activityId
    ? data.activityComments.filter((c) => c.activityId === activityId)
    : data.activityComments;
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await getData();

  if (!body.projectId || !body.activityId || !body.authorId || !body.text?.trim()) {
    return NextResponse.json({ error: "projectId, activityId, authorId, and text are required" }, { status: 400 });
  }

  const project = data.projects.find((p) => p.id === body.projectId);
  const projectUserIds = new Set(
    [project?.contractorId, project?.manufacturerId, project?.consultantId, project?.clientId].filter(Boolean)
  );
  const candidates = data.users.filter((u) => projectUserIds.has(u.id) || u.tenantId === project?.tenantId);

  const mentionHandles = Array.from(new Set((body.text.match(/@(\w+)/g) || []).map((m: string) => m.slice(1).toLowerCase())));
  const mentioned = candidates.filter((u) =>
    mentionHandles.some((h) => u.name.toLowerCase().replace(/\s+/g, "").includes(h as string))
  );

  const comment = {
    id: id(),
    projectId: body.projectId,
    activityId: body.activityId,
    authorId: body.authorId,
    text: body.text.trim(),
    mentions: mentioned.map((u) => u.id),
    createdAt: new Date().toISOString(),
  };
  data.activityComments.push(comment);

  const activity = data.activities.find((a) => a.id === body.activityId);
  const author = data.users.find((u) => u.id === body.authorId);
  for (const u of mentioned) {
    if (u.id === body.authorId) continue;
    await notify(data, u, "ACTIVITY_MENTION", `${author?.name || "Someone"} mentioned you`, `"${comment.text}" — on ${activity?.name || "an activity"}`);
  }

  await audit(data, {
    tenantId: project?.tenantId || "",
    actorId: body.authorId,
    action: "CREATE",
    entity: "activity_comment",
    entityId: comment.id,
    after: comment,
  });

  await saveData(data);
  return NextResponse.json(comment, { status: 201 });
}
