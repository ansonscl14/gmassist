import { google, gmail_v1 } from "googleapis";
import { prisma } from "@/lib/db";

function getOAuthClient(accessToken: string, refreshToken?: string | null) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
  });
  return oauth2;
}

export async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) {
    throw new Error("No Google account linked");
  }
  const auth = getOAuthClient(account.access_token, account.refresh_token);
  return google.gmail({ version: "v1", auth });
}

export async function getCalendarClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) {
    throw new Error("No Google account linked");
  }
  const auth = getOAuthClient(account.access_token, account.refresh_token);
  return google.calendar({ version: "v3", auth });
}

function decodeBody(data?: string | null): string {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractTextFromPayload(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBody(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractTextFromPayload(part);
      if (text) return text;
    }
  }
  if (payload.body?.data) {
    return decodeBody(payload.body.data);
  }
  return "";
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export interface ParsedEmail {
  gmailId: string;
  threadId: string;
  subject: string;
  fromAddress: string;
  fromName: string | null;
  snippet: string;
  bodyText: string;
  receivedAt: Date;
  isRead: boolean;
  labels: string[];
  hasReplied: boolean;
}

export function parseGmailMessage(msg: gmail_v1.Schema$Message): ParsedEmail {
  const headers = msg.payload?.headers;
  const from = getHeader(headers, "From");
  const fromMatch = from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  const labels = msg.labelIds ?? [];

  return {
    gmailId: msg.id!,
    threadId: msg.threadId!,
    subject: getHeader(headers, "Subject") || "(no subject)",
    fromAddress: fromMatch?.[2]?.trim() ?? from,
    fromName: fromMatch?.[1]?.trim() ?? null,
    snippet: msg.snippet ?? "",
    bodyText: extractTextFromPayload(msg.payload).slice(0, 8000),
    receivedAt: new Date(parseInt(msg.internalDate ?? "0", 10)),
    isRead: !labels.includes("UNREAD"),
    labels,
    hasReplied: labels.includes("SENT") || false,
  };
}

export async function fetchUnreadInboxMessages(userId: string): Promise<ParsedEmail[]> {
  const gmail = await getGmailClient(userId);
  const messages: ParsedEmail[] = [];

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: 50,
    q: "in:inbox is:unread",
  });

  for (const item of list.data.messages ?? []) {
    if (!item.id) continue;
    const full = await gmail.users.messages.get({ userId: "me", id: item.id, format: "full" });
    if (full.data) messages.push(parseGmailMessage(full.data));
  }

  return messages;
}

export async function setupGmailWatch(userId: string): Promise<Date | null> {
  const topic = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topic) {
    console.warn("GMAIL_PUBSUB_TOPIC not set — skipping Gmail watch");
    return null;
  }

  const gmail = await getGmailClient(userId);
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: topic,
      labelIds: ["INBOX"],
    },
  });

  const expiryMs = parseInt(res.data.expiration ?? "0", 10);
  return expiryMs ? new Date(expiryMs) : null;
}

export function gmailComposeUrl(to: string, subject: string, threadId?: string): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
  });
  if (threadId) params.set("th", threadId);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function gmailOpenUrl(gmailId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${gmailId}`;
}
