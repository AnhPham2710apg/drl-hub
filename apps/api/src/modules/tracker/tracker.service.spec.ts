import { TrackerService } from './tracker.service';
import { DrlClause, DrlClassification, TrackerStatus } from '@drl-hub/shared-types';

describe('TrackerService - HCMUS Score Simulator & Classification', () => {
  let service: TrackerService;

  beforeEach(() => {
    service = new TrackerService();
  });

  it('should cap ND1 at 30 points and ND4 at 25 points according to HCMUS rules', () => {
    // ND1 max 30đ, ND4 max 25đ
    const mockTrackedEvents = [
      {
        status: TrackerStatus.VERIFIED, // Đã duyệt
        mappings: [{ clauseNumber: DrlClause.ND1_HOC_TAP, awardedPoints: 20 }],
      },
      {
        status: TrackerStatus.ATTENDED, // Đã tham gia (cộng thêm 15đ -> Tổng 35đ -> Phải capped 30đ)
        mappings: [{ clauseNumber: DrlClause.ND1_HOC_TAP, awardedPoints: 15 }],
      },
      {
        status: TrackerStatus.VERIFIED,
        mappings: [{ clauseNumber: DrlClause.ND4_CONG_DONG, awardedPoints: 10 }], // Hiến máu
      },
      {
        status: TrackerStatus.BOOKMARKED, // Mục tiêu dự kiến (Xuân tình nguyện 20đ -> Tổng 30đ -> Capped 25đ)
        mappings: [{ clauseNumber: DrlClause.ND4_CONG_DONG, awardedPoints: 20 }],
      },
    ];

    const result = service.simulateScores(mockTrackedEvents);

    const nd1 = result.clauseBreakdown.find((c) => c.clause === DrlClause.ND1_HOC_TAP);
    expect(nd1?.currentPoints).toBe(30); // Max 30đ
    expect(nd1?.projectedPoints).toBe(30);

    const nd4 = result.clauseBreakdown.find((c) => c.clause === DrlClause.ND4_CONG_DONG);
    expect(nd4?.currentPoints).toBe(10);
    expect(nd4?.projectedPoints).toBe(25); // Max 25đ

    expect(result.totalCurrentPoints).toBe(40); // 30 + 10
    expect(result.currentClassification).toBe(DrlClassification.YEU); // 40 điểm xếp loại YẾU (35-49đ)

    expect(result.totalProjectedPoints).toBe(55); // 30 + 25
    expect(result.projectedClassification).toBe(DrlClassification.TRUNG_BINH); // 55 điểm xếp loại TRUNG BÌNH (50-64đ)
  });

  it('should classify as XUAT SAC when total score reaches 90-100', () => {
    const events = [
      { status: TrackerStatus.VERIFIED, mappings: [{ clauseNumber: DrlClause.ND1_HOC_TAP, awardedPoints: 30 }] },
      { status: TrackerStatus.VERIFIED, mappings: [{ clauseNumber: DrlClause.ND2_NOI_QUY, awardedPoints: 20 }] },
      { status: TrackerStatus.VERIFIED, mappings: [{ clauseNumber: DrlClause.ND3_HOAT_DONG, awardedPoints: 25 }] },
      { status: TrackerStatus.VERIFIED, mappings: [{ clauseNumber: DrlClause.ND4_CONG_DONG, awardedPoints: 20 }] },
    ];

    const result = service.simulateScores(events);
    expect(result.totalCurrentPoints).toBe(95);
    expect(result.currentClassification).toBe(DrlClassification.XUAT_SAC);
  });
});
