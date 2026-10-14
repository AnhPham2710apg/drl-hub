export enum UserRole {
  STUDENT = 'STUDENT',
  CLUB_MANAGER = 'CLUB_MANAGER',
  FACULTY_OFFICER = 'FACULTY_OFFICER',
  ADMIN = 'ADMIN',
}

/**
 * 5 Nội dung đánh giá ĐRL chuẩn của Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM (HCMUS)
 */
export enum DrlClause {
  ND1_HOC_TAP = 1, // Tham gia học tập và nghiên cứu khoa học (Tối đa 30 điểm)
  ND2_NOI_QUY = 2, // Chấp hành nội quy, quy chế trong Nhà trường (Tối đa 20 điểm)
  ND3_HOAT_DONG = 3, // Tham gia hoạt động chính trị - xã hội, văn hóa, thể thao, phòng chống tệ nạn (Tối đa 25 điểm)
  ND4_CONG_DONG = 4, // Hành động hướng đến xây dựng và phát triển cộng đồng (Tối đa 25 điểm)
  ND5_KHUYEN_KHICH = 5, // Nội dung khuyến khích cộng thêm (Tối đa 30 điểm)
}

export interface DrlSubCriterion {
  id: string;
  title: string;
  points: number;
  maxPoints?: number;
  description?: string;
}

export interface DrlSubClauseInfo {
  code: string;
  clause: DrlClause;
  title: string;
  defaultPoints: number;
  maxPoints?: number;
  description: string;
}

export const HCMUS_SUB_CLAUSES: Record<string, DrlSubClauseInfo> = {
  '1.5': {
    code: '1.5',
    clause: DrlClause.ND1_HOC_TAP,
    title: 'Đề tài Nghiên cứu khoa học / Khóa luận',
    defaultPoints: 15,
    description: 'Tác giả đề tài NCKH, khóa luận, tiểu luận tốt nghiệp từ cấp Khoa trở lên',
  },
  '1.6': {
    code: '1.6',
    clause: DrlClause.ND1_HOC_TAP,
    title: 'Cuộc thi học thuật cấp Khoa trở lên',
    defaultPoints: 5,
    description: 'Tham gia cuộc thi học thuật từ cấp khoa trở lên (hoàn tất vòng 1)',
  },
  '1.7': {
    code: '1.7',
    clause: DrlClause.ND1_HOC_TAP,
    title: 'Ban tổ chức / CTV cuộc thi học thuật',
    defaultPoints: 10,
    description: 'Ban tổ chức (10đ) hoặc Cộng tác viên (5đ) cuộc thi học thuật',
  },
  '1.8': {
    code: '1.8',
    clause: DrlClause.ND1_HOC_TAP,
    title: 'Sinh hoạt Thư viện / CLB học thuật / PTN',
    defaultPoints: 5,
    description: 'Tham gia sinh hoạt thường xuyên tại Thư viện, CLB học thuật, PTN',
  },
  '1.9': {
    code: '1.9',
    clause: DrlClause.ND1_HOC_TAP,
    title: 'Hội thảo / Tech Talk / Chuyên đề học thuật / Ôn thi',
    defaultPoints: 5,
    description: 'Tham gia hoặc tổ chức sinh hoạt, hội thảo chuyên đề học thuật, Tech Talk, ôn thi môn học, hướng nghiệp',
  },
  '2.2': {
    code: '2.2',
    clause: DrlClause.ND2_NOI_QUY,
    title: 'Đánh giá môn học',
    defaultPoints: 5,
    description: 'Tham gia đánh giá trên 50% số môn đã đăng ký trong học kỳ',
  },
  '2.3': {
    code: '2.3',
    clause: DrlClause.ND2_NOI_QUY,
    title: 'Khảo sát / Điều tra xã hội / Đề án ĐHQG',
    defaultPoints: 5,
    description: 'Tham gia các đợt khảo sát sự hài lòng người học, khảo sát ĐHQG, khảo sát IR3',
  },
  '3.1_TRUONG': {
    code: '3.1',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'Cuộc thi trực tuyến / Hội thi tìm hiểu cấp Trường',
    defaultPoints: 10,
    description: 'Cuộc thi tìm hiểu chính trị, tư tưởng, pháp luật, an toàn thông tin, Unlock the Rules do cấp Trường/CTSV/Đoàn-Hội tổ chức',
  },
  '3.1_KHOA': {
    code: '3.1',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'Cuộc thi trực tuyến / Hội thi tìm hiểu cấp Khoa',
    defaultPoints: 5,
    description: 'Cuộc thi tìm hiểu văn hóa, chính trị, lịch sử cấp Khoa/Chi đoàn',
  },
  '3.2': {
    code: '3.2',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'Thể dục thể thao / Đường chạy / Rèn luyện thể lực',
    defaultPoints: 5,
    description: 'Ngày hội TDTT, giải chạy sinh viên (Fitus, UPRACE...), giấy chứng nhận sức khỏe thể chất',
  },
  '3.3': {
    code: '3.3',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'Huy động lực lượng',
    defaultPoints: 5,
    description: 'Tham gia các đợt huy động lực lượng cấp Trường, cấp Khoa',
  },
  '3.4': {
    code: '3.4',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'CLB sở thích / Đội nhóm phong trào',
    defaultPoints: 5,
    description: 'Thành viên tích cực CLB sở thích cấp khoa trở lên hoặc đội nhóm chức năng',
  },
  '3.5': {
    code: '3.5',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'Hoạt động văn hóa / Talkshow kỹ năng / Chuyên đề / Tham quan',
    defaultPoints: 5,
    description: 'Hoạt động cấp lớp, talkshow kỹ năng mềm, chuyên đề chính trị - xã hội, bảo tàng, 20-11, văn hóa sinh viên',
  },
  '3.8': {
    code: '3.8',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'Tư vấn tuyển sinh / Ngày hội việc làm',
    defaultPoints: 5,
    description: 'Tham gia hoạt động tư vấn tuyển sinh, Ngày hội việc làm từ cấp Khoa trở lên',
  },
  '3.11': {
    code: '3.11',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'Sản phẩm / Dự án truyền thông',
    defaultPoints: 15,
    description: 'Tác giả, đồng tác giả sản phẩm/dự án truyền thông quảng bá hình ảnh Trường/ĐHQG',
  },
  '3.14': {
    code: '3.14',
    clause: DrlClause.ND3_HOAT_DONG,
    title: 'Ban tổ chức hoạt động phong trào',
    defaultPoints: 10,
    description: 'Thành viên Ban tổ chức hoạt động phong trào (Cấp trường 10đ, Cấp khoa 5đ)',
  },
  '4.2': {
    code: '4.2',
    clause: DrlClause.ND4_CONG_DONG,
    title: 'Hiến máu tình nguyện',
    defaultPoints: 10,
    description: 'Tham gia hiến máu tình nguyện vì cộng đồng (có giấy chứng nhận)',
  },
  '4.3': {
    code: '4.3',
    clause: DrlClause.ND4_CONG_DONG,
    title: 'Tình nguyện vì cộng đồng / Bảo vệ môi trường',
    defaultPoints: 5,
    description: 'Tình nguyện viên hoạt động vì cộng đồng ngắn hạn (<24h: 5đ), Clean4Green, Chủ nhật xanh',
  },
  '4.4': {
    code: '4.4',
    clause: DrlClause.ND4_CONG_DONG,
    title: 'Ban tổ chức hoạt động tình nguyện',
    defaultPoints: 10,
    description: 'Thành viên BTC hoạt động tình nguyện (Cấp trường 10đ, Cấp khoa 5đ)',
  },
  '4.5': {
    code: '4.5',
    clause: DrlClause.ND4_CONG_DONG,
    title: 'Quyên góp / Gây quỹ từ thiện tình nguyện',
    defaultPoints: 3,
    description: 'Tham gia các hoạt động quyên góp, gây quỹ Xuân tình nguyện, Mùa hè xanh, ủng hộ đồng bào',
  },
  '4.6': {
    code: '4.6',
    clause: DrlClause.ND4_CONG_DONG,
    title: 'Tuyên truyền pháp luật / Phòng chống tệ nạn',
    defaultPoints: 10,
    description: 'Cuộc thi, chương trình tuyên truyền Hiến pháp, văn bản luật, phòng chống dịch bệnh',
  },
  '4.7': {
    code: '4.7',
    clause: DrlClause.ND4_CONG_DONG,
    title: 'Ban cán sự lớp hoàn thành tốt',
    defaultPoints: 10,
    description: 'Được đánh giá hoàn thành tốt nhiệm vụ trở lên đối với Ban cán sự lớp trong năm học',
  },
  '4.8': {
    code: '4.8',
    clause: DrlClause.ND4_CONG_DONG,
    title: 'Đoàn viên xuất sắc / Đảng viên hoàn thành tốt',
    defaultPoints: 10,
    description: 'Đoàn viên hoàn thành xuất sắc nhiệm vụ hoặc Đảng viên hoàn thành tốt nhiệm vụ',
  },
  '5.1': {
    code: '5.1',
    clause: DrlClause.ND5_KHUYEN_KHICH,
    title: 'Khen thưởng cấp Quốc gia / ĐHQG / Hiệu trưởng',
    defaultPoints: 10,
    description: 'Bằng khen, Giấy khen cấp ĐHQG, Hiệu trưởng, UBND tỉnh, các bộ ngành',
  },
  '5.2': {
    code: '5.2',
    clause: DrlClause.ND5_KHUYEN_KHICH,
    title: 'Đạt giải cuộc thi cấp Khoa trở lên',
    defaultPoints: 5,
    description: 'Giải Nhất/Vô địch (+5đ), Giải Nhì/Ba/Khuyến khích (+3đ) cuộc thi cấp Khoa trở lên',
  },
  '5.3': {
    code: '5.3',
    clause: DrlClause.ND5_KHUYEN_KHICH,
    title: 'Đội tuyển Olympic / Giải thưởng cấp Thành',
    defaultPoints: 15,
    description: 'Thành viên đội tuyển Olympic hoặc đạt giải thưởng học thuật, sáng tạo cấp Thành trở lên',
  },
  '5.4': {
    code: '5.4',
    clause: DrlClause.ND5_KHUYEN_KHICH,
    title: 'Bài báo khoa học quốc tế uy tín',
    defaultPoints: 25,
    description: 'Tác giả/đồng tác giả bài báo trên tạp chí quốc tế uy tín hoặc hội thảo quốc tế',
  },
  '5.5': {
    code: '5.5',
    clause: DrlClause.ND5_KHUYEN_KHICH,
    title: 'Bài báo khoa học trong nước',
    defaultPoints: 15,
    description: 'Tác giả/đồng tác giả bài báo trên tạp chí khoa học trong nước hoặc hội thảo quốc gia',
  },
};

export const HCMUS_DRL_CONFIG = {
  [DrlClause.ND1_HOC_TAP]: {
    name: 'Tham gia học tập và nghiên cứu khoa học',
    maxPoints: 30,
    shortName: 'Học tập & NCKH',
  },
  [DrlClause.ND2_NOI_QUY]: {
    name: 'Chấp hành nội quy, quy chế trong Nhà trường',
    maxPoints: 20,
    shortName: 'Nội quy & Quy chế',
  },
  [DrlClause.ND3_HOAT_DONG]: {
    name: 'Tham gia hoạt động chính trị - xã hội, văn hóa, thể thao, phòng chống tệ nạn',
    maxPoints: 25,
    shortName: 'Chính trị - Xã hội - Thể thao',
  },
  [DrlClause.ND4_CONG_DONG]: {
    name: 'Hành động hướng đến xây dựng và phát triển cộng đồng',
    maxPoints: 25,
    shortName: 'Phát triển cộng đồng & Tình nguyện',
  },
  [DrlClause.ND5_KHUYEN_KHICH]: {
    name: 'Nội dung khuyến khích cộng thêm',
    maxPoints: 30,
    shortName: 'Khuyến khích & Khen thưởng',
  },
} as const;

export enum DrlClassification {
  XUAT_SAC = 'XUẤT SẮC', // 90 - 100
  TOT = 'TỐT',           // 80 - 89
  KHA = 'KHÁ',           // 65 - 79
  TRUNG_BINH = 'TRUNG BÌNH', // 50 - 64
  YEU = 'YẾU',           // 35 - 49
  KEM = 'KÉM',           // < 35
}

export function getDrlClassification(totalScore: number): DrlClassification {
  if (totalScore >= 90) return DrlClassification.XUAT_SAC;
  if (totalScore >= 80) return DrlClassification.TOT;
  if (totalScore >= 65) return DrlClassification.KHA;
  if (totalScore >= 50) return DrlClassification.TRUNG_BINH;
  if (totalScore >= 35) return DrlClassification.YEU;
  return DrlClassification.KEM;
}

export enum EventStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum TrackerStatus {
  BOOKMARKED = 'BOOKMARKED',
  REGISTERED = 'REGISTERED',
  ATTENDED = 'ATTENDED',
  VERIFIED = 'VERIFIED',
}
