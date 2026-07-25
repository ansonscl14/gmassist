import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOpenActionStats } from "@/lib/digest/generator";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.onboardingDone) {
    return NextResponse.json({ needsOnboarding: true });
  }

  const rawItems = await prisma.actionItem.findMany({
    where: {
      userId: session.user.id,
      status: "OPEN",
    },
    include: { email: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const items = rawItems.map((item) => ({
    id: item.id,
    type: item.type,
    status: item.status,
    priority: item.priority,
    title: item.title,
    summary: item.summary,
    suggestedAction: item.suggestedAction,
    dueHint: item.dueHint,
    meetingStart: item.meetingStart,
    meetingEnd: item.meetingEnd,
    meetingLocation: item.meetingLocation,
    attendees: item.attendees,
    email: item.email
      ? {
          gmailId: item.email.gmailId,
          threadId: item.email.threadId,
          subject: item.email.subject,
          fromAddress: item.email.fromAddress,
          fromName: item.email.fromName,
          snippet: item.email.snippet,
          receivedAt: item.email.receivedAt,
        }
      : null,
  }));

  const stats = await getOpenActionStats(session.user.id);

  return NextResponse.json({ items, stats });
}
