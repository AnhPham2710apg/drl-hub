import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventStatus } from '@drl-hub/shared-types';

export interface PublishEventInput {
  title: string;
  originalPostUrl: string;
  cleanUrlHash: string;
  description?: string;
  posterImageUrl?: string;
  images?: string[];
  registrationDeadline?: string;
  organizerName?: string;
  faculty?: string;
  campus?: string;
  format?: string;
  orgLevel?: string;
  clauses: Array<{
    clauseNumber: number;
    awardedPoints: number;
  }>;
}

export interface EventFilterQuery {
  clause?: number;
  search?: string;
  closingSoon?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class EventsService {
  private inMemoryEvents: any[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async publish(input: PublishEventInput) {
    const slug = this.slugify(input.title) + '-' + Math.random().toString(36).substring(2, 7);

    try {
      // 1. Thử ghi vào PostgreSQL qua Prisma
      const event = await this.prisma.event.create({
        data: {
          title: input.title,
          slug,
          originalPostUrl: input.originalPostUrl,
          cleanUrlHash: input.cleanUrlHash,
          description: input.description,
          posterImageUrl: input.posterImageUrl,
          registrationDeadline: input.registrationDeadline ? new Date(input.registrationDeadline) : null,
          status: EventStatus.PUBLISHED,
          pointsAwarded: input.clauses.reduce((acc, c) => acc + c.awardedPoints, 0),
          criteriaMappings: {
            create: input.clauses.map((c) => ({
              criteriaId: c.clauseNumber,
              awardedPoints: c.awardedPoints,
            })),
          },
        },
        include: {
          criteriaMappings: true,
        },
      });
      return {
        ...event,
        images: input.images || (input.posterImageUrl ? [input.posterImageUrl] : []),
        faculty: input.faculty,
        campus: input.campus,
        format: input.format,
        orgLevel: input.orgLevel,
      };
    } catch (err: any) {
      // Fallback in-memory nếu DB chưa kết nối
      const existing = this.inMemoryEvents.find((e) => e.cleanUrlHash === input.cleanUrlHash);
      if (existing) {
        throw new ConflictException('Sự kiện này đã tồn tại trong hệ thống');
      }

      const mockEvent = {
        id: 'mem-' + Math.random().toString(36).substring(2, 9),
        title: input.title,
        slug,
        originalPostUrl: input.originalPostUrl,
        cleanUrlHash: input.cleanUrlHash,
        description: input.description,
        posterImageUrl: input.posterImageUrl,
        images: input.images || (input.posterImageUrl ? [input.posterImageUrl] : []),
        registrationDeadline: input.registrationDeadline,
        status: EventStatus.PUBLISHED,
        pointsAwarded: input.clauses.reduce((acc, c) => acc + c.awardedPoints, 0),
        clickCount: 0,
        faculty: input.faculty,
        campus: input.campus,
        format: input.format,
        orgLevel: input.orgLevel,
        createdAt: new Date().toISOString(),
        criteriaMappings: input.clauses.map((c) => ({
          criteriaId: c.clauseNumber,
          awardedPoints: c.awardedPoints,
        })),
      };
      this.inMemoryEvents.unshift(mockEvent);
      return mockEvent;
    }
  }

  async findAll(query: EventFilterQuery) {
    const { clause, search, closingSoon, page = 1, limit = 10 } = query;

    try {
      const where: any = {
        status: EventStatus.PUBLISHED,
      };

      if (clause) {
        where.criteriaMappings = {
          some: { criteriaId: Number(clause) },
        };
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        this.prisma.event.findMany({
          where,
          include: { criteriaMappings: true, organizer: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.event.count({ where }),
      ]);

      return { items, total, page, limit };
    } catch {
      // In-memory query fallback
      let filtered = [...this.inMemoryEvents];

      if (clause) {
        filtered = filtered.filter((e) =>
          e.criteriaMappings.some((m: any) => m.criteriaId === Number(clause))
        );
      }

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.title.toLowerCase().includes(s) ||
            (e.description && e.description.toLowerCase().includes(s))
        );
      }

      const total = filtered.length;
      const items = filtered.slice((page - 1) * limit, page * limit);

      return { items, total, page, limit };
    }
  }

  async findOneAndTrackClick(id: string) {
    try {
      const event = await this.prisma.event.update({
        where: { id },
        data: { clickCount: { increment: 1 } },
        include: { criteriaMappings: true, organizer: true },
      });
      return event;
    } catch {
      const event = this.inMemoryEvents.find((e) => e.id === id);
      if (!event) {
        throw new NotFoundException('Không tìm thấy sự kiện');
      }
      event.clickCount = (event.clickCount || 0) + 1;
      return event;
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
}
