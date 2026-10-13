import { Injectable, Logger } from '@nestjs/common';
import { GeminiLlmService } from '../gemini-llm.service';
import { EntityExtractionOutput } from './agent.types';

@Injectable()
export class ExtractorAgentService {
  private readonly logger = new Logger(ExtractorAgentService.name);

  constructor(private readonly geminiClient: GeminiLlmService) {}

  async extractEntities(content: string, url?: string): Promise<EntityExtractionOutput> {
    const systemInstruction = `
Bạn là AI Specialist chuyên về "Bóc tách Thực thể Sự kiện" (Entity & Metadata Extraction).
Nhiệm vụ DUY NHẤT của bạn là trích xuất chính xác các trường thông tin cụ thể từ bài viết Facebook / bài đăng web sự kiện:
1. title: Tiêu đề chính thức của sự kiện (loại bỏ tên fanpage, râu ria "người theo dõi", các tag rác, chỉ giữ tên chương trình, ví dụ: "ĐƯỜNG CHẠY SINH VIÊN: UPRACExHCMUS CAMPUS RUN 2026").
2. registrationDeadline: Hạn chót đóng đơn / form đăng ký (dạng dd/mm/yyyy nếu có).
3. eventDate: Ngày diễn ra sự kiện (dạng dd/mm/yyyy). Chú ý PHÂN BIỆT RÕ giữa Ngày diễn ra sự kiện và Hạn chót đăng ký.
4. eventTime: Khung giờ diễn ra sự kiện (ví dụ: "06g30", "08H00 - 11H30").
5. location: Địa điểm tổ chức chi tiết (ví dụ: "Khuôn viên Trường ĐH Khoa học tự nhiên, cơ sở Thủ Đức", "Hội trường I - Cơ sở 227 Nguyễn Văn Cừ").
6. registrationLink: Link form đăng ký (Google form, bit.ly, hoặc link website ctsv/khoa).
7. confidence: Độ tin cậy từ 0.0 đến 1.0.

Trả về kết quả bằng JSON duy nhất.
`;

    const prompt = `
Bài viết cần bóc tách:
---
${content}
---
Link đính kèm: ${url || ''}

Trả về JSON schema:
{
  "title": string,
  "registrationDeadline": string | null,
  "eventDate": string | null,
  "eventTime": string | null,
  "location": string | null,
  "registrationLink": string | null,
  "confidence": number
}
`;

    const res = await this.geminiClient.generateJson<EntityExtractionOutput>(prompt, systemInstruction);
    if (!res) {
      return {
        title: '',
        confidence: 0.5,
      };
    }

    return {
      title: res.title || '',
      registrationDeadline: res.registrationDeadline || undefined,
      eventDate: res.eventDate || undefined,
      eventTime: res.eventTime || undefined,
      location: res.location || undefined,
      registrationLink: res.registrationLink || undefined,
      confidence: res.confidence || 0.9,
    };
  }
}
