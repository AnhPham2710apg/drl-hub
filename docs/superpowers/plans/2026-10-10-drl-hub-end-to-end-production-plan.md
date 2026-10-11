# DRL-Hub: Kế Hoạch Triển Khai End-to-End Toàn Diện Chuẩn Production

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 1. TỔNG QUAN HỆ THỐNG & ĐẶC TẢ SẢN PHẨM (SPECIFICATION ALIGNMENT)
Hệ thống **DRL-Hub** được nâng cấp từ tầng Prototype lên **Production-Grade Application** theo mô hình **Modular Monolith & Event-Driven**:
- **Khả năng chịu tải**: Sẵn sàng phục vụ hàng chục ngàn sinh viên ĐHQG-HCM, xử lý đột biến tải trong các đợt cao điểm xét điểm rèn luyện.
- **Tiêu chuẩn quy chế**: 100% tuân thủ quy chế ĐRL của Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM (5 Nội dung đánh giá, Max Cap, Barem chi tiết, bảng quy đổi xếp loại).
- **Core Loop**:
  1. *Share Target (Mobile OS/Web)* $\rightarrow$ 
  2. *URL Sanitizer + Anti-Bot Scraping + NLP Clause Parser* $\rightarrow$ 
  3. *Publish Event vào Catalog (PostgreSQL 3NF)* $\rightarrow$ 
  4. *Personal Tracker & DRL Score Simulator (Capped)* $\rightarrow$ 
  5. *Outbound Facebook Redirection (`fb://...`) bảo toàn 100% KPI truyền thông của CLB*.

---

## 2. KIẾN TRÚC THƯ MỤC END-TO-END (MONOREPO ARCHITECTURE)

```text
DRL_HUB/
├── docker-compose.yml                     # PostgreSQL 16, Redis Stack, MinIO / LocalStack (S3)
├── package.json                           # npm workspaces root config
├── tsconfig.base.json                     # Root TypeScript base compiler options
├── packages/
│   ├── shared-types/                      # Single Source of Truth
│   │   ├── src/
│   │   │   ├── enums.ts                   # Role, DrlClause (ND1-ND5), DrlClassification, TrackerStatus
│   │   │   ├── dtos/                      # Ingest, Event, Tracker, Auth DTOs
│   │   │   └── index.ts
│   └── database/                          # Prisma 3NF Database Layer
│       ├── prisma/
│       │   ├── schema.prisma              # Users, Organizers, DrlCriteria, Events, Mapping, Tracker
│       │   └── migrations/
│       └── src/
│           ├── client.ts                  # Prisma Client singleton
│           ├── seed.ts                    # Seeder 5 Nội dung HCMUS
│           └── index.ts
├── apps/
│   ├── api/                               # NestJS Backend API & Workers
│   │   ├── src/
│   │   │   ├── common/                    # RateLimit (Token Bucket), Redis Cache-aside, Circuit Breaker
│   │   │   ├── modules/
│   │   │   │   ├── auth/                  # JWT Access (15m) + Rotating Refresh Token (7d) + RBAC Guards
│   │   │   │   ├── ingestion/             # URL Sanitizer, Canonical Scraper, Image Proxy/R2, NLP Parser
│   │   │   │   ├── events/                # Event Catalog, Multi-clause Filter, Search, Click-Counter
│   │   │   │   ├── tracker/               # Personal Tracker CRUD, Evidence Upload, HCMUS Simulator
│   │   │   │   └── admin/                 # Club & Faculty Operations, Approval Workflow, Report Export
│   │   │   └── main.ts                    # Swagger API Docs, CORS, Global Validation Pipe
│   ├── web/                               # Next.js 14 App Router (Club & Faculty Officer Portal)
│   │   └── src/
│   │       ├── app/                       # Dashboard, Event Approval, Club Analytics, Evidence Verification
│   │       └── components/                # shadcn/ui tables, stats, forms
│   └── mobile/                            # React Native (Expo) - Student Client
│       ├── app.json                       # Android ACTION_SEND & iOS Universal Links Config
│       ├── src/
│       │   ├── hooks/useShareIntent.ts    # Bắt URL từ Facebook share sheet
│       │   ├── utils/facebook-deep-link.ts# fb:// redirection & browser fallback
│       │   └── screens/                   # Discovery Feed, Simulator View, Ingest Confirmation Screen
```

---

## 3. LỘ TRÌNH TRIỂN KHAI CHI TIẾT (TASK BREAKDOWN & CHECKLIST)

### GIAI ĐOẠN 1: DATABASE & CORE EVENT CATALOG CRUD (API & PERSISTENCE)
- [x] **Task 1.1: Hoàn thiện Database Migrations & Prisma Service trong NestJS**
  - **Mục tiêu**: Tạo `DatabaseModule` trong `apps/api` tích hợp `PrismaService`, kết nối PostgreSQL 16.
  - **File**: `apps/api/src/modules/database/prisma.service.ts`, `apps/api/src/modules/database/database.module.ts`.
  - **Kiểm thử**: PrismaService kết nối và ngắt kết nối an toàn với graceful fallback.

- [x] **Task 1.2: Xây dựng Event Catalog Service & Controller (Publish & Query)**
  - **Mục tiêu**: 
    - `POST /api/v1/events/publish`: Lưu sự kiện đã bóc tách vào database kèm liên kết N-N bảng `event_criteria_mapping` (áp dụng 5 Nội dung HCMUS).
    - `GET /api/v1/events`: Lấy danh sách sự kiện kèm bộ lọc nâng cao (lọc theo Nội dung 1-5, theo Khoa, sắp hết hạn trong 24h, phân trang).
    - `GET /api/v1/events/:id`: Chi tiết sự kiện và ghi nhận click tracking (`click_count++` khi mở sang Facebook).
  - **File**: `apps/api/src/modules/events/events.service.ts`, `apps/api/src/modules/events/events.controller.ts`.
  - **Kiểm thử**: Đã chạy smoke test publish, filter và tracking thành công.

---

### GIAI ĐOẠN 2: PERSONAL TRACKER, EVIDENCE STORAGE & HCMUS SIMULATOR
- [x] **Task 2.1: Triển khai Personal Tracker Service (Sổ tay ĐRL)**
  - **Mục tiêu**:
    - `POST /api/v1/tracker/bookmark`: Bookmark sự kiện mục tiêu.
    - `PATCH /api/v1/tracker/:id/status`: Cập nhật trạng thái `BOOKMARKED` $\rightarrow$ `REGISTERED` $\rightarrow$ `ATTENDED` $\rightarrow$ `VERIFIED`.
    - `POST /api/v1/tracker/:id/evidence`: Lưu link ảnh minh chứng (chụp màn hình xác nhận form/giấy chứng nhận).
  - **File**: `apps/api/src/modules/tracker/tracker.controller.ts`, `apps/api/src/modules/tracker/tracker.service.ts`.
  - **Kiểm thử**: Endpoint bookmark và update status hoạt động chuẩn xác.

- [x] **Task 2.2: Tích hợp Personal Score Simulator với Database**
  - **Mục tiêu**: Endpoint `GET /api/v1/tracker/summary` lấy trực tiếp các sự kiện đã lưu của sinh viên, chạy qua bộ Simulator HCMUS, trả về tổng điểm hiện tại, tổng điểm dự kiến, xếp loại (Xuất sắc/Tốt/Khá...) và chi tiết 5 Nội dung.
  - **Kiểm thử**: Test với dữ liệu thực tế đạt tiêu chuẩn quy chế HCMUS.

---

### GIAI ĐOẠN 3: BẢO MẬT PRODUCTION, RATE LIMITING & CACHING
- [ ] **Task 3.1: Token-Bucket Rate Limiter & Security Headers**
  - **Mục tiêu**:
    - Bảo vệ Ingestion API (tối đa 10 req/phút để tránh bị lạm dụng crawler).
    - Rate limit API thông thường (tối đa 60 req/phút).
    - Cấu hình Helmet & XSS sanitization cho toàn bộ request body.
  - **File**: `apps/api/src/common/guards/rate-limiter.guard.ts`.
  - **Kiểm thử**: Test gọi quá 10 req/phút trả về HTTP 429 Too Many Requests.

- [ ] **Task 3.2: Cache-Aside với Redis (TTL 10 phút)**
  - **Mục tiêu**: Cache danh sách sự kiện trang chủ và danh mục tiêu chí ĐRL; tự động xóa cache (Invalidate) khi có sự kiện mới được Publish.
  - **File**: `apps/api/src/common/cache/redis-cache.service.ts`.

---

### GIAI ĐOẠN 4: GIAO DIỆN WEB PORTAL DÀNH CHO CLB & SINH VIÊN
- [ ] **Task 4.1: Nâng cấp Web Interface thành All-in-One Dashboard**
  - **Mục tiêu**:
    - **Tab 1: Bóc tách & Công bố sự kiện (Share Ingestion & Publish)**: Form review đầy đủ các trường (tiêu đề, poster, 5 Nội dung ĐRL HCMUS, số điểm, deadline, đơn vị tổ chức) và nút **"Công bố sự kiện"** lưu trực tiếp vào CSDL.
    - **Tab 2: Khám phá sự kiện (Event Discovery Feed)**: Danh sách sự kiện trực quan có bộ lọc theo 5 Nội dung, trạng thái mở đơn, và nút mở bài viết Facebook (`fb://...`).
    - **Tab 3: Sổ tay ĐRL & Simulator (Personal Tracker)**: Quản lý danh sách sự kiện đã tham gia, theo dõi thanh tiến độ điểm và dự toán xếp loại cuối kỳ.
  - **File**: `apps/api/public/index.html` (hoặc Next.js portal).
  - **Kiểm thử**: Kiểm thử thủ công luồng Share $\rightarrow$ Publish $\rightarrow$ Discovery $\rightarrow$ Tracker Simulator.

---

### GIAI ĐOẠN 5: MOBILE CLIENT NATIVE INTEGRATION & DEEP LINKING
- [ ] **Task 5.1: Cấu hình Native Share Target & Outbound Facebook Launcher**
  - **Mục tiêu**: Đóng gói cấu hình Android `ACTION_SEND` và iOS Universal Links trong `apps/mobile`, kết nối trực tiếp với backend `/api/v1/events/ingest-preview`.
  - **File**: `apps/mobile/src/screens/IngestConfirmationScreen.tsx`.
