"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, Check } from "lucide-react";

interface QRCodeDisplayProps {
  type: "whatsapp" | "telegram";
  userId: string;
}

export function QRCodeDisplay({ type, userId }: QRCodeDisplayProps) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate QR code data
    // In production, this would be fetched from your backend
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const data = `${baseUrl}/api/connect/${type}?user=${userId}`;
    setQrData(data);
  }, [type, userId]);

  const handleCopy = async () => {
    if (qrData) {
      await navigator.clipboard.writeText(qrData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    // In production, this would regenerate the QR code
    setQrData((prev) => prev ? prev + "&refresh=" + Date.now() : null);
  };

  const botName = type === "whatsapp" ? "Kin WhatsApp Bot" : "Kin Telegram Bot";
  const botHandle = type === "whatsapp" ? "+1 (555) 123-4567" : "@KinAssistantBot";

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white p-6 rounded-xl border-2 border-dashed border-gray-200">
        {qrData ? (
          <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            {/* Placeholder for QR code - in production, use a QR code library */}
            <div className="text-center">
              <div className="w-32 h-32 bg-black mx-auto mb-2 flex items-center justify-center rounded">
                <span className="text-white text-xs">QR CODE</span>
              </div>
              <p className="text-xs text-gray-500">Scan to connect</p>
            </div>
          </div>
        ) : (
          <div className="w-48 h-48 bg-gray-50 rounded-lg flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="font-medium text-gray-900">{botName}</p>
        <p className="text-sm text-gray-500">{botHandle}</p>
      </div>

      <div className="flex space-x-2 w-full">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" /> Copy Link
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
    </div>
  );
}
