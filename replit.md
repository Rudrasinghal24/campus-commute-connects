# UniRoute — Campus Bus Management

A production-ready campus bus management system with live face verification attendance, seat allocation, payments, fraud detection, and conductor override capabilities.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS + Zustand

## Where things live

- `artifacts/campus-bus/` — React SPA (student/conductor/admin portals)
- `artifacts/campus-bus/src/lib/store.ts` — Zustand state store (source of truth for all client state)
- `artifacts/campus-bus/src/components/face-capture.tsx` — reusable MediaPipe face capture component
- `artifacts/campus-bus/src/routes/` — all page routes
- `artifacts/api-server/` — Express API server

## Architecture decisions

- **Face-only attendance**: QR system removed; MediaPipe `tasks-vision` FaceDetector validates that a live face is present before capturing. The capture-and-compare architecture avoids continuous realtime descriptor loops.
- **Client-side state with Zustand persist**: All business data (students, attendance, payments, suspicious logs, overrides) lives in Zustand with `localStorage` persistence. The API server is available for future backend migration.
- **Store key: `uniroute-store-v2`**: Changed from `v1` to force a fresh store after schema updates.
- **Duplicate prevention**: `addStudent` in the store validates unique roll number, student phone, and parent phone before registering.
- **Conductor override**: When face verification fails after 3 retries, a suspicious entry is saved with the captured image. The conductor can approve attendance manually with a name + remarks modal.

## Product

- **Student portal**: Registration (3-step: details → live face photo → success), attendance via face scan (entry/exit), fee payment, live seat grid
- **Conductor portal**: Student list with manual entry marking, suspicious alerts tab with override approval modal, past overrides log
- **Admin console**: Overview, bus/route CRUD, student list with photos, seat assignment, payment history, all attendance logs, suspicious entries with captured images comparison, conductor overrides log

## User preferences

- Keep the existing UI design — no redesigns unless broken
- No file upload for photos — live webcam capture only
- MediaPipe FaceDetector via CDN WASM (loaded lazily in `face-capture.tsx`)

## Gotchas

- Pre-existing TypeScript errors in `src/components/ui/` (recharts, cmdk, vaul, etc.) are for unused shadcn components — ignore them
- MediaPipe WASM is loaded from `cdn.jsdelivr.net` on first use; needs internet access
- Face comparison uses canvas pixel similarity (48×48 downscale). Accurate when same person under similar lighting; not a biometric-grade matcher.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
