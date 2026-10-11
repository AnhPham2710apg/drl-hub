import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@drl-hub/shared-types';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService();
    service = new AuthService(jwtService);
  });

  it('should generate short-lived access token and 7-day refresh token', () => {
    const user = {
      id: 'mock-user-uuid',
      email: '21120001@student.hcmus.edu.vn',
      fullName: 'Nguyễn Văn A',
      studentId: '21120001',
      role: UserRole.STUDENT,
      faculty: 'Công nghệ Thông tin',
    };

    const tokens = service.generateTokens(user);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBe(900); // 15 mins
    expect(tokens.user.studentId).toBe('21120001');

    // Decode verify payload
    const decoded: any = jwtService.decode(tokens.accessToken);
    expect(decoded.sub).toBe('mock-user-uuid');
    expect(decoded.role).toBe(UserRole.STUDENT);
  });

  it('should successfully verify a valid refresh token', () => {
    const user = {
      id: 'mock-user-uuid-2',
      email: 'clbtinhoc@hcmus.edu.vn',
      fullName: 'CLB Tin Học',
      role: UserRole.CLUB_MANAGER,
    };

    const tokens = service.generateTokens(user);
    const decodedRefresh = service.verifyRefreshToken(tokens.refreshToken);

    expect(decodedRefresh.sub).toBe('mock-user-uuid-2');
  });

  it('should throw UnauthorizedException on tampered refresh token', () => {
    expect(() => service.verifyRefreshToken('invalid.token.structure')).toThrow();
  });
});
