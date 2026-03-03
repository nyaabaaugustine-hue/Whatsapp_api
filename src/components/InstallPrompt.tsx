import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('install_prompt_dismissed') === '1';
    if (dismissed) return;
    const handler = (e: Event) => {
      e.preventDefault?.();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    const fallbackTimer = setTimeout(() => {
      if (!('onbeforeinstallprompt' in window)) {
        setVisible(true);
      }
    }, 4000);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as any);
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (deferred?.prompt) {
      await deferred.prompt();
      try {
        const choice = await deferred.userChoice;
        if (choice.outcome === 'accepted') {
          setVisible(false);
          setDeferred(null);
          localStorage.setItem('install_prompt_dismissed', '1');
        } else {
          setVisible(false);
          localStorage.setItem('install_prompt_dismissed', '1');
        }
      } catch {
        setVisible(false);
        localStorage.setItem('install_prompt_dismissed', '1');
      }
    } else {
      alert('Use your browser menu to “Install app” or “Add to Home screen”.');
      setVisible(false);
      localStorage.setItem('install_prompt_dismissed', '1');
    }
  };

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('install_prompt_dismissed', '1');
  };

  return (
    <div
      className="fixed left-6 bottom-6 z-[997] bg-[#111b21] border border-[#2f3b43] rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-3"
      style={{ maxWidth: 320 }}
    >
      <img src="https://res.cloudinary.com/dx1nrew3h/image/upload/v1772519545/cccc_nm31ku.png" alt="App" className="w-6 h-6 rounded-md" />
      <div className="flex-1 min-w-0">
        <p className="text-[#e9edef] text-sm font-bold truncate">Install Drivemond</p>
        <p className="text-[#8696a0] text-[11px] truncate">Get quick access on your device</p>
      </div>
      <button
        onClick={handleInstall}
        className="text-white text-xs font-bold bg-[#00a884] hover:bg-[#008f72] px-3 py-1.5 rounded-xl"
        aria-label="Install App"
      >
        Install
      </button>
      <button
        onClick={handleClose}
        className="ml-1 text-[#aebac1] hover:text-white text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
