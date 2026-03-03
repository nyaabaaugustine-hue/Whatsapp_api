import { useState } from 'react';
import { X, User, Phone } from 'lucide-react';

interface LeadCaptureModalProps {
  onSubmit: (name: string, phone: string) => void;
  onSkip?: () => void;
}

export function LeadCaptureModal({ onSubmit, onSkip }: LeadCaptureModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (name.trim()) onSubmit(name.trim(), phone.trim());
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center">
      <div className="bg-[#111b21] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6 mt-6 sm:mt-0 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[#e9edef] font-bold text-lg">Quick Intro 👋</h3>
            <p className="text-[#8696a0] text-xs mt-0.5">So Abena can personalise your experience</p>
          </div>
          <div className="w-7 h-7" />
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center bg-[#2a3942] rounded-xl px-4 py-3 gap-3">
            <User className="w-4 h-4 text-[#00a884] shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Your name *"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-transparent text-[#e9edef] placeholder-[#8696a0] text-sm outline-none flex-1 min-w-0"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="flex items-center bg-[#2a3942] rounded-xl px-4 py-3 gap-3">
            <Phone className="w-4 h-4 text-[#00a884] shrink-0" />
            <input
              type="tel"
              placeholder="Phone number *"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="bg-transparent text-[#e9edef] placeholder-[#8696a0] text-sm outline-none flex-1 min-w-0"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !phone.trim()}
          className="w-full bg-[#00a884] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#008f72] active:scale-95"
        >
          Start Chatting →
        </button>
        {(!name.trim() || !phone.trim()) && (
          <p className="text-center text-[#8696a0] text-xs mt-2">Both name and phone are required</p>
        )}
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full mt-3 text-[#aebac1] hover:text-white text-xs font-bold py-2 rounded-xl transition-colors hover:bg-white/5"
            aria-label="Skip for now"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
