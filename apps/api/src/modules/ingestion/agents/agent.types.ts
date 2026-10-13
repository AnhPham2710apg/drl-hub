export interface EntityExtractionOutput {
  title: string;
  registrationDeadline?: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  registrationLink?: string;
  confidence: number;
}

export interface OrgClassificationOutput {
  faculty: 'diachat' | 'cntt' | 'toantin' | 'vatly' | 'hoahoc' | 'sinhhoc' | 'moitruong' | 'vatlieu' | 'dientu' | 'liennganh' | 'all';
  orgLevel: 'truong' | 'khoa' | 'clb';
  campus: 'cs1' | 'cs2' | 'external' | 'online';
  format: 'offline' | 'online' | 'hybrid';
  organizerName?: string;
  confidence: number;
  reasoning: string;
}

export interface DrlPolicyOutput {
  clauseNumber: number; // 1..5
  awardedPoints: number;
  subCategory: string;
  rationale: string;
  confidence: number;
}

export interface CriticReviewOutput {
  isValid: boolean;
  issuesFound: string[];
  adjustedValues?: {
    title?: string;
    faculty?: OrgClassificationOutput['faculty'];
    orgLevel?: OrgClassificationOutput['orgLevel'];
    campus?: OrgClassificationOutput['campus'];
    format?: OrgClassificationOutput['format'];
    clauseNumber?: number;
    awardedPoints?: number;
    registrationDeadline?: string;
    eventDate?: string;
    location?: string;
  };
  debateSummary?: string;
}

export interface MultiAgentOrchestrationResult {
  entities: EntityExtractionOutput;
  organization: OrgClassificationOutput;
  drlPolicy: DrlPolicyOutput;
  critic: CriticReviewOutput;
  finalPayload: {
    title: string;
    faculty: string;
    orgLevel: string;
    campus: string;
    format: string;
    clauseNumber: number;
    awardedPoints: number;
    subCategory: string;
    registrationDeadline?: string;
    eventDate?: string;
    eventTime?: string;
    location?: string;
    registrationLink?: string;
  };
}
