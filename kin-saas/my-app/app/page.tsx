export default function Home() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kin - The Easy Button for AI</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fafafa; }
          .gradient-text { background: linear-gradient(135deg, #6366f1, #9333ea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .btn { display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #9333ea); color: white; text-decoration: none; font-weight: 500; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <nav style="position:fixed;top:0;width:100%;border-bottom:1px solid #27272a;background:rgba(10,10,10,0.8);backdrop-filter:blur(12px);z-index:50;">
          <div style="max-width:1280px;margin:0 auto;padding:0 16px;height:64px;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#9333ea);display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-weight:bold;font-size:14px;">K</span>
              </div>
              <span style="font-weight:600;font-size:18px;">Kin</span>
            </div>
            <a href="#pricing" class="btn" style="padding:8px 16px;font-size:14px;">Get Started</a>
          </div>
        </nav>

        <section style="padding:128px 16px 80px;text-align:center;">
          <div style="max-width:1024px;margin:0 auto;">
            <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:9999px;background:#18181b;border:1px solid #27272a;margin-bottom:32px;">
              <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;"></span>
              <span style="font-size:14px;color:#a1a1aa;">Now accepting early access</span>
            </div>

            <h1 style="font-size:56px;font-weight:700;line-height:1.1;margin-bottom:24px;">
              The <span class="gradient-text">Easy Button</span><br>for AI
            </h1>

            <p style="font-size:20px;color:#a1a1aa;max-width:576px;margin:0 auto 32px;">
              Text Kin. It books your flights, calls your doctor, answers your emails, and manages your life. No apps. No learning. Just help.
            </p>

            <a href="#pricing" class="btn">Start Your Free Trial →</a>
            <p style="font-size:14px;color:#71717a;margin-top:16px;">14 days free • No credit card required</p>
          </div>
        </section>

        <section id="features" style="padding:80px 16px;border-top:1px solid #27272a;">
          <div style="max-width:1152px;margin:0 auto;">
            <div style="text-align:center;margin-bottom:64px;">
              <h2 style="font-size:36px;font-weight:700;margin-bottom:16px;">Kin has everything</h2>
              <p style="font-size:18px;color:#a1a1aa;">One text. Infinite capabilities.</p>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:32px;">
              <div style="padding:32px;border-radius:16px;background:rgba(24,24,27,0.5);border:1px solid #27272a;">
                <div style="font-size:24px;margin-bottom:16px;">🖱️</div>
                <h3 style="font-size:20px;font-weight:600;margin-bottom:12px;">It has Hands</h3>
                <p style="color:#a1a1aa;line-height:1.6;">Kin can click, type, and navigate any website. Book flights on Expedia. Shop on Amazon. Fill out forms.</p>
              </div>
              <div style="padding:32px;border-radius:16px;background:rgba(24,24,27,0.5);border:1px solid #27272a;">
                <div style="font-size:24px;margin-bottom:16px;">📞</div>
                <h3 style="font-size:20px;font-weight:600;margin-bottom:12px;">It has a Voice</h3>
                <p style="color:#a1a1aa;line-height:1.6;">Kin makes real phone calls. It calls restaurants for reservations, doctors for appointments, and customer service.</p>
              </div>
              <div style="padding:32px;border-radius:16px;background:rgba(24,24,27,0.5);border:1px solid #27272a;">
                <div style="font-size:24px;margin-bottom:16px;">🔑</div>
                <h3 style="font-size:20px;font-weight:600;margin-bottom:12px;">It has Keys</h3>
                <p style="color:#a1a1aa;line-height:1.6;">Kin connects to your Gmail, Calendar, and apps securely. It reads emails, schedules meetings, and manages your digital life.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" style="padding:80px 16px;border-top:1px solid #27272a;">
          <div style="max-width:448px;margin:0 auto;text-align:center;">
            <h2 style="font-size:36px;font-weight:700;margin-bottom:16px;">Simple pricing</h2>
            <p style="font-size:18px;color:#a1a1aa;margin-bottom:48px;">One plan. Everything included.</p>

            <div style="padding:32px;border-radius:16px;background:#18181b;border:1px solid #27272a;text-align:left;">
              <div style="text-align:center;margin-bottom:32px;">
                <p style="font-size:14px;color:#71717a;margin-bottom:8px;">Kin Unlimited</p>
                <div style="display:flex;align-items:baseline;justify-content:center;gap:8px;">
                  <span style="font-size:48px;font-weight:700;">$29</span>
                  <span style="color:#71717a;">/month</span>
                </div>
              </div>

              <ul style="list-style:none;margin:0 0 32px 0;padding:0;">
                <li style="display:flex;align-items:center;gap:12px;margin-bottom:12px;color:#d4d4d8;"><span style="color:#22c55e;">✓</span> Unlimited messages</li>
                <li style="display:flex;align-items:center;gap:12px;margin-bottom:12px;color:#d4d4d8;"><span style="color:#22c55e;">✓</span> WhatsApp & Telegram access</li>
                <li style="display:flex;align-items:center;gap:12px;margin-bottom:12px;color:#d4d4d8;"><span style="color:#22c55e;">✓</span> Web browsing & automation</li>
                <li style="display:flex;align-items:center;gap:12px;margin-bottom:12px;color:#d4d4d8;"><span style="color:#22c55e;">✓</span> Phone calls (fair use)</li>
                <li style="display:flex;align-items:center;gap:12px;margin-bottom:12px;color:#d4d4d8;"><span style="color:#22c55e;">✓</span> Gmail & Calendar integration</li>
                <li style="display:flex;align-items:center;gap:12px;margin-bottom:12px;color:#d4d4d8;"><span style="color:#22c55e;">✓</span> Priority support</li>
              </ul>

              <button class="btn" style="width:100%;">Start Free Trial</button>
              <p style="text-align:center;margin-top:16px;font-size:14px;color:#71717a;">14 days free • Cancel anytime</p>
            </div>
          </div>
        </section>

        <footer style="padding:48px 16px;border-top:1px solid #27272a;">
          <div style="max-width:1152px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:16px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:24px;height:24px;border-radius:6px;background:linear-gradient(135deg,#6366f1,#9333ea);display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-weight:bold;font-size:12px;">K</span>
              </div>
              <span style="font-weight:500;">Kin</span>
            </div>
            <p style="font-size:14px;color:#71717a;">© 2026 Kin. All rights reserved.</p>
          </div>
        </footer>
      </body>
      </html>
    `}} />
  );
}
