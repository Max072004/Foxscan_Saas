import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getData, saveData, audit } from "@/lib/store";
import { notify } from "@/lib/notifications";

/**
 * Razorpay Webhook Handler
 *
 * Listens for `payment.captured` events and auto-marks the corresponding
 * invoice as PAID + payment record as CAPTURED. Also transitions the
 * associated stage to PAID and notifies the contractor.
 *
 * Setup:
 * 1. In Razorpay Dashboard → Settings → Webhooks, create a webhook
 *    pointing to https://yourdomain.com/api/webhooks/razorpay
 * 2. Select the "payment.captured" event
 * 3. Copy the webhook secret and set it as RAZORPAY_WEBHOOK_SECRET in .env
 */

function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[FOXSCAN:razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured"
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn("[FOXSCAN:razorpay-webhook] Invalid signature");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  let payload: {
    event: string;
    payload: {
      payment: {
        entity: {
          id: string;
          order_id: string;
          amount: number;
          currency: string;
          status: string;
        };
      };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Only handle payment.captured events
  if (payload.event !== "payment.captured") {
    // Acknowledge other events without processing
    return NextResponse.json({ status: "ignored", event: payload.event });
  }

  const paymentEntity = payload.payload.payment.entity;
  const razorpayOrderId = paymentEntity.order_id;

  if (!razorpayOrderId) {
    return NextResponse.json(
      { error: "Missing order_id in payment entity" },
      { status: 400 }
    );
  }

  const data = await getData();

  // Find the payment record by Razorpay order ID
  const paymentRecord = data.payments.find(
    p => p.provider === "RAZORPAY" && p.providerPaymentId === razorpayOrderId
  );

  if (!paymentRecord) {
    console.warn(
      `[FOXSCAN:razorpay-webhook] No payment record found for order ${razorpayOrderId}`
    );
    return NextResponse.json(
      { error: "Payment record not found" },
      { status: 404 }
    );
  }

  // Update payment record status
  paymentRecord.status = "CAPTURED";

  // Find and update the associated invoice
  const invoice = data.invoices.find(i => i.id === paymentRecord.invoiceId);
  if (invoice) {
    invoice.status = "PAID";
    invoice.paymentReference = paymentEntity.id; // Razorpay payment ID
  }

  // Find and transition the associated stage to PAID
  const stage = invoice
    ? data.stages.find(s => s.id === invoice.stageId)
    : undefined;

  if (stage && stage.state !== "PAID") {
    stage.state = "PAID";

    // Update the activity status
    const activity = data.activities.find(a => a.id === stage.activityId);
    if (activity) {
      activity.status = "PAID";

      // Notify the contractor that payment was captured
      const project = data.projects.find(p => p.id === activity.projectId);
      if (project?.contractorId) {
        const contractor = data.users.find(
          u => u.id === project.contractorId && u.active
        );
        if (contractor) {
          notify(
            data,
            contractor,
            "PAYMENT_CAPTURED",
            `Payment captured for ${activity.name}`,
            `Payment of ₹${paymentRecord.amount.toLocaleString("en-IN")} for "${activity.name}" has been captured via Razorpay.`
          ).catch(() => undefined);
        }
      }
    }
  }

  // Audit the webhook event
  await audit(data, {
    tenantId: invoice
      ? data.projects.find(
          p =>
            p.id ===
            data.activities.find(a => a.id === stage?.activityId)?.projectId
        )?.tenantId || ""
      : "",
    actorId: "system:razorpay-webhook",
    action: "PAYMENT_CAPTURED",
    entity: "payment",
    entityId: paymentRecord.id,
    after: { razorpayPaymentId: paymentEntity.id, razorpayOrderId },
  });

  await saveData(data);

  console.info(
    `[FOXSCAN:razorpay-webhook] Payment captured: order=${razorpayOrderId} payment=${paymentEntity.id}`
  );

  return NextResponse.json({ status: "ok" });
}
