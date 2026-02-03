"use client";

import { useMemo, useState } from "react";

export function TopUpForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_API_URL;
    return value?.replace(/\/$/, "") || "";
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = apiUrl
        ? `${apiUrl}/api/stripe/create-topup-session`
        : "/api/stripe/create-topup-session";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Top up failed.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top up failed.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ width: "100%" }}>
      <div className="formRow" style={{ justifyContent: "flex-start" }}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="button buttonPrimary"
          style={{ minWidth: 170, opacity: isLoading ? 0.85 : 1 }}
        >
          {isLoading ? "Opening checkout…" : "Buy credits"}
        </button>
      </div>
      {error ? (
        <div className="error" style={{ textAlign: "left" }}>
          {error}
        </div>
      ) : null}
    </form>
  );
}
