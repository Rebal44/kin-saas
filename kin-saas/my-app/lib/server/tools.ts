type ToolResult = { ok: true; content: string } | { ok: false; error: string };

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any) => Promise<ToolResult>;
};

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ ok: false, error: 'Could not serialize tool result' });
  }
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const res = await fetch(url, { cache: 'no-store', signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text?.slice(0, 500) };
  }
  if (!res.ok) {
    const msg = data?.reason || data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function formatWeather(params: {
  name: string;
  country?: string;
  admin1?: string;
  timezone?: string;
  current?: any;
}): string {
  const place = [params.name, params.admin1, params.country].filter(Boolean).join(', ');
  const c = params.current || {};

  const lines: string[] = [];
  lines.push(`Current weather for ${place}${params.timezone ? ` (${params.timezone})` : ''}:`);
  if (c.temperature_2m !== undefined) lines.push(`- Temperature: ${c.temperature_2m}°C`);
  if (c.relative_humidity_2m !== undefined) lines.push(`- Humidity: ${c.relative_humidity_2m}%`);
  if (c.wind_speed_10m !== undefined) lines.push(`- Wind: ${c.wind_speed_10m} km/h`);
  if (c.precipitation !== undefined) lines.push(`- Precipitation: ${c.precipitation} mm`);

  return lines.join('\n');
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'get_current_weather',
    description:
      'Get current weather for a given location name (city/region/country). Returns temperature, humidity, wind, precipitation when available.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Location name, e.g. "Taipei", "Taiwan", "New York"' },
      },
      required: ['location'],
      additionalProperties: false,
    },
    execute: async (args: any) => {
      const location = String(args?.location || '').trim();
      if (location.length > 120) return { ok: false, error: 'location is too long' };
      if (!location) return { ok: false, error: 'location is required' };

      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          location
        )}&count=1&language=en&format=json`;
        const geo = await fetchJson(geoUrl);
        const first = geo?.results?.[0];
        if (!first?.latitude || !first?.longitude) {
          return { ok: false, error: `Could not find location: ${location}` };
        }

        const forecastUrl =
          `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
            String(first.latitude)
          )}` +
          `&longitude=${encodeURIComponent(String(first.longitude))}` +
          `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m` +
          `&timezone=auto`;

        const forecast = await fetchJson(forecastUrl);
        const content = formatWeather({
          name: first.name,
          country: first.country,
          admin1: first.admin1,
          timezone: forecast?.timezone,
          current: forecast?.current,
        });

        return { ok: true, content };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Weather tool failed' };
      }
    },
  },
  {
    name: 'get_time',
    description: 'Get the current time in an IANA timezone (e.g. "Asia/Taipei", "America/Los_Angeles").',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'IANA timezone, e.g. "Asia/Taipei"' },
      },
      required: ['timezone'],
      additionalProperties: false,
    },
    execute: async (args: any) => {
      const timezone = String(args?.timezone || '').trim();
      if (timezone.length > 80) return { ok: false, error: 'timezone is too long' };
      if (!timezone) return { ok: false, error: 'timezone is required' };
      try {
        const now = new Date();
        const text = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(now);
        return { ok: true, content: `${text} (${timezone})` };
      } catch {
        return { ok: false, error: `Invalid timezone: ${timezone}` };
      }
    },
  },
];

export function getChatToolsSpec() {
  return TOOLS.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export async function executeToolByName(
  name: string,
  args: any
): Promise<{ ok: true; content: string } | { ok: false; content: string }> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { ok: false, content: safeJsonStringify({ ok: false, error: `Unknown tool: ${name}` }) };

  const result = await tool.execute(args);
  if (result.ok) return { ok: true, content: result.content };
  return { ok: false, content: safeJsonStringify({ ok: false, error: result.error }) };
}
