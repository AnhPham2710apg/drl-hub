# DRL-HUB: Campus Training-Point Aggregator & Student Engagement Platform

## 1. Executive Summary & Problem Context
Sinh viên tại các trường đại học thường xuyên bỏ lỡ các sự kiện cộng Điểm Rèn Luyện (ĐRL) do thông tin phân mảnh trên nhiều Fanpage Facebook của Đoàn - Hội, CLB/Đội/Nhóm. Việc theo dõi tiến độ tích lũy điểm theo từng Điều (Điều 1 - 5) mang tính thủ công, thiếu công cụ giả lập (Simulator) và lưu trữ minh chứng tập trung.
Đồng thời, Ban tổ chức (BTC) các CLB cần bảo toàn 100% KPI truyền thông (lượt reach, like, comment, form link) trên Fanpage Facebook chính thức.

**DRL-Hub** giải quyết bài toán này thông qua:
1. **OS Native Share Target**: Cho phép người dùng hoặc BTC chia sẻ trực tiếp link bài viết Facebook từ ứng dụng di động vào DRL-Hub để tự động bóc tách thông tin.
2. **AI & Heuristic Metadata Ingestion**: Chuẩn hóa URL (bỏ tracking tags), bóc tách OpenGraph, nhận diện số điểm và tiêu chí ĐRL (Điều 1-5), lưu trữ poster về Cloudflare R2 / S3.
3. **Two-Way Deep Linking**: Hỗ trợ chuyển hướng ngược lại ứng dụng Facebook native (`fb://...`) khi sinh viên muốn tương tác hoặc nộp link đăng ký.
4. **Personal Training-Point Tracker & Simulator**: Bảng tính dự toán ĐRL và sổ tay lưu trữ minh chứng cá nhân.

---

## 2. System Architecture & Component Design

### 2.1. Overall Monorepo Structure
```text
DRL_HUB/
├── apps/
│   ├── api/                 # NestJS REST API & BullMQ Ingestion Worker
│   ├── web/                 # Next.js 14 Management Portal (CLB & Faculty)
│   └── mobile/              # React Native (Expo) Client with Native Share Target
├── packages/
│   ├── database/            # Prisma Schema, Migrations, Seeders
│   └── shared-types/        # Shared DTOs, Enums (DRL Criteria, Roles, Statuses)
├── docker-compose.yml       # PostgreSQL 16, Redis Stack, LocalStack/MinIO
├── package.json             # Root workspace definition (npm/pnpm workspaces)
└── tsconfig.base.json       # Base TypeScript configuration
```

### 2.2. Core Backend Modules (`apps/api`)
- **Auth & RBAC Module**: JWT Access Token (15m) + Refresh Token xoay vòng (7d). Quản lý roles: `STUDENT`, `CLUB_MANAGER`, `FACULTY_OFFICER`, `ADMIN`.
- **Ingestion & Parser Module**:
  - `UrlSanitizer`: Lọc bỏ `fbclid`, `mibextid`, `ref`, tính MD5 hash `clean_url_hash` để chống trùng lặp.
  - `MetadataExtractor`: OpenGraph scraper (og:title, og:image, og:description) kết hợp fallback scraping.
  - `DrlClauseDetector`: Regex heuristic + LLM prompt nhận diện Điều 1-5, số điểm, hạn đăng ký.
  - `IngestPreviewController`: Trả kết quả bóc tách cho Client review trước khi publish.
- **Event Catalog Module**: Tìm kiếm, lọc sự kiện theo Điều 1-5, Khoa, trạng thái hạn chót.
- **Personal Tracker & Simulator Module**:
  - CRUD trạng thái theo dõi: `BOOKMARKED` -> `REGISTERED` -> `ATTENDED` -> `VERIFIED`.
  - Giả lập tổng điểm theo từng Điều theo barem quy chế trường.

---

## 3. Database Schema (PostgreSQL 3NF via Prisma)
- `users`: Thông tin sinh viên (MSSV, email trường, khoa, role).
- `organizers`: CLB, Đoàn - Hội tổ chức (mã đơn vị, link fanpage, logo, verified).
- `drl_criteria`: 5 Điều ĐRL chuẩn hóa (clause_number 1-5, max_points, mô tả).
- `events`: Bài viết sự kiện (tiêu đề, slug, original_post_url, clean_url_hash, poster, deadline, điểm).
- `event_criteria_mapping`: Ánh xạ N-N giữa Event và Tiêu chí ĐRL (cho phép 1 sự kiện cộng nhiều điều).
- `student_event_tracker`: Bảng bookmark, tiến độ và link ảnh minh chứng cá nhân.

---

## 4. Deep Linking & Native Redirection Specification
- **Inbound**: Universal Link `https://drlhub.vn/e/{slug}` và URL Scheme `drlhub://event/{id}`.
- **Outbound Facebook**:
  - Android: `Intent(ACTION_VIEW, "fb://facewebmodal/f?href=" + postUrl)` -> Fallback Chrome Custom Tabs.
  - iOS: `fb://...` -> Fallback SFSafariViewController.
  - Event click tracking: Increment `click_count` để thống kê hiệu quả truyền thông cho CLB.
