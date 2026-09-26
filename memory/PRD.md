# digiWed — PRD / Implementation Log

## Problem statement
Implement 9 requirements (3 phases) on the existing digiWed multi-tenant digital wedding
invitation SaaS (Next.js 15 App Router, JS only, Prisma, MySQL, NextAuth v5, Tailwind, shadcn).
Repo: https://github.com/fazarcode/digiwed-invitation2.git

## User decisions (locked)
1. Gift tracking (Req 7): **A — new `GiftEntry` ledger model**, keep `Gift` as angpau config.
2. Photo Moments public gallery (Req 9C): **show all submitted photos publicly** (no moderation field).
3. Moments landing (Req 9A): **add `momentsTitle` / `momentsMessage` fields + live preview**.
4. Scope: everything (Phases 1–3).

## Environment adaptation (this pod)
- MariaDB installed + supervisor program `mariadb`; DB `digi2`.
- Repo placed in `/app/frontend`; `start` script runs `next dev` on :3000.
- `/app/backend/server.py` rewritten as a FastAPI reverse proxy → Next.js:3000 (preserves multiple Set-Cookie headers, streams SSE for TV).
- `.env` (frontend): AUTH_URL / NEXT_PUBLIC_BASE_URL = preview URL; DATABASE_URL local MySQL.

## Implemented (2026-06)
- DB migration `phase_features`: `UserStatus.PENDING`; `User.templateId`; `GuestSideOption` model + `Guest.sideId`;
  `GiftEntry` model; `Invitation.momentsTitle/momentsMessage`. All additive; legacy fields kept.
- Req1 Attendance: edit/delete already existed; added **Add Attendance** dialog (checks in a not-yet-checked-in guest via lookup/checkin). Attendance GET now returns `guestToken`.
- Req2 Operator/Device setup dialog (existed) + inline **Add New Device**.
- Req3 Signup PENDING + admin activation: register → PENDING; `authorize()` requires status ACTIVE;
  admin `assignTemplate` action + template column in users table; `POST /api/invitations` inherits `user.templateId` (client cannot choose); template picker removed from new-invitation form.
- Req4 WhatsApp: bulk **Send WhatsApp** dialog with template Select + **Fix Message** toggle; fixed `buildContext` to derive event date/time/venue from `events[0]`.
- Req5 Guest Sides: new `sides` + `sides/[sideId]` API (owner-checked, SetNull on delete); `SidesEditor`; guest create/edit/filter use DB-driven sides (`sideId`).
- Req6 Parent fields: removed legacy `brideParents/groomParents` inputs; template-engine derives `BRIDE_PARENTS/GROOM_PARENTS` from father+mother.
- Req7 Gift ledger: `gift-entries` + `[entryId]` API; `GiftEntriesEditor` (Money/Goods tabs, totals, guest link). Existing angpau `gift-editor` untouched.
- Req8 Greeting TV live preview pane (local form state, idle-screen mirror).
- Req9 Photo Moments: `MomentsHero` shared component; `MomentsCustomizer` (title/message live preview, tab in editor); public page rewritten to **camera-only** (getUserMedia + canvas, no file input) with a **public gallery** tab + lightbox; `GET /api/moments/[slug]?gallery=1` returns only `{url,senderName,message,createdAt}`. Fixed latent bug (route/page selected nonexistent `weddingDate/venue`).

## Known limitations
- Camera-only cannot be fully server-enforced (browser can submit any image blob).
- Bulk WhatsApp opens multiple wa.me tabs (browser popup blockers may limit).

## Backlog / next
- P1: assertFeature guards on package-gated routes (package enforcement is cosmetic today).
- P2: import preview (xlsx) to support Guest Side column.
- P2: gift-entries edit (inline) — currently add/delete only in UI.
