# Multi-Agent Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi hệ thống phân loại bài viết sự kiện từ monolithic single-prompt sang mô hình Multi-Agent Pipeline gồm Điều phối viên chính (Coordinator), các AI chuyên trách độc lập (Extractor, Org Classifier, DRL Policy), và AI phản biện/tranh luận (Critic & Auditor) để đảm bảo độ chính xác tối đa.

**Architecture:** 
- **Coordinator (`MultiAgentCoordinatorService`)**: Nhận dữ liệu bài viết sạch từ OpengraphExtractor, dispatch nhiệm vụ song song cho 3 Specialist Agents, tổng hợp kết quả dự thảo.
- **Specialist Agents**:
  - `ExtractorAgent`: Bóc tách Title, Ngày, Giờ, Địa điểm, Link form, Hạn chót.
  - `OrgClassifierAgent`: Nhận diện đơn vị tổ chức, Fanpage Slug, phân biệt triệt để Cấp CLB vs Đoàn Khoa vs Cấp Trường, xác định cơ sở (`campus`) và hình thức (`format`).
  - `DrlPolicyAgent`: Tra cứu Sổ tay Sinh viên HCMUS, áp 5 Nội dung ĐRL và điểm thưởng.
- **Auditor / Critic Agent (`CriticAgentService`)**: Kiểm tra chéo giữa các kết quả, phát hiện xung đột/ảo giác (vd: có chữ "CLB" nhưng gán cấp Khoa, ngày diễn ra trùng hạn chót), kích hoạt chu trình tranh luận phản biện (Debate/Resolution loop) trước khi ra quyết định cuối cùng.
- **Deterministic Guardrail**: Fallback mượt mà về heuristic quy chế nếu API gặp sự cố.

**Tech Stack:** NestJS, TypeScript, Axios, Google Gemini API (gemini-3.5-flash-lite), Jest.

---

## Tasks

### Task 1: Định nghĩa Types và Giao diện Agent Contracts
**Files:**
- Create: `apps/api/src/modules/ingestion/agents/agent.types.ts`
- Modify: `packages/shared-types/src/dtos/ingest.dto.ts`

- [ ] Định nghĩa `EntityExtractionOutput`, `OrgClassificationOutput`, `DrlPolicyOutput`.
- [ ] Định nghĩa `CriticReviewOutput` (gồm `isValid`, `issuesFound`, `adjustedValues`, `rationale`).
- [ ] Bổ sung trường `debateSummary` hoặc `verificationNotes` vào DTO phản hồi nếu cần cho debug/audit.

### Task 2: Xây dựng Specialist Agents
**Files:**
- Create: `apps/api/src/modules/ingestion/agents/extractor-agent.service.ts`
- Create: `apps/api/src/modules/ingestion/agents/org-classifier-agent.service.ts`
- Create: `apps/api/src/modules/ingestion/agents/drl-policy-agent.service.ts`
- Modify: `apps/api/src/modules/ingestion/gemini-llm.service.ts` (chia sẻ hàm gọi Gemini API)

- [ ] Triển khai `ExtractorAgentService` tập trung duy nhất vào trích xuất thực thể.
- [ ] Triển khai `OrgClassifierAgentService` trang bị bảng luật phân cấp tổ chức HCMUS (CLB vs Khoa vs Trường).
- [ ] Triển khai `DrlPolicyAgentService` trang bị bảng khung 5 tiêu chí ĐRL HCMUS.

### Task 3: Xây dựng Critic / Auditor Agent & Debate Loop
**Files:**
- Create: `apps/api/src/modules/ingestion/agents/critic-agent.service.ts`

- [ ] Triển khai logic kiểm tra tính hợp lý giữa các kết quả của các Agent:
  - Xung đột giữa Tiêu đề/Đơn vị vs Cấp tổ chức (`orgLevel`).
  - Xung đột giữa Địa điểm vs Cơ sở (`campus`).
  - Xung đột giữa Thời gian sự kiện vs Hạn chót đăng ký.
- [ ] Triển khai Debate Prompt: Trình bày các điểm mâu thuẫn cho mô hình để đưa ra phán quyết điều chỉnh cuối cùng kèm lý do.

### Task 4: Triển khai Coordinator & Tích hợp vào Ingestion Pipeline
**Files:**
- Create: `apps/api/src/modules/ingestion/multi-agent-coordinator.service.ts`
- Modify: `apps/api/src/modules/ingestion/ingestion.module.ts`
- Modify: `apps/api/src/modules/ingestion/ingestion.controller.ts`

- [ ] Viết `MultiAgentCoordinatorService.orchestrate(cleanContent, url)`:
  - Bước 1: Gọi song song 3 Specialist Agents (`Promise.all`).
  - Bước 2: Gom kết quả, gửi qua `CriticAgentService.auditAndResolve()`.
  - Bước 3: Đóng gói kết quả cuối cùng, fallback an toàn qua heuristic nếu LLM gặp lỗi.
- [ ] Kết nối Controller với Coordinator thay vì gọi trực tiếp 1 prompt như trước.

### Task 5: Unit Tests & Kiểm thử thực tế
**Files:**
- Create: `apps/api/src/modules/ingestion/multi-agent-coordinator.spec.ts`

- [ ] Viết unit test cho Coordinator & Critic resolution logic.
- [ ] Chạy test với bài viết thực tế (UPRACE CTSV, Talkshow Khoa Địa chất, CLB Tin học).
- [ ] Xác nhận toàn bộ build & test chạy qua 100%.
