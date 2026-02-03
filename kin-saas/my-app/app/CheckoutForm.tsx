"use client";

import { useState } from "react";

export function CheckoutForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ width: "100%" }}>
      <div className="formRow">
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
          style={{ minWidth: 190, opacity: isLoading ? 0.85 : 1 }}
        >
          {isLoading ? "Opening checkout…" : "Subscribe ($29/mo)"}
        </button>
      </div>
      {error ? (
        <div className="error">{error}</div>
      ) : null}
      <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
        You’ll get a 7‑day free trial. Card required. Cancel anytime.
      </div>
    </form>
  );
}
