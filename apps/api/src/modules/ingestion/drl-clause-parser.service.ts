import { Injectable } from '@nestjs/common';
import { DrlClause, HCMUS_DRL_CONFIG } from '@drl-hub/shared-types';

export interface DetectedClause {
  clause: DrlClause;
  clauseName: string;
  subCategory?: string;
  confidence: number;
  points: number;
}

export interface ParseResult {
  detectedClauses: DetectedClause[];
  extractedDeadline?: string;
}

@Injectable()
export class DrlClauseParserService {
  parse(text: string): ParseResult {
    const detectedClauses: DetectedClause[] = [];
    const normalized = text.toLowerCase();

    // 1. Regex bóc tách số điểm cụ thể (ví dụ: "cộng 5 điểm", "được 3 đrl", "+10 điểm", "5đrl")
    const pointsRegex = /(?:cộng|được|\+)\s*(\d{1,2})\s*(?:điểm|đrl)|(\d{1,2})\s*(?:điểm\s+rèn\s+luyện|điểm\s+đrl)/gi;
    let explicitPoints: number | null = null;
    const pointsMatch = pointsRegex.exec(normalized);
    if (pointsMatch) {
      explicitPoints = parseInt(pointsMatch[1] || pointsMatch[2], 10);
    }

    // 2. Phân loại theo 5 Nội dung của HCMUS

    // [Nội dung 1: Tham gia học tập & NCKH - Max 30đ]
    // Cuộc thi học thuật (+5đ), NCKH (+15đ), CLB học thuật (+5đ), Hội thảo/Chuyên đề (+5đ)
    if (/nội\s*dung\s*1|học\s*thuật|nghiên\s*cứu\s*khoa\s*học|nckh|seminar|hội\s*thảo|chuyên\s*đề|học\s*tập|clb\s*học\s*thuật|phòng\s*thí\s*nghiệm|ptn/i.test(normalized)) {
      let pts = explicitPoints || 5;
      let subCategory = 'Hoạt động học thuật / Hội thảo / NCKH';
      if (/nghiên\s*cứu\s*khoa\s*học|nckh/i.test(normalized)) {
        pts = explicitPoints || 15;
        subCategory = 'Đề tài Nghiên cứu khoa học';
      }
      detectedClauses.push({
        clause: DrlClause.ND1_HOC_TAP,
        clauseName: HCMUS_DRL_CONFIG[DrlClause.ND1_HOC_TAP].name,
        subCategory,
        confidence: /nội\s*dung\s*1/i.test(normalized) ? 0.98 : 0.85,
        points: pts,
      });
    }

    // [Nội dung 2: Chấp hành nội quy, quy chế trong Nhà trường - Max 20đ]
    // Đánh giá môn học (+5đ), Khảo sát/Điều tra xã hội (+5đ), Nội quy (+15đ)
    if (/nội\s*dung\s*2|khảo\s*sát|điều\s*tra\s*xã\s*hội|đánh\s*giá\s*môn\s*học|nội\s*quy|quy\s*chế|sinh\s*hoạt\s*công\s*dân/i.test(normalized)) {
      detectedClauses.push({
        clause: DrlClause.ND2_NOI_QUY,
        clauseName: HCMUS_DRL_CONFIG[DrlClause.ND2_NOI_QUY].name,
        subCategory: 'Khảo sát / Đánh giá môn học / Chấp hành nội quy',
        confidence: /nội\s*dung\s*2/i.test(normalized) ? 0.98 : 0.8,
        points: explicitPoints || 5,
      });
    }

    // [Nội dung 3: Chính trị - xã hội, văn hóa, thể thao, phòng chống tệ nạn - Max 25đ]
    // Cuộc thi CT-VH-TT (5-10đ), Ngày hội thể thao/thể lực (+5đ), Tư vấn tuyển sinh/Ngày hội việc làm (+5đ),
    // Đối thoại lãnh đạo (+5đ), Dự án truyền thông (+15đ), Giao lưu quốc tế (10-15đ), CLB sở thích (+5đ), Huy động lực lượng (+5đ)
    if (/nội\s*dung\s*3|văn\s*nghệ|thể\s*thao|hội\s*thao|thể\s*lực|tư\s*vấn\s*tuyển\s*sinh|ngày\s*hội\s*việc\s*làm|chính\s*trị|đối\s*thoại|giao\s*lưu\s*quốc\s*tế|truyền\s*thông|huy\s*động\s*lực\s*lượng/i.test(normalized)) {
      let pts = explicitPoints || 5;
      let subCategory = 'Văn hóa - Thể thao - Chính trị xã hội';
      if (/giao\s*lưu\s*quốc\s*tế/i.test(normalized)) {
        pts = explicitPoints || 10;
        subCategory = 'Giao lưu / Trao đổi quốc tế';
      } else if (/truyền\s*thông/i.test(normalized)) {
        pts = explicitPoints || 15;
        subCategory = 'Sản phẩm / Dự án truyền thông Trường/ĐHQG';
      }
      detectedClauses.push({
        clause: DrlClause.ND3_HOAT_DONG,
        clauseName: HCMUS_DRL_CONFIG[DrlClause.ND3_HOAT_DONG].name,
        subCategory,
        confidence: /nội\s*dung\s*3/i.test(normalized) ? 0.98 : 0.85,
        points: pts,
      });
    }

    // [Nội dung 4: Xây dựng và phát triển cộng đồng - Max 25đ]
    // Hiến máu tình nguyện (+10đ), Tình nguyện viên vì cộng đồng (5-15đ), Quyên góp (+3đ),
    // Xuân tình nguyện / Mùa hè xanh / Tiếp sức mùa thi, Tuyên truyền pháp luật (+10đ), Ban cán sự/Đoàn viên XS (+10đ)
    if (/nội\s*dung\s*4|hiến\s*máu|tình\s*nguyện|xuân\s*tình\s*nguyện|mùa\s*hè\s*xanh|tiếp\s*sức\s*mùa\s*thi|quyên\s*góp|cộng\s*đồng|đoàn\s*viên\s*xuất\s*sắc|ban\s*cán\s*sự/i.test(normalized)) {
      let pts = explicitPoints || 10;
      let subCategory = 'Hoạt động tình nguyện vì cộng đồng';
      if (/hiến\s*máu/i.test(normalized)) {
        pts = explicitPoints || 10;
        subCategory = 'Hiến máu tình nguyện';
      } else if (/quyên\s*góp/i.test(normalized)) {
        pts = explicitPoints || 3;
        subCategory = 'Quyên góp / Ủng hộ';
      }
      detectedClauses.push({
        clause: DrlClause.ND4_CONG_DONG,
        clauseName: HCMUS_DRL_CONFIG[DrlClause.ND4_CONG_DONG].name,
        subCategory,
        confidence: /nội\s*dung\s*4/i.test(normalized) ? 0.98 : 0.9,
        points: pts,
      });
    }

    // [Nội dung 5: Khuyến khích cộng thêm - Max 30đ]
    // Khen thưởng/Giải thưởng quốc gia/quốc tế/ĐHQG (5-20đ), Giải cuộc thi cấp khoa trở lên (3-5đ),
    // Olympic/Cuộc thi cấp Thành (+15đ), Bài báo khoa học quốc tế (+25đ), Bài báo trong nước (+15đ), Học bổng vượt khó (+10đ)
    if (/nội\s*dung\s*5|khen\s*thưởng|đạt\s*giải|giải\s*thưởng|olympic|bài\s*báo.*quốc\s*tế|bài\s*báo.*khoa\s*học|học\s*bổng\s*vượt\s*khó|thành\s*tích\s*xuất\s*sắc/i.test(normalized)) {
      let pts = explicitPoints || 5;
      let subCategory = 'Giải thưởng / Khen thưởng / Bài báo khoa học';
      if (/bài\s*báo.*quốc\s*tế/i.test(normalized)) {
        pts = explicitPoints || 25;
        subCategory = 'Bài báo khoa học quốc tế';
      } else if (/olympic/i.test(normalized)) {
        pts = explicitPoints || 15;
        subCategory = 'Đội tuyển Olympic / Cuộc thi cấp Thành';
      }
      detectedClauses.push({
        clause: DrlClause.ND5_KHUYEN_KHICH,
        clauseName: HCMUS_DRL_CONFIG[DrlClause.ND5_KHUYEN_KHICH].name,
        subCategory,
        confidence: /nội\s*dung\s*5/i.test(normalized) ? 0.98 : 0.85,
        points: pts,
      });
    }

    // 3. Regex bóc tách Deadline (dd/mm/yyyy hoặc dd-mm-yyyy)
    const deadlineRegex = /(?:hạn\s*chót(?:\s*đăng\s*ký)?|hạn\s*đăng\s*ký|deadline|đến\s*hết\s*ngày)[\s:]*([0-3]?\d[./\-][0-1]?\d[./\-]\d{4})/i;
    const deadlineMatch = normalized.match(deadlineRegex);
    let extractedDeadline: string | undefined;
    if (deadlineMatch && deadlineMatch[1]) {
      extractedDeadline = deadlineMatch[1];
    }

    return {
      detectedClauses,
      extractedDeadline,
    };
  }
}
