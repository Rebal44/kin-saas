"use client";

import { useState } from "react";

type Result =
  | null
  | { deepLink: string; appLink: string; botUsername: string }
  | { error: string };

export default function ConnectPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setResult({ error: "Please enter a valid email." });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data?.error || "Could not generate connect link.");

      setResult({
        deepLink: data.deepLink,
        appLink: data.appLink,
        botUsername: data.botUsername,
      });
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Could not generate connect link." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="h2" style={{ textAlign: "left" }}>
          Connect Telegram
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Enter the email you used at checkout. We’ll generate a one‑click Telegram connect link.
        </p>

        <div className="panel" style={{ marginTop: 16 }}>
          <form onSubmit={onSubmit}>
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
                style={{ minWidth: 210, opacity: isLoading ? 0.85 : 1 }}
              >
                {isLoading ? "Generating…" : "Generate link"}
              </button>
            </div>
          </form>

          {result && "error" in result ? (
            <div className="error" style={{ textAlign: "left" }}>
              {result.error}
            </div>
          ) : null}

          {result && !("error" in result) ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ color: "var(--muted)", marginBottom: 10 }}>
                Bot: <strong>@{result.botUsername}</strong>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="button buttonPrimary" href={result.appLink}>
                  Open Telegram app
                </a>
                <a className="button buttonSoft" href={result.deepLink} target="_blank" rel="noreferrer">
                  Open in browser
                </a>
              </div>
              <div className="finePrint">
                After you tap Start, come back to Telegram and send any message like <code>hi</code>.
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 16 }}>
          <a href="/">Back to home</a>
        </div>
      </div>
    </main>
  );
}

