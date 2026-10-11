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
});
