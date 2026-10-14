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
    const detectedClauses: DetectedClause[] = [];
    const normalized = text.toLowerCase();

    // 1. Regex bóc tách số điểm ĐRL cụ thể:
    // Chỉ nhận diện các mẫu rõ ràng về điểm rèn luyện: "cộng 5 điểm", "+5 điểm", "+5 đrl", "5 điểm rèn luyện", "5 đrl", "được cộng 5 điểm"
    // Tránh bẫy câu hỏi trắc nghiệm như "được 1 điểm cho mỗi câu", "mỗi câu trả lời đúng được 1 điểm"
    const pointsRegex = /(?:cộng|\+)\s*(\d{1,2})\s*(?:điểm\s*(?:rèn\s*luyện|đrl)?|đrl\b)|(?:được\s+cộng\s*)(\d{1,2})\s*(?:điểm|đrl\b)|(\d{1,2})\s*(?:điểm\s*rèn\s*luyện|điểm\s*đrl|\s*đrl\b)/gi;
    let explicitPoints: number | null = null;
    const pointsMatch = pointsRegex.exec(normalized);
    if (pointsMatch) {
      const parsedVal = parseInt(pointsMatch[1] || pointsMatch[2] || pointsMatch[3], 10);
      if (parsedVal >= 2 && parsedVal <= 30) {
        explicitPoints = parsedVal;
      }
    }

    // 2. Phân loại theo 5 Nội dung của HCMUS

    // [Nội dung 1: Tham gia học tập & NCKH - Max 30đ]
    // Cuộc thi học thuật (+5đ), NCKH (+15đ), CLB học thuật (+5đ), Hội thảo/Chuyên đề (+5đ), Talkshow học thuật/tri thức (+5đ)
    if (/nội\s*dung\s*1|học\s*thuật|nghiên\s*cứu\s*khoa\s*học|nckh|seminar|hội\s*thảo|chuyên\s*đề|học\s*tập|clb\s*học\s*thuật|phòng\s*thí\s*nghiệm|ptn|talkshow|tri\s*thức|tự\s*học|chuyển\s*đổi\s*số/i.test(normalized)) {
      let pts = explicitPoints || 5;
      let subCategory = 'Hoạt động học thuật / Hội thảo / NCKH / Talkshow';
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
