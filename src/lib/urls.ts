export function gmailOpenUrl(gmailId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${gmailId}`;
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
