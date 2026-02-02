"use client";

import { useState } from "react";
import { MessageCircle, Phone, Key, Copy, Check, LogOut } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [copied, setCopied] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [telegramConnected, setTelegramConnected] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("https://kin.ai/start");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-semibold">Kin</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm">
              ● Active
            </span>
            <Link href="/" className="text-zinc-400 hover:text-zinc-200">
              <LogOut className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-zinc-400">Your AI assistant is ready to help.</p>
        </div>

        {/* Connection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* WhatsApp */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-zinc-500">{whatsappConnected ? "Connected" : "Not connected"}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${whatsappConnected ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                {whatsappConnected ? "Active" : "Setup"}
              </span>
            </div>

            {!whatsappConnected ? (
              <div className="text-center">
                <div className="w-48 h-48 mx-auto mb-4 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <p className="text-zinc-500 text-sm">QR Code will appear here</p>
                </div>
                <p className="text-sm text-zinc-400 mb-4">Scan with WhatsApp to connect</p>
                <button
                  onClick={() => setWhatsappConnected(true)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
                >
                  Simulate Connection
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <p className="font-medium">Your Phone</p>
                    <p className="text-sm text-zinc-500">+1 (555) 123-4567</p>
                  </div>
                </div>
                <button
                  onClick={() => setWhatsappConnected(false)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Telegram */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Telegram</p>
                  <p className="text-sm text-zinc-500">{telegramConnected ? "Connected" : "Not connected"}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${telegramConnected ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                {telegramConnected ? "Active" : "Setup"}
              </span>
            </div>

            {!telegramConnected ? (
              <div className="text-center">
                <a
                  href="https://t.me/KinAssistantBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
                >
                  Open Telegram
                </a>
                <p className="text-sm text-zinc-400 mt-4">Click to start chatting with Kin</p>
                <button
                  onClick={() => setTelegramConnected(true)}
                  className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
                >
                  Simulate Connection
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <p className="font-medium">@username</p>
                    <p className="text-sm text-zinc-500">Telegram User</p>
                  </div>
                </div>
                <button
                  onClick={() => setTelegramConnected(false)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <MessageCircle className="w-6 h-6 text-indigo-400 mb-3" />
            <p className="font-medium mb-1">Messages</p>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-zinc-500">this month</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <Phone className="w-6 h-6 text-purple-400 mb-3" />
            <p className="font-medium mb-1">Calls</p>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-zinc-500">this month</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <Key className="w-6 h-6 text-pink-400 mb-3" />
            <p className="font-medium mb-1">Tasks</p>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-zinc-500">completed</p>
          </div>
        </div>

        {/* Referral */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20">
          <h3 className="font-medium mb-2">Share Kin with friends</h3>
          <p className="text-zinc-400 text-sm mb-4">Give them 50% off their first month</p>

          <div className="flex gap-2">
            <input
              type="text"
              value="https://kin.ai/start"
              readOnly
              className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
