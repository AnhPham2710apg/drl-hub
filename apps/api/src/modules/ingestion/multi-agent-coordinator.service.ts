import { Injectable, Logger } from '@nestjs/common';
import { ExtractorAgentService } from './agents/extractor-agent.service';
import { OrgClassifierAgentService } from './agents/org-classifier-agent.service';
import { DrlPolicyAgentService } from './agents/drl-policy-agent.service';
import { CriticAgentService } from './agents/critic-agent.service';
import { MultiAgentOrchestrationResult } from './agents/agent.types';

@Injectable()
export class MultiAgentCoordinatorService {
  private readonly logger = new Logger(MultiAgentCoordinatorService.name);

  constructor(
    private readonly extractorAgent: ExtractorAgentService,
    private readonly orgAgent: OrgClassifierAgentService,
    private readonly drlAgent: DrlPolicyAgentService,
    private readonly criticAgent: CriticAgentService,
  ) {}

  /**
   * Điều phối quy trình phân tích sự kiện đa tác nhân:
   * 1. Dispatch song song 3 Specialist Agents (Extractor, Org, DRL)
   * 2. Gom kết quả gửi cho Critic / Auditor Agent để kiểm tra chéo & tranh luận
   * 3. Giải quyết mâu thuẫn và chốt kết quả cuối cùng (Final Consensus)
   */
  async orchestrate(content: string, url?: string): Promise<MultiAgentOrchestrationResult> {
    this.logger.log('Starting Multi-Agent Orchestration workflow...');

    // Bước 1: Chạy song song 3 Specialist Agents để tối ưu thời gian phản hồi
    const [entities, organization, drlPolicy] = await Promise.all([
      this.extractorAgent.extractEntities(content, url),
      this.orgAgent.classifyOrganization(content, url),
      this.drlAgent.evaluatePolicy(content, url),
    ]);

    this.logger.log(
      `Specialists completed: Title="${entities.title}", Org="${organization.faculty}/${organization.orgLevel}", DRL=ND${drlPolicy.clauseNumber}(+${drlPolicy.awardedPoints}đ)`,
    );

    // Bước 2: AI Critic / Auditor phản biện và phát hiện mâu thuẫn
    const critic = await this.criticAgent.auditAndResolve(content, url, entities, organization, drlPolicy);
    this.logger.log(`Critic verdict: isValid=${critic.isValid}, Summary: "${critic.debateSummary}"`);

    // Bước 3: Áp dụng các điều chỉnh sau phản biện (nếu có)
    const adjusted = critic.adjustedValues || {};

    const finalPayload = {
      title: adjusted.title || entities.title,
      faculty: adjusted.faculty || organization.faculty,
      orgLevel: adjusted.orgLevel || organization.orgLevel,
      campus: adjusted.campus || organization.campus,
      format: adjusted.format || organization.format,
      clauseNumber: adjusted.clauseNumber || drlPolicy.clauseNumber,
      awardedPoints: adjusted.awardedPoints || drlPolicy.awardedPoints,
      subCategory: drlPolicy.subCategory,
      registrationDeadline: adjusted.registrationDeadline || entities.registrationDeadline,
      eventDate: adjusted.eventDate || entities.eventDate,
      eventTime: entities.eventTime,
      location: adjusted.location || entities.location,
      registrationLink: entities.registrationLink,
    };

    return {
      entities,
      organization,
      drlPolicy,
      critic,
      finalPayload,
    };
  }
}
