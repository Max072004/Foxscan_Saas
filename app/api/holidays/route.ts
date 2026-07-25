import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, requireRole } from "@/lib/auth";
import { getData, id, saveData, audit } from "@/lib/store";
import { body } from "@/lib/security";

const createSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().date(),
  label: z.string().min(2).max(120),
});

export async function GET(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    const projectId = req.nextUrl.searchParams.get("projectId");
    const projects = new Set(data.projects.filter((p) => p.tenantId === user.tenantId).map((p) => p.id));
    return NextResponse.json(data.holidays.filter((h) => projects.has(h.projectId) && (!projectId || h.projectId === projectId)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    requireRole(user, ["ADMIN", "CLIENT", "CONSULTANT"]);
    const input = body(createSchema, await req.json());
    if (!data.projects.some((p) => p.id === input.projectId && p.tenantId === user.tenantId)) {
      throw new Error("Project not found");
    }
    const holiday = { id: id(), ...input, createdBy: user.id, createdAt: new Date().toISOString() };
    data.holidays.push(holiday);
    await audit(data, { tenantId: user.tenantId, actorId: user.id, action: "CREATE_HOLIDAY", entity: "holiday", entityId: holiday.id, after: holiday });
    await saveData(data);
    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    requireRole(user, ["ADMIN", "CLIENT", "CONSULTANT"]);
    const holidayId = req.nextUrl.searchParams.get("id");
    if (!holidayId) throw new Error("id is required");
    const idx = data.holidays.findIndex((h) => h.id === holidayId);
    if (idx === -1) throw new Error("Holiday not found");
    const [removed] = data.holidays.splice(idx, 1);
    await audit(data, { tenantId: user.tenantId, actorId: user.id, action: "DELETE_HOLIDAY", entity: "holiday", entityId: holidayId, before: removed });
    await saveData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}
