import { Test, TestingModule } from '@nestjs/testing';
import { MultiAgentCoordinatorService } from './multi-agent-coordinator.service';
import { ExtractorAgentService } from './agents/extractor-agent.service';
import { OrgClassifierAgentService } from './agents/org-classifier-agent.service';
import { DrlPolicyAgentService } from './agents/drl-policy-agent.service';
import { CriticAgentService } from './agents/critic-agent.service';

describe('MultiAgentCoordinatorService', () => {
  let coordinator: MultiAgentCoordinatorService;
  let mockExtractor: Partial<ExtractorAgentService>;
  let mockOrg: Partial<OrgClassifierAgentService>;
  let mockDrl: Partial<DrlPolicyAgentService>;
  let mockCritic: Partial<CriticAgentService>;

  beforeEach(async () => {
    mockExtractor = {
      extractEntities: jest.fn().mockResolvedValue({
        title: 'CUỘC THI THÁCH THỨC 2026',
        eventDate: '20/10/2026',
        location: 'Hội trường I, Cơ sở Nguyễn Văn Cừ',
        confidence: 0.95,
      }),
    };

    mockOrg = {
      classifyOrganization: jest.fn().mockResolvedValue({
        faculty: 'cntt',
        orgLevel: 'khoa', // ban đầu gán là khoa
        campus: 'cs1',
        format: 'offline',
        organizerName: 'CLB Tin học - Khoa CNTT',
        confidence: 0.9,
        reasoning: 'Khoa CNTT',
      }),
    };

    mockDrl = {
      evaluatePolicy: jest.fn().mockResolvedValue({
        clauseNumber: 1,
        awardedPoints: 5,
        subCategory: 'Cuộc thi học thuật',
        rationale: 'Quy chế ND1',
        confidence: 0.95,
      }),
    };

    mockCritic = {
      auditAndResolve: jest.fn().mockResolvedValue({
        isValid: false,
        issuesFound: ['Đơn vị là CLB Tin học nên orgLevel phải là clb, không phải khoa'],
        adjustedValues: {
          orgLevel: 'clb',
        },
        debateSummary: 'Đã phát hiện và điều chỉnh orgLevel từ khoa sang clb vì có chữ CLB.',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiAgentCoordinatorService,
        { provide: ExtractorAgentService, useValue: mockExtractor },
        { provide: OrgClassifierAgentService, useValue: mockOrg },
        { provide: DrlPolicyAgentService, useValue: mockDrl },
        { provide: CriticAgentService, useValue: mockCritic },
      ],
    }).compile();

    coordinator = module.get<MultiAgentCoordinatorService>(MultiAgentCoordinatorService);
  });

  it('should dispatch to all 3 specialists and apply critic adjustment', async () => {
    const result = await coordinator.orchestrate(
      'CLB Tin học tổ chức Cuộc thi Thách thức tại 227 NVC',
      'https://facebook.com/clb.tinhochcmus/posts/123',
    );

    expect(mockExtractor.extractEntities).toHaveBeenCalled();
    expect(mockOrg.classifyOrganization).toHaveBeenCalled();
    expect(mockDrl.evaluatePolicy).toHaveBeenCalled();
    expect(mockCritic.auditAndResolve).toHaveBeenCalled();

    // orgLevel phải được điều chỉnh sang 'clb' sau khi Critic phản biện
    expect(result.finalPayload.orgLevel).toBe('clb');
    expect(result.finalPayload.faculty).toBe('cntt');
    expect(result.finalPayload.clauseNumber).toBe(1);
    expect(result.critic.debateSummary).toContain('điều chỉnh orgLevel từ khoa sang clb');
  });
});
