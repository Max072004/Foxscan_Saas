import { NextRequest, NextResponse } from "next/server";
import { getData, saveData, audit } from "@/lib/store";
import { currentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const data = await getData();
    const user = currentUser(data, req.headers.get("authorization"));
    const body = await req.json();

    const record = data.users.find(u => u.id === user.id)!;
    if (typeof body.name === "string" && body.name.trim()) record.name = body.name.trim();
    if (typeof body.companyName === "string") record.companyName = body.companyName.trim() || undefined;
    if (typeof body.phone === "string") record.phone = body.phone.trim() || undefined;

    await audit(data, { tenantId: user.tenantId, actorId: user.id, action: "UPDATE_PROFILE", entity: "user", entityId: user.id, after: record });
    await saveData(data);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}
