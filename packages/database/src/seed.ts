import { prisma } from './client.js';

export async function seedDrlCriteria() {
  const criteriaData = [
    {
      clauseNumber: 1,
      subClause: '1.0',
      title: 'Tham gia học tập và nghiên cứu khoa học',
      maxPoints: 30,
      description: 'Chấp hành quy chế học vụ (15đ), ĐTB học kỳ (5-15đ), tiến bộ (2-10đ), NCKH (15đ), cuộc thi học thuật/hội thảo (5-10đ), sinh hoạt CLB học thuật/PTN (5đ).',
    },
    {
      clauseNumber: 2,
      subClause: '2.0',
      title: 'Chấp hành nội quy, quy chế trong Nhà trường',
      maxPoints: 20,
      description: 'Không vi phạm nội quy trường (15đ), đánh giá môn học trên 50% (5đ), tham gia khảo sát/điều tra xã hội của Trường (5đ).',
    },
    {
      clauseNumber: 3,
      subClause: '3.0',
      title: 'Tham gia hoạt động chính trị - xã hội, văn hóa, thể thao, phòng chống tệ nạn',
      maxPoints: 25,
      description: 'Cuộc thi chính trị/văn hóa/thể thao (5-10đ), ngày hội thể thao/chứng nhận thể lực (5đ), huy động lực lượng cấp Trường/Khoa (5đ), TV CLB sở thích (5đ), tư vấn tuyển sinh/ngày hội việc làm (5đ), đối thoại lãnh đạo (5đ), sản phẩm truyền thông (15đ), giao lưu quốc tế (10-15đ), BTC/CTV (3-10đ).',
    },
    {
      clauseNumber: 4,
      subClause: '4.0',
      title: 'Hành động hướng đến xây dựng và phát triển cộng đồng',
      maxPoints: 25,
      description: 'Không vi phạm pháp luật (10đ), hiến máu tình nguyện (10đ), tình nguyện viên vì cộng đồng (5-15đ), BTC/CTV tình nguyện (3-10đ), quyên góp (3đ), tuyên truyền pháp luật/phòng chống dịch bệnh (10đ), Ban cán sự lớp HTTN trở lên (10đ), Đoàn viên xuất sắc/Đảng viên HT tốt NV (10đ).',
    },
    {
      clauseNumber: 5,
      subClause: '5.0',
      title: 'Nội dung khuyến khích cộng thêm',
      maxPoints: 30,
      description: 'Khen thưởng cấp quốc gia/quốc tế/UBND/ĐHQG (5-20đ), giải cuộc thi cấp khoa trở lên (3-5đ), Olympic/cuộc thi cấp Thành (15đ), bài báo quốc tế (25đ), bài báo trong nước (15đ), học bổng vượt khó (10đ), SV mồ côi (20đ), SV khuyết tật/hộ nghèo (10đ).',
    },
  ];

  console.log('Seeding HCMUS DRL Criteria...');
  for (const item of criteriaData) {
    const existing = await prisma.drlCriteria.findFirst({
      where: { clauseNumber: item.clauseNumber },
    });
    if (!existing) {
      await prisma.drlCriteria.create({ data: item });
    } else {
      await prisma.drlCriteria.update({
        where: { id: existing.id },
        data: item,
      });
    }
  }
  console.log('HCMUS DRL Criteria seeded successfully.');
}

if (process.env.NODE_ENV !== 'test') {
  seedDrlCriteria()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
}
