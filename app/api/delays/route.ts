import { NextRequest, NextResponse } from "next/server";
import { getData, id, saveData, audit } from "@/lib/store";
import { currentUser, requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    const projectId = req.nextUrl.searchParams.get("projectId");
    const delays = projectId
      ? data.delays.filter((d) => {
          const activity = data.activities.find((a) => a.id === d.activityId);
          return activity?.projectId === projectId;
        })
      : data.delays;
    return NextResponse.json(delays);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 403 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    requireRole(user, ["ADMIN", "CONTRACTOR", "CONSULTANT"]);

    const activity = data.activities.find((a) => a.id === body.activityId);
    if (!activity) throw new Error("Activity not found");

    const delay = {
      id: id(),
      activityId: body.activityId,
      reason: body.reason,
      impactDays: Number(body.impactDays),
      ownerId: user.id,
      mitigationPlan: body.mitigationPlan || "",
      targetClose: body.targetClose,
    };

    data.delays.push(delay);

    const project = data.projects.find((p) => p.id === activity.projectId);
    await audit(data, {
      tenantId: project?.tenantId || "",
      actorId: user.id,
      action: "CREATE",
      entity: "delay",
      entityId: delay.id,
      after: delay,
    });

    await saveData(data);
    return NextResponse.json(delay, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 403 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    requireRole(user, ["ADMIN", "CONTRACTOR", "CONSULTANT"]);

    const delay = data.delays.find((d) => d.id === body.delayId);
    if (!delay) throw new Error("Delay not found");

    if (body.action === "resolve") {
      delay.resolvedAt = new Date().toISOString();
    }

    const activity = data.activities.find((a) => a.id === delay.activityId);
    const project = activity
      ? data.projects.find((p) => p.id === activity.projectId)
      : undefined;

    await audit(data, {
      tenantId: project?.tenantId || "",
      actorId: user.id,
      action: "RESOLVE_DELAY",
      entity: "delay",
      entityId: delay.id,
      after: delay,
    });

    await saveData(data);
    return NextResponse.json(delay);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 403 }
    );
  }
}
