import { NextRequest, NextResponse } from "next/server";

/** Gmail Pub/Sub push endpoint — auto-sync is disabled; scans are manual via the dashboard. */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-gmail-webhook-secret");
  if (secret !== process.env.GMAIL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, skipped: "manual scan only" });
  } catch (err) {
    console.error("Gmail webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
