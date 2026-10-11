import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { TrackerService, TrackedEventInput } from './tracker.service';
import { TrackerStatus } from '@drl-hub/shared-types';

export interface BookmarkEventInput {
  userId?: string;
  eventId: string;
  title: string;
  originalPostUrl: string;
  awardedPoints: number;
  clauseNumber: number;
}

@Controller('api/v1/tracker')
export class TrackerController {
  private userTrackedEvents: Map<string, any[]> = new Map();

  constructor(private readonly trackerService: TrackerService) {}

  @Post('bookmark')
  async bookmark(@Body() body: BookmarkEventInput) {
    const userId = body.userId || 'default-student';
    if (!this.userTrackedEvents.has(userId)) {
      this.userTrackedEvents.set(userId, []);
    }

    const list = this.userTrackedEvents.get(userId)!;
    const existing = list.find((item) => item.eventId === body.eventId);
    if (!existing) {
      list.push({
        id: 'track-' + Math.random().toString(36).substring(2, 9),
        eventId: body.eventId,
        title: body.title,
        originalPostUrl: body.originalPostUrl,
        status: TrackerStatus.BOOKMARKED,
        evidenceUrl: null,
        mappings: [
          {
            clauseNumber: body.clauseNumber,
            awardedPoints: body.awardedPoints,
          },
        ],
        createdAt: new Date().toISOString(),
      });
    }

    return this.getSummary(userId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: TrackerStatus; evidenceUrl?: string; userId?: string }
  ) {
    const userId = body.userId || 'default-student';
    const list = this.userTrackedEvents.get(userId) || [];
    const item = list.find((t) => t.id === id || t.eventId === id);
    if (item) {
      item.status = body.status;
      if (body.evidenceUrl) item.evidenceUrl = body.evidenceUrl;
    }

    return this.getSummary(userId);
  }

  @Get('summary')
  async getSummary(userId: string = 'default-student') {
    const list = this.userTrackedEvents.get(userId) || [];
    const simulation = this.trackerService.simulateScores(list);

    return {
      trackedEvents: list,
      simulation,
    };
  }
}
