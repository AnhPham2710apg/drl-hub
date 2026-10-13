import { Test, TestingModule } from '@nestjs/testing';
import { OpenGraphExtractorService } from './opengraph-extractor.service';

describe('OpenGraphExtractorService', () => {
  let service: OpenGraphExtractorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenGraphExtractorService],
    }).compile();

    service = module.get<OpenGraphExtractorService>(OpenGraphExtractorService);
  });

  describe('resolveFacebookUrl', () => {
    it('should rewrite permalink.php to canonical /posts/ format', async () => {
      const permalink =
        'https://www.facebook.com/permalink.php?story_fbid=pfbid0jPJFuHqhNQrsBAsR4x3G53UvSCSVmTYdi7NtrcFsAQzcQfvUp7LzkFhW3Pw5wHJLl&id=61582622519868';
      const resolved = await service.resolveFacebookUrl(permalink);
      expect(resolved).toBe(
        'https://www.facebook.com/61582622519868/posts/pfbid0jPJFuHqhNQrsBAsR4x3G53UvSCSVmTYdi7NtrcFsAQzcQfvUp7LzkFhW3Pw5wHJLl/',
      );
    });

    it('should leave normal URLs untouched', async () => {
      const normalUrl = 'https://www.facebook.com/osa.hcmus/posts/123456789';
      const resolved = await service.resolveFacebookUrl(normalUrl);
      expect(resolved).toBe(normalUrl);
    });
  });

  describe('isFacebookLoginWall', () => {
    it('should identify Facebook login wall text correctly', () => {
      const loginWallText =
        'Đăng nhập vào Facebook để tiếp tục. Khám phá những điều bạn yêu thích. Quên mật khẩu? Tạo tài khoản mới.';
      expect(service.isFacebookLoginWall(loginWallText)).toBe(true);
    });

    it('should not flag genuine post content as login wall', () => {
      const postText =
        '🔥 [CUỘC THI TRỰC TUYẾN: VIỆT NAM TRONG KỶ NGUYÊN SỐ] 🔥\nThời gian: 15/10/2026\nĐăng ký tham gia ngay để nhận ĐRL!';
      expect(service.isFacebookLoginWall(postText)).toBe(false);
    });
  });
});
