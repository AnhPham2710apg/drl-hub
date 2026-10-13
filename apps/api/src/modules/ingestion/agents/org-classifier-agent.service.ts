import { Injectable, Logger } from '@nestjs/common';
import { GeminiLlmService } from '../gemini-llm.service';
import { OrgClassificationOutput } from './agent.types';

@Injectable()
export class OrgClassifierAgentService {
  private readonly logger = new Logger(OrgClassifierAgentService.name);

  constructor(private readonly geminiClient: GeminiLlmService) {}

  async classifyOrganization(content: string, url?: string): Promise<OrgClassificationOutput> {
    const systemInstruction = `
Bạn là AI Specialist chuyên về "Cơ cấu Tổ chức và Địa điểm HCMUS" (HCMUS Organization & Venue Specialist).
Nhiệm vụ DUY NHẤT của bạn là thẩm định đơn vị tổ chức, fanpage slug và cơ sở tổ chức:

1. KHOA CHUYÊN NGÀNH (faculty):
   - 'diachat': Khoa Địa chất (slug: dk.lch.diachatkhtn, dtl.geology...)
   - 'cntt': Khoa Công nghệ Thông tin (slug: btc.doankhoa.cntt, clb.tinhochcmus...)
   - 'toantin': Khoa Toán - Tin học (slug: doanhoi.toantin...)
   - 'vatly': Khoa Vật lý - Vật lý Kỹ thuật
   - 'hoahoc': Khoa Hóa học
   - 'sinhhoc': Khoa Sinh học - CNSH
   - 'moitruong': Khoa Môi trường
   - 'vatlieu': Khoa Khoa học & Công nghệ Vật liệu
   - 'dientu': Khoa Điện tử - Viễn thông
   - 'liennganh': Sự kiện phối hợp giữa nhiều khoa
   - 'all': Đơn vị cấp Toàn trường (Phòng CTSV, Ban Cán sự Đoàn trường, Hội Sinh viên Trường, NVHSV, TT QL KTX...)

2. CẤP TỔ CHỨC (orgLevel) - CỰC KỲ QUAN TRỌNG:
   - 'clb' (Câu Lạc Bộ / Đội / Nhóm sinh viên): Bất cứ khi nào đơn vị có từ "CLB", "Câu lạc bộ", "Đội", "Nhóm", "Dự án sinh viên", "CLB Tin học", "CLB Tiếng Anh", "CLB Kỹ năng", dù CLB đó trực thuộc Khoa CNTT hay Khoa Địa chất thì orgLevel BẮT BUỘC là 'clb'.
   - 'khoa' (Cấp Khoa): Chỉ dành riêng cho Ban Chủ nhiệm Khoa, Đoàn Khoa, hoặc Liên chi hội Sinh viên Khoa (ví dụ: "Đoàn Khoa Địa chất", "LCH Khoa CNTT"). Không phải CLB!
   - 'truong' (Cấp Trường / ĐHQG): Ban Giám hiệu, Phòng Công tác Sinh viên (CTSV / osa.hcmus), Đoàn Trường, Hội Sinh viên Trường, NVHSV, ĐHQG-HCM.

3. CƠ SỞ (campus):
   - 'cs1': 227 Nguyễn Văn Cừ, Quận 5 (Hội trường I, Giảng đường 2, Tòa nhà A/B/C/D...).
   - 'cs2': Cơ sở Linh Trung - Thủ Đức / ĐHQG (Nhà F, Giảng đường 1, Khuôn viên KHTN Thủ Đức...).
   - 'external': Địa điểm ngoài trường (Nhà Văn hóa Sinh viên TP.HCM, ĐH Bách Khoa, NVH Thanh Niên, các tỉnh thành tình nguyện...).
   - 'online': MS Teams, Google Meet, Zoom, Livestream.

4. HÌNH THỨC (format):
   - 'offline' | 'online' | 'hybrid'
`;

    const prompt = `
Bài viết và Fanpage Slug cần phân loại:
---
${content}
---
Link đính kèm: ${url || ''}

Trả về JSON schema:
{
  "faculty": "diachat" | "cntt" | "toantin" | "vatly" | "hoahoc" | "sinhhoc" | "moitruong" | "vatlieu" | "dientu" | "liennganh" | "all",
  "orgLevel": "truong" | "khoa" | "clb",
  "campus": "cs1" | "cs2" | "external" | "online",
  "format": "offline" | "online" | "hybrid",
  "organizerName": string,
  "confidence": number,
  "reasoning": string
}
`;

    const res = await this.geminiClient.generateJson<OrgClassificationOutput>(prompt, systemInstruction);
    if (!res) {
      return {
        faculty: 'all',
        orgLevel: 'truong',
        campus: 'cs1',
        format: 'offline',
        confidence: 0.5,
        reasoning: 'Fallback do không nhận được phản hồi',
      };
    }

    return {
      faculty: res.faculty || 'all',
      orgLevel: res.orgLevel || 'truong',
      campus: res.campus || 'cs1',
      format: res.format || 'offline',
      organizerName: res.organizerName || undefined,
      confidence: res.confidence || 0.9,
      reasoning: res.reasoning || '',
    };
  }
}
