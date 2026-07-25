import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deliverDigest } from "@/lib/digest/generator";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deliverDigest(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Digest send error:", err);
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 });
  }
}
