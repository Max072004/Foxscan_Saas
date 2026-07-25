import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/store";
import { currentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const data = await getData();

  // No/invalid token (web's guest-mode viewing): keep today's unscoped behavior
  // unchanged. Any authenticated caller (mobile always sends a token once signed
  // in) gets a properly tenant- and project-scoped view below.
  let user;
  try {
    user = currentUser(data, req.headers.get("authorization"));
  } catch {
    return NextResponse.json(data);
  }

  try {
    const tenantProjects = data.projects.filter(p => p.tenantId === user.tenantId);
    const visibleProjects = user.role === "ADMIN"
      ? tenantProjects
      : tenantProjects.filter(p =>
          p.contractorId === user.id ||
          p.manufacturerId === user.id ||
          p.consultantId === user.id ||
          p.clientId === user.id
        );
    const projectIds = new Set(visibleProjects.map(p => p.id));
    const activities = data.activities.filter(a => projectIds.has(a.projectId));
    const activityIds = new Set(activities.map(a => a.id));

    return NextResponse.json({
      ...data,
      tenants: data.tenants.filter(t => t.id === user.tenantId),
      users: data.users.filter(u => u.tenantId === user.tenantId),
      sessions: [],
      invitations: data.invitations.filter(i => i.tenantId === user.tenantId),
      projects: visibleProjects,
      buildings: data.buildings.filter(b => projectIds.has(b.projectId)),
      boqItems: data.boqItems.filter(b => projectIds.has(b.projectId)),
      activities,
      stages: data.stages.filter(s => activityIds.has(s.activityId)),
      invoices: data.invoices.filter(i => projectIds.has(i.projectId)),
      dlpCases: data.dlpCases.filter(d => projectIds.has(d.projectId)),
      warranties: data.warranties.filter(w => projectIds.has(w.projectId)),
      disputes: data.disputes.filter(d => projectIds.has(d.projectId)),
      notifications: data.notifications.filter(n => n.recipientId === user.id),
      siteUpdates: data.siteUpdates.filter(s => projectIds.has(s.projectId)),
      delays: data.delays.filter(d => activityIds.has(d.activityId)),
      documents: data.documents.filter(d => projectIds.has(d.projectId)),
      audits: data.audits.filter(a => a.tenantId === user.tenantId),
      activityComments: data.activityComments.filter(c => projectIds.has(c.projectId)),
      quotations: data.quotations.filter(q => projectIds.has(q.projectId)),
      holidays: data.holidays.filter(h => projectIds.has(h.projectId)),
      deviceRegistrations: data.deviceRegistrations.filter(d => d.userId === user.id),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
