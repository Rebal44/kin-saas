import { TopUpForm } from "../TopUpForm";

export default function TopUpPage() {
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
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10 }}>Top up credits</h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.6, marginBottom: 18 }}>
          Enter the email you used at checkout. We’ll add credits immediately after payment.
        </p>
        <TopUpForm />
        <div style={{ marginTop: 16 }}>
          <a href="/" style={{ color: "#a78bfa" }}>
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}

