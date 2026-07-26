import OpenAI from "openai";
import { z } from "zod";
import type { ClassifiedAction, ActionPriority, ActionType } from "@/types";

const ActionSchema = z.object({
  type: z.enum([
    "MEETING_TO_ADD",
    "NEEDS_RESPONSE",
    "REQUEST_PENDING",
    "SCHEDULE_MEETING",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  title: z.string(),
  summary: z.string(),
  suggestedAction: z.string().optional(),
  dueHint: z.string().optional(),
  meetingStart: z.string().optional(),
  meetingEnd: z.string().optional(),
  meetingLocation: z.string().optional(),
  attendees: z.array(z.string()).optional(),
});

const ClassificationSchema = z.object({
  actions: z.array(ActionSchema),
  isAutomated: z.boolean(),
  requiresAction: z.boolean(),
});

const SYSTEM_PROMPT = `You are an executive email assistant. Analyze emails and extract ONLY actionable items the recipient must handle.

Categories:
1. MEETING_TO_ADD — A specific meeting/call with date/time was proposed or confirmed that should go on the calendar.
2. NEEDS_RESPONSE — Important email requiring a reply (questions, decisions, follow-ups). Flag if the sender is waiting or user appears behind.
3. REQUEST_PENDING — Someone asked the user to do something (review doc, approve, send info, complete a task).
4. SCHEDULE_MEETING — Someone wants to meet/call but no time is set yet; user needs to propose or book a slot.

Rules:
- Ignore newsletters, marketing, automated notifications, receipts, and FYI-only emails.
- Prioritize URGENT for time-sensitive deadlines (<48h), VIP senders, or repeated follow-ups.
- Prioritize HIGH for important business requests without hard deadlines.
- Consider the consequences of ignoring the email when determining priority.
- If no action needed, return empty actions array with requiresAction: false.
- Extract meeting times as ISO 8601 when possible.
- Be concise: title ≤ 80 chars, summary ≤ 200 chars.`;

export async function classifyEmail(input: {
  subject: string;
  fromAddress: string;
  fromName: string | null;
  bodyText: string;
  snippet: string;
  receivedAt: Date;
  isRead: boolean;
  daysSinceReceived: number;
}): Promise<ClassifiedAction[]> {
  if (!process.env.OPENAI_API_KEY) {
    return heuristicClassify(input);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userContent = `
From: ${input.fromName ?? input.fromAddress} <${input.fromAddress}>
Subject: ${input.subject}
Received: ${input.receivedAt.toISOString()} (${input.daysSinceReceived} days ago)
Read: ${input.isRead}

${input.bodyText || input.snippet}
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Return JSON: { "actions": [...], "isAutomated": bool, "requiresAction": bool }\n\n${userContent}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = ClassificationSchema.parse(JSON.parse(raw));

    if (!parsed.requiresAction || parsed.isAutomated) return [];

    return parsed.actions.map((a) => ({
      ...a,
      type: a.type as ActionType,
      priority: a.priority as ActionPriority,
    }));
  } catch (err) {
    console.error("AI classification failed, using heuristics:", err);
    return heuristicClassify(input);
  }
}

function heuristicClassify(input: {
  subject: string;
  fromAddress: string;
  bodyText: string;
  snippet: string;
  daysSinceReceived: number;
}): ClassifiedAction[] {
  const text = `${input.subject} ${input.bodyText} ${input.snippet}`.toLowerCase();
  const actions: ClassifiedAction[] = [];

  const noReplyDomains = ["noreply", "no-reply", "notifications", "mailer-daemon"];
  if (noReplyDomains.some((d) => input.fromAddress.toLowerCase().includes(d))) {
    return [];
  }

  const schedulePatterns = /schedule (a |)(call|meeting|time)|find a time|book a (call|meeting)|when are you free|let'?s connect/i;
  const meetingPatterns = /(\d{1,2}(:\d{2})?\s*(am|pm))|tomorrow at|next (mon|tue|wed|thu|fri)|zoom link|google meet|teams meeting/i;
  const requestPatterns = /please (review|send|approve|confirm|complete|provide|share)|can you|could you|need you to/i;
  const responsePatterns = /\?|following up|waiting for|please reply|let me know|get back to me/i;

  const priority: ActionPriority =
    input.daysSinceReceived >= 3 ? "HIGH" : input.daysSinceReceived >= 1 ? "MEDIUM" : "MEDIUM";

  if (schedulePatterns.test(text)) {
    actions.push({
      type: "SCHEDULE_MEETING",
      priority,
      title: `Schedule: ${input.subject.slice(0, 60)}`,
      summary: "Someone wants to meet but no time is confirmed yet.",
      suggestedAction: "Propose 2–3 time slots or send a scheduling link.",
    });
  } else if (meetingPatterns.test(text)) {
    actions.push({
      type: "MEETING_TO_ADD",
      priority,
      title: `Add to calendar: ${input.subject.slice(0, 50)}`,
      summary: "Email mentions a specific meeting time to add to your calendar.",
      suggestedAction: "Add this meeting to Google Calendar.",
    });
  }

  if (requestPatterns.test(text)) {
    actions.push({
      type: "REQUEST_PENDING",
      priority: input.daysSinceReceived >= 2 ? "HIGH" : priority,
      title: `Request: ${input.subject.slice(0, 60)}`,
      summary: "Someone asked you to take an action.",
      suggestedAction: "Review the email and complete the requested action.",
      dueHint: input.daysSinceReceived >= 3 ? "Overdue — sender may be waiting" : undefined,
    });
  } else if (responsePatterns.test(text)) {
    actions.push({
      type: "NEEDS_RESPONSE",
      priority: input.daysSinceReceived >= 2 ? "HIGH" : priority,
      title: `Reply needed: ${input.subject.slice(0, 55)}`,
      summary: input.snippet.slice(0, 200),
      suggestedAction: "Send a reply in Gmail.",
      dueHint: input.daysSinceReceived >= 3 ? "Fallen behind — prioritize this reply" : undefined,
    });
  }

  return actions;
}
