import { getCalendarClient } from "@/lib/gmail";

export interface CalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  attendees?: string[];
}

export async function createCalendarEvent(
  userId: string,
  event: CalendarEventInput
): Promise<string> {
  const calendar = await getCalendarClient(userId);

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
      attendees: event.attendees?.map((email) => ({ email })),
    },
  });

  return res.data.id ?? "";
}

export async function findConflictingEvents(
  userId: string,
  start: Date,
  end: Date
): Promise<boolean> {
  const calendar = await getCalendarClient(userId);
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
  });
  return (res.data.items?.length ?? 0) > 0;
}

export function googleCalendarComposeUrl(
  title: string,
  start: Date,
  end: Date,
  details?: string
): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: details ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
