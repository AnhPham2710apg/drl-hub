import { Injectable, Logger } from '@nestjs/common';
import { GeminiLlmService } from '../gemini-llm.service';
import {
  EntityExtractionOutput,
  OrgClassificationOutput,
  DrlPolicyOutput,
  CriticReviewOutput,
} from './agent.types';

@Injectable()
export class CriticAgentService {
  private readonly logger = new Logger(CriticAgentService.name);

  constructor(private readonly geminiClient: GeminiLlmService) {}

  /**
   * Bước 1: Kiểm tra heuristic chéo để phát hiện bất thường logic sơ bộ
   */
  private detectHeuristicConflicts(
    entities: EntityExtractionOutput,
    org: OrgClassificationOutput,
    drl: DrlPolicyOutput,
  ): string[] {
    const issues: string[] = [];

    // 1. Kiểm tra mâu thuẫn CLB vs Khoa/Trường
    const rawText = `${entities.title} ${org.organizerName || ''}`.toLowerCase();
    const hasClubKeywords = rawText.includes('clb') || rawText.includes('câu lạc bộ') || rawText.includes('đội ') || rawText.includes('nhóm ');
    if (hasClubKeywords && org.orgLevel !== 'clb') {
      issues.push(`Đơn vị tổ chức hoặc tiêu đề có chứa từ khóa Câu Lạc Bộ/Đội/Nhóm nhưng cấp tổ chức lại được gán là '${org.orgLevel}'. Cần chuyển sang 'clb'.`);
    }

    // 2. Kiểm tra ngày sự kiện vs hạn chót
    if (entities.eventDate && entities.registrationDeadline && entities.eventDate === entities.registrationDeadline) {
      issues.push(`Ngày diễn ra sự kiện (${entities.eventDate}) trùng với hạn chót đăng ký. Cần đối chiếu xem có nhầm lẫn giữa ngày tổ chức và hạn chót form.`);
    }

    // 3. Kiểm tra địa điểm vs cơ sở (campus)
    if (entities.location) {
      const loc = entities.location.toLowerCase();
      if ((loc.includes('thủ đức') || loc.includes('dĩ an') || loc.includes('nhà f') || loc.includes('linh trung')) && org.campus === 'cs1') {
        issues.push(`Địa điểm ghi tại Thủ Đức / Dĩ An / Nhà F nhưng cơ sở lại gán là CS1 (227 NVC). Cần sửa sang 'cs2'.`);
      }
      if ((loc.includes('nguyễn văn cừ') || loc.includes('hội trường i') || loc.includes('quận 5')) && org.campus === 'cs2') {
        issues.push(`Địa điểm ghi tại Nguyễn Văn Cừ / Quận 5 nhưng cơ sở lại gán là CS2. Cần sửa sang 'cs1'.`);
      }
    }

    // 4. Kiểm tra trần điểm ĐRL
    if (drl.awardedPoints > 25) {
      issues.push(`Điểm ĐRL đề xuất (${drl.awardedPoints}đ) vượt quá giới hạn khung quy chế HCMUS. Cần điều chỉnh tối đa 25đ.`);
    }

    return issues;
  }

  /**
   * Bước 2: AI Critic tranh luận & thẩm định lại toàn bộ quyết định
   */
  async auditAndResolve(
    content: string,
    url: string | undefined,
    entities: EntityExtractionOutput,
    org: OrgClassificationOutput,
    drl: DrlPolicyOutput,
  ): Promise<CriticReviewOutput> {
    const heuristicIssues = this.detectHeuristicConflicts(entities, org, drl);

    const systemInstruction = `
Bạn là "Auditor & Debate Arbiter" (AI Trọng tài & Thẩm định Phản biện).
Nhiệm vụ của bạn là giám sát kết quả của 3 AI Specialist (Extractor, OrgClassifier, DrlPolicy), phát hiện ảo giác, mâu thuẫn logic và đưa ra phán quyết cuối cùng (Final Verdict):

Các quy tắc thẩm định nghiêm ngặt:
1. NGUYÊN TẮC CẤP TỔ CHỨC:
   - Nếu là Câu lạc bộ (CLB Tin học, CLB Tiếng Anh, Đội Văn nghệ...), dù thuộc Khoa CNTT hay Trường, orgLevel BẮT BUỘC là 'clb'.
   - Nếu là Đoàn Khoa / LCH Khoa, orgLevel là 'khoa'.
   - Nếu là Phòng Ban trường (CTSV, Đoàn Trường, Hội Sinh viên Trường), orgLevel là 'truong'.
2. NGUYÊN TẮC CƠ SỞ:
   - 227 Nguyễn Văn Cừ, Quận 5 -> 'cs1'
   - Linh Trung, Thủ Đức, ĐHQG-HCM, KHTN Thủ Đức -> 'cs2'
   - Trực tuyến -> 'online'
3. NGUYÊN TẮC TIÊU ĐỀ:
   - Tiêu đề phải sạch sẽ, bảo toàn đúng tên sự kiện, không bị lẫn tên fanpage hay rác bài đăng.
`;

    const debatePrompt = `
Nội dung bài viết gốc:
---
${content}
Link đính kèm: ${url || ''}
---

DỰ THẢO TỪ CÁC SPECIALIST AGENTS:
1. Extractor Agent:
   - Title: "${entities.title}"
   - Event Date: "${entities.eventDate || 'N/A'}"
   - Event Time: "${entities.eventTime || 'N/A'}"
   - Location: "${entities.location || 'N/A'}"
   - Deadline: "${entities.registrationDeadline || 'N/A'}"
   - Link: "${entities.registrationLink || 'N/A'}"

2. Org Classifier Agent:
   - Faculty: "${org.faculty}"
   - Org Level: "${org.orgLevel}"
   - Campus: "${org.campus}"
   - Format: "${org.format}"
   - Reasoning: "${org.reasoning}"

3. DRL Policy Agent:
   - Clause: ND${drl.clauseNumber}
   - Points: +${drl.awardedPoints}đ
   - SubCategory: "${drl.subCategory}"

DANH SÁCH BẤT THƯỜNG SƠ BỘ PHÁT HIỆN:
${heuristicIssues.length > 0 ? heuristicIssues.map((it, idx) => `${idx + 1}. ${it}`).join('\n') : 'Không phát hiện lỗi sơ bộ.'}

YÊU CẦU:
Hãy phân tích phản biện kỹ lưỡng. Nếu có điểm nào bất hợp lý hoặc mâu thuẫn, hãy hiệu chỉnh lại trong trường 'adjustedValues' và tóm tắt lý do trong 'debateSummary'.

Trả về JSON schema:
{
  "isValid": boolean (true nếu dự thảo đã hoàn toàn chuẩn, false nếu có điểm cần điều chỉnh),
  "issuesFound": string[],
  "adjustedValues": {
    "title": string | null,
    "faculty": "diachat" | "cntt" | "toantin" | "vatly" | "hoahoc" | "sinhhoc" | "moitruong" | "vatlieu" | "dientu" | "liennganh" | "all" | null,
    "orgLevel": "truong" | "khoa" | "clb" | null,
    "campus": "cs1" | "cs2" | "external" | "online" | null,
    "format": "offline" | "online" | "hybrid" | null,
    "clauseNumber": number | null,
    "awardedPoints": number | null,
    "registrationDeadline": string | null,
    "eventDate": string | null,
    "location": string | null
  },
  "debateSummary": string
}
`;

    const reviewRes = await this.geminiClient.generateJson<CriticReviewOutput>(debatePrompt, systemInstruction);

    if (!reviewRes) {
      // Fallback khi Critic không phản hồi: giữ nguyên các giá trị ban đầu nhưng áp các rule cảnh báo sơ bộ nếu có
      this.logger.warn('Critic Agent call timed out or failed. Using fallback arbiter.');
      const fallbackAdjustments: any = {};
      if (heuristicIssues.some(i => i.includes('Câu Lạc Bộ'))) {
        fallbackAdjustments.orgLevel = 'clb';
      }
      return {
        isValid: heuristicIssues.length === 0,
        issuesFound: heuristicIssues,
        adjustedValues: fallbackAdjustments,
        debateSummary: heuristicIssues.length > 0 ? 'Đã tự động điều chỉnh theo quy tắc kiểm tra chéo.' : 'Dự thảo đạt chuẩn.',
      };
    }

    return {
      isValid: reviewRes.isValid,
      issuesFound: reviewRes.issuesFound || heuristicIssues,
      adjustedValues: reviewRes.adjustedValues,
      debateSummary: reviewRes.debateSummary || 'Đã kiểm chứng chéo và xác nhận.',
    };
  }
}
