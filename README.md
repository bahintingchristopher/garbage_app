# Garbage Collection App

Monorepo for the garbage collection marketplace (reduce landfill waste + income for clients & collectors).

## Structure

```
garbage_app/
+-- backend/    Express.js REST API (PostgreSQL via Sequelize)
+-- frontend/   Flutter mobile app (to be added)
+-- README.md
```

## Backend quick start

```bash
cd backend
npm install
# edit .env -> set DATABASE_URL (local Postgres or Render external URL)
npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with auto-reload |
| `npm start` | Start production server |
| `npm run seed:admin -- "<name>" <email> <password> <contact> "<address>"` | Create an ADMIN account |

## API endpoints (Phase 1)

| Method | Route | Access |
|---|---|---|
| GET | /api/health | Public |
| POST | /api/auth/register | Public (CLIENT or COLLECTOR) |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Authenticated |
| GET | /api/users/me | Authenticated |

Send token as header: `Authorization: Bearer <token>`

## Mobile app local development (Wi-Fi)

The Flutter app no longer hardcodes the PC IP. `frontend/run-dev.ps1` detects
the current Wi-Fi IPv4 and injects it at launch time.

```powershell
# terminal 1
cd backend; npm run dev

# terminal 2 (phone on the SAME Wi-Fi as this PC)
cd frontend
.\run-dev.ps1
```

- Changing Wi-Fi networks: just re-run `.\run-dev.ps1` - no code edits.
- First launch on a new network may require allowing Node.js through Windows
  Firewall (Private networks).
- Params: `-Port 5000`, `-Device <id>`, `-SkipBackendCheck`.
- Android emulator: bare `flutter run` works via the built-in fallback
  (`http://10.0.2.2:5000/api`) only if the PC IP matches the default in
  `lib/config/api_config.dart`; otherwise pass the same `--dart-define`.
