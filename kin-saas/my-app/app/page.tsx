import { CheckoutForm } from "./CheckoutForm";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <nav
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          borderBottom: "1px solid #27272a",
          backgroundColor: "rgba(10,10,10,0.8)",
          backdropFilter: "blur(8px)",
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 16px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #9333ea)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>K</span>
            </div>
            <span style={{ fontWeight: 650, fontSize: 18 }}>Kin</span>
          </div>
          <a
            href="#start"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              backgroundColor: "#f4f4f5",
              color: "#18181b",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Subscribe
          </a>
        </div>
      </nav>

      <section
        style={{
          paddingTop: 120,
          paddingBottom: 72,
          paddingLeft: 16,
          paddingRight: 16,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 9999,
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              marginBottom: 28,
              color: "#a1a1aa",
              fontSize: 14,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e" }} />
            Simple setup: pay, connect Telegram, done.
          </div>

          <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.05, marginBottom: 18 }}>
            Your AI, inside Telegram
          </h1>

          <p style={{ fontSize: 18, color: "#a1a1aa", maxWidth: 720, margin: "0 auto 28px" }}>
            Subscribe for $29/month, then connect Telegram in one click. After that, just message the bot.
          </p>

          <div id="start" style={{ maxWidth: 640, margin: "0 auto" }}>
            <CheckoutForm />
          </div>

          <div style={{ marginTop: 24, color: "#71717a", fontSize: 13 }}>
            After checkout you’ll be taken to a “Connect Telegram” page.
          </div>
        </div>
      </section>

      <section style={{ padding: "64px 16px", borderTop: "1px solid #27272a" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 750, marginBottom: 10 }}>How it works</h2>
            <p style={{ color: "#a1a1aa" }}>Three steps. No setup wizard.</p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
            {[
              { title: "Subscribe", body: "Pay $29/month (7‑day free trial)." },
              { title: "Connect Telegram", body: "Click the link on the success page and tap Start." },
              { title: "Chat", body: "Send messages in Telegram. Replies come back instantly." },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  flex: "1 1 260px",
                  maxWidth: 360,
                  padding: 22,
                  borderRadius: 16,
                  backgroundColor: "rgba(24,24,27,0.5)",
                  border: "1px solid #27272a",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
                <div style={{ color: "#a1a1aa", lineHeight: 1.6 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ padding: "40px 16px", borderTop: "1px solid #27272a" }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                background: "linear-gradient(135deg, #6366f1, #9333ea)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontWeight: 800, fontSize: 12 }}>K</span>
            </div>
            <span style={{ fontWeight: 600 }}>Kin</span>
          </div>
          <p style={{ fontSize: 13, color: "#71717a" }}>© 2026 Kin. All rights reserved.</p>
          <a href="/top-up" style={{ color: "#a78bfa", fontSize: 13 }}>
            Top up credits
          </a>
        </div>
      </footer>
    </div>
  );
}
