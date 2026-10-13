import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { UrlSanitizerService } from './url-sanitizer.service';
import { OpenGraphExtractorService } from './opengraph-extractor.service';
import { DrlClauseParserService } from './drl-clause-parser.service';

import { GeminiLlmService } from './gemini-llm.service';
import { ExtractorAgentService } from './agents/extractor-agent.service';
import { OrgClassifierAgentService } from './agents/org-classifier-agent.service';
import { DrlPolicyAgentService } from './agents/drl-policy-agent.service';
import { CriticAgentService } from './agents/critic-agent.service';
import { MultiAgentCoordinatorService } from './multi-agent-coordinator.service';

@Module({
  controllers: [IngestionController],
  providers: [
    UrlSanitizerService,
    OpenGraphExtractorService,
    DrlClauseParserService,
    GeminiLlmService,
    ExtractorAgentService,
    OrgClassifierAgentService,
    DrlPolicyAgentService,
    CriticAgentService,
    MultiAgentCoordinatorService,
  ],
  exports: [
    UrlSanitizerService,
    OpenGraphExtractorService,
    DrlClauseParserService,
    GeminiLlmService,
    MultiAgentCoordinatorService,
  ],
})
export class IngestionModule {}
