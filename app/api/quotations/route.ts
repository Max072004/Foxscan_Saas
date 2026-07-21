import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, requireRole } from "@/lib/auth";
import { getData, id, saveData, audit } from "@/lib/store";
import { body } from "@/lib/security";

const createSchema = z.object({
  projectId: z.string().uuid(),
  vendorName: z.string().min(2).max(160),
  vendorContact: z.string().max(160).optional(),
  amount: z.number().nonnegative(),
  notes: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["INVITED", "SUBMITTED", "AWARDED", "REJECTED"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    const projectId = req.nextUrl.searchParams.get("projectId");
    const projects = new Set(data.projects.filter((p) => p.tenantId === user.tenantId).map((p) => p.id));
    const list = data.quotations.filter((q) => projects.has(q.projectId) && (!projectId || q.projectId === projectId));
    return NextResponse.json(list);
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
    const now = new Date().toISOString();
    const quotation = {
      id: id(),
      ...input,
      status: "SUBMITTED" as const,
      invitedBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    data.quotations.push(quotation);
    await audit(data, { tenantId: user.tenantId, actorId: user.id, action: "CREATE_QUOTATION", entity: "quotation", entityId: quotation.id, after: quotation });
    await saveData(data);
    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    requireRole(user, ["ADMIN", "CLIENT", "CONSULTANT"]);
    const input = body(updateSchema, await req.json());
    const quotation = data.quotations.find((q) => q.id === input.id);
    if (!quotation) throw new Error("Quotation not found");

    if (input.status === "AWARDED") {
      // Awarding one quotation rejects the other open quotations for the same project.
      for (const q of data.quotations) {
        if (q.projectId === quotation.projectId && q.id !== quotation.id && (q.status === "INVITED" || q.status === "SUBMITTED")) {
          q.status = "REJECTED";
          q.updatedAt = new Date().toISOString();
        }
      }
    }

    Object.assign(quotation, {
      amount: input.amount ?? quotation.amount,
      notes: input.notes ?? quotation.notes,
      status: input.status ?? quotation.status,
      updatedAt: new Date().toISOString(),
    });

    await audit(data, { tenantId: user.tenantId, actorId: user.id, action: "UPDATE_QUOTATION", entity: "quotation", entityId: quotation.id, after: quotation });
    await saveData(data);
    return NextResponse.json(quotation);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}
