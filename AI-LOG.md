# AI-LOG: DRL-Hub HCMUS

## 2026-10-10 — Ingestion Pipeline & DRL Regulations Engine
- **Tool**: Antigravity (DeepMind Advanced Agentic Coding).
- **Asked for**: URL Sanitizer, Facebook OpenGraph Extractor, and HCMUS 5-clause DRL Parser with regulatory caps.
- **Changed**: Agent initially proposed full Puppeteer browser automation; replaced with Cheerio + direct OpenGraph HTML extraction to avoid 300MB Chromium bloat and ensure fast execution in sandbox. Added MD5 hash canonicalization for tracking deduplication.
- **Validated**: Unit tests `url-sanitizer.service.spec.ts` and `drl-clause-parser.service.spec.ts` pass 100%.

## 2026-10-11 — Luma UI Redesign & Multiple-choice Filters
- **Tool**: Antigravity.
- **Asked for**: Redesign layout to match Luma event app (Electric Blue `#2563EB`), convert single-choice dropdowns to multiple-choice pills for 10 HCMUS faculties and campuses.
- **Changed**: Replaced native HTML `<select>` with active pill toggle buttons, interactive filter badges, and an Active Chips bar. Synchronized metadata tags into the "Thêm sự kiện" publish card.
- **Validated**: Manual UI walkthrough and cross-verification in browser.

## 2026-10-11 — Authentication, Security & Google Calendar
- **Tool**: Antigravity.
- **Asked for**: Student authentication, JWT tokens, bcrypt encryption, and Google Calendar reminder integration.
- **Changed**: Auth service with bcrypt (10 rounds) and short-lived JWT tokens (15m access / 7d refresh). Added one-click Google Calendar TEMPLATE URL generator instead of heavy Google OAuth client library.
- **Validated**: `auth.service.spec.ts` passes; integration test with `POST /api/v1/auth/login` returns valid JWT pair.

## 2026-10-11 — Production Cleanliness & PWA Mobile App Harness
- **Tool**: Antigravity.
- **Asked for**: PWA mobile deployment readiness, cleanup of temporary files, project rules, and production test harness.
- **Changed**: Removed temporary scrapers (`test-*.js`, `dump-fb.js`, `fb_dump.html`), registered PWA manifest and service worker, added `CLAUDE.md` rules and unit test `events.service.spec.ts`.
- **Validated**: `npm test` runs 5 test suites (16 tests), 100% green. Build clean with zero warnings.
