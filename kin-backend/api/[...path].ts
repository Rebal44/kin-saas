import app from '../src/app';

// Vercel Serverless Function catch-all entrypoint.
// This allows Express to handle routes like /api/health, /api/webhooks/*, etc.
export default app;

