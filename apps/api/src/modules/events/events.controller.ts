import { Controller, Post, Get, Param, Query, Body, Res } from '@nestjs/common';
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
  async proxyImage(@Query('url') imageUrl: string, @Res() res: Response) {
    if (!imageUrl) {
      return res.status(400).send('Image URL is required');
    }

    try {
      while (imageUrl.includes('proxy-image?url=')) {
        const parts = imageUrl.split('proxy-image?url=');
        imageUrl = decodeURIComponent(parts[parts.length - 1]);
      }

      // Convert Facebook photo.php to direct crawler media endpoint
      const fbidMatch = imageUrl.match(/fbid=(\d+)/);
      if (fbidMatch && fbidMatch[1] && !imageUrl.includes('lookaside/crawler/media')) {
        imageUrl = `https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=${fbidMatch[1]}`;
      }

      const isFb = imageUrl.includes('fbsbx.com') || imageUrl.includes('fbcdn.net') || imageUrl.includes('facebook.com');
      const userAgent = isFb
        ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

      const axios = (await import('axios')).default;
      const response = await axios.get(imageUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': 'https://www.facebook.com/',
        },
        responseType: 'stream',
        timeout: 12000,
        validateStatus: (status) => status < 400,
      });

      const contentType = String(response.headers['content-type'] || 'image/jpeg');

      // CRITICAL: If Facebook returned HTML redirect or challenge, do NOT serve HTML as image!
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        return res.redirect('https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      response.data.on('error', () => {
        if (!res.headersSent) {
          res.redirect('https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800');
        }
      });
      response.data.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.redirect('https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800');
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
