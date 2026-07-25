"use client";

import { useSession, signOut} from "next-auth/react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    async function loadSettings() {
      await fetch("/api/settings");

      const savedTheme = localStorage.getItem("theme");

      if (savedTheme === "light") {
        document.documentElement.classList.add("light");
        setTheme("light");
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  async function saveSettings() {
    setSaving(true);

    await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    setSaving(false);
  }

  function changeTheme(newTheme: "dark" | "light") {
    setTheme(newTheme);

    if (newTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }

    localStorage.setItem("theme", newTheme);
  }

  async function deleteAccount() {
    const confirmed = confirm(
      "Are you sure? This will permanently delete your GMassist account and data."
    );

    if (!confirmed) return;

    const res = await fetch("/api/account/delete", {
      method: "DELETE",
    });

    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    } else {
      alert("Failed to delete account");}
  }

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="container">

      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
        ⚙️ Settings
      </h1>


      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2>👤 Account</h2>

        <p style={{ color: "var(--text-muted)" }}>
          Signed in as:
        </p>

        <p>
          {session?.user?.email}
        </p>
      </section>


      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>🎨 Appearance</h2>

        <p style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          Choose how GMassist looks.
        </p>

        <select
          value={theme}
          onChange={(e) =>
            changeTheme(e.target.value as "dark" | "light")
          }
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>

        <button
          className="btn btn-primary"
          style={{ marginTop: "1rem" }}
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </section>


      <section
        className="card"
        style={{
          marginTop: "1rem",
          border: "1px solid #ff5555",
        }}
      >
        <h2>🗑️ Danger Zone</h2>

        <button
          className="btn btn-secondary"
          onClick={deleteAccount}
        >
          Delete GMassist Account and Data
        </button>

        <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
          This will permanently delete:
        </p>

        <ul>
          <li>Your action items</li>
          <li>Email metadata</li>
          <li>Digest history</li>
        </ul>

        <p style={{ color: "var(--text-muted)" }}>
          This action cannot be undone.
        </p>
      </section>

    </div>
  );
}