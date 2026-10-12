import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import { Response } from 'express'; // reload
import { UrlSanitizerService } from './url-sanitizer.service';
import { OpenGraphExtractorService } from './opengraph-extractor.service';
import { DrlClauseParserService } from './drl-clause-parser.service';
import { GeminiLlmService } from './gemini-llm.service';
import { IngestPreviewRequest, IngestPreviewResponse, HCMUS_DRL_CONFIG } from '@drl-hub/shared-types';

@Controller('api/v1/events')
export class IngestionController {
  constructor(
    private readonly sanitizer: UrlSanitizerService,
    private readonly ogExtractor: OpenGraphExtractorService,
    private readonly clauseParser: DrlClauseParserService,
    private readonly geminiService: GeminiLlmService,
  ) {}

  @Post('ingest-preview')
  async preview(@Body() body: IngestPreviewRequest & { content?: string; posterImageUrl?: string }): Promise<IngestPreviewResponse> {
    // 1. Làm sạch link và tạo hash
    const { cleanUrl, hash, originalUrl } = this.sanitizer.sanitize(body.url);

    // 2. Trích xuất metadata OpenGraph
    const meta = await this.ogExtractor.extract(cleanUrl);

    // 3. Phân tích nội dung: Gọi Gemini 3.5 Flash-Lite LLM trước, nếu lỗi hoặc key trống thì fallback sang DrlClauseParserService
    // Đính kèm thông tin URL gốc & Canonical URL để AI phát hiện Fanpage/Đơn vị tổ chức từ slug (ví dụ: dk.lch.diachatkhtn -> Đoàn - Hội Khoa Địa chất)
    const effectiveUrl = meta.canonicalUrl || cleanUrl;
    const combinedContent = `URL GỐC / FANPAGE SLUG: ${effectiveUrl}\nTIÊU ĐỀ: ${meta.title}\nNỘI DUNG CHI TIẾT:\n${body.content || meta.description}`;
    
    let geminiResult = await this.geminiService.extractEvent(combinedContent, effectiveUrl);
    const ruleParsed = this.clauseParser.parse(combinedContent);

    // Chuẩn hóa danh sách ảnh: Nếu là link của Facebook lookaside, chuyển qua endpoint proxy của server
    const rawImages: string[] = [];
    if (body.posterImageUrl) rawImages.push(body.posterImageUrl);

    // Trích xuất thêm ảnh từ body.content nếu có (ví dụ dán markdown ![Image](...) hoặc link facebook)
    if (body.content) {
      const imgRegex = /!\[[^\]]*\]\((https:\/\/www\.facebook\.com\/photo[^\)]+)\)/g;
      let imgMatch: RegExpExecArray | null;
      while ((imgMatch = imgRegex.exec(body.content)) !== null) {
        const fbidM = imgMatch[1].match(/fbid=(\d+)/);
        if (fbidM && fbidM[1]) {
          const directUrl = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${fbidM[1]}`;
          if (!rawImages.includes(directUrl)) rawImages.push(directUrl);
        }
      }

      // Quét thêm bất kỳ fbid=(\d+) nào trong body.content
      const fbidGeneralRegex = /fbid=(\d+)/g;
      let fbidMatch: RegExpExecArray | null;
      while ((fbidMatch = fbidGeneralRegex.exec(body.content)) !== null) {
        const directUrl = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${fbidMatch[1]}`;
        if (!rawImages.includes(directUrl)) rawImages.push(directUrl);
      }
    }

    if (meta.posterImages && meta.posterImages.length > 0) {
      meta.posterImages.forEach(img => {
        if (!rawImages.includes(img)) rawImages.push(img);
      });
    } else if (meta.posterImageUrl && !rawImages.includes(meta.posterImageUrl)) {
      rawImages.push(meta.posterImageUrl);
    }

    const proxiedImages = rawImages.map(img => {
      if (img.includes('lookaside.fbsbx.com')) {
        return `/api/v1/events/proxy-image?url=${encodeURIComponent(img)}`;
      }
      return img;
    });

    const finalPoster = proxiedImages.length > 0 ? proxiedImages[0] : undefined;

    // Trích xuất Tiêu đề thông minh: Ưu tiên Gemini LLM, fallback qua heuristic
    let finalTitle = geminiResult?.title || meta.title;
    const isBioTitle = /người\s*theo\s*dõi|đang\s*nói\s*về\s*điều\s*này|lượt\s*đăng\s*ký|facebook/i.test(finalTitle);
    if ((isBioTitle || !finalTitle || finalTitle === 'Sự kiện chia sẻ từ Facebook') && body.content) {
      const firstLineMatch = body.content.match(/\[([^\]]+)\]\s*([^\n\r]+)/);
      if (firstLineMatch) {
        finalTitle = `[${firstLineMatch[1]}] ${firstLineMatch[2]}`.trim();
      } else {
        const lines = body.content.split('\n').map(l => l.trim()).filter(l => l.length > 5 && !l.startsWith('!') && !l.startsWith('http'));
        if (lines.length > 0) {
          finalTitle = lines[0].substring(0, 100).trim();
        }
      }
    }

    // Xây dựng danh sách clauses từ Gemini (hoặc từ rule)
    const suggestedClauses = geminiResult
      ? [
          {
            clause: geminiResult.clauseNumber,
            clauseName: HCMUS_DRL_CONFIG[geminiResult.clauseNumber as any]?.name || `Nội dung ${geminiResult.clauseNumber}`,
            subCategory: geminiResult.subCategory || 'Đánh giá tự động từ Gemini AI',
            confidence: 0.99,
            points: geminiResult.awardedPoints,
          },
        ]
      : ruleParsed.detectedClauses;

    return {
      originalUrl,
      cleanUrl,
      cleanUrlHash: hash,
      title: finalTitle && finalTitle !== 'Facebook' ? finalTitle : 'Sự kiện chia sẻ từ Facebook',
      description: body.content || meta.description,
      posterImageUrl: finalPoster,
      posterImages: proxiedImages,
      suggestedClauses,
      suggestedDeadline: geminiResult?.registrationDeadline || ruleParsed.extractedDeadline,
      extractedDate: geminiResult?.eventDate || ruleParsed.extractedDate,
      extractedTime: geminiResult?.eventTime || ruleParsed.extractedTime,
      extractedLocation: geminiResult?.location || ruleParsed.extractedLocation,
      extractedRegistrationLink: geminiResult?.registrationLink || ruleParsed.extractedRegistrationLink,
      suggestedFaculty: geminiResult?.faculty || ruleParsed.suggestedFaculty,
      suggestedOrgLevel: geminiResult?.orgLevel || ruleParsed.suggestedOrgLevel,
      suggestedCampus: geminiResult?.campus || ruleParsed.suggestedCampus,
      suggestedFormat: geminiResult?.format || ruleParsed.suggestedFormat,
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
