import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function PwaRegistration() {
  useEffect(() => {
    if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {
        // Ignore registration failures so web still works normally.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
