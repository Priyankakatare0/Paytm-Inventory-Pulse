# InventoryPulse — Demo Readiness Checklist (Windows)

This guide is optimized for a **smooth hackathon demo** (fast start, no surprises).

## 0) What to demo (90 seconds)

1. Login
2. Dashboard → **Voice Entry** → review & **Confirm** → live feed updates
3. Udhaar page → see updated entry (UPI masked)
4. Trigger low stock (demo endpoint or sell flow) → Loans page → **Approve** offer → active loan appears
5. Udhaar → Send Reminder (demo-safe)

## 1) One-time setup (first time only)

### Backend

```powershell
cd backend
npm install
```

If you want pre-filled demo data:

```powershell
npm run seed
```

### Frontend

```powershell
cd ..\frontend
npm install
```

## 2) Start the demo (every time)

### A) Start backend (port 5000)

If you see `EADDRINUSE` on port 5000, free it:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object -First 1 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Start backend:

```powershell
cd backend
npm run dev
```

Backend runs at: `http://localhost:5000`

### B) Start frontend

```powershell
cd ..\frontend
npm run dev
```

Frontend runs at the Vite URL printed in the terminal.

## 3) Auth behavior (important)

- All API routers are protected by JWT **except** `/api/auth/*`.
- If the token is missing/invalid, the frontend will **auto-redirect to /login**.

## 4) Demo triggers (optional)

> These endpoints require login (token) now.

### Low stock trigger

Use the UI sell flow, **or** call the demo endpoint (requires `Authorization: Bearer <token>`):

- `POST /api/demo/deplete-stock` with body `{ "sku": "SKU123", "remaining": 0 }`

### Fire a fake payment

- `POST /api/demo/fire-payment` with body `{ "amount": 600, "type": "UPI", "description": "Demo payment" }`

## 5) Known demo-safe notes

- Udhaar reminders run on cron; with `DEMO_MODE=true` email sending is skipped (no SMTP needed).
- UPI IDs are masked in UI and reminder emails.
- Hindi names are transliterated + cleaned in UI so the feed shows **Amit / Priyanka / Simran** (no “paida/rs” noise).

## 6) If something breaks mid-demo

- Refresh browser (token redirect will recover login state).
- If backend crashes: free port 5000 (command above) then restart `npm run dev`.
