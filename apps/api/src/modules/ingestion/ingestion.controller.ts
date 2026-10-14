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
      const rawImgs = (meta.posterImages && meta.posterImages.length > 0)
        ? meta.posterImages
        : (meta.posterImageUrl ? [meta.posterImageUrl] : []);
      const proxiedImages = rawImgs.map(img => {
        if (img.includes('lookaside.fbsbx.com') || img.includes('fbsbx.com') || img.includes('fbcdn.net') || img.includes('facebook.com')) {
          return `/api/v1/events/proxy-image?url=${encodeURIComponent(img)}&v=2`;
        }
        return img;
      });
      return {
        originalUrl,
        cleanUrl,
        cleanUrlHash: hash,
        title: meta.title,
        description: meta.description,
        isBlockedByLoginWall: true,
        posterImageUrl: proxiedImages[0] || undefined,
        posterImages: proxiedImages,
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
      if (img.includes('lookaside.fbsbx.com') || img.includes('fbsbx.com') || img.includes('fbcdn.net') || img.includes('facebook.com')) {
        return `/api/v1/events/proxy-image?url=${encodeURIComponent(img)}&v=2`;
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
          subClauseCode: finalPayload.subClauseCode || ruleParsed.detectedClauses[0]?.subClauseCode,
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
          subClauseCode: finalPayload.subClauseCode || '3.5',
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
      suggestedDeadline: !agentResult.critic.isAiResolved
        ? (ruleParsed.extractedDeadline || finalPayload?.registrationDeadline)
        : (finalPayload?.registrationDeadline || ruleParsed.extractedDeadline),
      extractedDate: !agentResult.critic.isAiResolved
        ? (ruleParsed.extractedDate || finalPayload?.eventDate)
        : (finalPayload?.eventDate || ruleParsed.extractedDate),
      extractedTime: !agentResult.critic.isAiResolved
        ? (ruleParsed.extractedTime || finalPayload?.eventTime)
        : (finalPayload?.eventTime || ruleParsed.extractedTime),
      extractedLocation: !agentResult.critic.isAiResolved
        ? (ruleParsed.extractedLocation || finalPayload?.location)
        : (finalPayload?.location || ruleParsed.extractedLocation),
      extractedRegistrationLink: ruleParsed.extractedRegistrationLink || finalPayload?.registrationLink,
      suggestedFaculty: (() => {
        const fullContent = `${body.content || ''} ${meta.description || ''} ${meta.title || ''}`;
        if (ruleParsed.suggestedFaculty === 'all' && /nhà\s*văn\s*hóa\s*sinh\s*viên|\bnvhsv\b|phòng\s*ctsv|phòng\s*công\s*tác\s*sinh\s*viên|đoàn\s*trường/i.test(fullContent)) {
          return 'all';
        }
        if (ruleParsed.suggestedFaculty && ruleParsed.suggestedFaculty !== 'all') {
          return ruleParsed.suggestedFaculty;
        }
        if (finalPayload?.faculty) {
          return finalPayload.faculty;
        }
        return ruleParsed.suggestedFaculty || 'all';
      })(),
      suggestedOrgLevel: (() => {
        const fullContent = `${body.content || ''} ${meta.description || ''} ${meta.title || ''}`;
        if (ruleParsed.suggestedOrgLevel === 'truong' && /nhà\s*văn\s*hóa\s*sinh\s*viên|\bnvhsv\b|phòng\s*ctsv|phòng\s*công\s*tác\s*sinh\s*viên|đoàn\s*trường/i.test(fullContent)) {
          return 'truong';
        }
        if (ruleParsed.suggestedOrgLevel) {
          return ruleParsed.suggestedOrgLevel;
        }
        if (finalPayload?.orgLevel) {
          return finalPayload.orgLevel;
        }
        return 'truong';
      })(),
      suggestedCampus: !agentResult.critic.isAiResolved
        ? (ruleParsed.suggestedCampus || finalPayload?.campus || 'cs1')
        : (ruleParsed.suggestedCampus === 'online' ? 'online' : (finalPayload?.campus || ruleParsed.suggestedCampus || 'cs1')),
      suggestedFormat: !agentResult.critic.isAiResolved
        ? (ruleParsed.suggestedFormat || finalPayload?.format || 'offline')
        : (ruleParsed.suggestedFormat === 'online' ? 'online' : (finalPayload?.format || ruleParsed.suggestedFormat || 'offline')),
      debateSummary: agentResult.critic.isAiResolved
        ? agentResult.critic.debateSummary
        : (ruleParsed.detectedClauses.length > 0 ? 'Đã đối soát thành công theo bộ quy chế ĐRL HCMUS.' : agentResult.critic.debateSummary),
      auditNotes: agentResult.critic.issuesFound,
    };
  }
}
