# IIML Secure Visitor Access Platform (SVAP)

**Zero friction for legitimate visitors. Maximum control for campus security.**

MVP Phase 1 implementation of the IIML campus visitor access platform per PRD.

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
