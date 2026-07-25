import { NextRequest, NextResponse } from "next/server";
import { getData, saveData } from "@/lib/store";
import { issueOtp, verifyOtp } from "@/lib/auth";
import { integrations } from "@/lib/integrations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await getData();

    const identifier = String(body.identifier || "").trim().toLowerCase();

    if (body.action === "request") {
      if (!identifier) return NextResponse.json({ error: "Phone or email is required" }, { status: 400 });

      const user = data.users.find(u => (u.email && u.email.toLowerCase() === identifier) || (u.phone && u.phone.toLowerCase() === identifier));
      const targetEmail = user?.email || (identifier.includes("@") ? identifier : undefined);
      if (!targetEmail) {
        return NextResponse.json({ error: "No email on file for this account. Contact your administrator to add one." }, { status: 400 });
      }

      const otp = issueOtp(data, identifier);
      await saveData(data);
      await integrations.email.send({
        to: targetEmail,
        subject: "Your Foxscan verification code",
        body: `Your one-time password is ${otp.code}. It expires in 15 minutes. If you did not request this, ignore this email.`,
      });

      return NextResponse.json({ challenge: otp.token, delivery: "email", deliveredTo: targetEmail });
    }

    const result = verifyOtp(data, identifier, String(body.code || ""));
    await saveData(data);
    return NextResponse.json({ token: result.session.token, user: result.user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication failed" }, { status: 401 });
  }
}
