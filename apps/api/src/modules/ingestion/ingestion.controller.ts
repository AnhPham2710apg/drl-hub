import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { UrlSanitizerService } from './url-sanitizer.service';
import { OpenGraphExtractorService } from './opengraph-extractor.service';
import { DrlClauseParserService } from './drl-clause-parser.service';
import { IngestPreviewRequest, IngestPreviewResponse } from '@drl-hub/shared-types';

@Controller('api/v1/events')
export class IngestionController {
  constructor(
    private readonly sanitizer: UrlSanitizerService,
    private readonly ogExtractor: OpenGraphExtractorService,
    private readonly clauseParser: DrlClauseParserService,
  ) {}

  @Post('ingest-preview')
  async preview(@Body() body: IngestPreviewRequest & { content?: string; posterImageUrl?: string }): Promise<IngestPreviewResponse> {
    // 1. Làm sạch link và tạo hash
    const { cleanUrl, hash, originalUrl } = this.sanitizer.sanitize(body.url);

    // 2. Trích xuất metadata OpenGraph
    const meta = await this.ogExtractor.extract(cleanUrl);

    // 3. Phân tích nội dung (kết hợp cả metadata bóc tách và content người dùng truyền kèm)
    const combinedContent = `${meta.title}\n${body.content || meta.description}`;
    const parsed = this.clauseParser.parse(combinedContent);

    // Chuẩn hóa link ảnh: Nếu là link của Facebook lookaside, chuyển qua endpoint proxy của server
    let finalPoster = body.posterImageUrl || meta.posterImageUrl;
    if (finalPoster && finalPoster.includes('lookaside.fbsbx.com')) {
      finalPoster = `/api/v1/events/proxy-image?url=${encodeURIComponent(finalPoster)}`;
    }

    return {
      originalUrl,
      cleanUrl,
      cleanUrlHash: hash,
      title: meta.title && meta.title !== 'Facebook' ? meta.title : 'Sự kiện chia sẻ từ Facebook',
      description: body.content || meta.description,
      posterImageUrl: finalPoster,
      suggestedClauses: parsed.detectedClauses,
      suggestedDeadline: parsed.extractedDeadline,
    };
  }

  @Get('proxy-image')
  async proxyImage(@Query('url') imageUrl: string, @Res() res: Response) {
    if (!imageUrl) {
      return res.status(400).send('Image URL is required');
    }

    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(imageUrl, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Referer': 'https://www.facebook.com/',
        },
        responseType: 'stream',
        timeout: 10000,
      });

      const contentType = String(response.headers['content-type'] || 'image/jpeg');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      response.data.pipe(res);
    } catch (err: any) {
      res.status(502).send('Failed to fetch remote image');
    }
  }
}
