import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Volume2, VolumeX, CalendarCheck, Check, Smartphone, Zap, Smile, Reply, Edit, Trash2, Clock, Heart, Search, Image as ImageIcon } from 'lucide-react';
import { addSavedLater } from '../services/savedLater';
import { estimateMonthlyCost } from '../services/ownershipCostService';
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
  onScheduleBooking?: (carId: string, carName: string, date: string, time: string) => void;
  onReact?: (id: string, emoji: string) => void;
  onReply?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onQuickReplySelect?: (value: string, text: string) => void;
}

// â”€â”€ Share car via WhatsApp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function shareCarViaWhatsApp(car: any) {
  const text = encodeURIComponent(
    `🚗 Check out this car at Drivemond!\n\n` +
    `*${car.year} ${car.brand} ${car.model}*\n` +
    `Price: GHS ${car.price.toLocaleString()}\n` +
    `⚙️ ${(car as any).transmission || 'Auto'} · ⛽ ${(car as any).fuel || 'Petrol'} · 📍 ${(car as any).mileage || 'N/A'}\n\n` +
    `Interested? Chat with Drivemond: https://wa.me/233504512884`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

function formatPriceShort(n: number) {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${v}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

const WA_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

// â”€â”€ Beautiful Car Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CarCard({ car: passedCar, url, onBook, className }: { car?: any; url?: string; onBook?: (id: string, name: string) => void; className?: string }) {
  const car = passedCar || (url ? CAR_DATABASE.find(c => {
    const imgs = [(c as any).image_url, (c as any).real_image, ...(((c as any).image_urls) || [])].filter(Boolean);
    return imgs.includes(url);
  }) : undefined);
  const [shared, setShared] = useState(false);
  const [imgErrs, setImgErrs] = useState<Record<string, boolean>>({});

  const images = (() => {
    if (car) {
      const list = Array.isArray((car as any).image_urls) ? (car as any).image_urls.filter(Boolean) : [];
      const feature = (car as any).image_url || list[0] || (car as any).real_image;
      const gallery = (car as any).real_image || list[1];
      const merged = [feature, gallery, ...list].filter(Boolean);
      const deduped: string[] = [];
      merged.forEach(u => { if (u && !deduped.includes(u)) deduped.push(u); });
      return deduped.length > 0 ? deduped : (url ? [url] : []);
    }
    return url ? [url] : [];
  })();

  const handleShare = () => {
    if (!car) return;
    shareCarViaWhatsApp(car);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };
  const contactLink = car
    ? `https://wa.me/233504512884?text=${encodeURIComponent(
      `Hi, I’m interested in the ${car.year} ${car.brand} ${car.model}. Can we chat?`
    )}`
    : 'https://wa.me/233504512884';
  const shortlistLink = car ? '#shortlist' : '#shortlist';
  const similarLink = car ? `#shortlist?similar=${encodeURIComponent(String(car.id))}` : '#shortlist';
  const saveLater = () => {
    if (!car) return;
    addSavedLater(String(car.id), `${car.brand} ${car.model} · ₵${car.price.toLocaleString()}`, 24);
  };
  const requestPhotos = () => {
    if (!car) return;
    alert('Request sent — we will share more photos shortly.');
  };
  const ownershipCost = car ? estimateMonthlyCost(car as any) : null;

  return (
    <div className={cn("rounded-2xl overflow-hidden mb-2.5 border border-[#2f3b43]/80 bg-[#111b21] shadow-lg", className)}>
      {/* Image Carousel */}
      <div className="relative w-full">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 scroll-smooth no-scrollbar">
          {images.map((img, i) => (
            <div key={`${img}-${i}`} className="snap-center flex-shrink-0 w-full relative" style={{ aspectRatio: '16/9' }}>
              <img
                src={imgErrs[img] ? `https://placehold.co/400x225/1f2c34/8696a0?text=${encodeURIComponent(car ? `${car.brand} ${car.model}` : 'Car')}` : img}
                alt={car ? `${car.brand} ${car.model}` : 'Car'}
                className="w-full h-full object-cover"
                onError={() => setImgErrs(prev => ({ ...prev, [img]: true }))}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {car && (
                <>
                  <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-[#EDEDED] text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
                    {car.year}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-end justify-between">
                    <div className="bg-black/70 backdrop-blur-[1px] px-2 py-1 rounded-md">
                      <p className="text-[#EDEDED] font-black text-[15px] leading-tight drop-shadow-lg">{car.brand} {car.model}</p>
                      <p className="text-[#EDEDED]/90 text-[10px]">Available Now</p>
                    </div>
                    <div className="text-right">
                      <p
                        title={`GHS ${car.price.toLocaleString()}`}
                        className="bg-black/70 text-[#EDEDED] font-black text-[16px] leading-tight drop-shadow-lg px-2 py-1 rounded-md"
                      >
                        GHS {formatPriceShort(car.price)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-2 right-3 text-[10px] text-white/70 bg-black/50 px-2 py-0.5 rounded-full border border-white/10">
            Swipe →
          </div>
        )}
      </div>

      {car && (
        <div className="px-3 pt-2.5 pb-3">
          {/* Specs pills */}
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {(car as any).transmission && (
              <span className="text-[10px] bg-[#2a3942] text-[#aebac1] px-2 py-1 rounded-full border border-[#3d4f5c]/50">
                ⚙️ {(car as any).transmission}
              </span>
            )}
            {(car as any).mileage && (
              <span className="text-[10px] bg-[#2a3942] text-[#aebac1] px-2 py-1 rounded-full border border-[#3d4f5c]/50">
                📍 {(car as any).mileage}
              </span>
            )}
            {(((car as any).insured || (car as any).registered)) && (
              <span className="text-[10px] bg-[#2a3942] text-[#aebac1] px-2 py-1 rounded-full border border-[#3d4f5c]/50">
                Verified docs
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
            <a
              href={shortlistLink}
              className="w-9 h-9 flex-shrink-0 rounded-[6%] flex items-center justify-center transition-all active:scale-95 border bg-[#2a3942] border-[#3d4f5c]/50 text-[#8696a0] hover:text-white hover:bg-[#3d4f5c]"
              title="Add to Shortlist"
            >
              <Heart className="w-4 h-4" />
            </a>
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
              {shared ? <Check className="w-4 h-4" /> : <span className="text-[#25D366]">{WA_ICON}</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetSliderCard({ config, onSubmit }: { config: Message['budgetSlider']; onSubmit?: (value: number) => void }) {
  const min = config?.min ?? 60000;
  const max = config?.max ?? 500000;
  const step = config?.step ?? 5000;
  const unit = config?.unit ?? 'GHS';
  const [value, setValue] = useState<number>(Math.round((min + max) / 2));

  return (
    <div className="bg-[#0b141a] border border-[#2f3b43] rounded-xl p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-[#8696a0] uppercase tracking-wide">Budget Range</div>
        <div className="text-[12px] font-bold text-[#e9edef]">{unit} {value.toLocaleString()}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-[#00a884]"
      />
      <div className="flex items-center justify-between mt-1 text-[10px] text-[#8696a0]">
        <span>{unit} {min.toLocaleString()}</span>
        <span>{unit} {max.toLocaleString()}</span>
      </div>
      <button
        onClick={() => onSubmit?.(value)}
        className="mt-3 w-full bg-[#00a884] hover:bg-[#008f72] text-white text-[11px] font-bold py-2 rounded-lg transition"
      >
        Use This Budget
      </button>
    </div>
  );
}

function TestDriveWidget({ carId, carName, onConfirm }: { carId: string; carName: string; onConfirm?: (carId: string, carName: string, date: string, time: string) => void }) {
  const today = new Date();
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const timeSlots = ['9:00 AM','10:00 AM','11:00 AM','12:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'];
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  return (
    <div className="bg-[#0b141a] border border-[#2f3b43] rounded-xl p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[11px] text-[#00a884] font-bold uppercase tracking-wide">Schedule Test Drive</div>
          <div className="text-[10px] text-[#8696a0] truncate">{carName}</div>
        </div>
        <Clock className="w-4 h-4 text-[#8696a0]" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[#8696a0]">Date</label>
          <input
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full bg-[#111b21] border border-[#2f3b43] rounded-md text-[11px] text-white px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#8696a0]">Time</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full bg-[#111b21] border border-[#2f3b43] rounded-md text-[11px] text-white px-2 py-1.5"
          >
            <option value="">Select</option>
            {timeSlots.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={() => { if (date && time) onConfirm?.(carId, carName, date, time); }}
        disabled={!date || !time}
        className="mt-3 w-full bg-[#00a884] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#008f72] text-white text-[11px] font-bold py-2 rounded-lg transition"
      >
        Confirm Test Drive
      </button>
    </div>
  );
}

// â”€â”€ Audio message player â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function MessageBubble({ message, onConfirmBooking, onScheduleBooking, onReact, onReply, onEdit, onDelete, onQuickReplySelect }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const aiImageUrls = message.aiImages || [];
  const aiCars = (() => {
    const map = new Map<string, any>();
    const other: string[] = [];
    aiImageUrls.forEach(url => {
      const car = CAR_DATABASE.find(c => {
        const imgs = [(c as any).image_url, (c as any).real_image, ...(((c as any).image_urls) || [])].filter(Boolean);
        return imgs.includes(url);
      });
      if (car) map.set(String(car.id), car);
      else other.push(url);
    });
    return { cars: Array.from(map.values()), other };
  })();
  const totalCarCards = aiCars.cars.length + aiCars.other.length;
  const showCarCarousel = totalCarCards > 1;

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
      {/* Proactive message â€” special pill style */}
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
          {showCarCarousel ? (
            <div className="mb-2">
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 pr-2">
                {aiCars.cars.map((car: any) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onBook={onConfirmBooking}
                    className="mb-0 w-[280px] sm:w-[320px] flex-shrink-0 snap-center"
                  />
                ))}
                {aiCars.other.map((url, idx) => (
                  <CarCard
                    key={`img-${idx}`}
                    url={url}
                    onBook={onConfirmBooking}
                    className="mb-0 w-[280px] sm:w-[320px] flex-shrink-0 snap-center"
                  />
                ))}
              </div>
              {/* Only show slide hint if there are multiple cars */}
              {(aiCars.cars.length + aiCars.other.length) > 1 && (
                <div className="text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded-full w-fit border border-white/10">
                  Slide → to view more cars
                </div>
              )}
            </div>
          ) : (
            <>
              {aiCars.cars.map((car: any) => (
                <CarCard key={car.id} car={car} onBook={onConfirmBooking} />
              ))}
              {aiCars.other.map((url, idx) => (
                <CarCard key={`img-${idx}`} url={url} onBook={onConfirmBooking} />
              ))}
            </>
          )}

          {message.budgetSlider && (
            <BudgetSliderCard
              config={message.budgetSlider}
              onSubmit={(val) => onQuickReplySelect?.(String(val), String(val))}
            />
          )}

          {message.scheduleWidget && (
            <TestDriveWidget
              carId={message.scheduleWidget.carId}
              carName={message.scheduleWidget.carName}
              onConfirm={(carId, carName, date, time) => onScheduleBooking?.(carId, carName, date, time)}
            />
          )}

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
                          className="flex items-center justify-center gap-2 border-2 border-[#25D366] text-[#FFD700] bg-transparent hover:bg-[#25D366]/10 active:scale-[0.97] py-1.5 px-2 rounded-[6%] text-[12px] font-bold transition-all shadow-md shadow-[#25D366]/10"
                        >
                          {WA_ICON}
                          Transfer me to Purchase Officer
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

