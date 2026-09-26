# Test Credentials — digiWed

## Admin (seeded via prisma/seed.js)
- Email: `admin@example.com`
- Password: `Admin@12345`
- Role: ADMIN

## Test users (seeded via prisma/seed_test_users.js)
- Active USER: `user@example.com` / `User@12345`
- PENDING USER (cannot log in until activated): `pending@example.com` / `User@12345`

## Notes
- App: Next.js 15 (App Router, JS only) + Prisma + MySQL (MariaDB local) + NextAuth v5.
- MySQL: `mysql://root:root@127.0.0.1:3306/digi2` (supervisor-managed program `mariadb`).
- Next.js runs on port 3000 (supervisor `frontend`, `yarn start` = `next dev`).
- FastAPI on 8001 (supervisor `backend`) is a **reverse proxy** forwarding all `/api/*` to Next.js:3000
  (platform ingress sends `/api` → 8001; the app is a single Next process serving pages + API on 3000).
- IMPORTANT: after any prisma schema change, run `yarn prisma generate` then `sudo supervisorctl restart frontend`
  (the dev process caches the Prisma client at startup).
- New signups are created PENDING; admin must Activate in /admin/users before login works.
