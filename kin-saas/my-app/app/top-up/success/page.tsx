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

export default async function TopUpSuccessPage({ searchParams }: PageProps) {
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
    `${baseUrl}/api/stripe/topup-session?sessionId=${encodeURIComponent(sessionId)}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as
    | { ok: true; creditsAdded: number; balance: number }
    | { error?: string };

  if (!res.ok || !("ok" in data)) {
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
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Top up not applied yet</h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 18 }}>
            {("error" in data && data.error) || "We couldn’t confirm your payment."}
          </p>
          <div style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 18 }}>
            Try refreshing this page once. If it still fails, wait ~30 seconds and try again.
          </div>
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
      <div style={{ maxWidth: 620, width: "100%" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10 }}>Top up complete</h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 10 }}>
          Added <strong style={{ color: "#fafafa" }}>{data.creditsAdded}</strong> credits.
        </p>
        <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 18 }}>
          Your balance is now <strong style={{ color: "#fafafa" }}>{data.balance}</strong>. You can return to Telegram
          and keep chatting.
        </p>
        <a href="/" style={{ color: "#a78bfa" }}>
          Back to home
        </a>
      </div>
    </main>
  );
}
