import { Controller, Post, Get, Param, Query, Body, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { EventsService, PublishEventInput, EventFilterQuery } from './events.service';

@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('publish')
  async publishEvent(@Body() body: PublishEventInput) {
    return this.eventsService.publish(body);
  }

  @Get()
  async getEvents(@Query() query: EventFilterQuery) {
    return this.eventsService.findAll(query);
  }

  @Get('proxy-image')
  async proxyImage(@Req() req: any, @Query('url') rawUrl: string, @Res() res: Response) {
    const brandedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <rect width="800" height="450" fill="#1e3a8a"/>
  <circle cx="400" cy="180" r="60" fill="#3b82f6" opacity="0.3"/>
  <path d="M400 140 L440 165 L400 190 L360 165 Z" fill="#ffffff"/>
  <path d="M375 175 L375 205 C375 215 425 215 425 205 L425 175" fill="none" stroke="#ffffff" stroke-width="4"/>
  <text x="400" y="270" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">HÌNH ẢNH SỰ KIỆN TỪ FACEBOOK</text>
  <text x="400" y="305" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#93c5fd">Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM</text>
</svg>`;

    if (!rawUrl && (!req.url || !req.url.includes('url='))) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(200).send(brandedSvg);
    }

    let imageUrl = rawUrl || '';
    if (req.url && req.url.includes('url=')) {
      const idx = req.url.indexOf('url=');
      imageUrl = req.url.slice(idx + 4);
      const vIdx = imageUrl.lastIndexOf('&v=');
      if (vIdx !== -1) {
        imageUrl = imageUrl.slice(0, vIdx);
      }
      imageUrl = decodeURIComponent(imageUrl);
    }

    try {
      while (imageUrl.includes('proxy-image?url=')) {
        const parts = imageUrl.split('proxy-image?url=');
        imageUrl = decodeURIComponent(parts[parts.length - 1]);
      }

      // Convert Facebook photo.php or photo/?fbid= to direct crawler media endpoint
      const fbidMatch = imageUrl.match(/fbid=(\d+)/);
      if (fbidMatch && fbidMatch[1] && !imageUrl.includes('lookaside/crawler/media')) {
        imageUrl = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${fbidMatch[1]}`;
      }

      const isFb = imageUrl.includes('fbsbx.com') || imageUrl.includes('fbcdn.net') || imageUrl.includes('facebook.com');
      const axios = (await import('axios')).default;
      let streamRes: any = null;

      // Strategy 1: Fetch with facebookexternalhit User-Agent (Authentic JPEG binary directly from Facebook)
      if (isFb) {
        try {
          const resp = await axios.get(imageUrl, {
            headers: {
              'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Language': 'vi,en;q=0.9',
            },
            responseType: 'stream',
            timeout: 10000,
            validateStatus: (status: number) => status < 400,
          });
          const ct = String(resp.headers['content-type'] || '');
          if (ct.startsWith('image/')) {
            streamRes = resp;
          }
        } catch {
          // Fall through to Strategy 2
        }
      }

      // Strategy 2: If strategy 1 did not get an image, attempt with standard browser User-Agent
      if (!streamRes) {
        try {
          const resp = await axios.get(imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Language': 'vi,en;q=0.9',
              'Referer': 'https://www.facebook.com/',
            },
            responseType: 'stream',
            timeout: 10000,
            validateStatus: (status: number) => status < 400,
          });
          const ct = String(resp.headers['content-type'] || '');
          if (ct.startsWith('image/')) {
            streamRes = resp;
          }
        } catch {
          // Fall through to fallback
        }
      }

      if (streamRes) {
        const contentType = String(streamRes.headers['content-type'] || 'image/jpeg');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, no-transform');
        streamRes.data.on('error', () => {
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.status(200).send(brandedSvg);
          }
        });
        return streamRes.data.pipe(res);
      }

      // If both strategies fail to return a binary image: serve HCMUS branded SVG
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.status(200).send(brandedSvg);
    } catch {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(200).send(brandedSvg);
      }
    }
  }

  @Get(':id/click')
  async trackClick(@Param('id') id: string) {
    return this.eventsService.findOneAndTrackClick(id);
  }

  @Get(':id')
  async getEventById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }
}
