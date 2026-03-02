import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Volume2, VolumeX, MessageCircle, MapPin, CalendarCheck, Tag } from 'lucide-react';
import { LocationCard } from './LocationCard';
import { useState } from 'react';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { QuickReplies } from './QuickReplies';
import { ActionButtons } from './ActionButtons';
import { SummaryCard } from './SummaryCard';
import { CarComparison } from './CarComparison';
import { CAR_DATABASE } from '../data/cars';

interface MessageBubbleProps {
  message: Message;
  onConfirmBooking?: (carId: string, carName: string) => void;
  onQuickReply?: (value: string, text: string) => void;
  onAction?: (action: string, data?: any) => void;
}

export function MessageBubble({ message, onConfirmBooking, onQuickReply, onAction }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    if (message.bookingProposal && onConfirmBooking) {
      onConfirmBooking(message.bookingProposal.carId, message.bookingProposal.carName);
      setIsConfirmed(true);
    }
  };

  const speak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(message.text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const hasPhone = message.text.includes('+233504512884') || message.text.toLowerCase().includes('sales manager');
  const hasLocation = message.text.toLowerCase().includes('car park location') || message.text.toLowerCase().includes('where are you located') || message.text.includes('maps.app.goo.gl');

  return (
    <div className={cn("flex w-full mb-2", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-[8px] px-[9px] py-[6px] relative shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]",
          isUser ? "bg-[#005c4b] rounded-tr-none" : "bg-[#202c33] rounded-tl-none"
        )}
      >
        <div className="flex flex-col">
          {message.attachment && message.attachment.type === 'image' && (
            <img src={message.attachment.url} alt="Attachment" className="max-w-full rounded-lg mb-2" />
          )}
          {message.attachment && message.attachment.type === 'audio' && (
            <audio controls src={message.attachment.url} className="max-w-full mb-2" />
          )}
          {message.aiImages && message.aiImages.map((url, idx) => {
            const car = CAR_DATABASE.find(c => c.image_url === url || c.real_image === url);
            return (
              <div key={idx} className="rounded-xl overflow-hidden mb-2 border border-[#2f3b43] bg-[#111b21]">
                {/* Car Image */}
                <div className="relative w-full" style={{aspectRatio:'16/9'}}>
                  <img
                    src={(car as any)?.real_image || url}
                    alt={car ? `${car.brand} ${car.model}` : 'Car'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // fallback chain: real_image → image_url → placeholder
                      const t = e.currentTarget;
                      if (t.src !== url) { t.src = url; }
                      else { t.src = 'https://via.placeholder.com/400x225/1f2c34/8696a0?text=' + encodeURIComponent(car ? `${car.brand} ${car.model}` : 'Car'); }
                    }}
                  />
                  {car && (
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {car.year}
                    </span>
                  )}
                  {car && (car as any).color && (
                    <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded-full">
                      {(car as any).color}
                    </span>
                  )}
                </div>
                {car && (
                  <div className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[#e9edef] font-bold text-[14px] leading-tight">{car.brand} {car.model}</p>
                        <p className="text-[#8696a0] text-[11px] mt-0.5">{car.year} · Available Now</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[#00a884] font-black text-[15px] leading-tight">₵{car.price.toLocaleString()}</p>
                        <p className="text-[#8696a0] text-[10px]">or best offer</p>
                      </div>
                    </div>
                    {/* Specs row */}
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {(car as any).transmission && (
                        <span className="text-[10px] bg-[#2a3942] text-[#8696a0] px-2 py-0.5 rounded-full">⚙️ {(car as any).transmission}</span>
                      )}
                      {(car as any).fuel && (
                        <span className="text-[10px] bg-[#2a3942] text-[#8696a0] px-2 py-0.5 rounded-full">⛽ {(car as any).fuel}</span>
                      )}
                      {(car as any).mileage && (
                        <span className="text-[10px] bg-[#2a3942] text-[#8696a0] px-2 py-0.5 rounded-full">📍 {(car as any).mileage}</span>
                      )}
                    </div>
                    <button
                      onClick={() => onConfirmBooking && onConfirmBooking(car.id, `${car.brand} ${car.model}`)}
                      className="w-full bg-[#00a884] hover:bg-[#008f72] active:scale-95 text-white text-[12px] font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Book a Viewing
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {message.text && (
            <div className="text-[14.2px] leading-snug text-[#e9edef] break-words whitespace-pre-wrap relative group">
              {isUser ? (
                message.text
              ) : (
                <>
                  <div className="markdown-body prose prose-invert prose-sm max-w-none prose-p:my-0 prose-a:text-[#53bdeb]">
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>{message.text}</ReactMarkdown>
                  </div>
                  <button 
                    onClick={speak}
                    className="absolute -right-1 -top-1 p-1 text-[#8696a0] hover:text-[#d1d7db] opacity-0 group-hover:opacity-100 transition-opacity"
                    title={isSpeaking ? "Stop speaking" : "Listen to message"}
                  >
                    {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>

                  {/* Location Card — WhatsApp style */}
                  {message.showLocation && (
                    <div className="mt-2">
                      <LocationCard />
                    </div>
                  )}

                  {/* Interactive Buttons */}
                  <div className="mt-3 flex flex-col space-y-2">
                    {hasPhone && (
                      <a 
                        href="https://wa.me/233504512884" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2 px-4 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat with Owner</span>
                      </a>
                    )}
                    {message.bookingProposal && !isConfirmed && (
                      <button 
                        onClick={handleConfirm}
                        className="flex items-center justify-center space-x-2 bg-[#111827] hover:bg-black text-white py-2 px-4 rounded-lg text-sm font-bold transition-colors shadow-sm border border-white/10"
                      >
                        <CalendarCheck className="w-4 h-4" />
                        <span>Confirm Booking for {message.bookingProposal.carName}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end mt-1 space-x-1">
          <span className="text-[11px] text-[#8696a0] whitespace-nowrap">
            {format(message.timestamp, 'HH:mm')}
          </span>
          {isUser && (
            <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb] fill-current">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
