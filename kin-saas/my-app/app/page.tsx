export default function Home() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Navigation */}
      <nav style={{ position: "fixed", top: 0, width: "100%", borderBottom: "1px solid #27272a", backgroundColor: "rgba(10,10,10,0.8)", backdropFilter: "blur(12px)", zIndex: 50 }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #6366f1, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: "bold", fontSize: "14px" }}>K</span>
            </div>
            <span style={{ fontWeight: 600, fontSize: "18px" }}>Kin</span>
          </div>
          <a href="#pricing" style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#f4f4f5", color: "#18181b", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Get Started</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ paddingTop: "128px", paddingBottom: "80px", paddingLeft: "16px", paddingRight: "16px", textAlign: "center" }}>
        <div style={{ maxWidth: "1024px", margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "9999px", backgroundColor: "#18181b", border: "1px solid #27272a", marginBottom: "32px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e" }}></span>
            <span style={{ fontSize: "14px", color: "#a1a1aa" }}>Now accepting early access</span>
          </div>

          <h1 style={{ fontSize: "56px", fontWeight: 700, lineHeight: 1.1, marginBottom: "24px" }}>
            The <span style={{ background: "linear-gradient(135deg, #6366f1, #9333ea)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Easy Button</span><br />for AI
          </h1>

          <p style={{ fontSize: "20px", color: "#a1a1aa", maxWidth: "576px", margin: "0 auto 32px" }}>
            Text Kin. It books your flights, calls your doctor, answers your emails, and manages your life. No apps. No learning. Just help.
          </p>

          <a href="#pricing" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "16px 32px", borderRadius: "12px", background: "linear-gradient(135deg, #4f46e5, #9333ea)", color: "white", textDecoration: "none", fontWeight: 500 }}>
            Start Your Free Trial →
          </a>

          <p style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}>14 days free • No credit card required</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: "80px 16px", borderTop: "1px solid #27272a" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: 700, marginBottom: "16px" }}>Kin has everything</h2>
            <p style={{ fontSize: "18px", color: "#a1a1aa" }}>One text. Infinite capabilities.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
            <div style={{ padding: "32px", borderRadius: "16px", backgroundColor: "rgba(24,24,27,0.5)", border: "1px solid #27272a" }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>🖱️</div>
              <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>It has Hands</h3>
              <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>Kin can click, type, and navigate any website. Book flights on Expedia. Shop on Amazon. Fill out forms.</p>
            </div>

            <div style={{ padding: "32px", borderRadius: "16px", backgroundColor: "rgba(24,24,27,0.5)", border: "1px solid #27272a" }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>📞</div>
              <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>It has a Voice</h3>
              <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>Kin makes real phone calls. It calls restaurants for reservations, doctors for appointments, and customer service.</p>
            </div>

            <div style={{ padding: "32px", borderRadius: "16px", backgroundColor: "rgba(24,24,27,0.5)", border: "1px solid #27272a" }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>🔑</div>
              <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>It has Keys</h3>
              <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>Kin connects to your Gmail, Calendar, and apps securely. It reads emails, schedules meetings, and manages your digital life.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: "80px 16px", borderTop: "1px solid #27272a" }}>
        <div style={{ maxWidth: "448px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "36px", fontWeight: 700, marginBottom: "16px" }}>Simple pricing</h2>
          <p style={{ fontSize: "18px", color: "#a1a1aa", marginBottom: "48px" }}>One plan. Everything included.</p>

          <div style={{ padding: "32px", borderRadius: "16px", backgroundColor: "#18181b", border: "1px solid #27272a", textAlign: "left" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <p style={{ fontSize: "14px", color: "#71717a", marginBottom: "8px" }}>Kin Unlimited</p>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "8px" }}>
                <span style={{ fontSize: "48px", fontWeight: 700 }}>$29</span>
                <span style={{ color: "#71717a" }}>/month</span>
              </div>
            </div>

            <ul style={{ listStyle: "none", margin: "0 0 32px 0", padding: 0 }}>
              {[
                "Unlimited messages",
                "WhatsApp & Telegram access",
                "Web browsing & automation",
                "Phone calls (fair use)",
                "Gmail & Calendar integration",
                "Priority support",
              ].map((feature) => (
                <li key={feature} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "#d4d4d8" }}>
                  <span style={{ color: "#22c55e" }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "linear-gradient(135deg, #4f46e5, #9333ea)", color: "white", border: "none", fontSize: "16px", fontWeight: 500, cursor: "pointer" }}>
              Start Free Trial
            </button>
            <p style={{ textAlign: "center", marginTop: "16px", fontSize: "14px", color: "#71717a" }}>14 days free • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "48px 16px", borderTop: "1px solid #27272a" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #6366f1, #9333ea)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: "bold", fontSize: "12px" }}>K</span>
            </div>
            <span style={{ fontWeight: 500 }}>Kin</span>
          </div>
          <p style={{ fontSize: "14px", color: "#71717a" }}>© 2026 Kin. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
