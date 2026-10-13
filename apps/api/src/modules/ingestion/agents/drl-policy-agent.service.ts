import { Injectable, Logger } from '@nestjs/common';
import { GeminiLlmService } from '../gemini-llm.service';
import { DrlPolicyOutput } from './agent.types';

@Injectable()
export class DrlPolicyAgentService {
  private readonly logger = new Logger(DrlPolicyAgentService.name);

  constructor(private readonly geminiClient: GeminiLlmService) {}

  async evaluatePolicy(content: string, url?: string): Promise<DrlPolicyOutput> {
    const systemInstruction = `
Bạn là AI Specialist chuyên về "Quy chế Điểm Rèn Luyện (ĐRL) HCMUS" (HCMUS DRL Policy Evaluator).
Nhiệm vụ DUY NHẤT của bạn là đối chiếu nội dung sự kiện với 5 tiêu chí của Quy chế Đánh giá Kết quả Rèn luyện Sinh viên HCMUS:

1. KHUNG TIÊU CHÍ (clauseNumber: 1..5):
   - NỘI DUNG 1 (Ý thức học tập, NCKH): Cuộc thi học thuật, Hackathon, Thách thức, Nghiên cứu khoa học, Hội thảo khoa học, Workshop học thuật, Sinh hoạt CLB học thuật. Điểm thưởng: 3đ - 15đ (thường 5đ).
   - NỘI DUNG 2 (Ý thức chấp hành pháp luật, nội quy): Khảo sát môn học trực tuyến, Sinh hoạt công dân - sinh viên, tuyên truyền pháp luật. Điểm: 5đ.
   - NỘI DUNG 3 (Hoạt động chính trị, xã hội, văn hóa, thể thao): Hội thao, giải chạy sinh viên (UPRACE...), Ngày hội việc làm, Talkshow kỹ năng mềm, Tiếp sức mùa thi, Tư vấn tuyển sinh, Văn nghệ, Lễ hội truyền thống. Điểm: 3đ - 5đ.
   - NỘI DUNG 4 (Phẩm chất công dân và quan hệ cộng đồng): Hiến máu nhân đạo (+10đ), Chiến dịch Mùa hè xanh (+10đ), Xuân tình nguyện (+10đ), Công tác xã hội, Bảo vệ môi trường, Giúp đỡ người khó khăn. Điểm: 5đ - 10đ.
   - NỘI DUNG 5 (Ý thức và kết quả tham gia công tác phụ trách lớp, đoàn thể): Ban cán sự lớp, BCH Đoàn - Hội, Đạt danh hiệu Sinh viên 5 tốt, Báo cáo viên xuất sắc. Điểm: 5đ - 25đ.

LƯU Ý: Nếu bài viết có ghi rõ "+5đ ĐRL", "cộng 10 điểm ĐRL", hãy lấy chính xác số điểm đó làm awardedPoints.
`;

    const prompt = `
Nội dung sự kiện cần đánh giá ĐRL:
---
${content}
---

Trả về JSON schema:
{
  "clauseNumber": number (1 đến 5),
  "awardedPoints": number,
  "subCategory": string (Ví dụ: "Tham gia giải chạy/hoạt động thể thao", "Tham gia talkshow kỹ năng"),
  "rationale": string (Căn cứ quy chế),
  "confidence": number
}
`;

    const res = await this.geminiClient.generateJson<DrlPolicyOutput>(prompt, systemInstruction);
    if (!res) {
      return {
        clauseNumber: 3,
        awardedPoints: 5,
        subCategory: 'Hoạt động phong trào sinh viên',
        rationale: 'Fallback tiêu chuẩn ND3',
        confidence: 0.5,
      };
    }

    return {
      clauseNumber: Number(res.clauseNumber) || 3,
      awardedPoints: Number(res.awardedPoints) || 5,
      subCategory: res.subCategory || 'Hoạt động rèn luyện',
      rationale: res.rationale || '',
      confidence: res.confidence || 0.9,
    };
  }
}
