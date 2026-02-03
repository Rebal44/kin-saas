export function getRequestOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host');

  if (!host) return 'http://localhost:3000';
  return `${proto}://${host}`;
}

