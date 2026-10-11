import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventStatus } from '@drl-hub/shared-types';

export interface PublishEventInput {
  title: string;
  originalPostUrl: string;
  cleanUrlHash: string;
  description?: string;
  posterImageUrl?: string;
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
  private inMemoryEvents: any[] = [
    {
      id: 'mock-1',
      title: 'Talkshow "Hạt Giống Đỏ 2026" - Lý Tưởng & Khát Vọng Thanh Niên',
      slug: 'talkshow-hat-giong-do-2026',
      originalPostUrl: 'https://www.facebook.com/photo.php?fbid=1526825616138522&set=a.545830524238041&type=3',
      cleanUrlHash: '1526825616',
      description: 'Chương trình giao lưu, bồi dưỡng nhận thức chính trị - lý tưởng cách mạng cho Đoàn viên, sinh viên Khoa Địa chất và toàn trường HCMUS. Tham gia nhận chứng nhận và cộng điểm rèn luyện Nội dung 3.',
      posterImageUrl: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&auto=format&fit=crop&q=80',
      registrationDeadline: '2026-10-25T17:00:00.000Z',
      status: EventStatus.PUBLISHED,
      pointsAwarded: 5,
      clickCount: 142,
      faculty: 'diachat',
      campus: 'cs1',
      format: 'offline',
      orgLevel: 'khoa',
      role: 'attendee',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      criteriaMappings: [{ criteriaId: 3, awardedPoints: 5 }],
      clauses: [{ clauseNumber: 3, awardedPoints: 5 }]
    },
    {
      id: 'mock-2',
      title: 'Cuộc thi Học thuật Hackathon "HCMUS Tech Innovators 2026"',
      slug: 'hackathon-hcmus-tech-innovators-2026',
      originalPostUrl: 'https://www.facebook.com/fit.hcmus/posts/1029384756',
      cleanUrlHash: '1029384756',
      description: 'Sân chơi lập trình và ứng dụng Trí tuệ Nhân tạo do Đoàn - Hội Khoa Công nghệ Thông tin (FIT) phối hợp cùng Google Developer Student Clubs tổ chức. Cơ hội rèn luyện chuyên môn kỹ thuật cao.',
      posterImageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
      registrationDeadline: '2026-10-30T23:59:00.000Z',
      status: EventStatus.PUBLISHED,
      pointsAwarded: 10,
      clickCount: 389,
      faculty: 'cntt',
      campus: 'cs2',
      format: 'hybrid',
      orgLevel: 'khoa',
      role: 'contestant',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      criteriaMappings: [{ criteriaId: 1, awardedPoints: 10 }],
      clauses: [{ clauseNumber: 1, awardedPoints: 10 }]
    },
    {
      id: 'mock-3',
      title: 'Chiến dịch Tình nguyện "Chủ Nhật Xanh HCMUS - Dĩ An 2026"',
      slug: 'chien-dich-chu-nhat-xanh-2026',
      originalPostUrl: 'https://www.facebook.com/ctxh.hcmus/posts/882736192',
      cleanUrlHash: '882736192',
      description: 'Ra quân vệ sinh môi trường, cải tạo cảnh quan khuôn viên Ký túc xá và Cơ sở 2 Linh Trung - Dĩ An do Đội CTXH & Khoa Môi trường (FES) đồng tổ chức. Được cấp Ngày Tình nguyện CTXH.',
      posterImageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=80',
      registrationDeadline: '2026-10-22T12:00:00.000Z',
      status: EventStatus.PUBLISHED,
      pointsAwarded: 8,
      clickCount: 215,
      faculty: 'moitruong',
      campus: 'cs2',
      format: 'offline',
      orgLevel: 'truong',
      role: 'organizer',
      createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
      criteriaMappings: [{ criteriaId: 4, awardedPoints: 8 }],
      clauses: [{ clauseNumber: 4, awardedPoints: 8 }]
    },
    {
      id: 'mock-4',
      title: 'Hội thảo Trực tuyến "Quy chế Học vụ, Miễn giảm học phí & Nếp sống Văn minh SV"',
      slug: 'hoi-thao-quy-che-hoc-vu-2026',
      originalPostUrl: 'https://www.facebook.com/hcmus.ctsv/posts/991827364',
      cleanUrlHash: '991827364',
      description: 'Phòng Công tác Sinh viên (CTSV) hướng dẫn quy chế đào tạo tín chỉ, đăng ký học phần, nội quy giảng đường và các thủ tục hồ sơ năm 2026.',
      posterImageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
      registrationDeadline: '2026-10-28T18:00:00.000Z',
      status: EventStatus.PUBLISHED,
      pointsAwarded: 5,
      clickCount: 98,
      faculty: 'all',
      campus: 'online',
      format: 'online',
      orgLevel: 'truong',
      role: 'attendee',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      criteriaMappings: [{ criteriaId: 2, awardedPoints: 5 }],
      clauses: [{ clauseNumber: 2, awardedPoints: 5 }]
    },
    {
      id: 'mock-5',
      title: 'Giải Bóng đá Sinh viên Khoa Hóa học & Sinh học 2026',
      slug: 'giai-bong-da-hoa-hoc-sinh-hoc-2026',
      originalPostUrl: 'https://www.facebook.com/chem.fbb.hcmus/posts/77651234',
      cleanUrlHash: '77651234',
      description: 'Giải giao lưu thể thao chào mừng ngày thành lập Đoàn TNCS Hồ Chí Minh tại sân cỏ nhân tạo Cơ sở 1 Quận 5. Khuyến khích rèn luyện thể chất.',
      posterImageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      registrationDeadline: '2026-11-05T17:00:00.000Z',
      status: EventStatus.PUBLISHED,
      pointsAwarded: 5,
      clickCount: 165,
      faculty: 'hoahoc',
      campus: 'cs1',
      format: 'offline',
      orgLevel: 'khoa',
      role: 'attendee',
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      criteriaMappings: [{ criteriaId: 5, awardedPoints: 5 }],
      clauses: [{ clauseNumber: 5, awardedPoints: 5 }]
    }
  ];

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
