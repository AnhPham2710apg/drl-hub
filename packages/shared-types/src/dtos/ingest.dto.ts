import { DrlClause, DrlClassification, EventStatus, TrackerStatus, UserRole } from '../enums.js';

export interface IngestPreviewRequest {
  url: string;
}

export interface IngestPreviewResponse {
  originalUrl: string;
  cleanUrl: string;
  cleanUrlHash: string;
  title: string;
  description?: string;
  posterImageUrl?: string;
  suggestedClauses: Array<{
    clause: DrlClause;
    clauseName: string;
    subCategory?: string;
    confidence: number;
    points: number;
  }>;
  suggestedDeadline?: string;
}

export interface PublishEventRequest {
  title: string;
  originalPostUrl: string;
  cleanUrlHash: string;
  description?: string;
  posterImageUrl?: string;
  registrationDeadline?: string;
  organizerId?: string;
  clauses: Array<{
    clauseNumber: number;
    awardedPoints: number;
  }>;
}

export interface ScoreSimulationItem {
  clause: DrlClause;
  clauseName: string;
  maxPoints: number;
  currentPoints: number;
  projectedPoints: number;
}

export interface ScoreSimulationResult {
  totalCurrentPoints: number;
  totalProjectedPoints: number;
  currentClassification: DrlClassification;
  projectedClassification: DrlClassification;
  clauseBreakdown: ScoreSimulationItem[];
}
