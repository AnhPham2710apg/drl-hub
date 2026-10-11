import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { UrlSanitizerService } from './url-sanitizer.service';
import { OpenGraphExtractorService } from './opengraph-extractor.service';
import { DrlClauseParserService } from './drl-clause-parser.service';

@Module({
  controllers: [IngestionController],
  providers: [
    UrlSanitizerService,
    OpenGraphExtractorService,
    DrlClauseParserService,
  ],
  exports: [
    UrlSanitizerService,
    OpenGraphExtractorService,
    DrlClauseParserService,
  ],
})
export class IngestionModule {}
