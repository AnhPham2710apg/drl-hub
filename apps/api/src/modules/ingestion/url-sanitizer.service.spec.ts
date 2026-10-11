import { UrlSanitizerService } from './url-sanitizer.service';

describe('UrlSanitizerService', () => {
  let service: UrlSanitizerService;

  beforeEach(() => {
    service = new UrlSanitizerService();
  });

  it('should remove fbclid, mibextid, ref, and tracking params from Facebook URL', () => {
    const rawUrl = 'https://www.facebook.com/share/p/1A2B3C4D5E/?mibextid=wwXIfr&fbclid=IwAR2xyz&ref=notif';
    const result = service.sanitize(rawUrl);

    expect(result.cleanUrl).toBe('https://www.facebook.com/share/p/1A2B3C4D5E');
    expect(result.hash).toBeDefined();
    expect(result.hash).toHaveLength(32); // MD5 hex length
  });

  it('should remove trailing slashes from path', () => {
    const rawUrl = 'https://www.facebook.com/clbtinhoc/posts/1234567890/';
    const result = service.sanitize(rawUrl);

    expect(result.cleanUrl).toBe('https://www.facebook.com/clbtinhoc/posts/1234567890');
  });

  it('should produce identical hash for same post with different tracking params', () => {
    const url1 = 'https://www.facebook.com/events/100020003000/?ref=newsfeed&fbclid=123';
    const url2 = 'https://www.facebook.com/events/100020003000?mibextid=xyz';

    const res1 = service.sanitize(url1);
    const res2 = service.sanitize(url2);

    expect(res1.cleanUrl).toBe(res2.cleanUrl);
    expect(res1.hash).toBe(res2.hash);
  });

  it('should throw error on invalid non-http URL', () => {
    expect(() => service.sanitize('invalid-url-string')).toThrow();
  });
});
