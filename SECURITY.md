# Security Policy

This document outlines security practices for Kin SaaS.

## Reporting Security Issues

If you discover a security vulnerability, please email security@kin-saas.com instead of creating a public issue.

## Security Measures

### Authentication

- Clerk handles all authentication
- JWT tokens with short expiry
- Secure session management
- OAuth providers (Google, GitHub) supported

### Authorization

- Row Level Security (RLS) on all database tables
- Role-based access control
- Subscription tier-based feature access

### Data Protection

- All data encrypted at rest (Supabase)
- TLS 1.3 for data in transit
- API keys stored as environment variables
- No sensitive data in logs

### API Security

- Rate limiting on all endpoints
- Input sanitization
- CORS properly configured
- Security headers (CSP, HSTS, etc.)

### Payment Security

- PCI compliance via Stripe
- No card data stored locally
- Webhook signature verification
- Idempotency keys for payments

### Infrastructure

- Vercel edge network
- Supabase managed database
- Sentry error monitoring
- Automated security scans via GitHub Actions

## Security Checklist

### Before Production

- [ ] All environment variables set
- [ ] Stripe webhooks configured
- [ ] Clerk webhooks configured
- [ ] RLS policies verified
- [ ] Rate limits configured
- [ ] CORS origins restricted
- [ ] Security headers enabled
- [ ] SSL/TLS configured
- [ ] Sentry monitoring active

### Regular Maintenance

- [ ] Dependency updates (monthly)
- [ ] Security audit (quarterly)
- [ ] Penetration testing (annually)
- [ ] Access review (quarterly)

## Security Headers

The following headers are set on all responses:

```
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Compliance

- GDPR compliant (data deletion supported)
- SOC 2 Type II (via Stripe/Supabase)
- PCI DSS (via Stripe)
