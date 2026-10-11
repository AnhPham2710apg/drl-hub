import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SanitizedUrlResult {
  originalUrl: string;
  cleanUrl: string;
  hash: string;
}

@Injectable()
export class UrlSanitizerService {
  private readonly trackingParams = new Set([
    'fbclid',
    'mibextid',
    'ref',
    'ref_src',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    '__cft__[0]',
    '__tn__',
  ]);

  sanitize(rawUrl: string): SanitizedUrlResult {
    try {
      const url = new URL(rawUrl.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new BadRequestException('Chỉ hỗ trợ giao thức HTTP/HTTPS');
      }

      // Lọc bỏ tracking query params
      const searchParams = new URLSearchParams(url.search);
      for (const key of Array.from(searchParams.keys())) {
        if (this.trackingParams.has(key) || key.startsWith('__')) {
          searchParams.delete(key);
        }
      }

      // Chuẩn hóa path: bỏ trailing slash nếu có
      let pathname = url.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }

      const queryString = searchParams.toString();
      const cleanUrl = `${url.origin}${pathname}${queryString ? `?${queryString}` : ''}`;

      // Tính MD5 hash phục vụ việc check trùng lặp URL cực nhanh trong Database
      const hash = crypto.createHash('md5').update(cleanUrl.toLowerCase()).digest('hex');

      return {
        originalUrl: rawUrl,
        cleanUrl,
        hash,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`URL không hợp lệ: ${rawUrl}`);
    }
  }
}
