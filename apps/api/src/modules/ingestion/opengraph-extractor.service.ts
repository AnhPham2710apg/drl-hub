import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ExtractedMetadata {
  title: string;
  description: string;
  posterImageUrl?: string;
  posterImages?: string[];
  canonicalUrl?: string;
  isBlockedByLoginWall?: boolean;
}

@Injectable()
export class OpenGraphExtractorService {
  private readonly logger = new Logger(OpenGraphExtractorService.name);

  /**
   * Tự động phân giải link rút gọn/share của Facebook thành URL bài viết chính thức (/posts/)
   * để vượt qua rào cản yêu cầu đăng nhập (login wall) của Facebook đối với link chia sẻ.
   */
  async resolveFacebookUrl(url: string): Promise<string> {
    let targetUrl = url;
    let hops = 0;

    // Đảm bảo share URL có dấu gạch chéo cuối để tránh bị Facebook gửi 301 thừa
    if (targetUrl.includes('/share/') && !targetUrl.endsWith('/')) {
      targetUrl += '/';
    }

    // 1. Vòng lặp giải nén redirect (hỗ trợ cả 301, 302 và multi-hop redirect cho link share/v/p)
    while ((targetUrl.includes('/share/') || targetUrl.includes('fb.watch')) && hops < 5) {
      hops++;
      try {
        const res = await axios.get(targetUrl, {
          headers: {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'Accept-Language': 'vi,en;q=0.9',
          },
          maxRedirects: 0,
          validateStatus: () => true,
          timeout: 8000,
        });

        const loc = res.headers['location'];
        if (!loc) break;
        targetUrl = loc;
      } catch (err: any) {
        this.logger.warn(`Could not resolve share redirect at hop ${hops} for ${url}: ${err.message}`);
        break;
      }
    }

    // 2. Nếu Facebook chuyển hướng sang trang đăng nhập với tham số next=
    const nextMatch = targetUrl.match(/[?&]next=([^&]+)/);
    if (nextMatch) {
      try {
        const decodedNext = decodeURIComponent(nextMatch[1]);
        if (decodedNext.includes('permalink.php') || decodedNext.includes('/posts/')) {
          targetUrl = decodedNext;
        }
      } catch {}
    }

    // 3. Chuyển đổi permalink.php?story_fbid=...&id=... hoặc story.php thành dạng /posts/ canonical chuẩn hóa
    if (targetUrl.includes('permalink.php') || targetUrl.includes('story.php')) {
      const storyFbidMatch = targetUrl.match(/story_fbid=([^&]+)/);
      const idMatch = targetUrl.match(/[?&]id=(\d+)/);
      if (storyFbidMatch && idMatch) {
        targetUrl = `https://www.facebook.com/${idMatch[1]}/posts/${storyFbidMatch[1]}/`;
      }
    }

    return targetUrl;
  }

  isFacebookLoginWall(text: string): boolean {
    if (!text) return true;
    const lower = text.toLowerCase().trim();
    if (lower === 'facebook' || lower === 'log in' || lower === 'đăng nhập') return true;
    const loginMarkers = [
      'đăng nhập vào facebook',
      'khám phá những điều bạn yêu thích',
      'quên mật khẩu',
      'tạo tài khoản mới',
      'log into facebook',
      'explore the things you love',
      'forgot password',
      'create new account',
      'see more on facebook',
      'log in to see more',
    ];
    const matchCount = loginMarkers.filter(m => lower.includes(m)).length;
    return matchCount >= 1;
  }

  async extract(url: string): Promise<ExtractedMetadata> {
    const extractedImageUrls: string[] = [];

    // Bước 0: Phân giải URL bài viết thực sự (giải nén link /share/ hoặc permalink.php)
    const effectiveUrl = await this.resolveFacebookUrl(url);

    try {
      // 1. Fetch với User-Agent facebookexternalhit để lấy metadata chuẩn nhất
      const response = await axios.get(effectiveUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept-Language': 'vi,en;q=0.9',
        },
        maxRedirects: 5,
      });

      let html = response.data;
      let $ = cheerio.load(html);

      // 2. Tự động truy vết Canonical URL thật sự nếu có (cho link photo.php, share/p/..., posts/...)
      const canonicalMatch = html.match(/rel="canonical"\s+href="([^"]+)"/i) || html.match(/href="(https:\/\/www\.facebook\.com\/[^"]+\/photos\/[^"]+)"/);
      const ogUrlMatch = html.match(/property="og:url"\s+content="([^"]+)"/i);
      let targetCanonicalUrl = '';

      if (canonicalMatch && canonicalMatch[1]) {
        targetCanonicalUrl = canonicalMatch[1].replace(/&amp;/g, '&');
      } else if (ogUrlMatch && ogUrlMatch[1] && effectiveUrl.includes('/share/')) {
        targetCanonicalUrl = ogUrlMatch[1].replace(/&amp;/g, '&');
      }

      if (targetCanonicalUrl && targetCanonicalUrl !== effectiveUrl) {
        try {
          const canonicalRes = await axios.get(targetCanonicalUrl, {
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
      // Kiểm tra xem Facebook có đính kèm toàn văn bài viết kèm emoji trong script CometSinglePostDialogRoot không:
      let embeddedFullText = '';
      const metaTitleJsonMatch = html.match(/"meta":\{"title":"([^"]+)"/);
      if (metaTitleJsonMatch && metaTitleJsonMatch[1] && metaTitleJsonMatch[1].length > 200) {
        try {
          embeddedFullText = JSON.parse(`"${metaTitleJsonMatch[1]}"`);
        } catch {
          embeddedFullText = metaTitleJsonMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        }
      }

      let ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || '';
      ogTitle = ogTitle.replace(/\s*\|\s*Facebook$/i, '').trim();

      let ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
      ogDesc = ogDesc.replace(/\s*\|\s*Facebook$/i, '').trim();

      let rawContent = embeddedFullText || ogTitle;
      const isTitleJustPageName = ogTitle.length < 90 && (
        /trường|khoa|thư\s*viện|đoàn|hội|clb|liên\s*chi\s*hội|hcmus/i.test(ogTitle) ||
        ogDesc.length > ogTitle.length
      );

      if (!embeddedFullText && isTitleJustPageName && ogDesc.length > 20) {
        rawContent = ogDesc;
      }

      // Lọc sạch mẩu cụt tên fanpage bị Facebook nén dính ở đầu bài (ví dụ: 'Đoàn - ')
      rawContent = rawContent.replace(/^(?:đoàn\s*[-–—]\s*|hội\s*[-–—]\s*|clb\s*[-–—]\s*)/i, '').trim();

      // Chuẩn hóa bài viết: Thêm xuống hàng tự nhiên trước các emoji mục tiêu rõ ràng
      let formattedDescription = rawContent;
      if (rawContent) {
        formattedDescription = rawContent
          .replace(/([^\n])\s*(🎙️|🎤|💬|🎁|📍|📅|⏰|⚡|🏃‍♂️|🏃|🔥|🏅|🏆|🥇|🥈|🥉|📌|🌱Đăng|🌱 Hạt|📚|🌟|🤖|THỜI GIAN|ĐỊA ĐIỂM)/g, '$1\n\n$2')
          .replace(/([^\n])\s*(Đến với Hạt Giống Đỏ|Khi tham gia chương trình|Chủ đề:|TALKSHOW|THÔNG TIN SỰ KIỆN|QUYỀN LỢI VÀ CƠ CẤU|Bảng vàng giải thưởng)/g, '$1\n\n$2');
      }

      let title = rawContent;
      let description = formattedDescription || ogDesc || rawContent;

      if (rawContent.length > 50) {
        const talkshowMatch = rawContent.match(/(?:TALK\s*SHOW|HỘI\s*THẢO|TỌA\s*ĐÀM|CHƯƠNG\s*TRÌNH|CUỘC\s*THI|CHIẾN\s*DỊCH|NGÀY\s*HỘI|ĐƯỜNG\s*CHẠY)[^–\n\r\.🌱🌟📚🔥]{5,100}[–\-:][^\n\r\.🌱🌟📚🔥]{5,100}/i);
        if (talkshowMatch && talkshowMatch[0]) {
          title = talkshowMatch[0].trim();
        } else {
          const quotedMatch = rawContent.match(/[“"\[]([^”"\]]+)[”"\]]/);
          if (quotedMatch && quotedMatch[1] && quotedMatch[1].length > 10) {
            title = quotedMatch[1].trim();
          } else {
            const firstLine = rawContent.split(/\n|🌱|🔴|📚|🌟|🎤|🔥/)[0].trim();
            title = firstLine.length > 15 ? firstLine : rawContent.substring(0, 80).trim();
          }
        }
      }

      // 4. Trích xuất ảnh OpenGraph chính
      const primaryOgImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
      if (primaryOgImage && !extractedImageUrls.includes(primaryOgImage)) {
        extractedImageUrls.push(primaryOgImage);
      }

      // Quét thêm ảnh từ fbid trên URL chính
      const mainFbidMatch = url.match(/fbid=(\d+)/);
      if (mainFbidMatch && mainFbidMatch[1]) {
        const fbidUrl = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${mainFbidMatch[1]}`;
        if (!extractedImageUrls.includes(fbidUrl)) extractedImageUrls.push(fbidUrl);
      }

      // 5. Jina AI Reader (r.jina.ai): Lấy toàn văn bài viết sạch + khôi phục đầy đủ emoji + trích xuất album ảnh
      try {
        const jinaTargetUrl = targetCanonicalUrl || effectiveUrl || url;
        const jinaUrl = `https://r.jina.ai/${jinaTargetUrl}`;
        const jinaRes = await axios.get(jinaUrl, { timeout: 10000 });
        const jinaMarkdown = jinaRes.data;

        if (jinaMarkdown && typeof jinaMarkdown === 'string') {
          if (this.isFacebookLoginWall(jinaMarkdown)) {
            this.logger.warn(`Jina Reader hit Facebook login wall for ${jinaTargetUrl}. Discarding Jina content.`);
          } else {
            // Bóc tách nội dung chính, loại bỏ hoàn toàn header rác
            const mdLines = jinaMarkdown.split('\n');
            const startIndex = mdLines.findIndex(l => l.startsWith('Markdown Content:'));
            const contentAfterHeader = startIndex !== -1 ? mdLines.slice(startIndex + 1).join('\n') : jinaMarkdown;

            // Trích xuất ảnh poster/album CHỈ TRONG PHẠM VI BÀI VIẾT (trước All reactions / bình luận / feed khác)
            const stopMarkers = ['All reactions:', 'Like\nComment', 'Top fan', 'See more from', 'Privacy · Terms'];
            let postRawSection = contentAfterHeader;
            for (const stop of stopMarkers) {
              const stopIdx = postRawSection.indexOf(stop);
              if (stopIdx !== -1) {
                postRawSection = postRawSection.substring(0, stopIdx);
              }
            }

            // A. Trích xuất fbid ảnh đính kèm từ chính phạm vi bài viết
            const fbidRegex = /(?:photo(?:\.php)?\?(?:[^"\s\)]*&)?fbid=|lookaside\.fbsbx\.com\/lookaside\/crawler\/media\/\?media_id=|fbid=)(\d+)/g;
            let fbMatch: RegExpExecArray | null;
            const postImageUrls: string[] = [];
            while ((fbMatch = fbidRegex.exec(postRawSection)) !== null) {
              const id = fbMatch[1];
              const imgUrl = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${id}`;
              if (!postImageUrls.includes(imgUrl) && !extractedImageUrls.includes(imgUrl)) {
                postImageUrls.push(imgUrl);
              }
            }
            // Giới hạn ảnh đính kèm bài viết tối đa 4 ảnh để tránh rò rỉ timeline
            extractedImageUrls.push(...postImageUrls.slice(0, 4));

            // 1) Khôi phục emoji gốc: ![Image \d+: 🔥] -> 🔥
            let cleanMd = contentAfterHeader.replace(/!\[Image\s+\d+:\s*([^\]]+)\]\([^\)]+\)/g, (match, emojiText) => {
              if (emojiText && !emojiText.includes('May be') && !emojiText.includes('image') && emojiText.length <= 8) {
                return emojiText.trim() + ' ';
              }
              return '';
            });

            // 2) Xóa các thẻ ảnh rác còn lại
            cleanMd = cleanMd
              .replace(/!\[Image[^\]]*\]\([^\)]+\)/g, '')
              .replace(/!Image\s+\d+/g, '');

            // 3) Giải nén các link rút gọn l.facebook.com hoặc chuyển link markdown thành text sạch
            cleanMd = cleanMd.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (match, text, href) => {
              if (text.startsWith('http')) return text;
              if (href.includes('l.facebook.com/l.php?u=')) {
                try {
                  const u = new URL(href).searchParams.get('u');
                  if (u) return u;
                } catch {
                  // Ignore parse error
                }
              }
              return text;
            });

            const lines = cleanMd.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const postLines: string[] = [];
            let inPost = false;

            for (const l of lines) {
              // Bỏ qua các dòng rác ban đầu của Facebook
              if (!inPost) {
                const isHeaderBoilerplate =
                  l.includes('\'s Post') ||
                  l.match(/\d+\s*(?:days?|hours?|mins?|ngày|giờ|phút)\s*ago/i) ||
                  l.match(/^\[?\d+[dhmw]\]?/i) ||
                  l.startsWith('Log In') ||
                  l.startsWith('Forgot Account') ||
                  l.startsWith('###') ||
                  l.startsWith('* * *') ||
                  l.startsWith('## ') ||
                  l.startsWith('[](') ||
                  l.startsWith('·') ||
                  l === '·';

                if (isHeaderBoilerplate) {
                  continue;
                }

                // Tiêu chí bắt đầu bài viết thực sự
                if (
                  l.startsWith('🔥') ||
                  l.startsWith('🔴') ||
                  l.startsWith('🌱') ||
                  l.startsWith('⚡') ||
                  l.startsWith('📍') ||
                  l.includes('CHÍNH THỨC') ||
                  l.includes('NGÀY HỘI') ||
                  l.includes('TALKSHOW') ||
                  l.includes('CUỘC THI') ||
                  l.includes('ĐƯỜNG CHẠY') ||
                  l.includes('HỘI THẢO') ||
                  l.length > 25
                ) {
                  inPost = true;
                }
              }

              if (inPost) {
                // Điểm dừng: các phần bình luận Facebook, phản ứng, hoặc link ảnh đính kèm cuối bài
                if (
                  l.includes('All reactions:') ||
                  l.includes('Like\nComment') ||
                  (l.startsWith('View ') && l.includes('repl')) ||
                  l.startsWith('English') ||
                  l.startsWith('Log In') ||
                  l.startsWith('See more from') ||
                  l.includes('Top fan') ||
                  l.includes('Privacy · Terms') ||
                  l.includes('/photo/?fbid=') ||
                  l.includes('/photos/')
                ) {
                  break;
                }
                postLines.push(l);
              }
            }

            if (postLines.length >= 3) {
              const fullJinaContent = postLines.join('\n\n');
              if (fullJinaContent.length > 100 && !this.isFacebookLoginWall(fullJinaContent)) {
                rawContent = fullJinaContent;
                description = fullJinaContent;
              }
            }
          }
        }
      } catch {
        // Bỏ qua nếu Jina lỗi
      }

      // Kiểm tra nếu nội dung cuối cùng bị Facebook khóa bằng login wall
      const loginWallDetected = this.isFacebookLoginWall(rawContent) && this.isFacebookLoginWall(description);
      if (loginWallDetected) {
        return {
          title: 'Bài viết yêu cầu đăng nhập Facebook',
          description: 'Facebook yêu cầu đăng nhập để xem bài viết này (bài viết riêng tư hoặc cần tài khoản). Vui lòng sử dụng tính năng "Dán trực tiếp nội dung bài viết" ở trên để AI phân tích và xếp loại ĐRL ngay lập tức!',
          isBlockedByLoginWall: true,
          posterImageUrl: undefined,
          posterImages: [],
          canonicalUrl: targetCanonicalUrl || effectiveUrl || undefined,
        };
      }

      // Trích xuất poster chính (giới hạn tối đa 4 ảnh để tránh rò rỉ timeline)
      const finalPosterImages = extractedImageUrls.slice(0, 4);
      const posterImageUrl = finalPosterImages.length > 0 ? finalPosterImages[0] : undefined;

      return {
        title: title || 'Sự kiện sinh viên',
        description: description || rawContent,
        posterImageUrl,
        posterImages: finalPosterImages,
        canonicalUrl: targetCanonicalUrl || effectiveUrl || undefined,
      };
    } catch (error) {
      // Fallback
      const fbidMatch = url.match(/fbid=(\d+)/);
      if (fbidMatch && fbidMatch[1]) {
        const fallback = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${fbidMatch[1]}`;
        extractedImageUrls.push(fallback);
      }

      const fallbackImages = extractedImageUrls.slice(0, 4);
      return {
        title: 'Sự kiện chia sẻ từ Facebook',
        description: '',
        posterImageUrl: fallbackImages[0] || undefined,
        posterImages: fallbackImages,
        canonicalUrl: effectiveUrl || undefined,
      };
    }
  }
}
