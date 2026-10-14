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
  eventDate?: string;
  eventTime?: string;
  location?: string;
  registrationLink?: string;
  organizerName?: string;
  faculty?: string;
  campus?: string;
  format?: string;
  orgLevel?: string;
  clauses: Array<{
    clauseNumber: number;
    awardedPoints: number;
    subClauseCode?: string;
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

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultEvents();
  }

  private seedDefaultEvents() {
    this.inMemoryEvents = [
      {
        id: 'ev-seed-1',
        title: '[NGÀY HỘI CHÀO MỪNG NĂM HỌC MỚI] BẬT TƯ DUY SỐ - MỞ LỘ TRÌNH XANH',
        slug: 'ngay-hoi-chao-mung-nam-hoc-moi-bat-tu-duy-so-mo-lo-trinh-xanh',
        originalPostUrl: 'https://www.facebook.com/photo/?fbid=1518627976956831&set=pcb.1518629756956653',
        cleanUrlHash: 'seed_hash_1',
        description: 'Ngày hội Chào mừng năm học mới với chủ đề "Bật tư duy số - Mở lộ trình xanh" chính thức diễn ra, mang đến không gian trải nghiệm tri thức và công nghệ số.\n\nCÙNG KHÁM PHÁ CÁC HOẠT ĐỘNG:\n- 05 Trạm sóng trải nghiệm khoa học\n- 02 Workshop kỹ năng chuyên đề số\n- Cuộc thi Rung chuông vàng khoa học\n- Gian hàng sách và quà tặng công nghệ.',
        posterImageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
        images: [
          'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'
        ],
        registrationDeadline: '2026-10-25',
        eventDate: '26/10/2026',
        eventTime: '07:30 - 16:30',
        location: 'Trường THPT Phước Bửu & Cơ sở 1 Nguyễn Văn Cừ, Q5',
        registrationLink: 'https://forms.gle/drl-hub-demo-reg',
        status: EventStatus.PUBLISHED,
        pointsAwarded: 5,
        clickCount: 42,
        faculty: 'all',
        campus: 'cs1',
        format: 'offline',
        orgLevel: 'truong',
        createdAt: new Date().toISOString(),
        clauses: [{ clauseNumber: 3, awardedPoints: 5, subClauseCode: '3.1' }],
        criteriaMappings: [{ criteriaId: 3, awardedPoints: 5, subClauseCode: '3.1' }],
      },
      {
        id: 'ev-seed-2',
        title: 'Hội thảo Công nghệ Trí tuệ Nhân tạo & Chuỗi Khối FIT HCMUS 2026',
        slug: 'hoi-thao-cong-nghe-ai-blockchain-fit-hcmus-2026',
        originalPostUrl: 'https://www.facebook.com/share/p/19snNvoSUM/',
        cleanUrlHash: 'seed_hash_2',
        description: 'Khoa Công nghệ Thông tin tổ chức hội thảo chuyên đề về xu hướng AI Agent và Web3. Sinh viên tham dự được cấp chứng nhận và tích lũy điểm rèn luyện Nội dung 1.\n\nDiễn giả: Các chuyên gia hàng đầu từ AI Center và Google Developer Experts.',
        posterImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        images: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'],
        registrationDeadline: '2026-11-05',
        eventDate: '08/11/2026',
        eventTime: '08:00 - 11:30',
        location: 'Hội trường I, Cơ sở 1, 227 Nguyễn Văn Cừ, Quận 5',
        registrationLink: 'https://forms.gle/ai-tech-fit-reg',
        status: EventStatus.PUBLISHED,
        pointsAwarded: 8,
        clickCount: 78,
        faculty: 'cntt',
        campus: 'cs1',
        format: 'offline',
        orgLevel: 'khoa',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        clauses: [{ clauseNumber: 1, awardedPoints: 8, subClauseCode: '1.2' }],
        criteriaMappings: [{ criteriaId: 1, awardedPoints: 8, subClauseCode: '1.2' }],
      },
      {
        id: 'ev-seed-3',
        title: 'Giải chạy Sinh viên Khoa học Tự nhiên vì Cộng đồng - UPRACE HCMUS',
        slug: 'giai-chay-sinh-vien-uprace-hcmus',
        originalPostUrl: 'https://www.facebook.com/share/p/19fv7sjD8F/',
        cleanUrlHash: 'seed_hash_3',
        description: 'Hoạt động chạy bộ trực tuyến gây quỹ từ thiện hỗ trợ các em nhỏ vùng sâu vùng xa do Đoàn trường ĐH Khoa học Tự nhiên phát động.\n\nTích lũy tối thiểu 20km trong 2 tuần để nhận chứng nhận hoàn thành và điểm rèn luyện Nội dung 4.',
        posterImageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
        images: ['https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800'],
        registrationDeadline: '2026-11-15',
        eventDate: '01/11/2026 - 15/11/2026',
        eventTime: 'Tự do ghi nhận qua Strava',
        location: 'Trực tuyến kết hợp Cơ sở 2 Linh Trung - Thủ Đức',
        registrationLink: 'https://uprace.vn/hcmus',
        status: EventStatus.PUBLISHED,
        pointsAwarded: 10,
        clickCount: 105,
        faculty: 'all',
        campus: 'cs2',
        format: 'hybrid',
        orgLevel: 'truong',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        clauses: [{ clauseNumber: 4, awardedPoints: 10, subClauseCode: '4.1' }],
        criteriaMappings: [{ criteriaId: 4, awardedPoints: 10, subClauseCode: '4.1' }],
      }
    ];
  }

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
          images: input.images || (input.posterImageUrl ? [input.posterImageUrl] : []),
          faculty: input.faculty,
          campus: input.campus,
          format: input.format,
          orgLevel: input.orgLevel,
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
        eventDate: input.eventDate,
        eventTime: input.eventTime,
        location: input.location,
        registrationLink: input.registrationLink,
        status: EventStatus.PUBLISHED,
        pointsAwarded: input.clauses.reduce((acc, c) => acc + c.awardedPoints, 0),
        clickCount: 0,
        faculty: input.faculty,
        campus: input.campus,
        format: input.format,
        orgLevel: input.orgLevel,
        createdAt: new Date().toISOString(),
        clauses: input.clauses,
        criteriaMappings: input.clauses.map((c) => ({
          criteriaId: c.clauseNumber,
          awardedPoints: c.awardedPoints,
          subClauseCode: c.subClauseCode,
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

  async findById(id: string) {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id },
        include: { criteriaMappings: true, organizer: true },
      });
      if (event) return event;
    } catch {}
    const memEvent = this.inMemoryEvents.find((e) => e.id === id);
    if (!memEvent) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }
    return memEvent;
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
