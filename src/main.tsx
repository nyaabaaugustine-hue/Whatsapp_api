import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initAnalytics } from './services/analytics';
import { popDue } from './services/savedLater';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initAnalytics();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    } else {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      }).catch(() => {});
    }
  });
}

function initNotifications() {
  try {
    if (!('Notification' in window)) return;
    let timer: number | null = null;
    const playTone = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.3);
      } catch {
        if ('vibrate' in navigator) {
          try { (navigator as any).vibrate?.(50); } catch {}
        }
      }
    };
    const checkDue = () => {
      if (Notification.permission === 'granted') {
        const due = popDue();
        if (due.length) {
          due.forEach(d => {
            try { new Notification('Saved for later', { body: `${d.title}` }); } catch {}
            playTone();
          });
        }
      }
    };
    const scheduleNext = () => {
      const visible = document.visibilityState === 'visible';
      const intervalMs = visible ? 60_000 : 5 * 60_000;
      timer = window.setTimeout(() => {
        checkDue();
        scheduleNext();
      }, intervalMs);
    };
    const startSchedule = () => {
      if (timer !== null) return;
      if (Notification.permission === 'denied') return;
      checkDue();
      scheduleNext();
    };
    const handleVisibility = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      startSchedule();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', () => {
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    });
    // If already granted, start immediately
    if (Notification.permission === 'granted') {
      startSchedule();
    }
  } catch {}
}
initNotifications();
