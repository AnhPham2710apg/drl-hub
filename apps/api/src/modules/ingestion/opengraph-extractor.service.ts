import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ExtractedMetadata {
  title: string;
  description: string;
  posterImageUrl?: string;
}

@Injectable()
export class OpenGraphExtractorService {
  async extract(url: string): Promise<ExtractedMetadata> {
    try {
      // 1. Fetch với User-Agent facebookexternalhit để lấy metadata chuẩn nhất
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept-Language': 'vi,en;q=0.9',
        },
        maxRedirects: 5,
      });

      let html = response.data;
      let $ = cheerio.load(html);

      // 2. Kiểm tra nếu là link photo.php thì Facebook thường giấu canonical URL thật trong thẻ <link rel="alternate">
      // Ví dụ: https://www.facebook.com/dk.lch.diachatkhtn/photos/.../1526825616138522/
      const canonicalMatch = html.match(/href="(https:\/\/www\.facebook\.com\/[^"]+\/photos\/[^"]+)"/);
      if (canonicalMatch && canonicalMatch[1] && url.includes('photo.php')) {
        try {
          const canonicalUrl = canonicalMatch[1].replace(/&amp;/g, '&');
          const canonicalRes = await axios.get(canonicalUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
              'Accept-Language': 'vi,en;q=0.9',
            },
          });
          html = canonicalRes.data;
          $ = cheerio.load(html);
        } catch {
          // Bỏ qua nếu fetch canonical thất bại, dùng tiếp HTML hiện tại
        }
      }

      // 3. Trích xuất Title & Caption đầy đủ
      // Thẻ <meta property="og:title"> trên trang canonical chứa TOÀN BỘ bài viết gốc!
      let rawTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || '';
      // Xóa phần đuôi "| Facebook"
      rawTitle = rawTitle.replace(/\s*\|\s*Facebook$/i, '').trim();

      // Tách dòng đầu làm Tiêu đề, các dòng sau làm Nội dung chi tiết
      let title = rawTitle;
      let description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

      if (rawTitle.length > 50) {
        description = rawTitle; // Lưu full caption
        // Tìm dòng tiêu đề sự kiện (thường bắt đầu sau 'Đoàn - ' hoặc chứa icon như 🔴, [ , ")
        const talkshowMatch = rawTitle.match(/(?:🔴|\[|“|")?([^–\n\r\.]{10,80}[–\-][^\n\r\.]{5,80})/);
        if (talkshowMatch && talkshowMatch[0]) {
          title = talkshowMatch[0].replace(/^[^\w\u00C0-\u1EF9“"\[🔴]+/, '').trim();
        } else {
          title = rawTitle.substring(0, 80).trim() + '...';
        }
      }

      // 4. Trích xuất Poster Image URL
      let posterImageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
      
      // Nếu là link photo.php mà chưa có ảnh, tự động fallback sang crawler media id chuẩn của Facebook
      if (!posterImageUrl && url.includes('fbid=')) {
        const fbidMatch = url.match(/fbid=(\d+)/);
        if (fbidMatch && fbidMatch[1]) {
          posterImageUrl = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${fbidMatch[1]}`;
        }
      }

      return {
        title: title || 'Sự kiện sinh viên',
        description: description || rawTitle,
        posterImageUrl: posterImageUrl || undefined,
      };
    } catch (error) {
      // Fallback khi Facebook rate limit
      let fallbackPoster: string | undefined;
      const fbidMatch = url.match(/fbid=(\d+)/);
      if (fbidMatch && fbidMatch[1]) {
        fallbackPoster = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${fbidMatch[1]}`;
      }

      return {
        title: 'Sự kiện chia sẻ từ Facebook',
        description: '',
        posterImageUrl: fallbackPoster,
      };
    }
  }
}
