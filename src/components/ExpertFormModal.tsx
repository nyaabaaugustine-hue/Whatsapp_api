import { useState } from 'react';
import { X, Send } from 'lucide-react';

export default function ExpertFormModal({ onClose, prefill }: { onClose?: () => void; prefill?: { name?: string; phone?: string; car?: string } }) {
  const [name, setName] = useState(prefill?.name || '');
  const [phone, setPhone] = useState(prefill?.phone || '');
  const [car, setCar] = useState(prefill?.car || '');
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      const html = `<h2>Ask Expert</h2><p>Name: ${name}</p><p>Phone: ${phone}</p><p>Car: ${car}</p><p>Topic: ${topic}</p><p>Details:</p><pre>${details}</pre>`;
      await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: `Ask Expert - ${topic || 'Car Owner Support'}`, html }) });
      onClose?.();
    } catch {
      onClose?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f3b43] bg-[#111b21]">
          <h3 className="text-white font-bold text-base">Ask Expert</h3>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1.5 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="w-full bg-[#111b21] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5" />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Your phone" className="w-full bg-[#111b21] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5" />
          <input value={car} onChange={e=>setCar(e.target.value)} placeholder="Car (brand & model)" className="w-full bg-[#111b21] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5" />
          <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic (e.g., suspension noise)" className="w-full bg-[#111b21] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5" />
          <textarea value={details} onChange={e=>setDetails(e.target.value)} placeholder="Describe the issue…" rows={4} className="w-full bg-[#111b21] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5" />
          <button disabled={sending} onClick={submit} className="w-full bg-[#00a884] hover:bg-[#008f72] text-white text-[11px] font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5">
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
