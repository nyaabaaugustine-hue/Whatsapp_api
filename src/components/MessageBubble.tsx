import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Volume2, VolumeX, MessageCircle, CalendarCheck, Share2, TrendingUp, Copy, Check, Smartphone, Zap, Smile, Reply, Edit, Trash2 } from 'lucide-react';
import { LocationCard } from './LocationCard';
import { CarComparison } from './CarComparison';
import { DepositCard } from './DepositCard';
import { useState } from 'react';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { CAR_DATABASE } from '../data/cars';
import { QuickReplies } from './QuickReplies';

interface MessageBubbleProps {
  message: Message;
  onConfirmBooking?: (carId: string, carName: string) => void;
  onReact?: (id: string, emoji: string) => void;
  onReply?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onQuickReplySelect?: (value: string, text: string) => void;
}

// ── Share car via WhatsApp ────────────────────────────────────────────
function shareCarViaWhatsApp(car: any) {
  const text = encodeURIComponent(
    `🚗 Check out this car at Drivemond!\n\n` +
    `*${car.year} ${car.brand} ${car.model}*\n` +
    `💰 Price: ₵${car.price.toLocaleString()}\n` +
    `⚙️ ${(car as any).transmission || 'Auto'} · ⛽ ${(car as any).fuel || 'Petrol'} · 📍 ${(car as any).mileage || 'N/A'}\n\n` +
    `Interested? Chat with Drivemond: https://wa.me/233504512884`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

// ── Beautiful Car Card ────────────────────────────────────────────────
function CarCard({ url, onBook }: { url: string; onBook?: (id: string, name: string) => void }) {
  const car = CAR_DATABASE.find(c => (c as any).real_image === url || c.image_url === url);
  const [shared, setShared] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const handleShare = () => {
    if (!car) return;
    shareCarViaWhatsApp(car);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="rounded-2xl overflow-hidden mb-2.5 border border-[#2f3b43]/80 bg-[#111b21] shadow-lg">
      {/* Image */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <img
          src={imgErr ? `https://placehold.co/400x225/1f2c34/8696a0?text=${encodeURIComponent(car ? `${car.brand} ${car.model}` : 'Car')}` : ((car as any)?.real_image || url)}
          alt={car ? `${car.brand} ${car.model}` : 'Car'}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top badges */}
        {car && (
          <>
            <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
              {car.year}
            </span>
            {(car as any).color && (
              <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full border border-white/10">
                🎨 {(car as any).color}
              </span>
            )}
          </>
        )}

        {/* Bottom price overlay */}
        {car && (
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-end justify-between">
            <div>
              <p className="text-white font-black text-[15px] leading-tight drop-shadow-lg">{car.brand} {car.model}</p>
              <p className="text-white/70 text-[10px]">{car.year} · Available Now</p>
            </div>
            <div className="text-right">
              <p className="text-[#4ade80] font-black text-[16px] leading-tight drop-shadow-lg">₵{car.price.toLocaleString()}</p>
              <p className="text-white/60 text-[9px]">or best offer</p>
            </div>
          </div>
        )}
      </div>

      {car && (
        <div className="px-3 pt-2.5 pb-3">
          {/* Specs pills */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {(car as any).transmission && (
              <span className="text-[10px] bg-[#2a3942] text-[#aebac1] px-2 py-1 rounded-full border border-[#3d4f5c]/50">
                ⚙️ {(car as any).transmission}
              </span>
            )}
            {(car as any).fuel && (
              <span className="text-[10px] bg-[#2a3942] text-[#aebac1] px-2 py-1 rounded-full border border-[#3d4f5c]/50">
                ⛽ {(car as any).fuel}
              </span>
            )}
            {(car as any).mileage && (
              <span className="text-[10px] bg-[#2a3942] text-[#aebac1] px-2 py-1 rounded-full border border-[#3d4f5c]/50">
                📍 {(car as any).mileage}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onBook?.(car.id, `${car.brand} ${car.model}`)}
              className="flex-1 bg-[#00a884] hover:bg-[#008f72] active:scale-[0.97] text-white text-[12px] font-bold py-2 rounded-[6%] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#00a884]/20"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Book Viewing
            </button>
            <button
              onClick={handleShare}
              className={cn(
                'w-9 h-9 flex-shrink-0 rounded-[6%] flex items-center justify-center transition-all active:scale-95 border',
                shared
                  ? 'bg-[#00a884]/20 border-[#00a884]/40 text-[#00a884]'
                  : 'bg-[#2a3942] border-[#3d4f5c]/50 text-[#8696a0] hover:text-white hover:bg-[#3d4f5c]'
              )}
              title="Share this car"
            >
              {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audio message player ──────────────────────────────────────────────
function AudioMessage({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#2a3942] rounded-xl px-3 py-2.5 mb-2 min-w-[200px]">
      <div className="w-8 h-8 bg-[#00a884] rounded-full flex items-center justify-center flex-shrink-0">
        <Volume2 className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <audio controls src={url} className="w-full h-8" style={{ filter: 'invert(0.8)' }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function MessageBubble({ message, onConfirmBooking, onReact, onReply, onEdit, onDelete, onQuickReplySelect }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(message.text);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const hasPhone = message.text.includes('+233504512884') || message.text.toLowerCase().includes('sales manager');
  const isProactive = message.isProactive;

  return (
    <div className={cn('flex w-full mb-1.5', isUser ? 'justify-end' : 'justify-start')}>
      {/* Proactive message — special pill style */}
      {isProactive && !isUser ? (
        <div className="max-w-[88%] mx-auto">
          <div className="bg-gradient-to-r from-[#005c4b]/40 to-[#00a884]/20 border border-[#00a884]/30 rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3 h-3 text-[#00a884]" />
              <span className="text-[#00a884] text-[10px] font-bold uppercase tracking-wide">Abena</span>
            </div>
            <p className="text-[#e9edef] text-[13px] leading-relaxed">{message.text}</p>
            <span className="text-[10px] text-[#8696a0] mt-1 block text-right">{format(message.timestamp, 'HH:mm')}</span>
          </div>
        </div>
      ) : (
        <div className={cn(
          'max-w-[88%] rounded-[10px] px-[9px] py-[6px] relative shadow-[0_1px_2px_rgba(0,0,0,0.25)]',
          isUser ? 'bg-[#005c4b] rounded-tr-none' : 'bg-[#202c33] rounded-tl-none'
        )}>

          {message.replyPreview && (
            <div className={cn('text-[11px] mb-1 px-2 py-1 rounded-md border', isUser ? 'bg-[#016a58] border-[#05846e] text-[#cdeee6]' : 'bg-[#1d2a33] border-[#2f3b43] text-[#aebac1]')}>
              {message.replyPreview}
            </div>
          )}

          {/* Audio attachment */}
          {message.attachment?.type === 'audio' && <AudioMessage url={message.attachment.url} />}

          {/* Image attachment */}
          {message.attachment?.type === 'image' && (
            <img src={message.attachment.url} alt="Attachment" className="max-w-full rounded-xl mb-2" />
          )}

          {/* Car image cards */}
          {message.aiImages?.map((url, idx) => (
            <CarCard key={idx} url={url} onBook={onConfirmBooking} />
          ))}

          {/* Car comparison card */}
          {message.compareCard && (
            <CarComparison
              carId1={message.compareCard.carId1}
              carId2={message.compareCard.carId2}
              onBook={onConfirmBooking}
            />
          )}

          {/* Deposit card */}
          {message.depositCard && (
            <DepositCard
              carName={message.depositCard.carName}
              depositAmount={message.depositCard.depositAmount}
            />
          )}

          {/* Text content */}
          {message.text && (
            <div className={cn('text-[14px] leading-snug break-words', isUser ? 'text-[#e9edef]' : 'text-[#e9edef]')}>
              {isUser ? (
                <span className="whitespace-pre-wrap">{message.text}</span>
              ) : (
                <div className="relative group">
                  <div className="markdown-body prose prose-invert prose-sm max-w-none prose-p:my-0.5 prose-a:text-[#53bdeb] prose-strong:text-white">
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>{message.text}</ReactMarkdown>
                  </div>

                  {/* Speak button */}
                  <button
                    onClick={speak}
                    className="absolute -right-1 -top-1 p-1 text-[#8696a0] hover:text-[#e9edef] opacity-0 group-hover:opacity-100 transition-opacity rounded-[6%] hover:bg-white/10"
                  >
                    {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>

                  {/* Location card */}
                  {message.showLocation && (
                    <div className="mt-2"><LocationCard /></div>
                  )}

                  {/* Phone / booking CTA buttons */}
                  {(hasPhone || (message.bookingProposal && !isConfirmed)) && (
                    <div className="mt-3 flex flex-col gap-2">
                      {hasPhone && (
                        <a
                          href="https://wa.me/233504512884"
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.97] text-white py-1.5 px-2 rounded-[6%] text-[12px] font-bold transition-all shadow-md shadow-[#25D366]/20"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Chat with Owner on WhatsApp
                        </a>
                      )}
                      {message.bookingProposal && !isConfirmed && (
                        <button
                          onClick={() => { onConfirmBooking?.(message.bookingProposal!.carId, message.bookingProposal!.carName); setIsConfirmed(true); }}
                          className="flex items-center justify-center gap-2 bg-[#00a884] hover:bg-[#008f72] active:scale-[0.97] text-white py-1.5 px-2 rounded-[6%] text-[12px] font-bold transition-all shadow-md"
                        >
                          <CalendarCheck className="w-4 h-4" />
                          Confirm Booking · {message.bookingProposal.carName}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {message.quickReplies && message.quickReplies.length > 0 && onQuickReplySelect && (
            <QuickReplies replies={message.quickReplies} onSelect={onQuickReplySelect} />
          )}

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              {message.reactions?.map(r => (
                <span key={r.emoji} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2a3942] text-[#e9edef] border border-[#3d4f5c]">
                  {r.emoji} {r.count}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[#aebac1]">
              {!isUser && (
                <>
                  <button onClick={() => setShowReactions(s => !s)} className="p-1 rounded-full hover:bg-[#3b4a54]">
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onReply?.(message.id)} className="p-1 rounded-full hover:bg-[#3b4a54]">
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {isUser && (
                <>
                  <button onClick={() => onEdit?.(message.id)} className="p-1 rounded-full hover:bg-[#3b4a54]">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete?.(message.id)} className="p-1 rounded-full hover:bg-[#3b4a54]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {showReactions && (
            <div className="mt-1 flex gap-1">
              {['👍','❤️','🔥','😊','🤝','💰'].map(e => (
                <button key={e} onClick={() => { onReact?.(message.id, e); setShowReactions(false); }} className="text-[13px] px-1 py-0.5 rounded-[6%] bg-[#2a3942] text-[#e9edef] border border-[#3d4f5c] hover:bg-[#3b4a54]">
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center justify-end mt-1 gap-1">
            <span className="text-[10px] text-[#8696a0] whitespace-nowrap">{format(message.timestamp, 'HH:mm')}</span>
            {isUser && (
              <svg viewBox="0 0 16 15" width="14" height="14" className="text-[#53bdeb] fill-current flex-shrink-0">
                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
