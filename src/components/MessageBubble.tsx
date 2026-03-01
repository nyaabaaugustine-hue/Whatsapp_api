import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Volume2, VolumeX, MessageCircle, MapPin, CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { QuickReplies } from './QuickReplies';
import { ActionButtons } from './ActionButtons';
import { SummaryCard } from './SummaryCard';
import { CarComparison } from './CarComparison';

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
          {message.aiImages && message.aiImages.map((url, idx) => (
            <div key={idx} className="relative min-h-[150px] w-full bg-[#111b21] rounded-lg mb-2 overflow-hidden border border-[#2f3b43]">
              <img 
                src={url} 
                alt="Car" 
                className="w-full h-full object-cover"
                onLoad={(e) => (e.currentTarget.parentElement!.style.minHeight = '0')}
              />
            </div>
          ))}
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
                        <span>Chat on WhatsApp</span>
                      </a>
                    )}
                    {hasLocation && (
                      <a 
                        href="https://maps.app.goo.gl/vzPQLpLZDYULV8Yp9" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white py-2 px-4 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>View Car Park Location</span>
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
