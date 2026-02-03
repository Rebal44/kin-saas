import { CheckoutForm } from "./CheckoutForm";

export default function Home() {
  return (
    <div>
      <header className="nav">
        <div className="container navInner">
          <div className="brand">
            <div className="logo">K</div>
            <span>Kin</span>
          </div>
          <a className="button buttonSoft" href="#start">
            Subscribe
          </a>
        </div>
      </header>

      <main className="hero">
        <div className="container">
          <div className="badge">
            <span className="dot" />
            Simple setup: pay, connect Telegram, done.
          </div>

          <h1 className="h1">Your AI, inside Telegram</h1>
          <p className="lead">
            Subscribe for $29/month, then connect Telegram in one click. After that, just message the bot.
          </p>

          <div id="start" className="panel" style={{ maxWidth: 720, margin: "0 auto" }}>
            <div className="panelTitle">Kin Pro</div>
            <div className="priceRow">
              <div className="price">$29</div>
              <div className="per">/ month · 7‑day free trial</div>
            </div>
            <CheckoutForm />
            <div className="finePrint">After checkout you’ll be taken to a “Connect Telegram” page.</div>
          </div>
        </div>
      </main>

      <section className="section">
        <div className="container">
          <div className="sectionHeader">
            <h2 className="h2">How it works</h2>
            <p style={{ color: "var(--muted)" }}>Three steps. No setup wizard.</p>
          </div>

          <div className="cards">
            {[
              { title: "Subscribe", body: "Pay $29/month (7‑day free trial)." },
              { title: "Connect Telegram", body: "Click the link on the success page and tap Start." },
              { title: "Chat", body: "Send messages in Telegram. Replies come back instantly." },
            ].map((item) => (
              <div key={item.title} className="card">
                <div className="cardTitle">{item.title}</div>
                <div className="cardBody">{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footerInner">
          <div className="brand" style={{ fontSize: 16 }}>
            <div className="logo" style={{ width: 24, height: 24, borderRadius: 8, fontSize: 12 }}>
              K
            </div>
            <span>Kin</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-2)" }}>© 2026 Kin. All rights reserved.</p>
          <a href="/top-up" style={{ fontSize: 13 }}>
            Top up credits
          </a>
        </div>
      </footer>
    </div>
  );
}
