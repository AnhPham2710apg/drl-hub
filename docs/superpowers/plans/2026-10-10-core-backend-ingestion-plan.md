# DRL-Hub Core Backend & Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Overview
Xây dựng nền tảng cốt lõi cho DRL-Hub theo kiến trúc Monorepo TypeScript, tập trung hoàn thiện tầng Database Schema (PostgreSQL 16 + Prisma), Shared Types/DTOs, Docker Infrastructure và Bộ máy bóc tách dữ liệu Facebook Ingestion Pipeline với kiểm thử TDD.

---

## File Structure Plan

```text
DRL_HUB/
├── docker-compose.yml                     # PostgreSQL 16 & Redis Stack container setup
├── package.json                           # Root monorepo workspace configuration (npm workspaces)
├── tsconfig.base.json                     # Root TypeScript compiler options
├── packages/
│   ├── shared-types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── enums.ts                   # Role, ClauseNumber, EventStatus, TrackerStatus
│   │       ├── dtos/
│   │       │   ├── ingest.dto.ts          # Preview & Ingest payload DTOs
│   │       │   └── tracker.dto.ts         # Tracker update DTOs
│   │       └── index.ts
│   └── database/
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   └── schema.prisma              # 3NF Schema: User, Organizer, DrlCriteria, Event, Tracker
│       └── src/
│           ├── client.ts                  # PrismaClient singleton instance
│           └── seed.ts                    # Barem 5 Điều ĐRL chuẩn hóa seed data
└── apps/
    └── api/
        ├── package.json
        ├── tsconfig.json
        ├── nest-cli.json
        ├── test/
        │   └── ingestion.e2e-spec.ts
        └── src/
            ├── app.module.ts
            ├── main.ts
            └── modules/
                ├── ingestion/
                │   ├── url-sanitizer.service.ts       # Clean fbclid, ref, hash generation
                │   ├── url-sanitizer.service.spec.ts  # TDD tests for sanitizing Facebook URLs
                │   ├── opengraph-extractor.service.ts # OG tag scraper & parser
                │   ├── drl-clause-parser.service.ts   # Heuristic Regex & Clause detector (Điều 1-5)
                │   ├── drl-clause-parser.service.spec.ts # TDD tests for clause detection
                │   ├── ingestion.controller.ts        # /api/v1/events/ingest-preview endpoint
                │   └── ingestion.module.ts
                ├── events/
                │   ├── events.service.ts
                │   └── events.controller.ts
                └── tracker/
                    ├── tracker.service.ts             # Simulator logic & progress tracking
                    ├── tracker.service.spec.ts        # TDD tests for DRL score simulator
                    └── tracker.controller.ts
```

---

## Task Decomposition

- [x] **Task 1: Monorepo Foundation & Docker Infrastructure**
  - **Deliverable**: `package.json` (npm workspaces), `tsconfig.base.json`, và `docker-compose.yml` (Postgres 16 + Redis) sẵn sàng khởi chạy.
  - **Verify**: Root config và workspace scripts đã cấu hình hoàn chỉnh.

- [x] **Task 2: Packages Layer - `packages/shared-types` & `packages/database` (Prisma)**
  - **Deliverable**: 
    - `packages/shared-types`: Định nghĩa đầy đủ Types & Enums (Role, ClauseNumber, EventStatus, TrackerStatus, IngestPreview).
    - `packages/database`: `schema.prisma` với 6 models chuẩn 3NF và seeder cho 5 Điều ĐRL.
  - **Verify**: Prisma Client sinh thành công (v6.19.3), package compile TypeScript không lỗi.

- [x] **Task 3: Ingestion Pipeline - URL Sanitizer & Deduplication (TDD)**
  - **Deliverable**: `UrlSanitizerService` loại bỏ sạch sẽ các query tracking (`fbclid`, `mibextid`, `ref`) và tạo `clean_url_hash` chuẩn MD5.
  - **Tests**: `url-sanitizer.service.spec.ts` kiểm thử với 5 dạng URL Facebook phổ biến.
  - **Verify**: Tất cả unit tests của URL Sanitizer pass 100%.

- [x] **Task 4: Ingestion Pipeline - DRL Clause Heuristic & Metadata Parser (TDD)**
  - **Deliverable**: `DrlClauseParserService` nhận diện từ khóa Điều 1, 2, 3, 4, 5, barem điểm (vd: "5 điểm", "cộng 3 đrl"), và ngày hạn đăng ký từ caption bài viết.
  - **Tests**: `drl-clause-parser.service.spec.ts` kiểm thử các mẫu caption thực tế của Đoàn - Hội và CLB.
  - **Verify**: Tất cả unit tests nhận diện Điều/Khoản pass 100%.

- [x] **Task 5: Core NestJS API Setup & Ingestion Preview Endpoint**
  - **Deliverable**: `apps/api` tích hợp IngestionModule, cung cấp endpoint `POST /api/v1/events/ingest-preview` trả về metadata, ảnh poster và gợi ý tiêu chí ĐRL.
  - **Verify**: `nest build` thành công và module import chạy trơn tru.

- [x] **Task 6: Personal Tracker & DRL Score Simulator (TDD)**
  - **Deliverable**: `TrackerService` tính toán tổng điểm rèn luyện theo từng Điều (áp dụng max cap của mỗi Điều) dựa trên danh sách sự kiện đã lưu.
  - **Tests**: `tracker.service.spec.ts` kiểm thử tính điểm không vượt quá barem tối đa của từng Điều.
  - **Verify**: Toàn bộ test tính điểm rèn luyện pass 100%.
