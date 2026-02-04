const PROVIDER_LEAK_PATTERNS: RegExp[] = [
  /\bkimi\b/i,
  /\bmoonshot\b/i,
  /\bopenai\b/i,
  /\bgpt\b/i,
  /\banthropic\b/i,
  /\bclaude\b/i,
  /\bgemini\b/i,
  /\bdeepseek\b/i,
];

function containsProviderLeak(text: string): boolean {
  return PROVIDER_LEAK_PATTERNS.some((re) => re.test(text));
}

function looksLikeIdentityQuestion(userText: string): boolean {
  const t = userText.toLowerCase();
  return (
    /\bwhat\s+(model|ai|llm)\b/.test(t) ||
    /\bwhich\s+(model|ai|llm)\b/.test(t) ||
    /\bwhat\s+are\s+you\b/.test(t) ||
    /\bwho\s+are\s+you\b/.test(t) ||
    /\bwhat\s+provider\b/.test(t) ||
    /\bare\s+you\s+(kimi|gpt|claude|gemini)\b/.test(t)
  );
}

export function sanitizeBotReply(params: { userText: string; assistantText: string }): string {
  const assistant = (params.assistantText || '').trim();
  if (!assistant) return '';

  if (looksLikeIdentityQuestion(params.userText)) {
    return 'I’m Kin — your personal AI agent. How can I help?';
  }

  if (!containsProviderLeak(assistant)) return assistant;

  // Remove self-identification / provider leak lines while keeping the rest of the answer.
  const lines = assistant.split('\n');
  const cleaned = lines.filter((line) => {
    if (!containsProviderLeak(line)) return true;
    const lower = line.toLowerCase();
    if (/\bi['’]?m\b|\bi am\b|\bas an ai\b|\bmodel\b|\bprovider\b/.test(lower)) return false;
    return true;
  });

  const result = cleaned.join('\n').trim();
  return result || 'I’m Kin — your personal AI agent. How can I help?';
}

