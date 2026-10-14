import { Injectable, Logger } from '@nestjs/common';
import { GeminiLlmService } from '../gemini-llm.service';
import { DrlPolicyOutput } from './agent.types';

@Injectable()
export class DrlPolicyAgentService {
  private readonly logger = new Logger(DrlPolicyAgentService.name);

  constructor(private readonly geminiClient: GeminiLlmService) {}

  async evaluatePolicy(content: string, url?: string): Promise<DrlPolicyOutput> {
    const systemInstruction = `
Bạn là AI Specialist chuyên về "Quy chế Điểm Rèn Luyện (ĐRL) Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM" (HCMUS DRL Policy Evaluator).
Căn cứ: Quyết định số 1028/QĐ-KHTN-CTSV và dữ liệu thực tế từ Hệ thống Điểm rèn luyện HCMUS (hcmus.drl.vn).

Nhiệm vụ: Đối chiếu nội dung sự kiện với Khung điểm chi tiết của HCMUS, xác định ĐÚNG 1 ĐIỀU KHOẢN DUY NHẤT (clauseNumber, subClauseCode) và điểm cộng chính xác:

BẢNG QUY CHUẨN ĐIỀU KHOẢN VÀ ĐIỂM SỐ HCMUS:
1. NỘI DUNG 1 (Học tập & NCKH - Tối đa 30đ):
   - Mục 1.8: Sinh hoạt thường xuyên tại Thư viện, CLB học thuật, PTN -> +5đ
   - Mục 1.9: Hội thảo, Tech Talk công nghệ (DSA, AI thực chiến, System Design...), chuyên đề học thuật, ôn thi môn học cuối kỳ -> +5đ
   - Mục 1.6: Cuộc thi học thuật cấp Khoa trở lên (IT Challenge, Hackathon, Thách thức...) -> +5đ
   - Mục 1.5: Tác giả đề tài Nghiên cứu khoa học / Khóa luận tốt nghiệp -> +15đ

2. NỘI DUNG 2 (Nội quy & Quy chế - Tối đa 20đ):
   - Mục 2.2: Tham gia đánh giá môn học học kỳ -> +5đ
   - Mục 2.3: Tham gia các đợt khảo sát, điều tra xã hội (Khảo sát sự hài lòng người học, khảo sát IR3, khảo sát ĐHQG...) -> +5đ

3. NỘI DUNG 3 (Chính trị - Xã hội, Văn hóa, Thể thao - Tối đa 25đ):
   - Mục 3.1: Cuộc thi trực tuyến / Hội thi tìm hiểu chính trị, tư tưởng Bác, lịch sử Đảng, an toàn thông tin mạng, Unlock the Rules, Nghị quyết TW:
     + Do cấp TRƯỜNG / Đoàn - Hội Trường / Phòng CTSV tổ chức -> +10 ĐIỂM!
     + Do cấp KHOA / Liên chi hội / Chi đoàn tổ chức -> +5 ĐIỂM!
   - Mục 3.2: Thể dục thể thao, giải chạy bộ sinh viên (Fitus, UPRACE...), kiểm tra thể lực -> +5đ
   - Mục 3.5: Talkshow kỹ năng mềm, Workshop phát triển bản thân, Chuyên đề chính trị - xã hội, Tham quan bảo tàng, Hoạt động văn hóa - văn nghệ, Chào mừng 20-11, US nhập ngũ, Tìm hiểu ATGT, Hội thao điện tử -> +5đ
   - Mục 3.8: Tư vấn tuyển sinh, Ngày hội việc làm (Job Fair) -> +5đ
   - Mục 3.11: Sản phẩm / Dự án truyền thông quảng bá Nhà trường -> +15đ

4. NỘI DUNG 4 (Cộng đồng & Tình nguyện - Tối đa 25đ):
   - Mục 4.2: Hiến máu tình nguyện (có giấy chứng nhận) -> +10 ĐIỂM!
   - Mục 4.3: Tình nguyện viên vì cộng đồng ngắn hạn (<24h), bảo vệ môi trường, Clean4Green, Chủ nhật xanh -> +5 ĐIỂM!
   - Mục 4.5: Quyên góp, gây quỹ từ thiện, nuôi heo đất, tập sách trao em cho chiến dịch Xuân tình nguyện, Mùa hè xanh, ủng hộ đồng bào -> +3 ĐIỂM!
   - Mục 4.6: Cuộc thi/chương trình tuyên truyền Hiến pháp, văn bản luật nơi cư trú -> +10đ

5. NỘI DUNG 5 (Khuyến khích & Khen thưởng - Tối đa 30đ):
   - Mục 5.2: Đạt giải cuộc thi cấp Khoa trở lên (Nhất: +5đ, Nhì/Ba/KK: +3đ)
   - Mục 5.3: Đội tuyển Olympic / Giải thưởng cấp Thành -> +15đ
   - Mục 5.4: Bài báo khoa học quốc tế uy tín / Hội thảo quốc tế -> +25đ
   - Mục 5.5: Bài báo khoa học trong nước uy tín / Hội thảo quốc gia -> +15đ

QUY TẮC BẮT BUỘC:
- Nếu bài viết ghi rõ cụ thể số điểm ĐRL (Ví dụ: "+5đ ĐRL", "cộng 10 điểm ĐRL", "Nội dung 1 (+5 điểm)"): Ưu tiên số điểm được công bố chính thức này.
- Không gán nhiều clause mâu thuẫn. Chọn ĐÚNG 1 subClauseCode phù hợp nhất theo bản chất hoạt động.
`;

    const prompt = `
Nội dung sự kiện cần đánh giá ĐRL:
---
${content}
---

Trả về JSON schema:
{
  "clauseNumber": number (1 đến 5),
  "subClauseCode": string (ví dụ: "3.1", "3.5", "1.9", "4.5", "4.3", "4.2", "2.3", "1.8", "3.2"),
  "awardedPoints": number,
  "subCategory": string (Ví dụ: "Cuộc thi trực tuyến cấp Trường (Mục 3.1)", "Talkshow kỹ năng mềm (Mục 3.5)", "Quyên góp tình nguyện (Mục 4.5)"),
  "rationale": string (Căn cứ theo quy chế 1028 và dữ liệu hệ thống ĐRL HCMUS),
  "confidence": number
}
`;

    const res = await this.geminiClient.generateJson<DrlPolicyOutput>(prompt, systemInstruction);
    if (!res) {
      return {
        clauseNumber: 3,
        subClauseCode: '3.5',
        awardedPoints: 5,
        subCategory: 'Hoạt động phong trào sinh viên',
        rationale: 'Fallback tiêu chuẩn ND3 Mục 3.5',
        confidence: 0.5,
      };
    }

    return {
      clauseNumber: Number(res.clauseNumber) || 3,
      subClauseCode: res.subClauseCode || '3.5',
      awardedPoints: Number(res.awardedPoints) || 5,
      subCategory: res.subCategory || 'Hoạt động rèn luyện',
      rationale: res.rationale || '',
      confidence: res.confidence || 0.9,
    };
  }
}
