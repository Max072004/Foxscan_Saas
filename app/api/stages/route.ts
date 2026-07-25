import { NextRequest, NextResponse } from "next/server";
import { withDataLock, audit, id } from "@/lib/store";
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

  const result = await withDataLock(async (data) => {
    const activity = data.activities.find(a => a.id === body.activityId);
    if (!activity) return { status: 404 as const, error: "Activity not found" };

    const project = data.projects.find(p => p.id === activity.projectId);
    if (!project) return { status: 404 as const, error: "Project not found" };

    let stage = data.stages.find(s => s.activityId === activity.id);
    if (stage) {
      let initialState: any = "MANUFACTURER";
      if (!project.manufacturerId) {
        initialState = project.consultantId ? "CONSULTANT" : "CLIENT";
      }
      const now = new Date().toISOString();
      stage.state = initialState;
      stage.raisedAt = now;
      stage.dueAt = new Date(Date.now() + (body.tatHours || 48) * 60 * 60 * 1000).toISOString();
      stage.submittedBy = body.actorId;
      stage.checklist = body.checklist || {};
      stage.evidence = body.evidence || [];
      stage.decisions.push({
        id: id(),
        actorId: body.actorId,
        role: "CONTRACTOR",
        decision: "RAISED",
        createdAt: now
      });
    } else {
      stage = createStage(
        activity,
        project,
        body.actorId,
        body.evidence || [],
        body.checklist || {},
        body.tatHours || 48
      );
      data.stages.push(stage);
    }

    // Link unassigned site updates for this activity to this stage
    for (const su of data.siteUpdates) {
      if (su.activityId === activity.id && !su.stageId) {
        su.stageId = stage.id;
      }
    }

    activity.status = "SUBMITTED";
    activity.progress = 50;

    await audit(data, {
      tenantId: project.tenantId,
      actorId: body.actorId,
      action: "RAISE_STAGE",
      entity: "stage",
      entityId: stage.id,
      after: stage,
    });

    const reviewer = findRecipientByRole(data, activity.id, stage.state as any);
    return { status: 201 as const, stage, activityId: activity.id, activityName: activity.name, reviewerId: reviewer?.id, data };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.reviewerId) {
    const reviewer = findUser(result.data, result.reviewerId);
    if (reviewer) {
      notify(
        result.data,
        reviewer,
        "STAGE_RAISED",
        `Stage raised for ${result.activityName}`,
        `A new stage has been raised for "${result.activityName}" and is awaiting your review.`
      ).catch(() => undefined);
    }
  }

  return NextResponse.json(result.stage, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  const result = await withDataLock(async (data) => {
    const stage = data.stages.find(s => s.id === body.stageId);
    if (!stage) return { status: 404 as const, error: "Stage not found" };

    const previousState = stage.state;
    const activity = data.activities.find(a => a.id === stage.activityId)!;
    const project = data.projects.find(p => p.id === activity.projectId)!;

    if (stage.state === "REWORK") {
      return { status: 400 as const, error: "This stage is in rework and must be resubmitted with new evidence via the raise endpoint, not approved or returned directly." };
    }

    const expectedRoles: Record<string, string> = {
      MANUFACTURER: "MANUFACTURER",
      CONSULTANT: "CONSULTANT",
      CLIENT: "CLIENT",
      AWAITING_RECEIPT: "CONTRACTOR",
    };

    const requiredRole = expectedRoles[stage.state];
    if (requiredRole && body.role !== requiredRole) {
      return { status: 403 as const, error: `Forbidden: Only the ${requiredRole} role can act at this stage.` };
    }

    let updated;
    try {
      updated = decide(stage, project, body.actorId, body.role, body.action, body.note, body.tatHours || 48);
    } catch (error) {
      return { status: 400 as const, error: error instanceof Error ? error.message : "Request failed" };
    }
    if (body.evidence) {
      stage.evidence = body.evidence;
    }

    activity.status =
      updated.state === "PAID"
        ? "PAID"
        : updated.state === "CLIENT"
          ? "APPROVED"
          : updated.state === "REWORK"
            ? "IN_PROGRESS"
            : "SUBMITTED";

    activity.progress =
      activity.status === "PAID"
        ? 100
        : activity.status === "APPROVED"
          ? 90
          : activity.status === "SUBMITTED"
            ? 50
            : 0;

    await audit(data, {
      tenantId: project.tenantId,
      actorId: body.actorId,
      action: body.action,
      entity: "stage",
      entityId: stage.id,
      after: updated,
    });

    return { status: 200 as const, updated, previousState, activityId: activity.id, activityName: activity.name, submittedBy: stage.submittedBy, note: body.note, role: body.role, data };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { updated, previousState, activityId, activityName, submittedBy, note, role, data } = result;

  // --- Send notifications based on the new state ---
  if (updated.state === "REWORK") {
    const contractor = findUser(data, submittedBy);
    if (contractor) {
      const reason = note || "No reason provided";
      notify(
        data,
        contractor,
        "STAGE_RETURNED",
        `Stage for ${activityName} returned for rework`,
        `Your submission for "${activityName}" has been returned for rework by the ${role}. Reason: ${reason}`
      ).catch(() => undefined);
    }
  } else if (updated.state === "CONSULTANT") {
    const consultant = findRecipientByRole(data, activityId, "CONSULTANT");
    if (consultant) {
      notify(
        data,
        consultant,
        "STAGE_APPROVED",
        `Stage for ${activityName} approved by Manufacturer`,
        `The stage for "${activityName}" has been approved by the Manufacturer and is awaiting your review.`
      ).catch(() => undefined);
    }
  } else if (updated.state === "CLIENT") {
    const client = findRecipientByRole(data, activityId, "CLIENT");
    if (client) {
      const approvedBy = previousState === "CONSULTANT" ? "Consultant" : "Manufacturer";
      notify(
        data,
        client,
        "STAGE_APPROVED",
        `Stage for ${activityName} approved by ${approvedBy}`,
        `The stage for "${activityName}" has been approved by the ${approvedBy} and is awaiting your payment release.`
      ).catch(() => undefined);
    }
  } else if (updated.state === "AWAITING_RECEIPT") {
    const contractor = findRecipientByRole(data, activityId, "CONTRACTOR");
    if (contractor) {
      notify(
        data,
        contractor,
        "PAYMENT_PROOF_UPLOADED",
        `Payment proof uploaded for ${activityName}`,
        `The Client has uploaded proof of payment for "${activityName}". Please review and confirm receipt of payment to close the stage.`
      ).catch(() => undefined);
    }
  } else if (updated.state === "PAID") {
    const contractor = findRecipientByRole(data, activityId, "CONTRACTOR");
    if (contractor) {
      notify(
        data,
        contractor,
        "PAYMENT_RELEASED",
        `Payment cleared for ${activityName}`,
        `Receipt of payment has been confirmed for "${activityName}". The stage is now paid and closed.`
      ).catch(() => undefined);
    }
  }

  return NextResponse.json(updated);
}
