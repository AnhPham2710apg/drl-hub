import { DrlClauseParserService } from './drl-clause-parser.service';
import { DrlClause } from '@drl-hub/shared-types';

describe('DrlClauseParserService (HCMUS Regulations)', () => {
  let service: DrlClauseParserService;

  beforeEach(() => {
    service = new DrlClauseParserService();
  });

  it('should detect ND1 (Học tập & NCKH) and deadline from academic challenge', () => {
    const text = `
      [CUỘC THI HỌC THUẬT IT CHALLENGE 2026 - KHOA CNTT]
      Sinh viên tham gia được cộng 5 điểm rèn luyện (Nội dung 1).
      Hạn chót đăng ký: 25/10/2026.
    `;
    const result = service.parse(text);

    const nd1 = result.detectedClauses.find((c) => c.clause === DrlClause.ND1_HOC_TAP);
    expect(nd1).toBeDefined();
    expect(nd1?.points).toBe(5);
    expect(result.extractedDeadline).toBe('25/10/2026');
  });

  it('should detect ND4 with 10 points for blood donation (Hiến máu tình nguyện)', () => {
    const text = `
      NGÀY HỘI HIẾN MÁU NHÂN ĐẠO - GIỌT HỒNG TỰ NHIÊN
      Được cộng 10 điểm ĐRL (Hành động hướng đến xây dựng và phát triển cộng đồng).
      Hạn đăng ký: 30-11-2026
    `;
    const result = service.parse(text);

    const nd4 = result.detectedClauses.find((c) => c.clause === DrlClause.ND4_CONG_DONG);
    expect(nd4).toBeDefined();
    expect(nd4?.points).toBe(10);
    expect(nd4?.subCategory).toBe('Hiến máu tình nguyện');
  });

  it('should detect ND3 for sports/recruitment festival (Tư vấn tuyển sinh / Ngày hội việc làm)', () => {
    const text = `
      NGÀY HỘI VIỆC LÀM & TƯ VẤN TUYỂN SINH HCMUS 2026
      Cộng 5 điểm rèn luyện Nội dung 3.
    `;
    const result = service.parse(text);

    const nd3 = result.detectedClauses.find((c) => c.clause === DrlClause.ND3_HOAT_DONG);
    expect(nd3).toBeDefined();
    expect(nd3?.points).toBe(5);
  });

  it('should detect ND5 with 25 points for international research paper (Bài báo quốc tế)', () => {
    const text = `
      CHÚC MỪNG NHÓM NGHIÊN CỨU XUẤT SẮC
      Có bài báo khoa học quốc tế được công bố tại hội nghị quốc tế uy tín.
    `;
    const result = service.parse(text);

    const nd5 = result.detectedClauses.find((c) => c.clause === DrlClause.ND5_KHUYEN_KHICH);
    expect(nd5).toBeDefined();
    expect(nd5?.points).toBe(25);
  });

  it('should extract date, time, location, registration link from real HCMUS event post', () => {
    const text = `
      TALK SHOW “HẠT GIỐNG ĐỎ” – KÍ ỨC, NIỀM TIN & SỰ GẠCH NỐI THẾ HỆ
      Khi tham gia chương trình sẽ được ghi nhận hoạt động ở học kì 1.
      📍 Địa điểm: Phòng F104, Trường Đại học Khoa học tự nhiên, ĐHQG-HCM (cơ sở Đông Hoà)
      📅 11/10/2026
      ⏰ 08H00 – 10H00
      🌱 Đăng ký tham gia qua link : https://docs.google.com/forms/d/1NCQjxgOZXCWzEHwcDNuao9rlonwJ4ShS8Y4hgIpqnc8/viewform
    `;
    const result = service.parse(text);

    expect(result.extractedDate).toBe('11/10/2026');
    expect(result.extractedTime).toBe('08H00 – 10H00');
    expect(result.extractedLocation).toContain('Phòng F104, Trường Đại học Khoa học tự nhiên');
    expect(result.extractedRegistrationLink).toContain('https://docs.google.com/forms/d/1NCQjxgOZXCWzEHwcDNuao9rlonwJ4ShS8Y4hgIpqnc8/viewform');
  });

  it('should accurately infer metadata for Central unit event held at UIT (Thư viện ĐHQG)', () => {
    const text = `
      Thư viện Trung tâm ĐHQG-HCM phối hợp tổ chức Talkshow Kỹ năng
      📍 Địa điểm: Hội trường A, Trường Đại học Công nghệ Thông tin (UIT)
      Thời gian: 08:30 ngày 17/10/2026
    `;
    const result = service.parse(text);

    expect(result.suggestedFaculty).toBe('all'); // Đơn vị chung / Cấp Trường
    expect(result.suggestedOrgLevel).toBe('truong'); // Cấp Trường / ĐHQG-HCM
    expect(result.suggestedCampus).toBe('external'); // Ngoài trường (UIT)
    expect(result.suggestedFormat).toBe('offline'); // Trực tiếp
  });

  it('should accurately infer metadata for Faculty level event (Khoa Địa chất, CS2)', () => {
    const text = `
      Đoàn khoa Địa chất - Ban Chấp hành Liên chi hội Khoa Địa chất
      Talkshow Hạt Giống Đỏ
      📍 Địa điểm: Phòng F104, Cơ sở Đông Hoà, Dĩ An
      Ngày: 11/10/2026
    `;
    const result = service.parse(text);

    expect(result.suggestedFaculty).toBe('diachat'); // Khoa Địa chất
    expect(result.suggestedOrgLevel).toBe('khoa'); // Cấp Khoa / Liên chi hội
    expect(result.suggestedCampus).toBe('cs2'); // Cơ sở 2
    expect(result.suggestedFormat).toBe('offline'); // Trực tiếp
  });

  it('should detect ND3 sub-clause 3.1 with 10 points for School-level online contest (HCMUS: Unlock the Rules)', () => {
    const text = `
      PHÒNG CÔNG TÁC SINH VIÊN (CTSV) - TRƯỜNG ĐH KHOA HỌC TỰ NHIÊN
      CUỘC THI TRỰC TUYẾN: “HCMUS: UNLOCK THE RULES” 2026
      Sinh viên tham gia hoàn thành bài thi sẽ được ghi nhận điểm rèn luyện.
      Thời gian: 15/03/2026 - 18/03/2026
      Hình thức: Trực tuyến
    `;
    const result = service.parse(text);

    expect(result.detectedClauses).toHaveLength(1);
    const clause = result.detectedClauses[0];
    expect(clause.clause).toBe(DrlClause.ND3_HOAT_DONG);
    expect(clause.subClauseCode).toBe('3.1');
    expect(clause.points).toBe(10); // Cấp Trường = 10đ
  });

  it('should detect ND3 sub-clause 3.1 with 5 points for Faculty-level contest (Đoàn Khoa SH-CNSH - Hành trình theo chân Bác)', () => {
    const text = `
      ĐOÀN KHOA SINH HỌC - CÔNG NGHỆ SINH HỌC
      Cuộc thi trực tuyến "Hành trình theo chân Bác lần thứ V"
      Thời gian: 15/11/2025 - 11/01/2026
      Hình thức thi: Trực tuyến
    `;
    const result = service.parse(text);

    expect(result.detectedClauses).toHaveLength(1);
    const clause = result.detectedClauses[0];
    expect(clause.clause).toBe(DrlClause.ND3_HOAT_DONG);
    expect(clause.subClauseCode).toBe('3.1');
    expect(clause.points).toBe(5); // Cấp Khoa = 5đ
  });

  it('should detect ND4 sub-clause 4.5 with 3 points for donation/fundraising (Quyên góp Mùa hè xanh / XTN)', () => {
    const text = `
      HỘI SINH VIÊN TRƯỜNG - CHIẾN DỊCH TÌNH NGUYỆN MÙA HÈ XANH 2026
      HOẠT ĐỘNG GÂY QUỸ VÀ QUYÊN GÓP ỦNG HỘ ĐỒNG BÀO
      Sinh viên tham gia quyên góp sách vở, quần áo hoặc kinh phí hỗ trợ các điểm trường khó khăn.
    `;
    const result = service.parse(text);

    expect(result.detectedClauses).toHaveLength(1);
    const clause = result.detectedClauses[0];
    expect(clause.clause).toBe(DrlClause.ND4_CONG_DONG);
    expect(clause.subClauseCode).toBe('4.5');
    expect(clause.points).toBe(3); // Quyên góp chuẩn 3đ
  });

  it('should detect ND4 sub-clause 4.3 with 5 points for short-term community volunteer / environment (Cleen4Green)', () => {
    const text = `
      ĐOÀN KHOA CÔNG NGHỆ THÔNG TIN
      HOẠT ĐỘNG TÌNH NGUYỆN BẢO VỆ MÔI TRƯỜNG "CLEEN4GREEN"
      Ra quân dọn rác, làm sạch khuôn viên và trồng cây xanh.
      Thời gian: 27/03/2026
    `;
    const result = service.parse(text);

    expect(result.detectedClauses).toHaveLength(1);
    const clause = result.detectedClauses[0];
    expect(clause.clause).toBe(DrlClause.ND4_CONG_DONG);
    expect(clause.subClauseCode).toBe('4.3');
    expect(clause.points).toBe(5); // Tình nguyện ngắn hạn = 5đ
  });

  it('should detect ND2 sub-clause 2.3 with 5 points for survey (Khảo sát sự hài lòng người học IR3)', () => {
    const text = `
      PHÒNG CÔNG TÁC SINH VIÊN
      Khảo sát sự hài lòng của người học với trải nghiệm học tập tại Đại học Quốc gia TP.HCM (Khảo sát IR3)
      Thời gian: 26/09/2025 - 21/10/2025
    `;
    const result = service.parse(text);

    expect(result.detectedClauses).toHaveLength(1);
    const clause = result.detectedClauses[0];
    expect(clause.clause).toBe(DrlClause.ND2_NOI_QUY);
    expect(clause.subClauseCode).toBe('2.3');
    expect(clause.points).toBe(5);
  });

  it('should detect ND1 sub-clause 1.9 with 5 points for Tech Talk (DSA & System Design)', () => {
    const text = `
      KHOA CÔNG NGHỆ THÔNG TIN
      Tech Talk “Chinh phục DSA & System Design - Mở lối vào công ty công nghệ hàng đầu”
      Thời gian: 14/04/2026
      Địa điểm: Hội trường I
    `;
    const result = service.parse(text);

    expect(result.detectedClauses).toHaveLength(1);
    const clause = result.detectedClauses[0];
    expect(clause.clause).toBe(DrlClause.ND1_HOC_TAP);
    expect(clause.subClauseCode).toBe('1.9');
    expect(clause.points).toBe(5);
  });

  it('should detect ND3 sub-clause 3.5 with 5 points for soft-skill talkshow (Sa mạc nở hoa / DEBUG YOUR EYES)', () => {
    const text = `
      PHÒNG CÔNG TÁC SINH VIÊN (CTSV)
      Talkshow: "Sa mạc nở hoa & hành trình vượt lên chính mình"
      Thời gian: 19/04/2026
      Địa điểm: Hội trường I, Cơ sở 227 Nguyễn Văn Cừ
    `;
    const result = service.parse(text);

    expect(result.detectedClauses).toHaveLength(1);
    const clause = result.detectedClauses[0];
    expect(clause.clause).toBe(DrlClause.ND3_HOAT_DONG);
    expect(clause.subClauseCode).toBe('3.5');
    expect(clause.points).toBe(5);
  });

  it('should detect ND3 sub-clause 3.2 with 5 points for running race (Đường chạy Fitus)', () => {
    const text = `
      LIÊN CHI HỘI KHOA CÔNG NGHỆ THÔNG TIN
      ĐƯỜNG CHẠY FITUS 2026 - BƯỚC CHẠY THANH NIÊN
      Thời gian: 29/03/2026
    `;
    const result = service.parse(text);

    expect(result.detectedClauses).toHaveLength(1);
    const clause = result.detectedClauses[0];
    expect(clause.clause).toBe(DrlClause.ND3_HOAT_DONG);
    expect(clause.subClauseCode).toBe('3.2');
    expect(clause.points).toBe(5);
  });
});
