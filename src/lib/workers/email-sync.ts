import { prisma } from "@/lib/db";
import { classifyEmail } from "@/lib/ai/classifier";
import { fetchUnreadInboxMessages, type ParsedEmail } from "@/lib/gmail";
import type { ActionType, ActionPriority } from "@/types";

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

async function upsertEmail(userId: string, msg: ParsedEmail) {
  return prisma.emailMessage.upsert({
    where: { userId_gmailId: { userId, gmailId: msg.gmailId } },
    create: {
      userId,
      gmailId: msg.gmailId,
      threadId: msg.threadId,
      subject: msg.subject,
      fromAddress: msg.fromAddress,
      fromName: msg.fromName,
      snippet: msg.snippet,
      bodyText: msg.bodyText,
      receivedAt: msg.receivedAt,
      isRead: msg.isRead,
      hasReplied: msg.hasReplied,
      labels: JSON.stringify(msg.labels),
    },
    update: {
      isRead: msg.isRead,
      hasReplied: msg.hasReplied,
      labels: JSON.stringify(msg.labels),
    },
  });
}

async function processEmail(userId: string, msg: ParsedEmail) {
  const email = await upsertEmail(userId, msg);

  if (email.processedAt) return;

  const skipLabels = ["SPAM", "TRASH", "CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL"];
  if (msg.labels.some((l) => skipLabels.includes(l))) {
    await prisma.emailMessage.update({
      where: { id: email.id },
      data: { processedAt: new Date() },
    });
    return;
  }

  const actions = await classifyEmail({
    subject: msg.subject,
    fromAddress: msg.fromAddress,
    fromName: msg.fromName,
    bodyText: msg.bodyText,
    snippet: msg.snippet,
    receivedAt: msg.receivedAt,
    isRead: msg.isRead,
    daysSinceReceived: daysSince(msg.receivedAt),
  });

  for (const action of actions) {
    const existing = await prisma.actionItem.findFirst({
      where: {
        userId,
        emailId: email.id,
        type: action.type as ActionType,
        status: "OPEN",
      },
    });
    if (existing) continue;

    await prisma.actionItem.create({
      data: {
        userId,
        emailId: email.id,
        type: action.type as ActionType,
        priority: action.priority as ActionPriority,
        title: action.title,
        summary: action.summary,
        suggestedAction: action.suggestedAction,
        dueHint: action.dueHint,
        meetingStart: action.meetingStart ? new Date(action.meetingStart) : null,
        meetingEnd: action.meetingEnd ? new Date(action.meetingEnd) : null,
        meetingLocation: action.meetingLocation,
        attendees: JSON.stringify(action.attendees ?? []),
      },
    });
  }

  await prisma.emailMessage.update({
    where: { id: email.id },
    data: { processedAt: new Date() },
  });
}

export async function syncUserEmails(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const messages = await fetchUnreadInboxMessages(userId);

  for (const msg of messages) {
    await processEmail(userId, msg);
  }

  return messages.length;
}

export async function syncAllUsers(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { onboardingDone: true },
    select: { id: true },
  });

  for (const user of users) {
    try {
      await syncUserEmails(user.id);
    } catch (err) {
      console.error(`Sync failed for user ${user.id}:`, err);
    }
  }
}

export async function backfillUnprocessed(userId: string, days = 14): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const unprocessed = await prisma.emailMessage.findMany({
    where: {
      userId,
      processedAt: null,
      receivedAt: { gte: cutoff },
    },
  });

  for (const email of unprocessed) {
    await processEmail(userId, {
      gmailId: email.gmailId,
      threadId: email.threadId,
      subject: email.subject,
      fromAddress: email.fromAddress,
      fromName: email.fromName,
      snippet: email.snippet,
      bodyText: email.bodyText ?? "",
      receivedAt: email.receivedAt,
      isRead: email.isRead,
      labels: JSON.parse(email.labels),
      hasReplied: email.hasReplied,
    });
  }

  return unprocessed.length;
}
