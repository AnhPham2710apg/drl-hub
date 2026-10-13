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

  it('should accurately infer metadata and parse points for Math-CS online contest (Khoa Toán - Tin học / Chi hội 25TTH3 on MyAloha)', () => {
    const text = `
      [CHI HỘI 25TTH3] CUỘC THI TRỰC TUYẾN: “VIỆT NAM TRONG KỶ NGUYÊN SỐ”
      Liên chi hội Khoa Toán - Tin học - Chi hội 25TTH3
      Nhằm thiết thực hưởng ứng Ngày Chuyển đổi số Quốc gia 10/10...
      Mỗi câu trả lời đúng được 1 điểm (thể lệ câu hỏi).
      Được cộng 5 điểm rèn luyện (Nội dung 1).
      Thời gian diễn ra: 13/10/2026 - 16/10/2026
      Hình thức: Trực tuyến trên MyAloha
      Link dự thi: https://myaloha.vn/ct/wuLlaj
    `;
    const result = service.parse(text);

    expect(result.suggestedFaculty).toBe('toantin');
    expect(result.suggestedOrgLevel).toBe('khoa');
    expect(result.suggestedCampus).toBe('online');
    expect(result.suggestedFormat).toBe('online');
    expect(result.extractedRegistrationLink).toBe('https://myaloha.vn/ct/wuLlaj');
    expect(result.extractedDeadline).toBe('16/10/2026');
    const nd1 = result.detectedClauses.find((c) => c.clause === DrlClause.ND1_HOC_TAP);
    expect(nd1).toBeDefined();
    expect(nd1?.points).toBe(5);
  });
});
