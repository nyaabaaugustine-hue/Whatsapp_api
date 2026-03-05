import { useEffect, useState } from 'react';
import { addToShortlist, getShortlist, removeFromShortlist, setNote, getNote, shortlistShareText, findSimilar, ShortlistItem } from '../services/shortlist';
import { CAR_DATABASE } from '../data/cars';
import { X, Trash2, NotebookPen, Share2, Copy, Scale } from 'lucide-react';

export default function ShortlistPanel({ onClose }: { onClose?: () => void }) {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [suggested, setSuggested] = useState<ShortlistItem[]>([]);

  useEffect(() => {
    setItems(getShortlist());
    const text = shortlistShareText();
    setShareUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const m = hash.match(/similar=(\w+)/);
    const seedId = m?.[1];
    if (seedId) {
      setSuggested(findSimilar(seedId));
    }
  }, []);

  const add = (id: string) => {
    const car = CAR_DATABASE.find(c => String(c.id) === String(id));
    if (car) {
      addToShortlist(car);
      setItems(getShortlist());
    }
  };
  const remove = (id: string) => {
    removeFromShortlist(id);
    setItems(getShortlist());
  };
  const updateNote = (id: string, value: string) => {
    setNote(id, value);
    setItems(prev => prev.map(it => it.id === id ? { ...it, note: value } : it));
  };
  const toggleCompare = (id: string) => {
    setCompare(prev => {
      const has = prev.includes(id);
      const next = has ? prev.filter(x => x !== id) : [...prev, id].slice(0, 2);
      return next;
    });
  };
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(shortlistShareText()); } catch {}
  };
  const addAllSuggested = () => {
    suggested.forEach(s => {
      const car = CAR_DATABASE.find(c => String(c.id) === s.id);
      if (car) addToShortlist(car);
    });
    setItems(getShortlist());
  };

  const a = compare[0] ? items.find(i => i.id === compare[0]) : null;
  const b = compare[1] ? items.find(i => i.id === compare[1]) : null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f3b43] bg-[#111b21]">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#e9edef]" />
            <h3 className="text-white font-bold text-base">Shortlist</h3>
          </div>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1.5 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {suggested.length > 0 && (
            <div className="bg-[#0b141a] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">Similar to your selection</p>
                <button onClick={addAllSuggested} className="text-[11px] px-2 py-1 rounded-lg bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition">
                  Add All
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {suggested.map(s => (
                  <div key={s.id} className="flex items-center gap-2 bg-[#111b21] rounded-lg px-2 py-2">
                    <img src={s.image} alt={`${s.brand} ${s.model}`} className="w-16 h-12 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{s.brand} {s.model}</div>
                      <div className="text-gray-500 text-[10px]">₵{s.price.toLocaleString()}</div>
                    </div>
                    <button onClick={() => add(s.id)} className="text-[10px] px-2 py-1 rounded bg-[#2a3942] text-white hover:bg-[#3d4f5c]">Add</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] px-3 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/30 transition flex items-center gap-1.5">
              <Share2 className="w-3 h-3" /> Share to WhatsApp
            </a>
            <button onClick={doCopy} className="text-[11px] px-3 py-1.5 rounded-lg bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition flex items-center gap-1.5">
              <Copy className="w-3 h-3" /> Copy Text
            </button>
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-gray-500 text-sm">Your shortlist is empty.</p>
            ) : items.map(it => (
              <div key={it.id} className="bg-[#0b141a] rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <img src={it.image} alt={`${it.brand} ${it.model}`} className="w-20 h-14 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{it.brand} {it.model}</div>
                    <div className="text-gray-500 text-[11px]">₵{it.price.toLocaleString()} · {it.year}</div>
                  </div>
                  <button onClick={() => toggleCompare(it.id)} className={`text-[10px] px-2 py-1 rounded ${compare.includes(it.id) ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-white hover:bg-[#3d4f5c]'}`}>
                    Compare
                  </button>
                  <button onClick={() => remove(it.id)} className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1.5">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
                <div className="mt-2">
                  <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1.5">
                    <NotebookPen className="w-3 h-3" /> Notes
                  </div>
                  <textarea
                    defaultValue={getNote(it.id)}
                    onBlur={(e) => updateNote(it.id, e.target.value)}
                    placeholder="Add your notes…"
                    className="w-full bg-[#111b21] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          {a && b && (
            <div className="bg-[#0b141a] rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-2">Comparison</div>
              <div className="grid grid-cols-2 gap-2">
                {[a, b].map((c, idx) => (
                  <div key={idx} className="bg-[#111b21] rounded-lg p-2">
                    <div className="text-white text-xs font-semibold">{c.brand} {c.model}</div>
                    <div className="text-gray-500 text-[11px]">₵{c.price.toLocaleString()} · {c.year}</div>
                    <div className="text-gray-400 text-[10px]">Pros: reliable · easy maintenance</div>
                    <div className="text-gray-400 text-[10px]">Cons: —</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
