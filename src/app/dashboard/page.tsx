"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ActionItemCard } from "@/components/ActionItemCard";
import { DigestSummary } from "@/components/DigestSummary";
import { OnboardingForm } from "@/components/OnboardingForm";
import type { ActionItemWithEmail, DigestStats } from "@/types";

const SECTIONS = [
  { type: "MEETING_TO_ADD", title: "Meetings to add to calendar", icon: "📅" },
  { type: "NEEDS_RESPONSE", title: "Emails needing your reply", icon: "✉️" },
  { type: "REQUEST_PENDING", title: "Requests waiting on you", icon: "📋" },
  { type: "SCHEDULE_MEETING", title: "Calls & meetings to schedule", icon: "📞" },
] as const;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ActionItemWithEmail[]>([]);
  const [stats, setStats] = useState<DigestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [digest, setDigest] = useState<any>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    if (data.needsOnboarding) {
      setNeedsOnboarding(true);
      setLoading(false);
      return;
    }
    setItems(data.items);
    setStats(data.stats);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      loadData();
    }
  }, [status, router, loadData]);

  async function handleReadUnread() {
    if (!confirm("Scan your unread inbox for action items?")) return;

    setScanning(true);
    await fetch("/api/gmail/sync", { method: "POST" });
    await loadData();
    setScanning(false);
  }

  async function handleAction(id: string, action: string) {
    await fetch(`/api/actions/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadData();
  }

  async function handleReadDigest() {
    const res = await fetch("/api/digest", {
      method: "POST",
  });

  const data = await res.json();
  console.log("DIGEST RESPONSE:", data);
  setDigest(data);
}

  if (status === "loading" || loading) {
    return (
      <div className="container">
        <div className="empty-state">Loading dashboard...</div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="container">
        <OnboardingForm onComplete={() => { setNeedsOnboarding(false); loadData(); }} />
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>GMassist</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {session?.user?.email}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={handleReadUnread} disabled={scanning}>
            {scanning ? "Scanning..." : "Read unread emails"}
          </button>
          <button className="btn btn-secondary" onClick={handleReadDigest}>
            Read my Daily Digest
          </button>
          <button className="btn btn-ghost" onClick={() => router.push("/settings")}>Settings</button>
          <button className="btn btn-ghost" onClick={() => signOut()}>Sign out</button>
        </div>
      </header>

      {stats && <DigestSummary stats={stats} />}

      {digest && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>
            📖 Today's Digest
          </h2>

          <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
            {digest.digest.actionCount} open action items
          </p>

          <h3>🔥 High Priority</h3>

          <div style={{ marginTop: "1rem" }}>
            <h4>✉️ Replies</h4>

            {digest.highReplies.length > 0 ? (
              digest.highReplies.map((item: any) => (
                <p key={item.id}>
                  • {item.title}
                </p>
              ))
            ) : (
              <p>🎉 You're all caught up!</p>
            )}
          </div>


          <div style={{ marginTop: "1rem" }}>
            <h4>📅 Meetings</h4>

            {digest.highMeetings.length > 0 ? (
              digest.highMeetings.map((item: any) => (
                <p key={item.id}>
                  • {item.title}
                </p>
              ))
            ) : (
              <p>🎉 You're all caught up!</p>
           )}
          </div>


          <div style={{ marginTop: "1rem" }}>
            <h4>📋 Requests</h4>

            {digest.highRequests.length > 0 ? (
              digest.highRequests.map((item: any) => (
                <p key={item.id}>
                  • {item.title}
                </p>
              ))
            ) : (
              <p>🎉 You're all caught up!</p>
            )}
          </div>


    <hr style={{ margin: "1.5rem 0" }} />

    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
      Showing only your highest-priority items.
      Open the sections below to see all {digest.actionCount} action items.
    </p>
  </div>
)}

      {SECTIONS.map((section) => {
        const sectionItems = items.filter((i) => i.type === section.type);
        if (sectionItems.length === 0) return null;

        return (
          <section key={section.type} style={{ marginBottom: "2rem" }}>
            <h2 className="section-title">
              {section.icon} {section.title}
              <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.85rem" }}>
                ({sectionItems.length})
              </span>
            </h2>
            {sectionItems.map((item) => (
              <ActionItemCard key={item.id} item={item} onAction={handleAction} />
            ))}
          </section>
        );
      })}

      {items.length === 0 && (
        <div className="empty-state card">
          <p>Press the button below to scan your unread inbox for action items.</p>
          <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={handleReadUnread} disabled={scanning}>
            {scanning ? "Scanning..." : "Read my unread emails"}
          </button>
        </div>
      )}
    </div>
  );
}
