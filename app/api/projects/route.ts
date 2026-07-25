import { NextRequest, NextResponse } from "next/server";
import { getData, id, saveData, audit } from "@/lib/store";
import { currentUser, requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    const tenantProjects = data.projects.filter(p => p.tenantId === user.tenantId);
    const visible = user.role === "ADMIN"
      ? tenantProjects
      : tenantProjects.filter(p =>
          p.contractorId === user.id ||
          p.manufacturerId === user.id ||
          p.consultantId === user.id ||
          p.clientId === user.id
        );
    return NextResponse.json(visible);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    requireRole(user, ["ADMIN", "CONTRACTOR"]);
    const body = await req.json();
    const project = {
      id: id(),
      tenantId: user.tenantId,
      status: "DRAFT" as const,
      ...body,
      contractorId: user.role === "CONTRACTOR" ? user.id : body.contractorId,
    };
    data.projects.push(project);
    await audit(data, { tenantId: user.tenantId, actorId: user.id, action: "CREATE", entity: "project", entityId: project.id, after: project });
    await saveData(data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 403 });
  }
}
