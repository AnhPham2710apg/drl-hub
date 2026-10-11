import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

export interface UseShareIntentResult {
  sharedUrl: string | null;
  clearSharedUrl: () => void;
}

/**
 * Hook lắng nghe Intent chia sẻ từ ứng dụng khác (Facebook, Chrome, Messenger)
 * qua Android ACTION_SEND hoặc iOS Custom Scheme
 */
export function useShareIntent(): UseShareIntentResult {
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1. Kiểm tra URL khi app được mở từ trạng thái terminated
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        parseAndSetUrl(initialUrl);
      }
    };

    handleInitialUrl();

    // 2. Lắng nghe URL khi app đang ở background
    const subscription = Linking.addEventListener('url', (event) => {
      parseAndSetUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const parseAndSetUrl = (rawUrl: string) => {
    // Format nếu qua scheme: drlhub://share?url=https://...
    if (rawUrl.startsWith('drlhub://share')) {
      try {
        const parsed = new URL(rawUrl);
        const target = parsed.searchParams.get('url');
        if (target) {
          setSharedUrl(target);
          return;
        }
      } catch (err) {
        console.warn('Cannot parse share scheme URL', err);
      }
    }

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      setSharedUrl(rawUrl);
    }
  };

  const clearSharedUrl = () => setSharedUrl(null);

  return { sharedUrl, clearSharedUrl };
}
