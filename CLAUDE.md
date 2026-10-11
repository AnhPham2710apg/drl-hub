# Project Rules: DRL-Hub HCMUS

## 1. Stack & Architecture
- Runtime: Node.js 22.x
- Backend: NestJS 10, Express, TypeScript 5, Passport JWT, bcrypt
- Database & ORM: PostgreSQL 16, Prisma ORM (with seamless offline in-memory fallback)
- Frontend: Single-Page Application (HTML5, Tailwind CSS, Phosphor Icons, KaTeX, PWA Service Worker)
- Mobile App Target: Progressive Web App (PWA) Standalone Mobile Mode

## 2. Coding & Design Standards
- Monorepo: npm workspaces (`apps/*`, `packages/*`).
- Style: 2-space indent, named exports for modules/services, no implicit any.
- Security:
  - NEVER commit `.env`, secrets, or private keys to git.
  - Passwords MUST be hashed with `bcrypt` (minimum 10 salt rounds).
  - JWT Tokens: short-lived Access Token (15 mins), long-lived Refresh Token (7 days).
  - Clean URL: All Facebook post URLs MUST be stripped of tracking params (`fbclid`, `mibextid`, `ref`).
- Safety & Invariants:
  - Max cap rule: DRL points MUST strictly follow HCMUS regulation (Cap ND1: 30đ, ND2: 20đ, ND3: 25đ, ND4: 25đ, ND5: 30đ; Total Max: 100đ).
  - Outbound link integrity: Facebook links must open cleanly to preserve 100% KPI for student clubs.

## 3. Harness & Quality Gates
- Commands:
  - `npm run build`: compile TypeScript across all workspaces
  - `npm test`: run Jest unit tests (must be all green before commit)
  - `npm start`: run NestJS server in production mode
- Rules:
  - Every new core feature/module MUST have a corresponding `.spec.ts` test file.
  - Do not add unapproved heavy third-party dependencies without review.
