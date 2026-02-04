"use client";

import { useMemo, useState } from "react";

type AccountData = {
  ok: true;
  email: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  credits: number;
  hasStripeCustomer: boolean;
};

export function AccountForm() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trialLabel = useMemo(() => {
    if (!data?.trialEndsAt) return null;
    const d = new Date(data.trialEndsAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString();
  }, [data?.trialEndsAt]);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setData(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/account/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const json = (await res.json()) as AccountData | { error?: string };
      if (!res.ok || !("ok" in json)) {
        throw new Error(("error" in json && json.error) || "Could not load account.");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load account.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onManageSubscription() {
    if (!data?.email) return;
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Could not open billing portal.");
      }
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal.");
      setIsLoading(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <form onSubmit={onLookup} style={{ width: "100%" }}>
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
            {isLoading ? "Loading…" : "View account"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="error" style={{ textAlign: "left", marginTop: 12 }}>
          {error}
        </div>
      ) : null}

      {data ? (
        <div
          className="panel"
          style={{ marginTop: 14, padding: 16, maxWidth: 720, marginInline: "auto" }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--muted)" }}>Email</div>
            <div style={{ fontWeight: 700 }}>{data.email}</div>

            <div style={{ color: "var(--muted)", marginTop: 8 }}>Subscription</div>
            <div style={{ fontWeight: 700, textTransform: "capitalize" }}>
              {data.subscriptionStatus || "inactive"}
            </div>
            {trialLabel ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Trial ends: {trialLabel}</div>
            ) : null}

            <div style={{ color: "var(--muted)", marginTop: 8 }}>Credits</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{data.credits}</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <a className="button buttonSoft" href="/top-up">
                Top up credits
              </a>
              <button
                type="button"
                className="button buttonSoft"
                onClick={onManageSubscription}
                disabled={isLoading || !data.hasStripeCustomer}
              >
                Manage subscription
              </button>
            </div>

            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
              Manage subscription opens Stripe’s billing portal (cancel, payment method, invoices).
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

