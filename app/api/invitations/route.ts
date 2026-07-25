import { NextRequest, NextResponse } from "next/server";
import { getData, saveData, audit } from "@/lib/store";
import { currentUser, invite } from "@/lib/auth";
import { integrations } from "@/lib/integrations";

export async function GET(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    return NextResponse.json(data.invitations.filter(i => i.tenantId === user.tenantId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await getData();
    const actor = currentUser(data, req.headers.get("authorization"));
    const body = await req.json();

    const { user, project } = invite(data, actor, body);

    await integrations.email.send({
      to: user.email,
      subject: "You've been added to Foxscan",
      body: `${actor.name} has added you to Foxscan as ${user.role}${project ? ` on "${project.name}"` : ""}. Sign in any time with this email address — you'll receive a one-time code by email, no password needed.`,
    });

    await audit(data, {
      tenantId: actor.tenantId,
      actorId: actor.id,
      action: "INVITE",
      entity: "user",
      entityId: user.id,
      after: user,
    });
    await saveData(data);

    return NextResponse.json({ user, project }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}
