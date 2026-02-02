export default function Home() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, width: "100%", borderBottom: "1px solid #27272a", backgroundColor: "rgba(10,10,10,0.8)", zIndex: 50 }}>
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
            The <span style={{ color: "#6366f1" }}>Easy Button</span><br />for AI
          </h1>

          <p style={{ fontSize: "20px", color: "#a1a1aa", maxWidth: "576px", margin: "0 auto 32px" }}>
            Text Kin. It books your flights, calls your doctor, answers your emails, and manages your life.
          </p>

          <a href="#pricing" style={{ display: "inline-block", padding: "16px 32px", borderRadius: "12px", background: "linear-gradient(135deg, #4f46e5, #9333ea)", color: "white", textDecoration: "none", fontWeight: 500 }}>
            Start Your Free Trial
          </a>

          <p style={{ fontSize: "14px", color: "#71717a", marginTop: "16px" }}>14 days free • No credit card required</p>
        </div>
      </section>
    </div>
  );
}
