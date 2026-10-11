import { Linking, Platform } from 'react-native';

export interface DeepLinkHandlerResult {
  openedVia: 'facebook_app' | 'browser_fallback';
  success: boolean;
}

/**
 * Điều hướng người dùng trực tiếp sang ứng dụng Facebook Native
 * Bảo toàn 100% KPI tương tác, like, comment, và click link form của CLB/Ban tổ chức.
 */
export async function openFacebookPost(postUrl: string): Promise<DeepLinkHandlerResult> {
  const cleanPostUrl = postUrl.trim();

  // URL Scheme chuyên dụng cho Facebook Native App
  let nativeFbUri = '';
  if (Platform.OS === 'android') {
    nativeFbUri = `fb://facewebmodal/f?href=${encodeURIComponent(cleanPostUrl)}`;
  } else if (Platform.OS === 'ios') {
    nativeFbUri = `fb://profile/link?url=${encodeURIComponent(cleanPostUrl)}`;
  }

  try {
    const canOpen = nativeFbUri ? await Linking.canOpenURL(nativeFbUri) : false;
    if (canOpen) {
      await Linking.openURL(nativeFbUri);
      return { openedVia: 'facebook_app', success: true };
    }
  } catch (error) {
    console.warn('Cannot open native Facebook app, falling back to browser...', error);
  }

  // Fallback sang trình duyệt (Chrome Custom Tabs / In-app Safari)
  try {
    await Linking.openURL(cleanPostUrl);
    return { openedVia: 'browser_fallback', success: true };
  } catch (err) {
    console.error('Failed to open URL in browser fallback', err);
    return { openedVia: 'browser_fallback', success: false };
  }
}
