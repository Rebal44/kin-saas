import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const sessionIdRaw = searchParams?.session_id;
  const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw;

  if (!sessionId) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 24,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div style={{ maxWidth: 560, width: "100%" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Missing session</h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 18 }}>
            This page needs a Stripe checkout session id (the “session_id” in the URL).
          </p>
          <a href="/" style={{ color: "#a78bfa" }}>
            Back to home
          </a>
        </div>
      </main>
    );
  }

  const baseUrl = await getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/stripe/checkout-session?sessionId=${encodeURIComponent(sessionId)}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as
    | { deepLink: string; appLink: string; botUsername: string; startCommand: string }
    | { error?: string };

  if (!res.ok || !("deepLink" in data)) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 24,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div style={{ maxWidth: 560, width: "100%" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Couldn’t connect</h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 18 }}>
            {("error" in data && data.error) || "We couldn’t resolve your checkout session."}
          </p>
          <a href="/" style={{ color: "#a78bfa" }}>
            Back to home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fafafa",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 24,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%" }}>
        <div
          style={{
            border: "1px solid #27272a",
            background: "rgba(24,24,27,0.5)",
            borderRadius: 16,
            padding: 22,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 850, marginBottom: 10 }}>Now connect Telegram</h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 18 }}>
            Tap the button below, then tap <strong>Start</strong> in Telegram.
          </p>

          <a
            href={data.appLink}
            style={{
              display: "inline-block",
              padding: "14px 18px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #4f46e5, #9333ea)",
              color: "white",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Open Telegram app
          </a>

          <div style={{ marginTop: 14, color: "#71717a", fontSize: 13 }}>
            Bot: @{data.botUsername}
          </div>

          <div style={{ marginTop: 10, fontSize: 13 }}>
            <a href={data.deepLink} style={{ color: "#a78bfa" }} target="_blank" rel="noreferrer">
              Open in browser instead
            </a>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #27272a" }}>
            <div style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 8 }}>
              If Telegram doesn’t open or “Start bot” does nothing, send this message to the bot:
            </div>
            <code style={{ display: "inline-block", padding: "8px 10px", borderRadius: 10, background: "#0b0b0c", border: "1px solid #27272a" }}>
              {data.startCommand}
            </code>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <a href="/" style={{ color: "#a78bfa" }}>
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
