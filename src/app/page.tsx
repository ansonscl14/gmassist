"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="container">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="hero">
        <h1>GMassist</h1>
        <p>
          Your Gmail virtual assistant. Scan unread emails on demand,
          surface what matters, and take one-click actions from your daily digest.
        </p>
        <button className="btn btn-primary" onClick={() => signIn("google")}>
          Sign in with Google
        </button>

        <div className="features">
          <div className="feature">
            <h3>📅 Meetings to add</h3>
            <p>Calls and meetings mentioned in email that aren&apos;t on your calendar yet.</p>
          </div>
          <div className="feature">
            <h3>✉️ Replies needed</h3>
            <p>Important emails you haven&apos;t responded to — including ones you&apos;ve fallen behind on.</p>
          </div>
          <div className="feature">
            <h3>📋 Open requests</h3>
            <p>Tasks, approvals, and asks from others waiting on you.</p>
          </div>
          <div className="feature">
            <h3>📞 Calls to schedule</h3>
            <p>Meeting requests without a confirmed time — track and book them.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
