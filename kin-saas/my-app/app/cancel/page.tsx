export default function CancelPage() {
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
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Checkout canceled</h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 18 }}>
          No worries — nothing was charged. You can try again any time.
        </p>
        <a href="/" style={{ color: "#a78bfa" }}>
          Back to home
        </a>
      </div>
    </main>
  );
}

