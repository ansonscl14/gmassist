"use client";

import type { ActionItemWithEmail } from "@/types";
import { gmailOpenUrl, googleCalendarComposeUrl } from "@/lib/urls";

const TYPE_LABELS: Record<string, string> = {
  MEETING_TO_ADD: "Add to calendar",
  NEEDS_RESPONSE: "Needs reply",
  REQUEST_PENDING: "Request pending",
  SCHEDULE_MEETING: "Schedule call",
};

const TYPE_ICONS: Record<string, string> = {
  MEETING_TO_ADD: "📅",
  NEEDS_RESPONSE: "✉️",
  REQUEST_PENDING: "📋",
  SCHEDULE_MEETING: "📞",
};

interface Props {
  item: ActionItemWithEmail;
  onAction: (id: string, action: string) => Promise<void>;
}

export function ActionItemCard({ item, onAction }: Props) {
  const priorityClass = `badge badge-${item.priority.toLowerCase()}`;

  async function handle(action: string) {
    if (action === "reply") {
      const res = await fetch(`/api/actions/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply" }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
      return;
    }

    if (action === "schedule") {
      const start = item.meetingStart ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = item.meetingEnd ?? new Date(start.getTime() + 60 * 60 * 1000);
      const url = googleCalendarComposeUrl(item.title, start, end, item.summary);
      window.open(url, "_blank");
      return;
    }

    if (action === "open") {
      if (item.email) window.open(gmailOpenUrl(item.email.gmailId), "_blank");
      return;
    }

    await onAction(item.id, action);
  }

  return (
    <div className="card" style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
            <span className="badge badge-type">
              {TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}
            </span>
            <span className={priorityClass}>{item.priority}</span>
            {item.dueHint && (
              <span className="badge badge-urgent">{item.dueHint}</span>
            )}
          </div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            {item.title}
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            {item.summary}
          </p>
          {item.email && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              From {item.email.fromName ?? item.email.fromAddress} ·{" "}
              {new Date(item.email.receivedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
        {item.type === "MEETING_TO_ADD" && (
          <button className="btn btn-primary" onClick={() => handle("add_to_calendar")}>
            Add to Calendar
          </button>
        )}
        {(item.type === "NEEDS_RESPONSE" || item.type === "REQUEST_PENDING") && (
          <button className="btn btn-primary" onClick={() => handle("reply")}>
            Reply in Gmail
          </button>
        )}
        {item.type === "SCHEDULE_MEETING" && (
          <button className="btn btn-primary" onClick={() => handle("schedule")}>
            Schedule Meeting
          </button>
        )}
        {item.email && (
          <button className="btn btn-secondary" onClick={() => handle("open")}>
            Open Email
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => handle("done")}>
          Done
        </button>
        <button className="btn btn-ghost" onClick={() => handle("snooze")}>
          Snooze 24h
        </button>
      </div>
    </div>
  );
}
