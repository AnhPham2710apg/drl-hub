import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import { Response } from 'express'; // reload
import { UrlSanitizerService } from './url-sanitizer.service';
import { OpenGraphExtractorService } from './opengraph-extractor.service';
import { DrlClauseParserService } from './drl-clause-parser.service';
import { GeminiLlmService } from './gemini-llm.service';
import { MultiAgentCoordinatorService } from './multi-agent-coordinator.service';
import { IngestPreviewRequest, IngestPreviewResponse, HCMUS_DRL_CONFIG } from '@drl-hub/shared-types';

@Controller('api/v1/events')
export class IngestionController {
  constructor(
    private readonly sanitizer: UrlSanitizerService,
    private readonly ogExtractor: OpenGraphExtractorService,
    private readonly clauseParser: DrlClauseParserService,
    private readonly geminiService: GeminiLlmService,
    private readonly coordinator: MultiAgentCoordinatorService,
  ) {}

  @Post('ingest-preview')
  async preview(@Body() body: IngestPreviewRequest & { content?: string; posterImageUrl?: string }): Promise<IngestPreviewResponse> {
    // 1. Làm sạch link và tạo hash
    const { cleanUrl, hash, originalUrl } = this.sanitizer.sanitize(body.url);

    // 2. Trích xuất metadata OpenGraph
    const meta = await this.ogExtractor.extract(cleanUrl);

    // Nếu bài viết bị Facebook chặn triệt để bằng Login Wall và người dùng chưa cung cấp nội dung thủ công
    if (meta.isBlockedByLoginWall && !body.content) {
      return {
        originalUrl,
        cleanUrl,
        cleanUrlHash: hash,
        title: meta.title,
        description: meta.description,
        isBlockedByLoginWall: true,
        posterImageUrl: undefined,
        posterImages: [],
        suggestedClauses: [],
        suggestedDeadline: undefined,
        debateSummary: 'Facebook yêu cầu đăng nhập để xem bài viết này. Hệ thống không thể tự động trích xuất nội dung từ liên kết bị giới hạn đối tượng hoặc yêu cầu phiên đăng nhập.',
        auditNotes: [
          'Liên kết bị Facebook áp dụng Login Wall / Chặn bot thu thập dữ liệu.',
          'Vui lòng copy và dán trực tiếp nội dung bài viết vào ô bên trên để AI phân tích và xếp loại ĐRL đầy đủ.',
        ],
      };
    }

    // 3. Phân tích nội dung đa tác nhân (Multi-Agent Pipeline với Debate & Verification)
    const effectiveUrl = meta.canonicalUrl || cleanUrl;
    const combinedContent = `URL GỐC / FANPAGE SLUG: ${effectiveUrl}\nTIÊU ĐỀ: ${meta.title}\nNỘI DUNG CHI TIẾT:\n${body.content || meta.description}`;
    
    let agentResult = await this.coordinator.orchestrate(combinedContent, effectiveUrl);
    const finalPayload = agentResult.finalPayload;
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

    const finalRawImages = rawImages.slice(0, 4);
    const proxiedImages = finalRawImages.map(img => {
      if (img.includes('lookaside.fbsbx.com')) {
        return `/api/v1/events/proxy-image?url=${encodeURIComponent(img)}`;
      }
      return img;
    });

    const finalPoster = proxiedImages.length > 0 ? proxiedImages[0] : undefined;

    // Trích xuất Tiêu đề thông minh: Ưu tiên Multi-Agent (nếu có giá trị thực sự), fallback qua OpenGraph metadata
    let finalTitle = meta.title;
    if (finalPayload?.title && finalPayload.title !== 'Sự kiện sinh viên' && finalPayload.title !== 'Facebook') {
      finalTitle = finalPayload.title;
    }

    const isBioTitle = /người\s*theo\s*dõi|đang\s*nói\s*về\s*điều\s*này|lượt\s*đăng\s*ký|facebook/i.test(finalTitle);
    const contentText = body.content || meta.description;
    if ((isBioTitle || !finalTitle || finalTitle === 'Sự kiện sinh viên' || finalTitle === 'Sự kiện chia sẻ từ Facebook') && contentText) {
      const firstLineMatch = contentText.match(/\[([^\]]+)\]\s*([^\n\r]+)/);
      if (firstLineMatch) {
        finalTitle = `[${firstLineMatch[1]}] ${firstLineMatch[2]}`.trim();
      } else {
        const quotedMatch = contentText.match(/[“"\[]([^”"\]]{6,100})[”"\]]/);
        if (quotedMatch) {
          finalTitle = quotedMatch[1].trim();
        } else {
          const lines = contentText.split('\n').map(l => l.trim()).filter(l => l.length > 5 && !l.startsWith('!') && !l.startsWith('http'));
          if (lines.length > 0) {
            finalTitle = lines[0].substring(0, 100).trim();
          }
        }
      }
    }

    // Xây dựng danh sách clauses: Nếu AI có kết quả thẩm định hợp lệ (isAiResolved) thì dùng AI, nếu fallback thì ưu tiên ruleParsed chính xác theo quy chế HCMUS
    let suggestedClauses = ruleParsed.detectedClauses;
    if (finalPayload?.clauseNumber && agentResult.critic.isAiResolved && agentResult.critic.isValid) {
      suggestedClauses = [
        {
          clause: finalPayload.clauseNumber as any,
          clauseName: HCMUS_DRL_CONFIG[finalPayload.clauseNumber as any]?.name || `Nội dung ${finalPayload.clauseNumber}`,
          subCategory: finalPayload.subCategory || 'Đánh giá tự động từ Multi-Agent',
          confidence: 0.99,
          points: finalPayload.awardedPoints,
        },
      ];
    } else if (suggestedClauses.length === 0 && finalPayload?.clauseNumber) {
      suggestedClauses = [
        {
          clause: finalPayload.clauseNumber as any,
          clauseName: HCMUS_DRL_CONFIG[finalPayload.clauseNumber as any]?.name || `Nội dung ${finalPayload.clauseNumber}`,
          subCategory: finalPayload.subCategory || 'Đánh giá tự động',
          confidence: 0.8,
          points: finalPayload.awardedPoints || 5,
        },
      ];
    }

    return {
      originalUrl,
      cleanUrl,
      cleanUrlHash: hash,
      title: finalTitle && finalTitle !== 'Facebook' ? finalTitle : 'Sự kiện chia sẻ từ Facebook',
      description: body.content || meta.description,
      posterImageUrl: finalPoster,
      posterImages: proxiedImages,
      suggestedClauses,
      suggestedDeadline: finalPayload?.registrationDeadline || ruleParsed.extractedDeadline,
      extractedDate: finalPayload?.eventDate || ruleParsed.extractedDate,
      extractedTime: finalPayload?.eventTime || ruleParsed.extractedTime,
      extractedLocation: finalPayload?.location || ruleParsed.extractedLocation,
      extractedRegistrationLink: finalPayload?.registrationLink || ruleParsed.extractedRegistrationLink,
      suggestedFaculty: (finalPayload?.faculty && finalPayload.faculty !== 'all') ? finalPayload.faculty : (ruleParsed.suggestedFaculty || finalPayload?.faculty || 'all'),
      suggestedOrgLevel: (finalPayload?.orgLevel && finalPayload.orgLevel !== 'truong') ? finalPayload.orgLevel : (ruleParsed.suggestedOrgLevel || finalPayload?.orgLevel || 'truong'),
      suggestedCampus: finalPayload?.campus || ruleParsed.suggestedCampus,
      suggestedFormat: finalPayload?.format || ruleParsed.suggestedFormat,
      debateSummary: agentResult.critic.isAiResolved
        ? agentResult.critic.debateSummary
        : (ruleParsed.detectedClauses.length > 0 ? 'Đã đối soát thành công theo bộ quy chế ĐRL HCMUS.' : agentResult.critic.debateSummary),
      auditNotes: agentResult.critic.issuesFound,
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
