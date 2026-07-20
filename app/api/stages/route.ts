import { NextRequest, NextResponse } from "next/server";
import { getData, saveData, audit } from "@/lib/store";
import { createStage, decide } from "@/lib/workflow";
import { notify } from "@/lib/notifications";
import type { AppData, User } from "@/lib/domain";

/** Resolve a user by their ID */
function findUser(data: AppData, userId: string | undefined): User | undefined {
  if (!userId) return undefined;
  return data.users.find(u => u.id === userId && u.active);
}

/** Find the project-linked user for a given role, given an activityId */
function findRecipientByRole(
  data: AppData,
  activityId: string,
  role: "CONTRACTOR" | "MANUFACTURER" | "CONSULTANT" | "CLIENT"
): User | undefined {
  const activity = data.activities.find(a => a.id === activityId);
  if (!activity) return undefined;
  const project = data.projects.find(p => p.id === activity.projectId);
  if (!project) return undefined;

  const roleToProjectField: Record<string, string | undefined> = {
    CONTRACTOR: project.contractorId,
    MANUFACTURER: project.manufacturerId,
    CONSULTANT: project.consultantId,
    CLIENT: project.clientId,
  };

  const userId = roleToProjectField[role];
  return findUser(data, userId);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await getData();
  const activity = data.activities.find(a => a.id === body.activityId);
  if (!activity)
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const stage = createStage(
    activity,
    body.actorId,
    body.evidence || [],
    body.checklist || {},
    body.tatHours || 24
  );
  activity.status = "SUBMITTED";
  data.stages.push(stage);

  await audit(data, {
    tenantId:
      data.projects.find(p => p.id === activity.projectId)?.tenantId || "",
    actorId: body.actorId,
    action: "RAISE_STAGE",
    entity: "stage",
    entityId: stage.id,
    after: stage,
  });
  await saveData(data);

  // Notify: Contractor raised → notify Manufacturer
  const manufacturer = findRecipientByRole(data, activity.id, "MANUFACTURER");
  if (manufacturer) {
    notify(
      data,
      manufacturer,
      "STAGE_RAISED",
      `Stage raised for ${activity.name}`,
      `A new stage has been raised for "${activity.name}" and is awaiting your review.`
    ).catch(() => undefined);
  }

  return NextResponse.json(stage, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const data = await getData();
  const stage = data.stages.find(s => s.id === body.stageId);
  if (!stage)
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const previousState = stage.state;
  const updated = decide(stage, body.actorId, body.role, body.action, body.note);
  const activity = data.activities.find(a => a.id === stage.activityId)!;

  activity.status =
    updated.state === "PAID"
      ? "PAID"
      : updated.state === "CLIENT"
        ? "APPROVED"
        : updated.state === "REWORK"
          ? "IN_PROGRESS"
          : "SUBMITTED";

  await audit(data, {
    tenantId:
      data.projects.find(p => p.id === activity.projectId)?.tenantId || "",
    actorId: body.actorId,
    action: body.action,
    entity: "stage",
    entityId: stage.id,
    after: updated,
  });
  await saveData(data);

  // --- Send notifications based on the new state ---
  if (updated.state === "REWORK") {
    // Returned for rework → notify the Contractor who originally submitted
    const contractor = findUser(data, stage.submittedBy);
    if (contractor) {
      const reason = body.note || "No reason provided";
      notify(
        data,
        contractor,
        "STAGE_RETURNED",
        `Stage for ${activity.name} returned for rework`,
        `Your submission for "${activity.name}" has been returned for rework by the ${body.role}. Reason: ${reason}`
      ).catch(() => undefined);
    }
  } else if (updated.state === "CONSULTANT") {
    // Manufacturer approved → notify Consultant
    const consultant = findRecipientByRole(data, activity.id, "CONSULTANT");
    if (consultant) {
      notify(
        data,
        consultant,
        "STAGE_APPROVED",
        `Stage for ${activity.name} approved by Manufacturer`,
        `The stage for "${activity.name}" has been approved by the Manufacturer and is awaiting your review.`
      ).catch(() => undefined);
    }
  } else if (updated.state === "CLIENT") {
    // Consultant approved → notify Client
    const client = findRecipientByRole(data, activity.id, "CLIENT");
    if (client) {
      notify(
        data,
        client,
        "STAGE_APPROVED",
        `Stage for ${activity.name} approved by Consultant`,
        `The stage for "${activity.name}" has been approved by the Consultant and is awaiting your payment release.`
      ).catch(() => undefined);
    }
  } else if (updated.state === "PAID") {
    // Client released payment → notify Contractor
    const contractor = findRecipientByRole(data, activity.id, "CONTRACTOR");
    if (contractor) {
      notify(
        data,
        contractor,
        "PAYMENT_RELEASED",
        `Payment released for ${activity.name}`,
        `Payment has been released for "${activity.name}". Amount due: ₹${stage.amountDue.toLocaleString("en-IN")}.`
      ).catch(() => undefined);
    }
  }

  return NextResponse.json(updated);
}
