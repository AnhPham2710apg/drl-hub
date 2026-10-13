import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DrlClause } from '@drl-hub/shared-types';

export interface GeminiExtractionResult {
  title: string;
  summary?: string;
  clauseNumber: number;
  awardedPoints: number;
  subCategory?: string;
  registrationDeadline?: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  registrationLink?: string;
  faculty: string;
  orgLevel: string;
  campus: string;
  format: string;
}

@Injectable()
export class GeminiLlmService {
  private readonly logger = new Logger(GeminiLlmService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY || '';
  private readonly modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  private readonly candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  /**
   * Phương thức chung cho các Sub-Agent gọi Gemini API với systemInstruction và schema JSON
   */
  async generateJson<T>(prompt: string, systemInstruction: string, timeoutMs: number = 12000): Promise<T | null> {
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. Skipping AI generation.');
      return null;
    }

    for (const model of this.candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const response = await axios.post(
          endpoint,
          {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          },
          { timeout: timeoutMs },
        );

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;
        return JSON.parse(rawText) as T;
      } catch (error: any) {
        const errMsg = error.response?.data?.error?.message || error.message;
        this.logger.warn(`Gemini call with model "${model}" failed (${errMsg}). Trying next model...`);
      }
    }

    this.logger.error('All candidate Gemini models failed.');
    return null;
  }

  /**
   * Gọi trực tiếp Gemini LLM API của Google để đọc hiểu toàn văn bài viết và trích xuất chuẩn xác (Legacy fallback)
   */
  async extractEvent(content: string, url?: string): Promise<GeminiExtractionResult | null> {
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. Skipping AI LLM extraction.');
      return null;
    }

    const systemInstruction = `
Bạn là Trợ lý AI chuyên gia phân loại Điểm Rèn Luyện (ĐRL) của Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM (HCMUS), dựa trên Quy chế Đánh giá Kết quả Rèn luyện Sinh viên và Sổ tay Sinh viên HCMUS.

Nhiệm vụ của bạn là đọc hiểu toàn văn bài viết sự kiện từ mạng xã hội (Facebook/Web) và trích xuất dữ liệu chuẩn xác cấu trúc JSON.

QUY TẮC PHÂN LOẠI CHI TIẾT THEO QUY CHẾ ĐRL HCMUS:

1. NỘI DUNG ĐÁNH GIÁ ĐRL (clauseNumber: 1..5 & awardedPoints):
   - Nội dung 1: Đánh giá về ý thức học tập, NCKH (Tối đa 30đ)
     + Tham gia các cuộc thi học thuật các cấp (Thách thức, Hackathon, Olympic Tin học/Toán/Vật lý/Hóa học...): +5đ
     + Tham gia NCKH sinh viên, báo cáo đề tài, seminar khoa học: +15đ
     + Tham gia Chuyên đề học thuật, Workshop công nghệ/kỹ thuật số, Hội thảo khoa học, Talkshow chia sẻ tri thức: +5đ
     + Thành viên CLB học thuật tham gia sinh hoạt định kỳ: +5đ
   
   - Nội dung 2: Đánh giá về ý thức chấp hành pháp luật và nội quy, quy chế (Tối đa 20đ)
     + Tham gia khảo sát, lấy ý kiến phản hồi về hoạt động giảng dạy môn học (Khảo sát môn học trực tuyến): +5đ
     + Tham gia Tuần sinh hoạt công dân - sinh viên đầu/giữa/cuối khóa: +5đ
     + Không vi phạm nội quy, quy chế thi cử, quy định ký túc xá: +10đ đến +15đ

   - Nội dung 3: Đánh giá về ý thức tham gia các hoạt động chính trị, xã hội, văn hóa, văn nghệ, thể thao, phòng chống tội phạm và các tệ nạn xã hội (Tối đa 25đ)
     + Tham gia các hoạt động văn nghệ, thể thao, hội thao, giải chạy sinh viên: +5đ
     + Tham gia Ngày hội văn hóa, Ngày hội chào đón tân sinh viên, Ngày hội việc làm: +5đ
     + Tham gia Talkshow kỹ năng mềm, diễn đàn, giao lưu văn hóa, đối thoại lãnh đạo: +5đ
     + Tham gia các hoạt động tư vấn tuyển sinh, hỗ trợ ngày hội học sinh: +5đ
     + Dự án truyền thông, đại sứ sinh viên, cuộc thi tìm hiểu chính trị, pháp luật: +5đ đến +15đ

   - Nội dung 4: Đánh giá về ý thức công dân trong quan hệ cộng đồng, hoạt động tình nguyện (Tối đa 25đ)
     + Tham gia Hiến máu tình nguyện: +10đ
     + Tham gia chiến dịch tình nguyện Mùa hè xanh, Xuân tình nguyện, Tiếp sức mùa thi, CTXH: +10đ đến +15đ
     + Hoạt động quyên góp, gây quỹ từ thiện, hỗ trợ đồng bào bão lũ: +3đ đến +5đ
     + Tuyên truyền, bảo vệ môi trường, dọn dẹp vệ sinh khuôn viên/cộng đồng: +5đ

   - Nội dung 5: Đánh giá về ý thức và kết quả khi tham gia công tác phụ trách lớp, các đoàn thể, tổ chức trong Nhà trường hoặc đạt thành tích đặc biệt (Tối đa 30đ)
     + Đạt giải thưởng trong các cuộc thi cấp Trường, cấp ĐHQG, cấp Quốc gia/Quốc tế: +5đ đến +20đ
     + Được khen thưởng gương Sinh viên 5 tốt, Thanh niên tiên tiến làm theo lời Bác: +10đ đến +20đ
     + Có bài báo công bố trên tạp chí khoa học trong nước (+15đ), quốc tế Scopus/WoS (+25đ)
     + Ban cán sự lớp, Cán bộ Đoàn - Hội hoàn thành tốt nhiệm vụ: +10đ

2. PHÂN LOẠI KHOA / ĐƠN VỊ TỔ CHỨC (faculty):
   - 'diachat': Khoa Địa chất (từ khóa: Geo, Địa chất, BTL Địa chất, CLB Địa chất...)
   - 'cntt': Khoa Công nghệ Thông tin (từ khóa: FIT, FIT-HCMUS, Khoa CNTT, CLB Tin học, GDSC, CLB Học thuật FIT...). Chú ý: nếu là trường ĐH CNTT (UIT) thì là 'all' cấp ĐHQG.
   - 'toantin': Khoa Toán - Tin học (FMT, CLB Toán - Tin, CLB Nghiên cứu Toán...)
   - 'vatly': Khoa Vật lý - Vật lý Kỹ thuật (Phys, NES, CLB Vật lý...)
   - 'hoahoc': Khoa Hóa học (Chem, CLB Hóa học, Sinh viên Hóa học...)
   - 'sinhhoc': Khoa Sinh học - Công nghệ Sinh học (FBB, CNSH, CLB Sinh học...)
   - 'moitruong': Khoa Môi trường (FES, CLB Môi trường...)
   - 'vatlieu': Khoa Khoa học & Công nghệ Vật liệu (FMS)
   - 'dientu': Khoa Điện tử - Viễn thông (FETEL, CLB Điện tử...)
   - 'liennganh': Khoa Khoa học Liên ngành (FIS)
   - 'all': Đơn vị chung / Cấp Trường / Cấp ĐHQG. Bao gồm: Đoàn Trường HCMUS, Hội Sinh viên HCMUS, Phòng CTSV, Phòng Đào tạo, KTX ĐHQG, Thư viện Trung tâm ĐHQG, Nhà Văn hóa Sinh viên TP.HCM (NVHSV), Thành Đoàn...

3. NGUYÊN TẮC PHÂN BIỆT CẤP TỔ CHỨC (orgLevel): 'truong' | 'khoa' | 'clb':
   RẤT QUAN TRỌNG - Hãy phân tích chính xác ai là chủ thể tổ chức:

   a) orgLevel = 'clb' (Cấp CLB / Đội / Nhóm sinh viên):
      - Khi đơn vị chủ trì là Câu lạc bộ, Đội, Nhóm sinh viên (chứa các từ khóa: "CLB", "Câu lạc bộ", "Đội", "Nhóm", "Ban", "Team", "Club").
      - Ví dụ: "CLB Tin học", "CLB Tiếng Anh", "CLB Kỹ năng", "CLB Guitar", "Đội Công tác xã hội", "CLB Sách", "Ban Học tập Khoa...", "GDSC - HCMUS"...
      - LƯU Ý ĐẶC BIỆT: Nếu CLB trực thuộc một Khoa (ví dụ CLB Tin học trực thuộc Khoa CNTT), thì:
        + faculty = 'cntt'
        + orgLevel = 'clb' (KHÔNG ĐƯỢC CHỌN LÀ 'khoa', vì đây là tổ chức sinh viên CLB).

   b) orgLevel = 'khoa' (Cấp Khoa / Đoàn Khoa / Liên chi hội):
      - Khi đơn vị chủ trì là Ban Chủ nhiệm Khoa, Đoàn Khoa, Liên chi đoàn (LCĐ), Liên chi hội sinh viên Khoa (LCH), Đoàn - Hội cơ sở cấp Khoa.
      - Ví dụ: "Đoàn Khoa Công nghệ Thông tin", "Liên chi hội Khoa Địa chất", "Đoàn Khoa Hóa học", "Khoa Toán - Tin học", "LCH Khoa Sinh học"...
      - Đây là tổ chức chính thống cấp Khoa, KHÔNG PHẢI là một CLB hay Đội nhóm sinh viên.

   c) orgLevel = 'truong' (Cấp Trường / ĐHQG-HCM / Đơn vị cấp Đại học):
      - Khi đơn vị chủ trì là Đoàn Trường HCMUS, Hội Sinh viên Trường HCMUS, Phòng/Ban chức năng Nhà trường (Phòng CTSV, Đào tạo, TTQLKTX...), Nhà Văn hóa Sinh viên TP.HCM (NVHSV), hoặc sự kiện liên trường cấp ĐHQG-HCM.

4. CƠ SỞ TỔ CHỨC (campus):
   - 'cs1': Cơ sở 1 (227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM, Hội trường I, Giảng đường 2)
   - 'cs2': Cơ sở 2 (Khu phố 6, Linh Trung, TP. Thủ Đức hoặc Đông Hòa, Dĩ An, Bình Dương, Nhà F, phòng F104, Giảng đường 1)
   - 'external': Ngoài các cơ sở của trường (Tổ chức tại NVHSV, THPT Phước Bửu, Trường ĐH khác như UIT/BK, địa bàn tình nguyện tỉnh/thành khác, Mái ấm...)
   - 'online': Tổ chức trực tuyến (MS Teams, Zoom, Google Meet, Livestream)

5. HÌNH THỨC TỔ CHỨC (format):
   - 'offline': Tổ chức trực tiếp tại địa điểm cụ thể
   - 'online': Trực tuyến hoàn toàn
   - 'hybrid': Kết hợp trực tiếp và trực tuyến

LƯU Ý QUAN TRỌNG:
- Loại bỏ toàn bộ phần râu ria giới thiệu Fanpage như "x người theo dõi", "quảng cáo", các hashtag không liên quan.
- Lấy đúng Tên chính thức của Sự kiện làm Title.
- Nếu bài viết ghi rõ số điểm ĐRL (ví dụ: "+5đ ĐRL", "cộng 10 điểm"), hãy lấy chính xác số điểm đó làm awardedPoints.
- Nhận diện đúng ngày (dd/mm/yyyy), giờ (vd: 08H00 - 11H30) và địa điểm tổ chức thực tế.
`;

    const prompt = `
Bài viết cần phân tích:
---
${content}
---
Link bài viết (nếu có): ${url || ''}

Trả về JSON duy nhất với cấu trúc sau:
{
  "title": string (Tiêu đề chính thức của sự kiện),
  "clauseNumber": number (1 đến 5),
  "awardedPoints": number (Điểm cộng ĐRL dự kiến, thường là 5 hoặc 10),
  "subCategory": string (Tên danh mục ngắn gọn),
  "registrationDeadline": string (Hạn chót đăng ký nếu có, vd "20/10/2026"),
  "eventDate": string (Ngày diễn ra sự kiện, vd "17/10/2026"),
  "eventTime": string (Khung giờ diễn ra, vd "08H00 – 10H00"),
  "location": string (Địa điểm tổ chức cụ thể),
  "registrationLink": string (Link form Google Form/bit.ly nếu có),
  "faculty": "diachat" | "cntt" | "toantin" | "vatly" | "hoahoc" | "sinhhoc" | "moitruong" | "vatlieu" | "dientu" | "liennganh" | "all",
  "orgLevel": "truong" | "khoa" | "clb",
  "campus": "cs1" | "cs2" | "external" | "online",
  "format": "offline" | "online" | "hybrid"
}
`;

    for (const model of this.candidateModels) {
      try {
        this.logger.log(`Calling Gemini API (${model}) for event extraction...`);

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const response = await axios.post(
          endpoint,
          {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          },
          { timeout: 15000 },
        );

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const parsed: GeminiExtractionResult = JSON.parse(rawText);
        this.logger.log(`Successfully extracted event via Gemini (${model}): "${parsed.title}" (ND${parsed.clauseNumber}, +${parsed.awardedPoints}đ)`);
        return parsed;
      } catch (error: any) {
        const errMsg = error.response?.data?.error?.message || error.message;
        this.logger.warn(`Gemini extraction with model "${model}" failed (${errMsg}). Trying next model...`);
      }
    }

    this.logger.error('All candidate Gemini models failed in extractEvent.');
    return null;
  }
}
