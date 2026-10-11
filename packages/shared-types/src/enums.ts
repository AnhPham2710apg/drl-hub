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
