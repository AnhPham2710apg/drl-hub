import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { UrlSanitizerService } from './url-sanitizer.service';
import { OpenGraphExtractorService } from './opengraph-extractor.service';
import { DrlClauseParserService } from './drl-clause-parser.service';

import { GeminiLlmService } from './gemini-llm.service';

@Module({
  controllers: [IngestionController],
  providers: [
    UrlSanitizerService,
    OpenGraphExtractorService,
    DrlClauseParserService,
    GeminiLlmService,
  ],
  exports: [
    UrlSanitizerService,
    OpenGraphExtractorService,
    DrlClauseParserService,
    GeminiLlmService,
  ],
})
export class IngestionModule {}
