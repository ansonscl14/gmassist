"use client";

import { useState } from "react";

interface Props {
  onComplete: () => void;
}

export function OnboardingForm({ onComplete }: Props) {
  const [dashboardDigest, setDashboardDigest] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let digestDelivery: "DASHBOARD" | "EMAIL" | "BOTH";

    if (dashboardDigest && emailDigest) {
      digestDelivery = "BOTH";
    } else if (emailDigest) {
      digestDelivery = "EMAIL";
    } else {
      digestDelivery = "DASHBOARD";
    }

    await fetch("/api/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        digestDelivery,
      }),
    });

    setLoading(false);
    onComplete();
  }

  return (
    <div className="card" style={{ maxWidth: 500, margin: "2rem auto" }}>
      <h2>Welcome to GMassist</h2>

      <p
        style={{
          color: "var(--text-muted)",
          marginBottom: "1.5rem",
        }}
      >
        Choose how you'd like to receive your daily digest.
      </p>

      <form onSubmit={handleSubmit}>
        
        {!dashboardDigest && !emailDigest && (
          <p
            style={{
              color: "#dc2626",
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            Please select at least one delivery method.
          </p>
        )}
        <button
          className="btn btn-primary"
          disabled={
            loading || (!dashboardDigest && !emailDigest)
          }
          style={{ width: "100%" }}
        >
          {loading ? "Saving..." : "Finish setup"}
        </button>
      </form>
    </div>
  );
}