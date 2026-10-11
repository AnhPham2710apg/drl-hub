import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@drl-hub/shared-types';
import * as bcrypt from 'bcrypt';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  studentId?: string;
  role: UserRole;
  faculty?: string;
}

interface StoredUser extends UserSession {
  passwordHash: string;
}

@Injectable()
export class AuthService {
  // In-memory persistent user repository fallback (for standalone mode)
  private readonly inMemoryUsers: Map<string, StoredUser> = new Map();

  constructor(private readonly jwtService: JwtService) {
    // Seed default student and organizer accounts
    const defaultPasswordHash = bcrypt.hashSync('HCMUS@2026', 10);
    this.inMemoryUsers.set('sv.hcmus@student.hcmus.edu.vn', {
      id: 'usr_student_01',
      email: 'sv.hcmus@student.hcmus.edu.vn',
      fullName: 'Nguyễn Văn An',
      studentId: '22120001',
      role: UserRole.STUDENT,
      faculty: 'Khoa Công nghệ Thông tin',
      passwordHash: defaultPasswordHash,
    });
  }

  async register(data: {
    email: string;
    password?: string;
    fullName: string;
    studentId?: string;
    faculty?: string;
    role?: string;
  }) {
    const emailNorm = data.email.toLowerCase().trim();
    if (this.inMemoryUsers.has(emailNorm)) {
      throw new BadRequestException('Email này đã được đăng ký tài khoản');
    }

    const passwordToHash = data.password || 'HCMUS@2026';
    const passwordHash = await bcrypt.hash(passwordToHash, 10);
    const id = 'usr_' + Date.now();

    const newUser: StoredUser = {
      id,
      email: emailNorm,
      fullName: data.fullName.trim(),
      studentId: data.studentId?.trim() || '2212' + Math.floor(1000 + Math.random() * 9000),
      role: (data.role as UserRole) || UserRole.STUDENT,
      faculty: data.faculty || 'Khoa Công nghệ Thông tin',
      passwordHash,
    };

    this.inMemoryUsers.set(emailNorm, newUser);
    return this.generateTokens(newUser);
  }

  async login(email: string, password?: string) {
    const emailNorm = email.toLowerCase().trim();
    const user = this.inMemoryUsers.get(emailNorm);

    if (!user) {
      // Auto-register demo account for smooth student experience if password provided
      if (password) {
        return this.register({
          email: emailNorm,
          fullName: emailNorm.split('@')[0],
          password,
        });
      }
      throw new UnauthorizedException('Tài khoản không tồn tại. Vui lòng đăng ký!');
    }

    if (password && user.passwordHash) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        throw new UnauthorizedException('Mật khẩu không chính xác');
      }
    }

    return this.generateTokens(user);
  }

  generateTokens(user: UserSession) {
    const payload = {
      sub: user.id,
      email: user.email,
      studentId: user.studentId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // JWT ngắn hạn 15 phút
      secret: process.env.JWT_SECRET || 'drlhub_super_secret_jwt_key_2026',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        expiresIn: '7d', // Refresh token xoay vòng 7 ngày
        secret: process.env.JWT_REFRESH_SECRET || 'drlhub_super_secret_refresh_key_2026',
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentId: user.studentId,
        role: user.role,
        faculty: user.faculty,
      },
    };
  }

  verifyRefreshToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'drlhub_super_secret_refresh_key_2026',
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }
}
