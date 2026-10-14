import { Injectable } from '@nestjs/common';
import { DrlClause, HCMUS_DRL_CONFIG } from '@drl-hub/shared-types';

export interface DetectedClause {
  clause: DrlClause;
  clauseName: string;
  subClauseCode?: string;
  subCategory?: string;
  confidence: number;
  points: number;
}

export interface ParseResult {
  detectedClauses: DetectedClause[];
  extractedDeadline?: string;
  extractedDate?: string;
  extractedTime?: string;
  extractedLocation?: string;
  extractedRegistrationLink?: string;
  suggestedFaculty?: string;
  suggestedOrgLevel?: string;
  suggestedCampus?: string;
  suggestedFormat?: string;
}

@Injectable()
export class DrlClauseParserService {
  parse(text: string): ParseResult {
    const normalized = text.toLowerCase();

    // 0. Suy luận phân loại Đơn vị, Cấp tổ chức, Cơ sở và Hình thức theo chuẩn HCMUS trước
    // Cần metadata.orgLevel để phân biệt cuộc thi 3.1 Cấp Trường (10đ) vs Cấp Khoa (5đ)
    const preliminaryMetadata = this.inferMetadata(text);

    // 1. Regex bóc tách số điểm ĐRL cụ thể:
    // Loại trừ bẫy câu hỏi trắc nghiệm như "được 1 điểm cho mỗi câu", "mỗi câu trả lời đúng được 1 điểm"
    const cleanTextForPoints = normalized
      .replace(/mỗi\s*câu[^\n.,;]*?(?:được|\+)\s*\d+\s*điểm/gi, '')
      .replace(/\d+\s*điểm\s*(?:cho\s*mỗi\s*câu|\/\s*câu)/gi, '');

    const pointsRegex = /(?:cộng|\+)\s*(\d{1,2})\s*(?:điểm\s*(?:rèn\s*luyện|đrl)?|đrl\b)|(?:được\s+cộng\s*)(\d{1,2})\s*(?:điểm|đrl\b)|(\d{1,2})\s*(?:điểm\s*rèn\s*luyện|điểm\s*đrl|\s*đrl\b)/gi;
    let explicitPoints: number | null = null;
    const pointsMatch = pointsRegex.exec(cleanTextForPoints);
    if (pointsMatch) {
      const parsedVal = parseInt(pointsMatch[1] || pointsMatch[2] || pointsMatch[3], 10);
      if (parsedVal >= 2 && parsedVal <= 30) {
        explicitPoints = parsedVal;
      }
    }

    // 2. Kiểm tra nếu bài viết chỉ định đích danh "Nội dung X" hoặc "ND X"
    let explicitClause: DrlClause | null = null;
    if (/nội\s*dung\s*1|\bnd\s*1\b/i.test(normalized)) explicitClause = DrlClause.ND1_HOC_TAP;
    else if (/nội\s*dung\s*2|\bnd\s*2\b/i.test(normalized)) explicitClause = DrlClause.ND2_NOI_QUY;
    else if (/nội\s*dung\s*3|\bnd\s*3\b/i.test(normalized)) explicitClause = DrlClause.ND3_HOAT_DONG;
    else if (/nội\s*dung\s*4|\bnd\s*4\b/i.test(normalized)) explicitClause = DrlClause.ND4_CONG_DONG;
    else if (/nội\s*dung\s*5|\bnd\s*5\b/i.test(normalized)) explicitClause = DrlClause.ND5_KHUYEN_KHICH;

    // 3. Khung phân loại chuyên biệt theo Quy định 1028/QĐ-KHTN-CTSV và thực tế hệ thống ĐRL HCMUS
    interface CandidateClause {
      clause: DrlClause;
      subClauseCode: string;
      subCategory: string;
      defaultPoints: number;
      weight: number;
    }
    const candidates: CandidateClause[] = [];

    // [Mục 4.2] Hiến máu tình nguyện (+10đ)
    if (/hiến\s*máu|giọt\s*hồng|hiến\s*máu\s*nhân\s*đạo/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND4_CONG_DONG,
        subClauseCode: '4.2',
        subCategory: 'Hiến máu tình nguyện',
        defaultPoints: 10,
        weight: 100,
      });
    }

    // [Mục 4.5] Quyên góp / Gây quỹ từ thiện tình nguyện (+3đ)
    if (/quyên\s*góp|gây\s*quỹ|nuôi\s*heo\s*đất|tập\s*sách\s*trao\s*em|ủng\s*hộ\s*đồng\s*bào|góp\s*quỹ|quỹ\s*xuân\s*tình\s*nguyện/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND4_CONG_DONG,
        subClauseCode: '4.5',
        subCategory: 'Quyên góp / Gây quỹ từ thiện tình nguyện',
        defaultPoints: 3,
        weight: 96,
      });
    }

    // [Mục 4.3] Tình nguyện vì cộng đồng / Bảo vệ môi trường (+5đ)
    // Chỉ kích hoạt nếu không phải quyên góp đơn thuần
    if (/cleen4green|chủ\s*nhật\s*xanh|dọn\s*rác|bảo\s*vệ\s*môi\s*trường|thu\s*gom\s*pin|tình\s*nguyện\s*xanh|công\s*tác\s*xã\s*hội|chiến\s*dịch\s*tình\s*nguyện|xuân\s*tình\s*nguyện|mùa\s*hè\s*xanh|tiếp\s*sức\s*mùa\s*thi/i.test(normalized) &&
        !/quyên\s*góp|gây\s*quỹ/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND4_CONG_DONG,
        subClauseCode: '4.3',
        subCategory: 'Tình nguyện vì cộng đồng / Bảo vệ môi trường',
        defaultPoints: 5,
        weight: 88,
      });
    }

    // [Mục 2.2] Tham gia đánh giá môn học (+5đ)
    if (/đánh\s*giá\s*môn\s*học|đánh\s*giá\s*khóa\s*học/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND2_NOI_QUY,
        subClauseCode: '2.2',
        subCategory: 'Đánh giá môn học',
        defaultPoints: 5,
        weight: 95,
      });
    }

    // [Mục 2.3] Tham gia khảo sát, điều tra xã hội (+5đ)
    if (/khảo\s*sát|điều\s*tra\s*xã\s*hội|phiếu\s*khảo\s*sát|lấy\s*ý\s*kiến\s*người\s*học|trải\s*nghiệm\s*học\s*tập|khảo\s*sát\s*ir3|đề\s*án\s*đổi\s*mới/i.test(normalized) &&
        !/đánh\s*giá\s*môn\s*học/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND2_NOI_QUY,
        subClauseCode: '2.3',
        subCategory: 'Khảo sát người học / Điều tra xã hội / Đề án ĐHQG',
        defaultPoints: 5,
        weight: 94,
      });
    }

    // [Mục 3.2] Thể dục thể thao / Đường chạy / Rèn luyện thể lực (+5đ)
    if (/đường\s*chạy|uprace|chạy\s*bộ|thể\s*thao|hội\s*thao|thể\s*lực|thanh\s*niên\s*khỏe|giải\s*bóng|giải\s*cầu\s*lông|ngày\s*hội\s*thể\s*dục/i.test(normalized) &&
        !/điện\s*tử|esport/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND3_HOAT_DONG,
        subClauseCode: '3.2',
        subCategory: 'Thể dục thể thao / Đường chạy / Rèn luyện thể lực',
        defaultPoints: 5,
        weight: 90,
      });
    }

    // [Mục 3.8] Tư vấn tuyển sinh / Ngày hội việc làm (+5đ)
    if (/tư\s*vấn\s*tuyển\s*sinh|ngày\s*hội\s*việc\s*làm|job\s*fair|ngày\s*hội\s*doanh\s*nghiệp/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND3_HOAT_DONG,
        subClauseCode: '3.8',
        subCategory: 'Tư vấn tuyển sinh / Ngày hội việc làm',
        defaultPoints: 5,
        weight: 90,
      });
    }

    // [Mục 3.1] Cuộc thi trực tuyến / Hội thi tìm hiểu chính trị, an toàn mạng, pháp luật, lịch sử
    // Cấp Trường: +10đ! Cấp Khoa: +5đ!
    if (/cuộc\s*thi\s*trực\s*tuyến|hội\s*thi\s*trực\s*tuyến|unlock\s*the\s*rules|vinh\s*quang\s*dưới\s*cờ\s*đảng|không\s*một\s*mình|đại\s*hội\s*đảng|nghị\s*quyết|hành\s*trình\s*theo\s*chân\s*bác|tìm\s*hiểu\s*biển\s*đảo|hội\s*thi\s*tìm\s*hiểu|thi\s*tìm\s*hiểu|tìm\s*hiểu\s*pháp\s*luật/i.test(normalized)) {
      const isCentralOrSchool = preliminaryMetadata.orgLevel === 'truong' ||
        /trường\b|phòng\s*ctsv|ctsv|đoàn\s*trường|hội\s*sinh\s*viên\s*trường|\bhsv\b|\bđtn\b/i.test(normalized) &&
        !/đoàn\s*khoa|lch|chi\s*hội|chi\s*đoàn/i.test(normalized);

      candidates.push({
        clause: DrlClause.ND3_HOAT_DONG,
        subClauseCode: '3.1',
        subCategory: isCentralOrSchool
          ? 'Cuộc thi trực tuyến / Hội thi tìm hiểu cấp Trường'
          : 'Cuộc thi trực tuyến / Hội thi tìm hiểu cấp Khoa',
        defaultPoints: isCentralOrSchool ? 10 : 5,
        weight: 92,
      });
    }

    // [Mục 1.8] Sinh hoạt Thư viện / CLB học thuật / PTN (+5đ)
    if (/sinh\s*hoạt.*thư\s*viện|thuvien|thư\s*viện\s*trung\s*tâm|tập\s*huấn\s*kiến\s*thức\s*thông\s*tin/i.test(normalized) &&
        !/hội\s*trường\s*a\s*uit/i.test(normalized)) { // Ngoại trừ chỉ mượn địa điểm hội trường
      candidates.push({
        clause: DrlClause.ND1_HOC_TAP,
        subClauseCode: '1.8',
        subCategory: 'Sinh hoạt Thư viện / CLB học thuật / PTN',
        defaultPoints: 5,
        weight: 92,
      });
    }

    // [Mục 1.5] Đề tài Nghiên cứu khoa học (+15đ)
    if (/nghiên\s*cứu\s*khoa\s*học|\bnckh\b|đề\s*tài\s*nckh|khóa\s*luận\s*tốt\s*nghiệp/i.test(normalized) &&
        !/hội\s*thảo|workshop|talkshow/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND1_HOC_TAP,
        subClauseCode: '1.5',
        subCategory: 'Đề tài Nghiên cứu khoa học / Khóa luận',
        defaultPoints: 15,
        weight: 95,
      });
    }

    // [Mục 1.9 & 1.6] Tech Talk / Workshop Công nghệ / Cuộc thi học thuật / Ôn thi môn học (+5đ)
    if (/tech\s*talk|system\s*design|\bdsa\b|ai\s*thực\s*chiến|g-sparks|ôn\s*thi|học\s*thuật|hackathon|thách\s*thức|seminar\s*học\s*thuật|clb\s*học\s*thuật|phòng\s*thí\s*nghiệm|\bptn\b/i.test(normalized)) {
      const isAcademicContest = /cuộc\s*thi\s*học\s*thuật|hackathon|thách\s*thức/i.test(normalized);
      candidates.push({
        clause: DrlClause.ND1_HOC_TAP,
        subClauseCode: isAcademicContest ? '1.6' : '1.9',
        subCategory: isAcademicContest
          ? 'Cuộc thi học thuật cấp Khoa trở lên'
          : 'Hội thảo / Tech Talk / Chuyên đề học thuật / Ôn thi',
        defaultPoints: 5,
        weight: 87,
      });
    }

    // [Mục 3.5] Hoạt động văn hóa / Talkshow kỹ năng mềm / Chuyên đề xã hội / Tham quan bảo tàng (+5đ)
    // Bao gồm các case thực tế: Sa mạc nở hoa, DEBUG YOUR EYES, Nhìn ra thế giới, US nhập ngũ, 20-11, Bảo tàng, LUNIX...
    if (/talkshow|workshop|tọa\s*đàm|chuyên\s*đề|bảo\s*tàng|tham\s*quan|kỹ\s*năng\s*mềm|hạt\s*giống\s*đỏ|sa\s*mạc\s*nở\s*hoa|debug\s*your\s*eyes|nhìn\s*ra\s*thế\s*giới|us\s*nhập\s*ngũ|chào\s*mừng\s*ngày\s*nhà\s*giáo|20-11|together\s*asean|an\s*toàn\s*giao\s*thông|tâm\s*lý|giao\s*lưu|văn\s*hóa|văn\s*nghệ|lunix|thể\s*thao\s*điện\s*tử/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND3_HOAT_DONG,
        subClauseCode: '3.5',
        subCategory: 'Hoạt động văn hóa / Talkshow kỹ năng / Chuyên đề / Tham quan',
        defaultPoints: 5,
        weight: 82,
      });
    }

    // [Nội dung 5] Khuyến khích: Bài báo khoa học, Olympic, Khen thưởng
    if (/bài\s*báo.*quốc\s*tế|hội\s*nghị\s*quốc\s*tế/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND5_KHUYEN_KHICH,
        subClauseCode: '5.4',
        subCategory: 'Bài báo khoa học quốc tế uy tín',
        defaultPoints: 25,
        weight: 99,
      });
    } else if (/olympic|cấp\s*thành/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND5_KHUYEN_KHICH,
        subClauseCode: '5.3',
        subCategory: 'Đội tuyển Olympic / Giải thưởng cấp Thành',
        defaultPoints: 15,
        weight: 95,
      });
    } else if (/đạt\s*giải|giải\s*thưởng|khen\s*thưởng/i.test(normalized)) {
      candidates.push({
        clause: DrlClause.ND5_KHUYEN_KHICH,
        subClauseCode: '5.2',
        subCategory: 'Đạt giải cuộc thi cấp Khoa trở lên',
        defaultPoints: 5,
        weight: 80,
      });
    }

    // 4. Áp dụng ưu tiên nếu bài viết ghi rõ Nội dung X (explicitClause)
    if (explicitClause) {
      candidates.forEach((c) => {
        if (c.clause === explicitClause) {
          c.weight += 50; // Ưu tiên hàng đầu cho điều khoản ghi rõ trong thông báo
        } else {
          c.weight -= 30; // Giảm trọng số của các điều khoản khác
        }
      });

      // Nếu chưa có candidate nào khớp với explicitClause, tạo candidate mặc định cho nó
      if (!candidates.some((c) => c.clause === explicitClause)) {
        candidates.push({
          clause: explicitClause,
          subClauseCode: `${explicitClause}.1`,
          subCategory: HCMUS_DRL_CONFIG[explicitClause].name,
          defaultPoints: explicitPoints || 5,
          weight: 120,
        });
      }
    }

    // 5. Chọn điều khoản chính xác nhất (Best Match), loại bỏ trùng lặp mâu thuẫn
    const detectedClauses: DetectedClause[] = [];
    if (candidates.length > 0) {
      // Sắp xếp theo trọng số giảm dần
      candidates.sort((a, b) => b.weight - a.weight);
      const best = candidates[0];

      const finalPoints = explicitPoints || best.defaultPoints;
      detectedClauses.push({
        clause: best.clause,
        clauseName: HCMUS_DRL_CONFIG[best.clause].name,
        subClauseCode: best.subClauseCode,
        subCategory: best.subCategory,
        confidence: explicitClause && best.clause === explicitClause ? 0.99 : 0.92,
        points: finalPoints,
      });
    } else {
      // Fallback mặc định an toàn: ND3 Hoạt động phong trào (+5đ)
      detectedClauses.push({
        clause: DrlClause.ND3_HOAT_DONG,
        clauseName: HCMUS_DRL_CONFIG[DrlClause.ND3_HOAT_DONG].name,
        subClauseCode: '3.5',
        subCategory: 'Hoạt động phong trào / Kỹ năng sinh viên',
        confidence: 0.7,
        points: explicitPoints || 5,
      });
    }

    // 3. Regex bóc tách Deadline đăng ký (dd/mm/yyyy hoặc dd-mm-yyyy hoặc dạng kèm giờ)
    const deadlineRegex = /(?:hạn\s*chót(?:\s*đăng\s*ký)?|hạn\s*đăng\s*ký|deadline|đóng\s*link(?:\s*đăng\s*ký)?|đến\s*(?:hết\s*)?ngày|đến\s*hết)[\s:]*([0-2]?\d[hH:]\d{0,2}\s*(?:ngày\s*)?)?([0-3]?\d[./\-][0-1]?\d[./\-]\d{4})/i;
    const deadlineMatch = text.match(deadlineRegex);
    let extractedDeadline: string | undefined;
    if (deadlineMatch) {
      const timePart = deadlineMatch[1] ? deadlineMatch[1].trim() + ' ' : '';
      extractedDeadline = `${timePart}${deadlineMatch[2]}`.trim();
    } else {
      // Trường hợp cuộc thi / hoạt động theo khoảng thời gian: "13/10/2026 - 16/10/2026" hoặc "đến 16/10/2026"
      const dateRangeMatch = text.match(/(?:[0-3]?\d[./\-][0-1]?\d[./\-]\d{4})\s*(?:[-–—]|đến\s*(?:ngày)?)\s*([0-3]?\d[./\-][0-1]?\d[./\-]\d{4})/i);
      if (dateRangeMatch && dateRangeMatch[1]) {
        extractedDeadline = dateRangeMatch[1].trim();
      }
    }

    // 4. Regex bóc tách Ngày tổ chức sự kiện (📅, 🗓️, hoặc "Thời gian: ... ngày dd/mm/yyyy", hoặc khoảng ngày)
    let extractedDate: string | undefined;
    const dateRangeMatch = text.match(/([0-3]?\d[./\-][0-1]?\d[./\-]\d{4})\s*(?:[-–—]|đến\s*(?:ngày)?)\s*([0-3]?\d[./\-][0-1]?\d[./\-]\d{4})/i);
    if (dateRangeMatch) {
      extractedDate = `${dateRangeMatch[1]} – ${dateRangeMatch[2]}`;
    } else {
      const dateRegex = /(?:(?:\uD83D\uDCC5|\uD83D\uDDD3|thời\s*gian[\s:]+.*?|ngày\s*diễn\s*ra[\s:]*|ngày[\s:]+)\s*|[^\d]|^)([0-3]?\d[./\-][0-1]?\d[./\-]\d{4})/i;
      const dateMatch = text.match(dateRegex);
      if (dateMatch && dateMatch[1]) {
        extractedDate = dateMatch[1];
      }
    }

    // 5. Regex bóc tách Giờ tổ chức (⏰ hoặc 08H00 – 10H00, 8h00 - 11h30, v.v.)
    let extractedTime: string | undefined;
    const iconTimeMatch = text.match(/(?:⏰|⏱️)\s*([0-2]?\d[hH:]\d{2}(?:\s*[–\-–—]\s*[0-2]?\d[hH:]\d{2})?)/i);
    if (iconTimeMatch && iconTimeMatch[1]) {
      extractedTime = iconTimeMatch[1].trim();
    } else {
      const generalTimeMatch = text.match(/(?:bắt\s*đầu\s*lúc|thời\s*gian[\s:]+)?([0-2]?\d[hH]\d{2}\s*[–\-–—]\s*[0-2]?\d[hH]\d{2})/i);
      if (generalTimeMatch && generalTimeMatch[1]) {
        extractedTime = generalTimeMatch[1].trim();
      }
    }

    // 6. Regex bóc tách Địa điểm tổ chức (📍 hoặc "Địa điểm:", "Tại...")
    let extractedLocation: string | undefined;
    const locationRegex = /(?:📍|địa\s*điểm[\s:]+)\s*([^\n\r]+)/i;
    const locMatch = text.match(locationRegex);
    if (locMatch && locMatch[1]) {
      extractedLocation = locMatch[1]
        .split(/[📅⏰🌱🎁🎙️💬#\(\)]/)[0]
        .replace(/^địa\s*điểm\s*[:–\-]\s*/i, '')
        .replace(/^[–\-:\s]+/, '')
        .trim();
      // Nếu có ngoặc đóng mở chi tiết, giữ nguyên nếu có ý nghĩa
      const parenMatch = locMatch[1].match(/(.*?\(.*?\))/);
      if (parenMatch && parenMatch[1]) {
        extractedLocation = parenMatch[1]
          .replace(/^địa\s*điểm\s*[:–\-]\s*/i, '')
          .replace(/^[–\-:\s]+/, '')
          .trim();
      }
    }

    // 7. Regex bóc tách Link đăng ký Form (Google Form, MS Forms, bit.ly, myaloha, v.v.)
    let extractedRegistrationLink: string | undefined;
    const regLinkRegex = /(?:đăng\s*ký\s*(?:tham\s*gia)?(?:\s*qua)?\s*link[\s:]*|link\s*(?:đăng\s*ký|dự\s*thi)[\s:]*|form\s*đăng\s*ký[\s:]*)?(https:\/\/(?:docs\.google\.com\/forms[^\s\n\r]+|forms\.gle\/[^\s\n\r]+|forms\.office\.com[^\s\n\r]+|bit\.ly\/[^\s\n\r]+|myaloha\.vn\/[^\s\n\r]+))/i;
    const regMatch = text.match(regLinkRegex);
    if (regMatch && regMatch[1]) {
      extractedRegistrationLink = regMatch[1].trim();
    }

    if (!extractedLocation) {
      const formatLocMatch = text.match(/(?:hình\s*thức(?:\s*dự\s*thi)?[\s:]+)([^\n\r]+)/i);
      if (formatLocMatch && formatLocMatch[1]) {
        extractedLocation = formatLocMatch[1].trim();
      }
    }

    // Nếu không tìm thấy deadline nhưng có ngày tổ chức sự kiện, có thể suy luận gợi ý hạn chót trước ngày sự kiện
    if (!extractedDeadline && extractedDate) {
      extractedDeadline = `Trước ngày ${extractedDate}`;
    }

    // 8. Suy luận phân loại Đơn vị, Cấp tổ chức, Cơ sở và Hình thức theo chuẩn HCMUS
    const metadata = this.inferMetadata(text, extractedLocation);

    return {
      detectedClauses,
      extractedDeadline,
      extractedDate,
      extractedTime,
      extractedLocation,
      extractedRegistrationLink,
      suggestedFaculty: metadata.faculty,
      suggestedOrgLevel: metadata.orgLevel,
      suggestedCampus: metadata.campus,
      suggestedFormat: metadata.format,
    };
  }

  /**
   * Phân tích ngữ cảnh nội dung bài viết để phân loại chính xác các trường:
   * - Khoa / Đơn vị tổ chức (faculty)
   * - Cấp tổ chức (orgLevel: 'truong' | 'khoa' | 'clb')
   * - Cơ sở tổ chức (campus: 'cs1' | 'cs2' | 'external' | 'online')
   * - Hình thức (format: 'offline' | 'online' | 'hybrid')
   */
  private inferMetadata(text: string, extractedLocation?: string): {
    faculty: string;
    orgLevel: string;
    campus: string;
    format: string;
  } {
    const normalized = text.toLowerCase();
    const locNormalized = (extractedLocation || '').toLowerCase();
    const combined = `${normalized} ${locNormalized}`;

    // --- 1. Suy luận Khoa / Đơn vị & Cấp tổ chức ---
    let faculty = 'all';
    let orgLevel = 'truong';

    // Đơn vị trực thuộc cấp Trường hoặc cơ quan trung tâm (chỉ match khi đơn vị chủ trì là trường/phòng/ban):
    const isCentralUnit = /phòng\s*ctsv|phòng\s*công\s*tác\s*sinh\s*viên|phòng\s*đào\s*tạo|đoàn\s*trường\b|hội\s*sinh\s*viên\s*trường\b|thư\s*viện\s*trung\s*tâm|\bttqlktx\b|nhà\s*văn\s*hóa\s*sinh\s*viên|\bnvhsv\b/i.test(normalized);

    // Kiểm tra các Khoa chuyên môn & mã lớp chi hội HCMUS
    let matchedFaculty = '';
    if (/địa\s*chất|khoa\s*địa|bộ\s*môn\s*địa|\bgeo\b|\bdch\b|\d{2}dch/i.test(normalized)) {
      matchedFaculty = 'diachat';
    } else if (/công\s*nghệ\s*thông\s*tin|khoa\s*cntt|\bfit\b|\bcnpm\b|\bktpm\b|\bkhmt\b|\bhttt\b|\bmmt\b|\bcntn\b|\d{2}cntn|\d{2}clc|\d{2}apcs/i.test(normalized) && !combined.includes('đại học công nghệ thông tin') && !combined.includes('uit')) {
      matchedFaculty = 'cntt';
    } else if (/toán\s*[-–]?\s*tin|toán\s*tin|\bfmt\b|\btth\b|\d{2}tth/i.test(normalized)) {
      matchedFaculty = 'toantin';
    } else if (/vật\s*lý|vlkt|\bphys\b|\bvl\b|\d{2}vl/i.test(normalized)) {
      matchedFaculty = 'vatly';
    } else if (/hóa\s*học|\bchem\b|\bhh\b|\d{2}hh/i.test(normalized)) {
      matchedFaculty = 'hoahoc';
    } else if (/sinh\s*học|công\s*nghệ\s*sinh\s*học|\bfbb\b|\bsh\b|\d{2}sh|\d{2}cnsh/i.test(normalized)) {
      matchedFaculty = 'sinhhoc';
    } else if (/môi\s*trường|\bfes\b|\bmt\b|\d{2}mt/i.test(normalized)) {
      matchedFaculty = 'moitruong';
    } else if (/khoa\s*học\s*vật\s*liệu|cn\s*vật\s*liệu|\bfms\b|\bvlieu\b|\d{2}vlieu/i.test(normalized)) {
      matchedFaculty = 'vatlieu';
    } else if (/điện\s*tử\s*[-–]?\s*viễn\s*thông|\bfetel\b|\bdtvt\b|\d{2}dtvt/i.test(normalized)) {
      matchedFaculty = 'dientu';
    } else if (/khoa\s*học\s*liên\s*ngành|\bfis\b|\blk\b/i.test(normalized)) {
      matchedFaculty = 'liennganh';
    }

    // Kiểm tra Chi Đoàn / Chi Hội / Liên chi hội / Đoàn Khoa -> Cấp Khoa / Liên chi hội
    const isFacultyLevel = /liên\s*chi\s*hội|liên\s*chi\s*đoàn|đoàn\s*khoa|chi\s*hội|chi\s*đoàn/i.test(normalized);

    // Kiểm tra các từ khóa CLB / Đội / Nhóm sinh viên
    const isClub = /câu\s*lạc\s*bộ|\bclb\b|đội\s*sinh\s*viên|đội\s*ctxh|nhóm\s*sinh\s*viên|\bclub\b|\bteam\b|ban\s*học\s*tập/i.test(normalized);

    if (isCentralUnit) {
      faculty = 'all';
      orgLevel = 'truong';
    } else if (matchedFaculty) {
      faculty = matchedFaculty;
      orgLevel = isClub ? 'clb' : 'khoa';
    } else if (isClub) {
      orgLevel = 'clb';
    } else if (isFacultyLevel) {
      orgLevel = 'khoa';
    }

    // --- 2. Suy luận Cơ sở tổ chức (Campus) ---
    // cs1: 227 Nguyễn Văn Cừ, Quận 5
    // cs2: Linh Trung, Thủ Đức / Đông Hòa, Dĩ An, Bình Dương
    // external: Tổ chức ngoài trường (VD: UIT, Bách Khoa, NVH Sinh viên, Địa bàn tình nguyện...)
    // online: MS Teams, Zoom, Google Meet, MyAloha, Trực tuyến
    let campus = 'cs1';

    if (/myaloha|trực\s*tuyến|online|ms\s*teams|zoom|google\s*meet/i.test(combined) && !/trực\s*tiếp|hội\s*trường\s*i|giảng\s*đường|cơ\s*sở/i.test(combined)) {
      campus = 'online';
    } else if (/thpt|trường\s*thpt|nhà\s*văn\s*hóa\s*sinh\s*viên|\bnvhsv\b|hồ\s*tràm|hội\s*trường\s*a\s*uit|trường\s*đại\s*học\s*công\s*nghệ\s*thông\s*tin|\buit\b|bách\s*khoa|\bhcmut\b|địa\s*bàn|tỉnh\s+|mái\s*ấm|nhà\s*mở|ngoài\s*trường/i.test(combined)) {
      campus = 'external';
    } else if (/đông\s*hoà|đông\s*hòa|dĩ\s*an|linh\s*trung|cơ\s*sở\s*2|cs2|f104|nhà\s*f|giảng\s*đường\s*1|kí\s*túc\s*xá\s*khu/i.test(combined)) {
      campus = 'cs2';
    } else if (/nguyễn\s*văn\s*cừ|nguyen\s*van\s*cu|quận\s*5|cơ\s*sở\s*1|cs1|giảng\s*đường\s*2|hội\s*trường\s*i/i.test(combined)) {
      campus = 'cs1';
    }

    // --- 3. Suy luận Hình thức tổ chức (Format: offline / online / hybrid) ---
    let format = 'offline';
    if (/hybrid|kết\s*hợp\s*trực\s*tiếp\s*và\s*trực\s*tuyến|vừa\s*online\s*vừa\s*offline/i.test(combined)) {
      format = 'hybrid';
    } else if (/myaloha|online|trực\s*tuyến|webinar|ms\s*teams|zoom/i.test(combined) && !/kết\s*hợp|offline\s*và\s*online/i.test(combined)) {
      format = 'online';
    } else {
      format = 'offline';
    }

    return { faculty, orgLevel, campus, format };
  }
}
