# IIML Secure Visitor Access Platform (SVAP)

The **IIML Secure Visitor Access Platform (SVAP)** is a comprehensive campus security solution designed to manage and monitor visitor entry and exit at IIM Lucknow. Built as a Phase 1 MVP, it replaces traditional paper-based logs with a modern, fast, and secure digital auditing system.

The application features three specialized portals:
1. **Guard Tablet (`/guard`)**: A single-screen PWA interface for campus gates enabling real-time QR code scanning, phone-number-based lookups, emergency entry logging, and incident reporting.
2. **Host Portal (`/host`)**: An interface for hosts (students, faculty, administrative staff) to pre-register planned visitors, review and approve unplanned visitor access requests in real-time, and view visitor logs.
3. **Admin Dashboard (`/admin`)**: A centralized management panel for security administrators to monitor real-time campus occupancy, view detailed override audits, manage blacklists, and generate passes for bulk events.

### Core Mechanisms
- **Dynamic Security Passes**: Visitors receive secure QR codes generated using HMAC-SHA256 signatures that automatically rotate every 30 seconds to prevent replay attacks.
- **Verification Engine**: Instantly checks visitors against custom rules and blacklists, returning verification states (GREEN, YELLOW, RED).
- **Authentication**: Secured with HTTP-only JWT cookies for administrators, guards, and hosts, using simulated OTPs in development mode.
- **Resilient Infrastructure**: Constructed using Next.js 15, Prisma ORM, and PostgreSQL, designed to run seamlessly on Vercel with automatic schema synchronization and offline client caching.

## Quick Start

```bash
cd ~/Projects/iiml-svap
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Credentials

| Role | Login |
|------|-------|
| **Security Guard** | Guard ID `G001`, PIN `1234` |
| **Supervisor** | Guard ID `S001`, PIN `1234` |
| **Host** | `arjun.mehta@iiml.ac.in` — OTP shown on screen in dev mode |
| **Admin** | `admin@iiml.ac.in` / `admin123` |

## Three Interfaces

1. **Guard Tablet** (`/guard`) — Primary interface. Scan QR, phone lookup, emergency entry, exit logging, incident reports. Single-screen, large buttons, PWA-ready.
2. **Host Portal** (`/host`) — Register planned visitors, approve unplanned requests, view history.
3. **Admin Dashboard** (`/admin`) — Live occupancy, override audit, blacklist, bulk event passes, analytics.

**Visitor QR Pass** — `/visitor/[passId]` — Dynamic QR refreshes every 30 seconds.

## MVP Features (Phase 1)

- Planned visitor registration with dynamic QR passes
- Unplanned visitor phone lookup + host approval (<10 min expiry)
- Security verification engine (GREEN / RED / YELLOW)
- Entry and exit logging with occupancy tracking
- Emergency entry with mandatory audit log
- Manual/supervisor override with audit trail
- Incident reporting
- Blacklist management
- Bulk event pass generation
- Offline cache for approved passes (service worker)
- Full audit log

## Assumptions Made

| Area | Assumption |
|------|------------|
| **Host auth** | `@iiml.ac.in` email + OTP (simulated in dev) |
| **Guard auth** | Guard ID + 4-digit PIN on shared tablets |
| **Admin auth** | Email + password |
| **Campus** | 3 gates: Main Gate, Hostel Gate, Admin Block |
| **QR security** | HMAC-signed tokens, 30s rotation, single-use on entry |
| **Offline** | Service worker caches approved passes; sync on reconnect |
| **No smartphone** | OTP sent to visitor phone (simulated in dev) |
| **Data retention** | 90-day policy (not auto-purged in MVP) |
| **Supervisor** | S001 can override after host timeout |
| **Database** | SQLite for easy local setup (swap to PostgreSQL for production) |

## Architecture

- **Frontend:** Next.js 15 App Router, React 19, Tailwind CSS 4
- **Backend:** Next.js API routes
- **Database:** SQLite + Prisma ORM
- **Auth:** JWT HTTP-only cookies
- **QR:** HMAC-SHA256 signed tokens with 30-second windows

## Performance Targets

| Metric | Target |
|--------|--------|
| Verification response | < 3 sec |
| Gate processing | < 8 sec |
| Host approval window | 10 min (auto-expire) |
| Override rate KPI | < 3% |

## End-to-End Test Flow

1. **Planned visitor:** Host registers visitor → open `/visitor/[passId]` → Guard scans QR → GREEN → Allow Entry
2. **Unplanned:** Guard enters phone → selects host → Request Approval → Host approves → Guard verifies → Entry
3. **Emergency:** Guard → Emergency tab → enter reason → immediate entry + audit log
4. **Admin:** View live occupancy, review overrides, add blacklist entry

## Production Checklist

- [ ] Switch to PostgreSQL
- [ ] Set strong `JWT_SECRET` and `QR_SECRET`
- [ ] Integrate real SMS (MSG91/Twilio) for OTP
- [ ] Add HTTPS and secure cookie settings
- [ ] Deploy guard tablets as installed PWA
- [ ] Connect push notifications for host approvals

## License

Private — IIM Lucknow internal use.
