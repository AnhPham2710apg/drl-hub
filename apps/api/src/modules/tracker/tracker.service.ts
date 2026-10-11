import { Injectable } from '@nestjs/common';
import {
  DrlClause,
  HCMUS_DRL_CONFIG,
  ScoreSimulationResult,
  ScoreSimulationItem,
  TrackerStatus,
  getDrlClassification,
} from '@drl-hub/shared-types';

export interface TrackedEventInput {
  status: TrackerStatus;
  mappings: Array<{
    clauseNumber: number;
    awardedPoints: number;
  }>;
}

@Injectable()
export class TrackerService {
  simulateScores(trackedEvents: TrackedEventInput[]): ScoreSimulationResult {
    const rawCurrent: Record<DrlClause, number> = {
      [DrlClause.ND1_HOC_TAP]: 0,
      [DrlClause.ND2_NOI_QUY]: 0,
      [DrlClause.ND3_HOAT_DONG]: 0,
      [DrlClause.ND4_CONG_DONG]: 0,
      [DrlClause.ND5_KHUYEN_KHICH]: 0,
    };

    const rawProjected: Record<DrlClause, number> = {
      [DrlClause.ND1_HOC_TAP]: 0,
      [DrlClause.ND2_NOI_QUY]: 0,
      [DrlClause.ND3_HOAT_DONG]: 0,
      [DrlClause.ND4_CONG_DONG]: 0,
      [DrlClause.ND5_KHUYEN_KHICH]: 0,
    };

    for (const item of trackedEvents) {
      const isConfirmed =
        item.status === TrackerStatus.ATTENDED || item.status === TrackerStatus.VERIFIED;

      for (const map of item.mappings) {
        const clause = map.clauseNumber as DrlClause;
        if (rawProjected[clause] !== undefined) {
          rawProjected[clause] += map.awardedPoints;
          if (isConfirmed) {
            rawCurrent[clause] += map.awardedPoints;
          }
        }
      }
    }

    const breakdown: ScoreSimulationItem[] = [];
    let totalCurrent = 0;
    let totalProjected = 0;

    const clauses = [
      DrlClause.ND1_HOC_TAP,
      DrlClause.ND2_NOI_QUY,
      DrlClause.ND3_HOAT_DONG,
      DrlClause.ND4_CONG_DONG,
      DrlClause.ND5_KHUYEN_KHICH,
    ];

    for (const clause of clauses) {
      const config = HCMUS_DRL_CONFIG[clause];
      // Áp dụng giới hạn trần (Max Cap) cho từng Nội dung theo chuẩn HCMUS:
      // ND1: 30đ, ND2: 20đ, ND3: 25đ, ND4: 25đ, ND5: 30đ
      const currentCapped = Math.min(rawCurrent[clause], config.maxPoints);
      const projectedCapped = Math.min(rawProjected[clause], config.maxPoints);

      totalCurrent += currentCapped;
      totalProjected += projectedCapped;

      breakdown.push({
        clause,
        clauseName: config.name,
        maxPoints: config.maxPoints,
        currentPoints: currentCapped,
        projectedPoints: projectedCapped,
      });
    }

    // Quy định HCMUS: Nếu tổng điểm vượt quá 100 điểm thì quy về 100 điểm.
    const finalCurrent = Math.min(totalCurrent, 100);
    const finalProjected = Math.min(totalProjected, 100);

    return {
      totalCurrentPoints: finalCurrent,
      totalProjectedPoints: finalProjected,
      currentClassification: getDrlClassification(finalCurrent),
      projectedClassification: getDrlClassification(finalProjected),
      clauseBreakdown: breakdown,
    };
  }
}
