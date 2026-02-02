"use client";

import { useState } from "react";
import { MessageCircle, Phone, Key, ArrowRight, Check } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-semibold text-lg">Kin</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-zinc-200 transition">Features</a>
            <a href="#pricing" className="hover:text-zinc-200 transition">Pricing</a>
          </div>
          <a
            href="/auth/sign-up"
            className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-zinc-400">Now accepting early access</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            The{" "}
            <span className="gradient-text">Easy Button</span>
            <br />
            for AI
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Text Kin. It books your flights, calls your doctor, answers your emails, 
            and manages your life. No apps. No learning. Just help.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/auth/sign-up"
              className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition"
            >
              Start Your Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </a>
            <span className="text-sm text-zinc-500">14 days free • No credit card required</span>
          </div>

          {/* Chat Preview */}
          <div className="mt-16 max-w-md mx-auto">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 glow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold">K</span>
                </div>
                <div>
                  <p className="font-medium">Kin</p>
                  <p className="text-xs text-zinc-500">Online</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="bg-indigo-600 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm">My hip hurts. Call Dr. Smith and get me an appointment for Tuesday morning.</p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm text-zinc-200">Calling Dr. Smith's office now... ☎️</p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm text-zinc-200">✅ You're booked for 10:00 AM Tuesday. I put it on your calendar.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            AI is powerful.<br />
            <span className="text-zinc-500">But getting it to work is a nightmare.</span>
          </h2>

          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            {[
              "Install 5 different apps",
              "Learn prompt engineering",
              "Connect APIs manually",
              "Remember 20 passwords",
              "Switch between tools",
              "Still do it yourself",
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-500">
                ❌ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Kin has everything</h2>
            <p className="text-zinc-400">One text. Infinite capabilities.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 gradient-bg">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">It has Hands</h3>
              <p className="text-zinc-400">
                Kin can click, type, and navigate any website. Book flights on Expedia. 
                Shop on Amazon. Fill out forms. It uses the web like you do.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 gradient-bg">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6">
                <Phone className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">It has a Voice</h3>
              <p className="text-zinc-400">
                Kin makes real phone calls. It calls restaurants for reservations, 
                doctors for appointments, and customer service when you need help.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 gradient-bg">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-6">
                <Key className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">It has Keys</h3>
              <p className="text-zinc-400">
                Kin connects to your Gmail, Calendar, and apps securely. 
                It reads emails, schedules meetings, and manages your digital life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple pricing</h2>
          <p className="text-zinc-400 mb-12">One plan. Everything included.</p>

          <div className="max-w-md mx-auto p-8 rounded-2xl bg-zinc-900 border border-zinc-800 glow">
            <div className="text-center mb-8">
              <p className="text-sm text-zinc-500 mb-2">Kin Unlimited</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold">$29</span>
                <span className="text-zinc-500">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8 text-left">
              {[
                "Unlimited messages",
                "WhatsApp & Telegram access",
                "Web browsing & automation",
                "Phone calls (fair use)",
                "Gmail & Calendar integration",
                "Priority support",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-zinc-300">{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="/auth/sign-up"
              className="block w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition text-center"
            >
              Start Free Trial
            </a>

            <p className="mt-4 text-sm text-zinc-500">14 days free • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to meet Kin?</h2>
          <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
            Join thousands who've already replaced their apps, assistants, and 
            headaches with one simple text.
          </p>

          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition"
            >
              Get Started
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="font-medium">Kin</span>
          </div>

          <p className="text-sm text-zinc-500">© 2026 Kin. All rights reserved.</p>

          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
