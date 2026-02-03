export const dynamic = "force-dynamic";

export default function TopUpSuccessPage() {
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
        <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 18 }}>
          Your credits have been added. You can return to Telegram and keep chatting.
        </p>
        <a href="/" style={{ color: "#a78bfa" }}>
          Back to home
        </a>
      </div>
    </main>
  );
}

