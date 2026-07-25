import { NextRequest, NextResponse } from "next/server";
import { getData, id, saveData, audit } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import type { AppData, User } from "@/lib/domain";

function visibleProjectIds(data: AppData, user: User): Set<string> {
  const tenantProjects = data.projects.filter(p => p.tenantId === user.tenantId);
  const visible = user.role === "ADMIN"
    ? tenantProjects
    : tenantProjects.filter(p =>
        p.contractorId === user.id ||
        p.manufacturerId === user.id ||
        p.consultantId === user.id ||
        p.clientId === user.id
      );
  return new Set(visible.map(p => p.id));
}

export async function GET(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    const q = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
    const projectId = req.nextUrl.searchParams.get("projectId");
    const projectIds = visibleProjectIds(data, user);

    if (projectId && !projectIds.has(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      data.documents.filter(d =>
        projectIds.has(d.projectId) &&
        (!projectId || d.projectId === projectId) &&
        (!q || `${d.name} ${d.type} ${d.tags.join(" ")}`.toLowerCase().includes(q))
      )
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    const body = await req.json();

    if (!visibleProjectIds(data, user).has(body.projectId)) {
      throw new Error("Project not found");
    }

    const prior = data.documents.filter(d => d.projectId === body.projectId && d.name === body.name);
    const document = {
      id: id(),
      uploadedBy: user.id,
      version: prior.length ? Math.max(...prior.map(d => d.version)) + 1 : 1,
      createdAt: new Date().toISOString(),
      tags: [],
      visibility: ["ADMIN", "CONTRACTOR", "MANUFACTURER", "CONSULTANT", "CLIENT"],
      url: "",
      ...body,
    };
    data.documents.push(document);
    await audit(data, { tenantId: user.tenantId, actorId: user.id, action: "UPLOAD", entity: "document", entityId: document.id, after: document });
    await saveData(data);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 403 });
  }
}
