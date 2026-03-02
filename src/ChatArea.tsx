import { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical, Phone, Video, X, Volume2, VolumeX, Calculator, Mic, MicOff } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { LeadCaptureModal } from './LeadCaptureModal';
import { BookingModal } from './BookingModal';
import { PaymentCalculator } from './PaymentCalculator';
import { Message, Attachment } from '../types';
import { sendChatMessage, getCustomerMemory, saveCustomerMemory } from '../services/chatService';
import { CAR_DATABASE } from '../data/cars';
import { cn } from '../lib/utils';
import { logService } from '../services/logService';

interface ChatAreaProps { onClose?: () => void; }

const GREETING = "Hello! 👋 This is Abena.\n\nI have some of the cleanest and most reliable vehicles currently available in the Ghanaian market, ranging from fuel-efficient daily drivers to high-end luxury models.\n\nMy goal is to help you find a car that offers both prestige and peace of mind.\n\nTo recommend the perfect match from our inventory, could you share a few details?\n\n1️⃣ **Budget**: What is your estimated price range in Ghana Cedis (₵)?\n\n2️⃣ **Vehicle Type**: Are you looking for a fuel-efficient sedan, rugged SUV, or luxury model?\n\n3️⃣ **Purpose**: Will the car be for personal use, family, or business (like Uber/Bolt)?\n\n4️⃣ **Timeline**: How soon are you planning to get behind the wheel?\n\nReply with your answers, and I'll pull up the best options for you right away! 🚗💨";

const PROACTIVE_MESSAGES = [
  "Still looking? 👀 I just got a few fresh units in — want me to show you?",
  "Hey! Don't forget — some of these cars go fast 🔥 Want me to reserve one for you?",
  "Still there? 😊 I can narrow down the perfect car for you in 2 questions. Want to try?",
];

export function ChatArea({ onClose }: ChatAreaProps) {
  const [messages, setMessages]         = useState<Message[]>([]);
  const [greetingDone, setGreetingDone] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [isTyping, setIsTyping]         = useState(false);
  const [isCalling, setIsCalling]       = useState(false);
  const [autoRead, setAutoRead]         = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isRecording, setIsRecording]   = useState(false);
  const [leadInfo, setLeadInfo]         = useState<{ name: string; phone: string } | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(true);
  const [bookingModal, setBookingModal] = useState<{ carId: string; carName: string } | null>(null);
  const [showHandoff, setShowHandoff]   = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | undefined>();

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const proactiveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proactiveShown  = useRef(false);
  const mediaRecorder   = useRef<MediaRecorder | null>(null);
  const audioChunks     = useRef<Blob[]>([]);

  // ── Proactive message after 10s of inactivity ───────────────────────
  const scheduleProactive = useCallback(() => {
    if (proactiveShown.current) return;
    if (proactiveTimer.current) clearTimeout(proactiveTimer.current);
    proactiveTimer.current = setTimeout(async () => {
      if (proactiveShown.current) return;
      proactiveShown.current = true;
      const msg = PROACTIVE_MESSAGES[Math.floor(Math.random() * PROACTIVE_MESSAGES.length)];
      const id = `proactive-${Date.now()}`;
      setIsTyping(true);
      await new Promise(r => setTimeout(r, 1200));
      setIsTyping(false);
      setMessages(prev => [...prev, { id, text: msg, sender: 'ai', timestamp: new Date(), isProactive: true }]);
    }, 10000);
  }, []);

  // ── Greeting ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (showLeadModal || greetingDone) return;
    let cancelled = false;
    const memory = getCustomerMemory();
    const isReturning = !!memory.name && memory.name !== leadInfo?.name;

    const greetingText = isReturning
      ? `Welcome back ${memory.name}! 😊 Great to see you again.\n\nLast time you were checking out our inventory. Still looking for that perfect ride? I've got some fresh units in 🚗`
      : GREETING;

    const msgId = 'greeting';
    setIsTyping(true);
    setMessages([{ id: msgId, text: '', sender: 'ai', timestamp: new Date() }]);

    (async () => {
      await new Promise(r => setTimeout(r, 600));
      const words = greetingText.split(' ');
      let current = '';
      for (let i = 0; i < words.length; i++) {
        if (cancelled) return;
        current += (i === 0 ? '' : ' ') + words[i];
        setMessages([{ id: msgId, text: current, sender: 'ai', timestamp: new Date() }]);
        const w = words[i];
        let delay = 70 + Math.random() * 60 + w.length * 8;
        if (w.endsWith('.') || w.endsWith('?') || w.endsWith('!')) delay += 900 + Math.random() * 500;
        else if (w.endsWith(',') || w.endsWith(':') || w.includes('️⃣')) delay += 400 + Math.random() * 200;
        else if (w.length > 7) delay += 60 + Math.random() * 40;
        await new Promise(r => setTimeout(r, delay));
      }
      if (!cancelled) {
        setIsTyping(false);
        setGreetingDone(true);
        scheduleProactive();
      }
    })();

    return () => { cancelled = true; };
  }, [showLeadModal, greetingDone, scheduleProactive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => { if (proactiveTimer.current) clearTimeout(proactiveTimer.current); }, []);

  // ── Lead submit ───────────────────────────────────────────────────────
  const handleLeadSubmit = (name: string, phone: string) => {
    setLeadInfo({ name, phone });
    setShowLeadModal(false);
    saveCustomerMemory({ name, phone });
    logService.addLog({ intent: 'lead_capture', lead_temperature: 'warm', messageText: `Lead captured: ${name} | ${phone}` });
    setMessages(prev => prev.map(m =>
      m.id === 'greeting' ? { ...m, text: m.text.replace('Hello! 👋 This is Abena.', `Hello ${name}! 👋 This is Abena.`) } : m
    ));
  };

  // ── Booking confirm ───────────────────────────────────────────────────
  const handleBookingConfirm = (carId: string, carName: string, date: string, time: string) => {
    setBookingModal(null);
    setShowHandoff(true);
    const booking = logService.addBooking({ car_id: carId, customer_email: leadInfo?.phone || 'unknown', status: 'confirmed' });
    setLastBookingId(booking.id);
    const confirmMsg: Message = {
      id: Date.now().toString(),
      text: `✅ **Booking Confirmed!**\n\n📅 **Date**: ${date} at ${time}\n🚗 **Vehicle**: ${carName}\n📞 **Booking ID**: ${booking.id}\n\nOur sales manager will call you shortly. Thank you${leadInfo ? `, ${leadInfo.name}` : ''}! 😊`,
      sender: 'ai', timestamp: new Date(),
      depositCard: { carName, depositAmount: 5000 },
    };
    setMessages(prev => [...prev, confirmMsg]);
    const ownerMsg = encodeURIComponent(`🚗 *New Booking Alert!*\n\n📅 Date: ${date} at ${time}\n🚘 Vehicle: ${carName}\n👤 Customer: ${leadInfo?.name || 'Unknown'}\n📞 Phone: ${leadInfo?.phone || 'Not provided'}\n🔖 Booking ID: ${booking.id}\n\nPlease follow up.`);
    window.open(`https://wa.me/233541988383?text=${ownerMsg}`, '_blank');
  };

  // ── Voice recording ───────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];
      recorder.ondataavailable = e => audioChunks.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.onload = () => {
          const attachment: Attachment = { type: 'audio', data: (reader.result as string).split(',')[1], mimeType: 'audio/webm', url };
          handleSendMessage('🎤 Voice message', attachment);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch { alert('Microphone access denied.'); }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const openWhatsApp = () => {
    const name = leadInfo?.name || 'a customer';
    const text = encodeURIComponent(`Hi, I'm ${name} and I'm interested in buying a car from Drivemond. Can you help me?`);
    window.open(`https://wa.me/233504512884?text=${text}`, '_blank');
  };

  const clearChat = () => { if (window.confirm('Clear this chat?')) setMessages([]); };
  const startCall = () => {
    setIsCalling(true);
    setTimeout(() => { setIsCalling(false); alert('Call ended. Abena is currently only available for chat.'); }, 3000);
  };
  const toggleAutoRead = () => {
    setAutoRead(prev => { if (!prev) alert('Auto-read enabled.'); else window.speechSynthesis.cancel(); return !prev; });
  };

  // ── Main send ─────────────────────────────────────────────────────────
  const handleSendMessage = async (text: string, attachment?: Attachment) => {
    if (!text.trim() && !attachment) return;
    if (proactiveTimer.current) clearTimeout(proactiveTimer.current);

    const userMessage: Message = { id: Date.now().toString(), text, sender: 'user', timestamp: new Date(), attachment };
    const currentMessages = [...messages];
    setMessages(prev => [...prev, userMessage]);
    logService.addMessageToSession(userMessage);
    setIsLoading(true);

    try {
      let responseText = await sendChatMessage(currentMessages, text, attachment);
      const aiImages: string[] = [];
      let bookingProposal: { carId: string; carName: string } | undefined;
      let compareCard: { carId1: string; carId2: string } | undefined;
      let depositCard: { carName: string; depositAmount: number } | undefined;

      const processJsonAction = (data: any, originalText: string) => {
        if (data.action === 'send_car_images' || data.action === 'send_car_image' || data.recommended_car_id) {
          const carId = data.car_id || data.recommended_car_id;
          if (carId) {
            const car = CAR_DATABASE.find(c => c.id === String(carId));
            if (car) { const img = (car as any).real_image || car.image_url; if (!aiImages.includes(img)) aiImages.push(img); }
          }
        }
        if (data.action === 'compare_cars' && data.car_id_1 && data.car_id_2) {
          compareCard = { carId1: String(data.car_id_1), carId2: String(data.car_id_2) };
        }
        if (data.action === 'propose_booking' && data.car_id) {
          const car = CAR_DATABASE.find(c => c.id === String(data.car_id));
          if (car) bookingProposal = { carId: car.id, carName: `${car.brand} ${car.model}` };
        }
        if (data.action === 'show_deposit_info') {
          depositCard = { carName: data.car_name || 'Vehicle', depositAmount: data.deposit_amount || 5000 };
        }
        if (data.intent || data.lead_temperature) {
          logService.addLog({ intent: data.intent || 'unknown', lead_temperature: data.lead_temperature || 'unknown', recommended_car_id: data.recommended_car_id, messageText: originalText });
          if (data.lead_temperature === 'hot' || data.intent === 'booking' || data.intent === 'negotiating') setShowHandoff(true);
          if (data.recommended_car_id) saveCustomerMemory({ carsViewed: [String(data.recommended_car_id)] });
        }
      };

      const findAndStripJSON = (raw: string) => {
        let clean = raw;
        const orig = raw;
        clean = clean.replace(/```(?:json|js)?\s*(\{[\s\S]*?\})\s*```/g, (_, json) => {
          try { processJsonAction(JSON.parse(json), orig); return ''; } catch { return ''; }
        });
        const matches = clean.match(/\{[\s\S]*?\}/g);
        if (matches) matches.forEach(m => {
          try { const d = JSON.parse(m); if (d.intent || d.action || d.lead_temperature || d.recommended_car_id) { processJsonAction(d, orig); clean = clean.replace(m, ''); } } catch {}
        });
        return clean.replace(/\s{3,}/g, '\n\n').trim();
      };

      responseText = findAndStripJSON(responseText);

      // Client-side fallback for all cars
      const allCarsKw = ['show me all', 'all cars', 'all the cars', 'full list', 'show all', 'list all', 'show your cars', 'what cars', 'your inventory', 'all models', 'prices and cars'];
      if (allCarsKw.some(k => text.toLowerCase().includes(k)) && aiImages.length === 0) {
        CAR_DATABASE.forEach(car => { const img = (car as any).real_image || car.image_url; if (!aiImages.includes(img)) aiImages.push(img); });
      }

      // Client-side comparison fallback
      if (!compareCard) {
        const cmpKw = ['compare', 'vs', 'versus', 'difference between'];
        if (cmpKw.some(k => text.toLowerCase().includes(k))) {
          const mentioned = CAR_DATABASE.filter(c => text.toLowerCase().includes(c.model.toLowerCase()) || text.toLowerCase().includes(c.brand.toLowerCase()));
          if (mentioned.length >= 2) compareCard = { carId1: mentioned[0].id, carId2: mentioned[1].id };
        }
      }

      setIsLoading(false);
      setIsTyping(true);

      const aiMsgId = (Date.now() + 1).toString();
      const locKw = ['location', 'address', 'where are you', 'office', 'showroom', 'map', 'directions', 'find you', 'locate'];
      const showLocation = locKw.some(k => text.toLowerCase().includes(k));

      setMessages(prev => [...prev, { id: aiMsgId, text: '', sender: 'ai', timestamp: new Date(), aiImages: aiImages.length > 0 ? aiImages : undefined, bookingProposal, compareCard, depositCard, showLocation }]);

      await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));

      const words = responseText.split(' ');
      let current = '';
      for (let i = 0; i < words.length; i++) {
        current += (i === 0 ? '' : ' ') + words[i];
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: current } : m));
        const w = words[i];
        let delay = 20 + Math.random() * 40 + w.length * 4;
        if (w.endsWith('.') || w.endsWith('?') || w.endsWith('!')) delay += 500 + Math.random() * 400;
        else if (w.endsWith(',') || w.endsWith(':')) delay += 200 + Math.random() * 150;
        await new Promise(r => setTimeout(r, delay));
      }

      setIsTyping(false);
      const finalMsg: Message = { id: aiMsgId, text: responseText, sender: 'ai', timestamp: new Date(), aiImages: aiImages.length > 0 ? aiImages : undefined, bookingProposal, compareCard, depositCard, showLocation };
      logService.addMessageToSession(finalMsg);
      if (autoRead && 'speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(responseText));
      if (bookingProposal) setTimeout(() => setBookingModal(bookingProposal!), 1000);

      // Schedule next proactive if lead didn't engage
      scheduleProactive();

    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: `Sorry, there was an error. ${error instanceof Error ? error.message : 'Please try again.'}`, sender: 'ai', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0b141a] relative overflow-hidden">
      {showLeadModal && <LeadCaptureModal onSubmit={handleLeadSubmit} onSkip={() => setShowLeadModal(false)} />}
      {bookingModal && <BookingModal carId={bookingModal.carId} carName={bookingModal.carName} onConfirm={handleBookingConfirm} onClose={() => setBookingModal(null)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#202c33] border-b border-[#2f3b43] z-10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1771168493/eds_bjytks.png" alt="Abena" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-[15px] font-semibold text-[#e9edef] leading-tight truncate">Abena{leadInfo ? ` · ${leadInfo.name}` : ''}</h2>
            <p className={cn('text-[11px] mt-0.5 transition-colors truncate', isTyping ? 'text-[#00a884] font-medium' : 'text-[#8696a0]')}>
              {isTyping ? 'typing...' : 'Drivemond Sales · Online'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 text-[#aebac1] flex-shrink-0">
          <button onClick={openWhatsApp} title="WhatsApp" className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </button>
          <button onClick={() => setShowCalculator(p => !p)} title="Calculator" className={cn('p-2 rounded-full transition-colors', showCalculator ? 'bg-[#3b4a54] text-[#00a884]' : 'hover:bg-[#3b4a54]')}>
            <Calculator className="w-[18px] h-[18px]" />
          </button>
          <button onClick={toggleAutoRead} className={cn('p-2 rounded-full transition-colors', autoRead ? 'text-[#00a884]' : 'hover:bg-[#3b4a54]')}>
            {autoRead ? <Volume2 className="w-[18px] h-[18px]" /> : <VolumeX className="w-[18px] h-[18px]" />}
          </button>
          <button onClick={startCall} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors hidden sm:flex">
            <Video className="w-[18px] h-[18px]" />
          </button>
          <button onClick={startCall} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors">
            <Phone className="w-[18px] h-[18px]" />
          </button>
          <button onClick={clearChat} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors">
            <MoreVertical className="w-[18px] h-[18px]" />
          </button>
          {onClose && <button onClick={onClose} className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors"><X className="w-[18px] h-[18px]" /></button>}
        </div>
      </div>

      {/* ── Calling overlay ── */}
      {isCalling && (
        <div className="absolute inset-0 z-50 bg-[#0b141a] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative mb-8">
            <img src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1771168493/eds_bjytks.png" alt="Abena" className="w-32 h-32 rounded-full object-cover border-4 border-[#00a884]" />
            <div className="absolute inset-0 rounded-full border-4 border-[#00a884] animate-ping opacity-20" />
          </div>
          <h2 className="text-2xl font-medium text-[#e9edef] mb-2">Abena</h2>
          <p className="text-[#8696a0] animate-pulse">Calling...</p>
          <button onClick={() => setIsCalling(false)} className="mt-12 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg">
            <Phone className="w-8 h-8 text-white rotate-[135deg] fill-current" />
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 z-10 min-h-0">
        {showCalculator && <PaymentCalculator onClose={() => setShowCalculator(false)} />}
        <div className="flex flex-col space-y-1 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex justify-center my-4">
              <div className="bg-[#ffeecd] text-gray-700 text-xs px-4 py-2 rounded-lg shadow-sm text-center max-w-xs">
                🔒 Messages are end-to-end encrypted
              </div>
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} onConfirmBooking={(carId, carName) => setBookingModal({ carId, carName })} />
          ))}
          {isLoading && (
            <div className="flex w-full mb-2 justify-start">
              <div className="bg-[#202c33] rounded-lg rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-1.5">
                {[0, 150, 300].map(delay => (
                  <div key={delay} className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Voice recording banner ── */}
      {isRecording && (
        <div className="flex-shrink-0 px-3 py-2 bg-red-900/30 border-t border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-xs font-medium">Recording... Tap stop when done</span>
          </div>
          <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-full font-bold active:scale-95 transition-all">Stop</button>
        </div>
      )}

      {/* ── Handoff banner ── */}
      {showHandoff && (
        <div className="flex-shrink-0 px-3 py-2.5 bg-gradient-to-r from-[#0d2b1f] to-[#0b1f15] border-t border-[#1a3a2a] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[#4ade80] text-[12px] font-bold leading-tight">🚗 Take the Next Step</p>
            <p className="text-[#8696a0] text-[10px] mt-0.5 leading-tight">Connect with a Sales Specialist to finalise details</p>
          </div>
          <a href="tel:+233504512884" className="flex-shrink-0 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white text-[11px] font-black px-3 py-2 rounded-xl transition-all whitespace-nowrap shadow-md">
            Speak to Sales →
          </a>
        </div>
      )}

      {/* ── Input + voice button ── */}
      <div className="z-10 flex-shrink-0 flex items-end gap-2 px-2 pb-2">
        <div className="flex-1">
          <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
        <button
          onMouseDown={startRecording}
          onTouchStart={startRecording}
          className={cn(
            'flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg mb-[3px]',
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#00a884] hover:bg-[#008f72]'
          )}
          title={isRecording ? 'Recording...' : 'Hold to record voice'}
        >
          {isRecording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
        </button>
      </div>
    </div>
  );
}
