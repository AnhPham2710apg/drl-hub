import { openFacebookPost } from './facebook-deep-link';
import { Linking, Platform } from 'react-native';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

describe('openFacebookPost Deep Linking', () => {
  const targetUrl = 'https://www.facebook.com/clbtinhoc/posts/1020304050';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should attempt native fb:// URL first on Android', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(true);

    const result = await openFacebookPost(targetUrl);

    expect(result.openedVia).toBe('facebook_app');
    expect(result.success).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith(
      `fb://facewebmodal/f?href=${encodeURIComponent(targetUrl)}`
    );
  });

  it('should fallback to browser if Facebook app is not installed', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
    (Linking.openURL as jest.Mock).mockResolvedValue(true);

    const result = await openFacebookPost(targetUrl);

    expect(result.openedVia).toBe('browser_fallback');
    expect(result.success).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith(targetUrl);
  });
});
