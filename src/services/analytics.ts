declare global {
  interface Window { posthog?: any }
}

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

export function initAnalytics() {
  if (!KEY) return;
  if (window.posthog) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.posthog.com/posthog.js';
  script.async = true;
  script.onload = () => {
    try {
      window.posthog = (window.posthog || []);
      window.posthog.init(KEY, { api_host: HOST, autocapture: false, capture_pageview: true });
    } catch {}
  };
  document.head.appendChild(script);
}

export function track(event: string, properties?: Record<string, any>) {
  try { window.posthog?.capture?.(event, properties || {}); } catch {}
}
