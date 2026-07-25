"use client";

import type { DigestStats } from "@/types";

interface Props {
  stats: DigestStats;
}

export function DigestSummary({ stats }: Props) {
  const total =
    stats.meetingsToAdd +
    stats.needsResponse +
    stats.requestsPending +
    stats.scheduleMeetings;

  return (
    <div>
      <div className="grid-stats">
        <div className="stat-card">
          <div className="number">{stats.meetingsToAdd}</div>
          <div className="label">Meetings to add</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.needsResponse}</div>
          <div className="label">Need replies</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.requestsPending}</div>
          <div className="label">Requests pending</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.scheduleMeetings}</div>
          <div className="label">To schedule</div>
        </div>
      </div>

      {total === 0 ? (
        <div className="empty-state card">
          <p style={{ fontSize: "1.1rem" }}>You&apos;re all caught up!</p>
          <p style={{ marginTop: "0.5rem" }}>No open action items right now.</p>
        </div>
      ) : stats.overdue > 0 ? (
        <div className="card" style={{ borderColor: "var(--urgent)", marginBottom: "1.5rem" }}>
          <strong style={{ color: "var(--urgent)" }}>
            {stats.overdue} overdue item{stats.overdue > 1 ? "s" : ""}
          </strong>
          <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
            — prioritize these first
          </span>
        </div>
      ) : null}
    </div>
  );
}
