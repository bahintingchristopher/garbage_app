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
