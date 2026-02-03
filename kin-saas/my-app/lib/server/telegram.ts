type TelegramApiResponse<T> = { ok: boolean; result: T };

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN');
  return token;
}

function apiUrl() {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

export async function telegramGetMe(): Promise<{ id: number; username?: string } | null> {
  try {
    const res = await fetch(`${apiUrl()}/getMe`, { method: 'POST' });
    const data = (await res.json()) as TelegramApiResponse<{ id: number; username?: string }>;
    return data.ok ? data.result : null;
  } catch {
    return null;
  }
}

export async function telegramSendMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl()}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = (await res.json()) as TelegramApiResponse<unknown>;
    return !!data.ok;
  } catch {
    return false;
  }
}

export function parseStartCommand(text?: string) {
  if (!text) return { isCommand: false as const };
  const match = text.trim().match(/^\/start(?:\s+(.+))?$/i);
  if (!match) return { isCommand: false as const };
  const param = match[1]?.trim();
  return { isCommand: true as const, param: param || undefined };
}

