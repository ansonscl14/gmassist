import { startOfDay, format } from "date-fns";
import { prisma } from "@/lib/db";
import type { DigestStats } from "@/types";

export async function getOpenActionStats(userId: string): Promise<DigestStats> {
  const items = await prisma.actionItem.findMany({
    where: { userId, status: "OPEN" },
  });

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  return {
    meetingsToAdd: items.filter((i) => i.type === "MEETING_TO_ADD").length,
    needsResponse: items.filter((i) => i.type === "NEEDS_RESPONSE").length,
    requestsPending: items.filter((i) => i.type === "REQUEST_PENDING").length,
    scheduleMeetings: items.filter((i) => i.type === "SCHEDULE_MEETING").length,
    overdue: items.filter((i) => i.createdAt < threeDaysAgo).length,
  };
}

function buildSummary(stats: DigestStats): string {
  const total =
    stats.meetingsToAdd +
    stats.needsResponse +
    stats.requestsPending +
    stats.scheduleMeetings;

  if (total === 0) {
    return "You're all caught up — no open action items today.";
  }

  const parts: string[] = [];
  if (stats.meetingsToAdd) parts.push(`${stats.meetingsToAdd} meeting(s) to add`);
  if (stats.needsResponse) parts.push(`${stats.needsResponse} email(s) need replies`);
  if (stats.requestsPending) parts.push(`${stats.requestsPending} request(s) pending`);
  if (stats.scheduleMeetings) parts.push(`${stats.scheduleMeetings} call(s) to schedule`);
  if (stats.overdue) parts.push(`${stats.overdue} overdue item(s)`);

  return `End-of-day digest: ${parts.join(", ")}.`;
}

export async function generateDailyDigest(userId: string) {
  const today = startOfDay(new Date());
  const items = await prisma.actionItem.findMany({
    where: {
      userId,
      status: "OPEN",
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
  });
  const stats = await getOpenActionStats(userId);
  const summary = buildSummary(stats);
  const actionCount =
    stats.meetingsToAdd +
    stats.needsResponse +
    stats.requestsPending +
    stats.scheduleMeetings;

  const highReplies = items
  .filter(
    (i) =>
      i.type === "NEEDS_RESPONSE" &&
      (i.priority === "HIGH" || i.priority === "URGENT")
  )
  .slice(0, 3);

const highMeetings = items
  .filter(
    (i) =>
      i.type === "MEETING_TO_ADD" &&
      (i.priority === "HIGH" || i.priority === "URGENT")
  )
  .slice(0, 3);

const highRequests = items
  .filter(
    (i) =>
      i.type === "REQUEST_PENDING" &&
      (i.priority === "HIGH" || i.priority === "URGENT")
  )
  .slice(0, 3);
  const digest = await prisma.dailyDigest.upsert({
    where: {
      userId_digestDate: { userId, digestDate: today },
    },
    create: {
      userId,
      digestDate: today,
      summary,
      actionCount,
    },
    update: { summary, actionCount },
  });

  return {
    digest,
    stats,
    highReplies,
    highMeetings,
    highRequests,
};
}

export async function deliverDigest(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return;

  const { digest, stats } = await generateDailyDigest(userId);

  const total =
    stats.meetingsToAdd +
    stats.needsResponse +
    stats.requestsPending +
    stats.scheduleMeetings;

  if (total === 0) return;

  // Email delivery will be added later.
  // Dashboard delivery simply saves the digest in the database.

  await prisma.dailyDigest.update({
    where: { id: digest.id },
    data: {
      sentAt: new Date(),
    },
  });
}

export function formatDigestDate(date: Date): string {
  return format(date, "EEEE, MMMM d");
}