import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
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

  @Get(':id/click')
  async trackClick(@Param('id') id: string) {
    return this.eventsService.findOneAndTrackClick(id);
  }

  @Get(':id')
  async getEventById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }
}
