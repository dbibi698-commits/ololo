# MURSHID AUTO PRINT

Web ordering platform + Windows printer agent for a print shop.

## Build status (be honest about what exists)

| Phase | Area | Status |
|---|---|---|
| 1 | Project skeleton, SQLite schema + migrations, audit log | Done, tested |
| 1 | Admin login (scrypt, lockout, sessions, CSRF, optional TOTP) | Done, tested (service level) |
| 1 | Device registration, one-time API keys (hash only), revoke/regenerate/disable, heartbeat | Done, tested (service level) |
| 1 | Pricing engine (server-side, versioned) and settings (approval mode, cash toggle) | Done, tested |
| 1 | Admin UI: devices, QR code, settings, pricing, audit log; landing page; themes | Written, **not yet run in a browser** |
| 2 | Customer portal, uploads, validation, malware-scan hook, order tracking/cancel | Not started |
| 3 | Approval workflow, Razorpay/Cashfree payments, webhooks, cash confirmation | Not started |
| 4 | Print queue + leases, Electron agent, PDF/image printing | Not started |
| 5 | Photo Studio, PDF tools | Not started |
| 6 | Dashboard stats/reports, backup/restore, deployment files, installer | Not started |

`server.js` and the routes use Express, which could not be installed in the build
environment (no network), so the HTTP layer has only been syntax-checked. Run
`npm install` then `npm start` on your PC to verify it. The service layer is covered by 28 passing tests.

## Setup on Windows (VS Code)

1. Install Node.js LTS (22.13 or newer) and VS Code.
2. Open this folder in VS Code, then Terminal > New Terminal.
3. `npm install`
4. Copy `.env.example` to `.env`. Set `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD` (12+ chars, upper, lower, digit).
5. `npm run migrate`
6. `npm run create-admin` (then delete ADMIN_PASSWORD from `.env`)
7. `npm start` and open http://localhost:3000/admin.html
8. Sign in, open Settings (set the public URL) and Pricing, then Devices to generate a key.
9. `npm test` runs the tests.

## Environment variables

See `.env.example`. Secrets (payment keys) live only in the server `.env`, never in the EXE or in public files.

## Security notes already implemented

- API keys: 256-bit random, only SHA-256 hash stored, shown once, revocation immediate.
- Admin passwords: scrypt. Sessions: random token, hash stored, HttpOnly + SameSite=Strict cookie, CSRF header on writes.
- Prices/settings changes are owner-only and written to an append-only audit log (DB triggers block edits/deletes).
- DB constraints: one successful payment per order, one print job per order, webhook event replay blocked.
- `/uploads` is not served statically.
