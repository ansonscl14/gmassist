import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCalendarEvent } from "@/lib/calendar";
import { gmailComposeUrl } from "@/lib/gmail";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const action = body.action as string;

  const item = await prisma.actionItem.findFirst({
    where: { id, userId: session.user.id },
    include: { email: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  switch (action) {
    case "done":
      await prisma.actionItem.update({
        where: { id },
        data: { status: "DONE", completedAt: new Date() },
      });
      return NextResponse.json({ ok: true });

    case "dismiss":
      await prisma.actionItem.update({
        where: { id },
        data: { status: "DISMISSED", completedAt: new Date() },
      });
      return NextResponse.json({ ok: true });

    case "snooze": {
      const hours = body.hours ?? 24;
      await prisma.actionItem.update({
        where: { id },
        data: {
          status: "SNOOZED",
          snoozedUntil: new Date(Date.now() + hours * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({ ok: true });
    }

    case "add_to_calendar": {
      const start = item.meetingStart ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = item.meetingEnd ?? new Date(start.getTime() + 60 * 60 * 1000);
      const attendees = JSON.parse(item.attendees || "[]") as string[];

      const eventId = await createCalendarEvent(session.user.id, {
        summary: item.title.replace(/^Add to calendar:\s*/i, ""),
        description: item.summary,
        location: item.meetingLocation ?? undefined,
        start,
        end,
        attendees,
      });

      await prisma.actionItem.update({
        where: { id },
        data: { status: "DONE", calendarEventId: eventId, completedAt: new Date() },
      });

      return NextResponse.json({ ok: true, eventId });
    }

    case "reply": {
      if (!item.email) {
        return NextResponse.json({ error: "No linked email" }, { status: 400 });
      }
      const url = gmailComposeUrl(
        item.email.fromAddress,
        `Re: ${item.email.subject}`,
        item.email.threadId
      );
      return NextResponse.json({ ok: true, url });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
