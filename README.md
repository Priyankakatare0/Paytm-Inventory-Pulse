# Paytm Inventory Pulse (InventoryPulse)

A hackathon-ready inventory + transactions + udhaar dashboard.

> **Browser requirement:** Run the frontend in **Google Chrome only** (recommended: latest stable). Some features (especially realtime + voice UX) are only verified on Chrome.

---

## Repo structure

- `backend/` — Express API + Prisma + Socket.io
- `frontend/` — React (Vite) + Tailwind UI


---

## Prerequisites

- **Node.js**: latest LTS recommended (Node 18+ works for most setups)
- **npm** (comes with Node)
- **PostgreSQL database** (local or hosted)

---

## 1) Backend setup (one time)

Open PowerShell:

```powershell
cd backend
npm install
```

### Environment variables

Create `backend/.env` (or update it) with at least:

```env
# Required
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public
JWT_SECRET=change-me

# Optional (demo-safe)
DEMO_MODE=true
PORT=5000
```

Notes:
- `DATABASE_URL` must point to a reachable **PostgreSQL** instance (Prisma uses it).
- `JWT_SECRET` can be any string for local/dev.
- If you don’t set `PORT`, the backend defaults to `5000`.

### Apply Prisma migrations

```powershell
npx prisma migrate deploy
```

(If you are developing locally and want Prisma to create/update your DB during development, you can also use `npx prisma migrate dev`.)

### Seed demo data (optional)

```powershell
npm run seed
```

This creates a demo merchant:
- Phone: `9876543210`
- PIN: `4321`

---

## 2) Frontend setup (one time)

Open a second PowerShell window:

```powershell
cd frontend
npm install
```

### Frontend environment (optional)

By default, the frontend calls `http://localhost:5000`.

If your backend runs elsewhere, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 3) Run the project (every time)

### A) Start backend (port 5000)

```powershell
cd backend
npm run dev
```

Backend runs at:
- `http://localhost:5000`

If you get `EADDRINUSE` (port already in use), free port 5000:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object -First 1 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### B) Start frontend

```powershell
cd frontend
npm run dev
```

Open the Vite URL printed in the terminal in **Google Chrome**.

---

## Authentication (important)

- All API routes are protected by JWT **except** `/api/auth/*`.
- If the token is missing/invalid, the frontend auto-redirects to `/login`.

---

## Features / pages

- **Dashboard** — summary + realtime feed
- **Inventory** — stock list and low-stock threshold support
- **Transactions** — transactions list
- **Udhaar** — create entries, mark paid, send reminder (UPI masked)
- **Loans** — loan offers / approvals (demo flow)

---

## Troubleshooting

### Udhaar page not updating

- Ensure you started the backend you *think* you started (port `5000` collisions can cause you to hit a stale server).
- Confirm backend shows `✅ Server running on http://localhost:5000`.
- Hard refresh Chrome (`Ctrl+Shift+R`).

### Backend crashes on start

Common causes:
- Bad `DATABASE_URL`
- Port already in use (`EADDRINUSE`)

### Prisma errors

- Confirm `backend/.env` has a correct `DATABASE_URL`.
- Run `npx prisma migrate deploy` again.

---

## Demo (90 seconds)

This sequence is optimized for a smooth hackathon demo.

1. Login
2. Dashboard → **Voice Entry** → review & **Confirm** → live feed updates
3. Udhaar page → see updated entry (UPI masked)
4. Trigger low stock (demo endpoint or sell flow) → Loans page → **Approve** offer → active loan appears
5. Udhaar → Send Reminder (demo-safe)

### Optional demo triggers (requires login)

All routes below require `Authorization: Bearer <token>`.

- Low stock trigger:
	- `POST /api/demo/deplete-stock` with body `{ "sku": "SKU123", "remaining": 0 }`
- Fire a fake payment:
	- `POST /api/demo/fire-payment` with body `{ "amount": 600, "type": "UPI", "description": "Demo payment" }`

### Demo-safe notes

- Udhaar reminders run on cron; with `DEMO_MODE=true` email sending is skipped (no SMTP needed).
- UPI IDs are masked in UI and reminder emails.
- Hindi names are transliterated + cleaned in UI for display.
