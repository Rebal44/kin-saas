"use client";

import { useMemo, useState } from "react";

export function CheckoutForm() {
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

    if (!apiUrl) {
      setError("Missing NEXT_PUBLIC_API_URL configuration.");
      return;
    }

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/stripe/create-checkout-session`, {
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
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: 320,
            maxWidth: "100%",
            padding: "14px 14px",
            borderRadius: 12,
            border: "1px solid #27272a",
            background: "#0b0b0c",
            color: "#fafafa",
            outline: "none",
            fontSize: 15,
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg, #4f46e5, #9333ea)",
            color: "white",
            fontWeight: 600,
            fontSize: 15,
            minWidth: 170,
            opacity: isLoading ? 0.8 : 1,
          }}
        >
          {isLoading ? "Opening checkout…" : "Subscribe ($29/mo)"}
        </button>
      </div>
      {error ? (
        <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 14, textAlign: "center" }}>
          {error}
        </div>
      ) : null}
      <div style={{ marginTop: 12, color: "#a1a1aa", fontSize: 13, textAlign: "center" }}>
        You’ll get a 7‑day free trial. Card required. Cancel anytime.
      </div>
    </form>
  );
}

