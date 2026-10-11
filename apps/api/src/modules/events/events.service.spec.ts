import { EventsService } from './events.service';
import { PrismaService } from '../database/prisma.service';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = new PrismaService();
    // Giả lập prisma error để kiểm tra in-memory fallback an toàn
    jest.spyOn(prisma.event, 'findMany').mockRejectedValue(new Error('DB Offline'));
    jest.spyOn(prisma.event, 'create').mockRejectedValue(new Error('DB Offline'));
    service = new EventsService(prisma);
  });

  it('should start with an empty clean event list', async () => {
    const res = await service.findAll({});
    expect(res.items).toBeDefined();
    expect(res.items.length).toBe(0);
  });

  it('should filter published events by clause number correctly', async () => {
    await service.publish({
      title: 'Talkshow Nội dung 3',
      originalPostUrl: 'https://fb.com/test-nd3',
      cleanUrlHash: 'hash-nd3',
      clauses: [{ clauseNumber: 3, awardedPoints: 5 }]
    });

    const res = await service.findAll({ clause: 3 });
    expect(res.items.length).toBe(1);
    expect(res.items[0].criteriaMappings[0].criteriaId).toBe(3);
  });

  it('should publish a new event with metadata and calculate total pointsAwarded', async () => {
    const newEvent = {
      title: 'Hội thảo Trí tuệ Nhân tạo 2026',
      originalPostUrl: 'https://facebook.com/fit/post-123456',
      cleanUrlHash: 'hash-ai-2026',
      description: 'Workshop AI Khoa CNTT',
      faculty: 'cntt',
      campus: 'cs1',
      format: 'offline',
      orgLevel: 'khoa',
      clauses: [{ clauseNumber: 1, awardedPoints: 5 }],
    };

    const saved = await service.publish(newEvent);
    expect(saved.id).toBeDefined();
    expect(saved.title).toBe(newEvent.title);
    expect(saved.faculty).toBe('cntt');
    expect(saved.pointsAwarded).toBe(5);

    // Verify it is in findAll list
    const list = await service.findAll({});
    const found = list.items.find((e: any) => e.cleanUrlHash === 'hash-ai-2026');
    expect(found).toBeDefined();
  });
});
