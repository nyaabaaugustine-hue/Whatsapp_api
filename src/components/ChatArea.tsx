import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Phone, X, Share2, Volume2, VolumeX, Download, FileText, HelpCircle } from 'lucide-react';
import ExpertFormModal from './ExpertFormModal';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { LeadCaptureModal } from './LeadCaptureModal';
import { BookingModal } from './BookingModal';
import { Message, Attachment, QuickReply } from '../types';
import { sendChatMessage } from '../services/chatService';
import { CAR_DATABASE } from '../data/cars';
import { cn } from '../lib/utils';
import { logService } from '../services/logService';
import { track } from '../services/analytics';

interface ChatAreaProps {
  onClose?: () => void;
}

const GREETING = "Hello, I'm Abena.\nI'll help you find the right car based on your needs, budget, and lifestyle - in under 60 seconds.\nWhat best describes your purpose?";
const GREETING_REPLIES: QuickReply[] = [
  { id: 'g_family', text: 'Family Use', value: 'Family Use' },
  { id: 'g_business', text: 'Business', value: 'Business Use' },
  { id: 'g_ride', text: 'Ride-hailing', value: 'Ride-Hailing' },
  { id: 'g_exec', text: 'Executive', value: 'Executive' },
  { id: 'g_personal', text: 'Personal Use', value: 'Personal Use' },
];

export function ChatArea({ onClose }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [greetingDone, setGreetingDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [netOnline, setNetOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isCalling, setIsCalling] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [presetText, setPresetText] = useState<string>('');
  const [nameGreeted, setNameGreeted] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [aiFallback, setAiFallback] = useState(false);
  const [stage, setStage] = useState<'Browsing' | 'Interested' | 'Booking'>('Browsing');
  const [chatBgUrl, setChatBgUrl] = useState<string | null>(() => {
    try { return localStorage.getItem('chat_bg_url') || 'https://res.cloudinary.com/dx1nrew3h/image/upload/v1772512677/aaaaa_w3eapq.jpg'; } catch { return 'https://res.cloudinary.com/dx1nrew3h/image/upload/v1772512677/aaaaa_w3eapq.jpg'; }
  });
  const [showExpert, setShowExpert] = useState(false);
  const [serviceDue, setServiceDue] = useState<boolean>(() => {
    try { return (localStorage.getItem('__service_due__') || '1') === '1'; } catch { return true; }
  });
  const lastLeadScoreRef = useRef<number | null>(null);
  const followUpTimerRef = useRef<number | null>(null);
  const followUp24hRef = useRef<number | null>(null);
  const followUp48hRef = useRef<number | null>(null);
  const lastUserActivityRef = useRef<number>(Date.now());
  const lastAiActivityRef = useRef<number>(Date.now());
  const NOTIF_24_DUE_KEY = '__abena_notif_24_due__';
  const NOTIF_48_DUE_KEY = '__abena_notif_48_due__';
  const NOTIF_24_SENT_KEY = '__abena_notif_24_sent__';
  const NOTIF_48_SENT_KEY = '__abena_notif_48_sent__';
  const LAST_ACTIVITY_KEY = '__abena_last_activity__';

  // Lead capture â€” show modal on first open
  const [leadInfo, setLeadInfo] = useState<{ name: string; phone: string } | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(true);
  const LEAD_STORAGE_KEY = '__lead_info__';
  const LEAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  // Booking modal
  const [bookingModal, setBookingModal] = useState<{ carId: string; carName: string } | null>(null);

  // Sales handoff â€” only show after booking confirmed or hot purchase intent
  const [showHandoff, setShowHandoff] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [flow, setFlow] = useState<{ stage: 'idle' | 'budget' | 'type' | 'timeline' | 'results'; budget?: string; carType?: string; timeline?: string }>({ stage: 'idle' });
  const [openQuestion, setOpenQuestion] = useState<'purpose' | 'priority' | 'financing' | 'budget' | 'type' | null>(null);
  
  // Comprehensive session memory - never ask the same question twice
  const [sessionMemory, setSessionMemory] = useState<{
    purpose?: string;
    priority?: string;
    financing?: 'full' | 'financing';
    budget?: number;
    carType?: string;
    askedQuestions: Set<string>;
  }>({
    askedQuestions: new Set()
  });
  const [budgetSliderShown, setBudgetSliderShown] = useState(false);

  // Type out greeting word-by-word on mount (after lead modal dismissed)
  useEffect(() => {
    if (showLeadModal || greetingDone) return;
    let cancelled = false;
    const msgId = 'greeting';
    setIsTyping(true);
    setMessages([{ id: msgId, text: '', sender: 'ai', timestamp: new Date() }]);

    (async () => {
      await new Promise(r => setTimeout(r, 600));
      const words = GREETING.split(' ');
      let current = '';
      for (let i = 0; i < words.length; i++) {
        if (cancelled) return;
        current += (i === 0 ? '' : ' ') + words[i];
        setMessages([{ id: msgId, text: current, sender: 'ai', timestamp: new Date() }]);
        const w = words[i];
        let delay = 110 + Math.random() * 100 + w.length * 12;
        if (w.endsWith('.') || w.endsWith('?') || w.endsWith('!')) delay += 1200 + Math.random() * 600;
        else if (w.endsWith(',') || w.endsWith(':')) delay += 600 + Math.random() * 300;
        else if (w.length > 7) delay += 100 + Math.random() * 60;
        await new Promise(r => setTimeout(r, delay));
      }
      if (!cancelled) {
        setIsTyping(false);
        setGreetingDone(true);
        setMessages([{ id: msgId, text: GREETING, sender: 'ai', timestamp: new Date(), quickReplies: GREETING_REPLIES }]);
      }
    })();

    return () => { cancelled = true; };
  }, [showLeadModal, greetingDone]);

  useEffect(() => {
    if (!greetingDone) return;
    setMessages(prev => prev.map(m => m.id === 'greeting'
      ? { ...m }
      : m));
  }, [greetingDone]);
  useEffect(() => {
    if (!isAtBottom) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping, isAtBottom]);

  useEffect(() => {
    const on = () => setNetOnline(true);
    const off = () => setNetOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const triggerServiceBooking = () => {
    const msgId = (Date.now() + 2).toString();
    const aiMsg: Message = {
      id: msgId,
      text: 'Service Booking\nChoose a preferred day and we’ll confirm your slot.',
      sender: 'ai',
      timestamp: new Date(),
      quickReplies: [
        { id: 'svc_weekday', text: 'Weekday', value: 'weekday' },
        { id: 'svc_weekend', text: 'Weekend', value: 'weekend' },
        { id: 'svc_call', text: 'Talk to Service', value: 'talk_service' },
      ]
    };
    setMessages(prev => [...prev, aiMsg]);
    try { localStorage.setItem('__service_due__', '0'); setServiceDue(false); } catch {}
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEAD_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { name: string; phone: string; savedAt: number };
      if (Date.now() - data.savedAt > LEAD_TTL_MS) {
        localStorage.removeItem(LEAD_STORAGE_KEY);
        return;
      }
      setLeadInfo({ name: data.name, phone: data.phone });
      setShowLeadModal(false);
      setNameGreeted(true);
    } catch {}
  }, []);

  useEffect(() => {
    const maybeNotify = async () => {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      const now = Date.now();
      const due24 = parseInt(localStorage.getItem(NOTIF_24_DUE_KEY) || '0', 10);
      const due48 = parseInt(localStorage.getItem(NOTIF_48_DUE_KEY) || '0', 10);
      const sent24 = localStorage.getItem(NOTIF_24_SENT_KEY) === '1';
      const sent48 = localStorage.getItem(NOTIF_48_SENT_KEY) === '1';
      if (due24 && now >= due24 && !sent24) {
        localStorage.setItem(NOTIF_24_SENT_KEY, '1');
        new Notification('Drivemond Follow‑Up', { body: 'The options you viewed are still available. Would you like to reserve one?' });
      }
      if (due48 && now >= due48 && !sent48) {
        localStorage.setItem(NOTIF_48_SENT_KEY, '1');
        new Notification('Drivemond Check‑In', { body: 'Just checking in — want me to narrow this down to one best match?' });
      }
    };
    maybeNotify();
  }, []);

  useEffect(() => {
    if (!leadInfo) return;
    if (!logService.getCurrentSession()) {
      logService.startNewSession();
    }
    logService.updateUserInfo({ name: leadInfo.name, phone: leadInfo.phone });
  }, [leadInfo]);

  const handleLeadSubmit = (name: string, phone: string) => {
    setLeadInfo({ name, phone });
    setShowLeadModal(false);
    try {
      localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify({ name, phone, savedAt: Date.now() }));
    } catch {}
    if (!logService.getCurrentSession()) {
      logService.startNewSession();
    }
    logService.updateUserInfo({ name, phone });
    logService.addLog({
      intent: 'lead_capture',
      lead_temperature: 'warm',
      messageText: `Lead captured: ${name} | ${phone}`
    });
    track('lead_capture', { name, phone });
    (async () => {
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'josemorgan120@gmail.com',
            subject: `New Lead: ${name}`,
            html: `<h2>New Lead</h2><p><strong>Name:</strong> ${name}</p><p><strong>WhatsApp:</strong> ${phone}</p>`
          })
        });
        setErrorToast('Lead sent to admin.');
        setTimeout(() => setErrorToast(null), 2500);
      } catch {}
    })();
    // Personalise first message (or add one if missing)
    let greeted = false;
    setMessages(prev => {
      const next = prev.map(m =>
        m.id === 'greeting'
          ? { ...m, text: m.text.replace('Hi! 👋 I’m Abena', `Hi ${name}! 👋 I’m Abena`) }
          : m
      );
      greeted = next.some(m => m.id === 'greeting');
      return next;
    });
    if (!greeted) {
      const msg: Message = {
        id: (Date.now() + 1).toString(),
        text: `Hi ${name}! 👋 I’m Abena.\nWhat budget range are you working with?`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msg]);
      logService.addMessageToSession(msg);
    }
    setNameGreeted(true);
  };

  

  const handleBookingConfirm = async (carId: string, carName: string, date: string, time: string) => {
    setBookingModal(null);
    setShowHandoff(true);
    const booking = await logService.addBooking({
      car_id: carId,
      customer_email: leadInfo?.phone || 'unknown',
      status: 'confirmed'
    });
    const confirmMsg: Message = {
      id: Date.now().toString(),
      text: `Booking Confirmed.\n\nDate: ${date} at ${time}\nVehicle: ${carName}\nBooking ID: ${booking.id}\n\nOur sales manager will call you shortly to confirm the appointment. Thank you${leadInfo ? `, ${leadInfo.name}` : ''}.\n\nWould you like assistance with insurance, registration, financing, or delivery?`,
      sender: 'ai',
      timestamp: new Date(),
      quickReplies: [
        { id: 'up_ins', text: 'Insurance', value: 'Insurance' },
        { id: 'up_reg', text: 'Registration', value: 'Registration' },
        { id: 'up_fin', text: 'Financing', value: 'Financing' },
        { id: 'up_del', text: 'Delivery', value: 'Delivery' },
        { id: 'up_sales', text: 'Talk to Sales', value: 'talk_sales' },
      ]
    };
    setMessages(prev => [...prev, confirmMsg]);

    await finalizeSession();
    track('booking_confirmed', { carId, carName, date, time });
  };

  const normalizePhone = (raw: string | undefined) => {
    if (!raw) return '';
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.startsWith('0')) return `233${digits.substring(1)}`;
    if (digits.startsWith('233')) return digits;
    return `233${digits}`;
  };
  const finalizeSession = async () => {
    const phone = normalizePhone(leadInfo?.phone);
    const transcriptLines = messages.map(m => {
      const who = m.sender === 'user' ? 'You' : 'Abena';
      const time = m.timestamp.toLocaleString();
      return `${who} [${time}]: ${m.text}`;
    });
    const html = `<h2>Chat Transcript</h2><p>Name: ${leadInfo?.name || 'Unknown'}</p><p>Phone: ${leadInfo?.phone || 'Unknown'}</p><pre style="white-space:pre-wrap;font-family:Inter,system-ui">${transcriptLines.join('\n')}</pre>`;
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'josemorgan120@gmail.com', subject: `Chat Transcript - ${leadInfo?.name || 'Customer'}`, html })
    });
    setErrorToast('Transcript emailed.');
    setTimeout(() => setErrorToast(null), 2500);
    logService.addLog({
      intent: 'transcript_saved',
      lead_temperature: 'warm',
      messageText: `Transcript saved for ${leadInfo?.name || 'Unknown'}`
    });
    track('transcript_emailed', { name: leadInfo?.name, phone: leadInfo?.phone });
  };

  const downloadTranscript = () => {
    const transcriptLines = messages.map(m => {
      const who = m.sender === 'user' ? 'You' : 'Abena';
      const time = m.timestamp.toLocaleString();
      return `${who} [${time}]: ${m.text}`;
    });
    const blob = new Blob([transcriptLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportTranscriptPDF = () => {
    const transcriptLines = messages.map(m => {
      const who = m.sender === 'user' ? 'You' : 'Abena';
      const time = m.timestamp.toLocaleString();
      return `${who} [${time}]: ${m.text}`;
    });
    const html = `
      <html>
        <head>
          <title>Chat Transcript</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            pre { white-space: pre-wrap; font-size: 12px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <h1>Chat Transcript</h1>
          <pre>${transcriptLines.join('\n')}</pre>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };


  const clearChat = () => {
    if (window.confirm("Clear this chat?")) {
      setMessages([]);
    }
  };

  const startCall = () => {
    setIsCalling(true);
    setTimeout(() => {
      setIsCalling(false);
      alert("Call ended. Abena is currently only available for chat.");
    }, 3000);
  };

  const toggleAutoRead = () => {
    setAutoRead(prev => {
      if (!prev) alert("Auto-read enabled.");
      else window.speechSynthesis.cancel();
      return !prev;
    });
  };

  function categoryOf(brand: string, model: string) {
    const b = brand.toLowerCase();
    const m = model.toLowerCase();
    if (['rav4','cr-v','rx'].some(x => m.includes(x))) return 'SUV';
    if (m.includes('f-150')) return 'Pickup';
    if (['mercedes-benz','lexus'].some(x => b.includes(x))) return 'Luxury';
    return 'Sedan';
  }

  function parseBudget(input: string): number | undefined {
    const match = input.match(/(\d[\d,.\s]*)(\s*[kKmM])?/);
    if (!match) return undefined;
    const raw = match[1].replace(/[,.\s]/g, '');
    let val = parseInt(raw, 10);
    if (isNaN(val)) return undefined;
    const suffix = (match[2] || '').trim().toLowerCase();
    if (suffix === 'k') val *= 1000;
    if (suffix === 'm') val *= 1000000;
    return val;
  }

  function parseType(input: string): string | undefined {
    const s = input.toLowerCase();
    if (s.includes('suv')) return 'SUV';
    if (s.includes('sedan')) return 'Sedan';
    if (s.includes('luxury')) return 'Luxury';
    if (s.includes('pickup')) return 'Pickup';
    if (s.includes('load') || s.includes('carry') || s.includes('cargo')) return 'Pickup';
    if (s.includes('strong')) return 'Pickup';
    if (s.includes('long journey') || s.includes('long trip') || s.includes('road trip')) return 'SUV';
    if (s.includes('electric') || s.includes('hybrid')) return 'Electric';
    // Handle "any" or "recommend" as valid responses
    if (s.includes('any') || s.includes('recommend') || s.includes('suggest') || s.includes('either')) return 'Any';
    return undefined;
  }

  function parseBuyerProfile(input: string): string | undefined {
    const s = input.toLowerCase();
    if (s.includes('first') || s.includes('first-time')) return 'First-Time Buyer';
    if (s.includes('family')) return 'Family Use';
    if (s.includes('business owner') || s.includes('business')) return 'Business Use';
    if (s.includes('uber') || s.includes('bolt') || s.includes('ride-hailing') || s.includes('ride hailing')) return 'Ride-Hailing';
    if (s.includes('executive') || s.includes('luxury')) return 'Executive';
    if (s.includes('personal')) return 'Personal Use';
    return undefined;
  }

  function parsePriority(input: string): string | undefined {
    const s = input.toLowerCase();
    const trimmed = s.trim();
    if (/^1$/.test(trimmed)) return 'Fuel Efficiency';
    if (/^2$/.test(trimmed)) return 'Easy Maintenance';
    if (/^3$/.test(trimmed)) return 'Strong Resale Value';
    if (/^4$/.test(trimmed)) return 'Comfort';
    // More flexible matching
    if (s.includes('fuel') || s.includes('efficiency') || s.includes('economy')) return 'Fuel Efficiency';
    if (s.includes('maintenance') || s.includes('service') || s.includes('maintain')) return 'Easy Maintenance';
    if (s.includes('resale') || s.includes('resell') || s.includes('value')) return 'Strong Resale Value';
    if (s.includes('comfort') || s.includes('spacious')) return 'Comfort';
    if (s.includes('power') || s.includes('performance')) return 'Power';
    if (s.includes('business use') || s.includes('business')) return 'Business Use';
    return undefined;
  }

  function parseFinancing(input: string): 'full' | 'financing' | undefined {
    const s = input.toLowerCase();
    if (s.includes('finance') || s.includes('financing') || s.includes('installment') || s.includes('monthly')) return 'financing';
    if (s.includes('cash') || s.includes('full') || s.includes('pay in full') || s.includes('paying full') || s.includes('outright')) return 'full';
    // Handle negative responses as "not financing" = "full payment"
    if (s === 'no' || s === 'nope' || s === 'nah') return 'full';
    return undefined;
  }

  function parseLocation(input: string): 'Accra' | 'Outside Accra' | undefined {
    const s = input.toLowerCase();
    if (s.includes('accra') || s.includes('east legon') || s.includes('tema') || s.includes('spintex') || s.includes('airport') || s.includes('madina')) return 'Accra';
    if (s.includes('kumasi') || s.includes('takoradi') || s.includes('tamale') || s.includes('cape coast') || s.includes('sunyani') || s.includes('koforidua')) return 'Outside Accra';
    return undefined;
  }

  function parseTimeline(input: string): string | undefined {
    const s = input.toLowerCase();
    if (s.includes('week') || s.includes('today')) return 'this week';
    if (s.includes('month')) return 'within a month';
    if (s.includes('browse')) return 'just browsing';
    return undefined;
  }

  function findCarsInText(input: string) {
    const s = input.toLowerCase();
    return CAR_DATABASE.filter(c => {
      const b = c.brand.toLowerCase();
      const m = c.model.toLowerCase();
      return s.includes(b) || s.includes(m) || s.includes(`${b} ${m}`) || s.includes(`${m} ${b}`);
    });
  }

  function rankCars(cars: typeof CAR_DATABASE, priority?: string) {
    const score = (c: any) => {
      let s = 0;
      const brand = c.brand.toLowerCase();
      const model = c.model.toLowerCase();
      if (priority === 'Fuel Efficiency' || priority === 'Easy Maintenance' || priority === 'Strong Resale Value') {
        if (brand.includes('toyota') || brand.includes('honda')) s += 4;
      }
      if (priority === 'Comfort' || priority === 'Power') {
        if (brand.includes('lexus') || brand.includes('mercedes')) s += 3;
      }
      if (priority === 'Business Use') {
        if (model.includes('f-150') || model.includes('rav4') || model.includes('cr-v')) s += 3;
      }
      return s;
    };
    return cars.slice().sort((a, b) => score(b) - score(a));
  }

  function selectCars(budget?: number, type?: string) {
    let cars = CAR_DATABASE.slice();
    if (type && type !== 'Electric') {
      cars = cars.filter(c => categoryOf(c.brand, c.model) === type);
    }
    if (budget) {
      const allowance = Math.max(budget * 1.15, budget); // allow up to +15% over budget
      const within = cars.filter(c => c.price <= allowance);
      if (within.length > 0) {
        cars = within.sort((a, b) => Math.abs(a.price - budget) - Math.abs(b.price - budget));
      } else {
        // Fallback: show lowest-priced viable options to guide buyer upward
        const lowest = cars.slice().sort((a, b) => a.price - b.price).slice(0, 3);
        return lowest;
      }
    }
    return cars.slice(0, 3);
  }

  function craftLocalReply(userText: string, name?: string, addName?: boolean, lastBudget?: number, lastProfile?: string, lastPriority?: string, lastFinancing?: 'full' | 'financing', lastType?: string) {
    const budget = parseBudget(userText) ?? lastBudget;
    const type = parseType(userText) ?? lastType;
    const profile = parseBuyerProfile(userText) ?? lastProfile;
    const priority = parsePriority(userText) ?? lastPriority;
    const financing = parseFinancing(userText) ?? lastFinancing;
    const time = parseTimeline(userText);
    const minPrice = Math.min(...CAR_DATABASE.map(c => c.price));
    const picks = rankCars(selectCars(budget, type), priority);
    const lower = userText.toLowerCase();
    const locationHit = parseLocation(userText);
    
    // Detect farewells
    const isFarewell = ['bye', 'goodbye', 'thank you', 'thanks', 'see you', 'later', 'gtg', 'gotta go', 'have to go'].some(k => lower.includes(k));
    
    // Detect "show more" / "what else" requests
    const wantsMore = ['what else', 'show more', 'more options', 'other options', 'alternatives', 'something else', 'different', 'another'].some(k => lower.includes(k));
    
    const askedForPhotos = ['photo', 'photos', 'picture', 'pictures', 'image', 'images', 'show', 'see', 'view'].some(k => lower.includes(k));
    const askedInventory = ['inventory', 'all cars', 'all the cars', 'full list', 'show all', 'list all', 'what do you have'].some(k => lower.includes(k));
    const askedLocation = ['location', 'address', 'where are you', 'showroom', 'office', 'map', 'directions'].some(k => lower.includes(k));
    const askedAlert = ['alert', 'notify', 'let me know', 'call me', 'text me', 'message me'].some(k => lower.includes(k));
    const askedContact = ['contact', 'contacts', 'phone', 'number', 'call', 'whatsapp'].some(k => lower.includes(k));
    const askedRugged = ['rugged', 'ruggard', 'tough', 'strong body', 'strong one', 'strong', 'offroad', 'off-road', 'durable'].some(k => lower.includes(k));
    const askedCompare = lower.includes('compare') || lower.includes('vs') || lower.includes('versus');
    const compareCars = askedCompare ? findCarsInText(userText).slice(0, 2) : [];
    const unsure = ['not sure', 'not sure yet', 'hmm', 'maybe', 'thinking', 'let me think', 'later'].some(k => lower.includes(k));
    const wantsBestValue = lower.includes('best value') || lower.includes('best-value') || userText === 'best_value';
    const wantsRecommend = lower.includes('recommend') || userText === 'recommend_for_me';
    const wantsNarrow = lower.includes('narrow') || userText === 'narrow_one';
    const shouldAttachImages = askedForPhotos || wantsMore;
    const imgs = shouldAttachImages ? picks.slice(0, 2).map(c => ((c as any).real_image || c.image_url)) : [];
    let lines: string[] = [];
    let quickReplies: QuickReply[] | undefined;
    
    // Handle farewells gracefully
    if (isFarewell) {
      lines.push(`Thank you${name ? `, ${name}` : ''}! It was great helping you today.`);
      lines.push("Feel free to reach out anytime you're ready to move forward.");
      lines.push("Our sales team is available 24/7 on WhatsApp: +233504512884");
      lines.push("Drive safe! 🚗");
      return { text: lines.join('\n'), aiImages: [], quickReplies: undefined };
    }
    
    // Handle "show more" / "what else" requests
    if (wantsMore) {
      const morePicks = picks.slice(2, 5); // Get next 3 cars
      if (morePicks.length > 0) {
        lines.push("Here are more great options for you:");
        morePicks.forEach(car => {
          lines.push(`\n${car.brand} ${car.model} (${car.year}) - GHS ${car.price.toLocaleString()}`);
        });
        lines.push("\nWould you like to see photos or book a viewing?");
        return {
          text: lines.join('\n'),
          aiImages: morePicks.slice(0, 2).map(c => ((c as any).real_image || c.image_url)),
          quickReplies: [
            { id: 'show_photos', text: 'Show Photos', value: 'show_photos' },
            { id: 'book_view', text: 'Book Viewing', value: 'reserve_viewing' }
          ]
        };
      } else {
        lines.push("I've shown you our best matches based on your preferences.");
        lines.push("Would you like to adjust your budget or car type to see different options?");
        return {
          text: lines.join('\n'),
          aiImages: [],
          quickReplies: [
            { id: 'adjust_budget', text: 'Adjust Budget', value: 'change budget' },
            { id: 'adjust_type', text: 'Different Type', value: 'change type' },
            { id: 'talk_sales', text: 'Talk to Sales', value: 'talk_sales' }
          ]
        };
      }
    }
    
    if (name && addName) lines.push(`Hello ${name}.`);
    if (askedLocation) {
      const locLine = locationHit === 'Outside Accra'
        ? "We offer nationwide delivery across Ghana."
        : "We're in East Legon, Accra. Want directions or a pin?";
      lines.push(locLine);
      return {
        text: lines.join('\n'),
        aiImages: [],
        quickReplies: [
          { id: 'loc_dir', text: 'Directions', value: 'directions' },
          { id: 'loc_pin', text: 'Send Pin', value: 'send_pin' }
        ]
      };
    }
    if (askedContact) {
      lines.push("You can reach our sales manager on WhatsApp:");
      lines.push("+233504512884");
      quickReplies = [{ id: 'contact_wa', text: 'Send WhatsApp Contact', value: 'send_contact' }];
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }
    if (askedCompare && compareCars.length === 2) {
      const [a, b] = compareCars;
      lines.push(`Compare: ${a.brand} ${a.model} vs ${b.brand} ${b.model}`);
      lines.push(`${a.brand} ${a.model} - fuel efficiency: strong, maintenance: easy, resale: strong.`);
      lines.push(`${b.brand} ${b.model} - comfort: strong, road confidence: strong.`);
      if (priority) lines.push(`Based on ${priority}, my strongest pick is ${a.brand} ${a.model}.`);
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }
    if (lower.includes('sedan vs suv')) {
      lines.push("If you value fuel savings and easy parking, a sedan fits well.");
      lines.push("If you want more space and road height, an SUV is ideal.");
      lines.push("Which way do you want to lean?");
      return {
        text: lines.join('\n'),
        aiImages: [],
        quickReplies: [
          { id: 'lean_sedan', text: 'Sedan', value: 'Sedan' },
          { id: 'lean_suv', text: 'SUV', value: 'SUV' }
        ]
      };
    }
    if (lower.includes('budget vs comfort')) {
      lines.push("Budget focus gives you strong value and lower ownership costs.");
      lines.push("Comfort focus gives you a more premium, relaxed drive.");
      lines.push("Which matters more right now?");
      return {
        text: lines.join('\n'),
        aiImages: [],
        quickReplies: [
          { id: 'lean_budget', text: 'Budget', value: 'Budget' },
          { id: 'lean_comfort', text: 'Comfort', value: 'Comfort' }
        ]
      };
    }
    if (lower.includes('fuel savings vs space')) {
      lines.push("Fuel savings favors smaller, lighter sedans.");
      lines.push("Space favors SUVs with more cabin and cargo room.");
      lines.push("Which matters most for your daily use?");
      return {
        text: lines.join('\n'),
        aiImages: [],
        quickReplies: [
          { id: 'lean_fuel', text: 'Fuel Savings', value: 'Fuel Savings' },
          { id: 'lean_space', text: 'More Space', value: 'Space' }
        ]
      };
    }
    if (lower.includes('let me think') || lower.includes('think about it')) {
      lines.push("No problem at all.");
      lines.push("Would you like me to save this option or send a quick comparison?");
      return {
        text: lines.join('\n'),
        aiImages: [],
        quickReplies: [
          { id: 'save_opt', text: 'Save Option', value: 'save_option' },
          { id: 'quick_comp', text: 'Quick Comparison', value: 'quick_comparison' }
        ]
      };
    }
    if (askedAlert) {
      lines.push("Understood. I will alert you the moment a clean unit lands in that range.");
      lines.push("Do you prefer SUV, sedan, or pickup?");
      quickReplies = [
        { id: 'type_suv', text: 'SUV', value: 'SUV' },
        { id: 'type_sedan', text: 'Sedan', value: 'Sedan' },
        { id: 'type_pickup', text: 'Pickup', value: 'Pickup' },
        { id: 'type_any', text: 'Any', value: 'any' }
      ];
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }

    if (!profile) {
      lines.push("What best describes your purpose?");
      quickReplies = [
        { id: 'p_family', text: 'Family Use', value: 'Family Use' },
        { id: 'p_business', text: 'Business', value: 'Business Use' },
        { id: 'p_ride', text: 'Ride-hailing', value: 'Ride-Hailing' },
        { id: 'p_exec', text: 'Executive', value: 'Executive' },
        { id: 'p_personal', text: 'Personal Use', value: 'Personal Use' }
      ];
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }

    if (!priority) {
      lines.push("What matters most to you?");
      quickReplies = [
        { id: 'pr_fuel', text: 'Fuel Efficiency', value: 'Fuel Efficiency' },
        { id: 'pr_maint', text: 'Easy Maintenance', value: 'Easy Maintenance' },
        { id: 'pr_resale', text: 'Strong Resale Value', value: 'Strong Resale Value' },
        { id: 'pr_comfort', text: 'Comfort', value: 'Comfort' }
      ];
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }

    if (!financing) {
      lines.push("Are you paying full or financing?");
      quickReplies = [
        { id: 'pay_full', text: 'Paying Full', value: 'pay in full' },
        { id: 'pay_fin', text: 'Financing', value: 'financing' }
      ];
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }

    if (askedForPhotos && !type) {
      lines.push("Which type should I show — SUV, sedan, or pickup?");
      quickReplies = [
        { id: 'type_suv', text: 'SUV', value: 'SUV' },
        { id: 'type_sedan', text: 'Sedan', value: 'Sedan' },
        { id: 'type_pickup', text: 'Pickup', value: 'Pickup' },
        { id: 'type_any', text: 'Any', value: 'any' }
      ];
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }

    if (!budget) {
      if (askedInventory) {
        lines.push("I'll guide you step by step.");
      }
      if (askedRugged && !type) {
        lines.push("For rugged use, do you want an SUV or pickup?");
        quickReplies = [
          { id: 'rug_suv', text: 'SUV', value: 'SUV' },
          { id: 'rug_pick', text: 'Pickup', value: 'Pickup' }
        ];
        return { text: lines.join('\n'), aiImages: [], quickReplies };
      } else if (type) {
        lines.push(`${type} noted.`);
      }
      if (priority) lines.push(`Priority noted: ${priority}.`);
      lines.push("What's your comfortable budget range?");
      quickReplies = [
        { id: 'b_under_100', text: 'Under GHS 100k', value: 'under_100k' },
        { id: 'b_150', text: 'GHS 150k', value: '150000' },
        { id: 'b_200', text: 'GHS 200k', value: '200000' },
        { id: 'b_250', text: 'GHS 250k', value: '250000' },
        { id: 'b_300_plus', text: 'GHS 300k & above', value: '300000+' }
      ];
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }

    // budget is present
    lines.push(`Great - budget GHS ${budget.toLocaleString()}.`);
    if (financing === 'financing') {
      const estimate = Math.round((budget * 0.8) / 36);
      lines.push(`Estimated monthly from GHS ${estimate.toLocaleString()} (36 months, 20% deposit).`);
      const financeAnswered = lower.includes('finance_yes') || lower.includes('not_now');
      if (!financeAnswered) {
        lines.push("Would you like a finance advisor to tailor options?");
        quickReplies = [
          { id: 'fin_yes', text: 'Yes, connect me', value: 'finance_yes' },
          { id: 'fin_no', text: 'Not now', value: 'not_now' }
        ];
        return { text: lines.join('\n'), aiImages: [], quickReplies };
      }
    }
    if (!type) {
      if (budget <= 100000) {
        lines.push("Under GHS 100k is a smart budget range in Ghana.");
        lines.push("You get reliable, fuel-efficient options with easy maintenance support.");
        lines.push("Ownership advantage:");
        lines.push("- Lower insurance costs");
        lines.push("- Affordable servicing");
        lines.push("- Easy spare parts access");
        lines.push("- Strong resale demand");
        const useAnswered = lower.includes('daily') || lower.includes('business use');
        if (!useAnswered) {
          lines.push("Will this be for daily driving or business use?");
          return {
            text: lines.join('\n'),
            aiImages: [],
            quickReplies: [
              { id: 'use_daily', text: 'Daily Driving', value: 'Daily Driving' },
              { id: 'use_business', text: 'Business Use', value: 'Business Use' }
            ]
          };
        }
      }
      lines.push("What type are you interested in?");
      quickReplies = [
        { id: 'type_sedan', text: 'Sedan (Fuel Efficient)', value: 'Sedan' },
        { id: 'type_suv', text: 'Compact SUV', value: 'SUV' },
        { id: 'type_reco', text: 'Recommend for Me', value: 'recommend_for_me' }
      ];
      return { text: lines.join('\n'), aiImages: [], quickReplies };
    }
    if (wantsRecommend) {
      const top = picks[0];
      if (top) {
        lines.push(`Based on what you've told me, my strongest recommendation is the ${top.brand} ${top.model}.`);
        lines.push("Fuel efficiency: strong. Maintenance: easy. Resale: strong.");
        lines.push("Fully inspected, verified documents, transparent pricing.");
        lines.push("This model maintains strong resale demand in Ghana.");
        return { text: lines.join('\n'), aiImages: imgs, quickReplies };
      }
    }
    if (wantsBestValue) {
      const top = picks.slice(0, 2);
      lines.push("Fast-moving models under your range this week:");
      top.forEach(c => lines.push(`${c.brand} ${c.model} - strong value and easy ownership.`));
      if (top[0]) {
        lines.push(`Top pick: ${top[0].brand} ${top[0].model}. Proven reliability, strong fuel economy, and resale demand.`);
      }
      return { text: lines.join('\n'), aiImages: imgs, quickReplies };
    }
    if (type) lines.push(`${type} noted.`);
    if (time) lines.push(`Timing: ${time}.`);
    if (time === 'this week') {
      lines.push("Let's move quickly to secure the right option for you.");
    }
    if (time === 'just browsing') {
      lines.push("I'll show you strong options to consider comfortably.");
    }
    // Guard: low budgets â€” keep it honest and human
    if (budget < minPrice) {
      lines.push(`Clean, verified units usually start around GHS ${minPrice.toLocaleString()}.`);
      lines.push("Would you like me to watch for a value-focused option in your range?");
      return {
        text: lines.join('\n'),
        aiImages: [],
        quickReplies: [
          { id: 'alert_yes', text: 'Yes, alert me', value: 'alert_me' },
          { id: 'alert_no', text: 'Not now', value: 'not_now' }
        ]
      };
    }
    if (picks.length > 0) {
      const top = picks[0];
      const isLuxury = categoryOf(top.brand, top.model) === 'Luxury' || profile === 'Executive' || type === 'Luxury';
      if (isLuxury) {
        lines.push(`${top.brand} ${top.model} - refined comfort with strong road presence.`);
      } else {
        lines.push(`${top.brand} ${top.model} - dependable daily companion with strong fuel savings.`);
      }
      lines.push("Widely supported in Ghana with easy maintenance and good parts access.");
      lines.push("Fully inspected, verified documents, transparent pricing.");
      lines.push("Fuel efficiency: strong. Resale: strong. Ghana roads: confident.");
      lines.push("Ownership profile: easy servicing support, widely available parts, stable resale value.");
      lines.push("This model maintains strong resale demand in Ghana.");
      if (profile === 'Business Use' || priority === 'Business Use') {
        lines.push("Business-ready performance with dependable uptime.");
      }
      if (['RAV4','CR-V','Corolla','RX 350'].includes(top.model)) {
        lines.push("This model is getting strong interest this week.");
      }
      if (locationHit === 'Accra') {
        lines.push("Available for viewing in East Legon.");
      } else if (locationHit === 'Outside Accra') {
        lines.push("We offer nationwide delivery across Ghana.");
      }
      if (unsure) {
        lines.push("Would you like a quick comparison with a close alternative?");
        quickReplies = [
          { id: 'comp_yes', text: 'Yes, compare', value: 'quick_comparison' },
          { id: 'comp_no', text: 'Not now', value: 'not_now' }
        ];
      } else if (wantsNarrow) {
        lines.push(`Based on what you've told me, my strongest recommendation is the ${top.brand} ${top.model}.`);
      } else {
        lines.push("Do you want photos or 1-2 more options?");
        quickReplies = [
          { id: 'show_photos', text: 'Show Cars', value: 'show_photos' },
          { id: 'more_opts', text: 'More Options', value: 'more_options' }
        ];
      }
      lines.push("Would you like to reserve a private viewing slot before it fills up?");
      if (!quickReplies) {
        quickReplies = [
          { id: 'reserve_yes', text: 'Reserve Viewing', value: 'reserve_viewing' },
          { id: 'reserve_no', text: 'Not now', value: 'not_now' }
        ];
      } else {
        quickReplies = [
          ...quickReplies,
          { id: 'reserve_yes', text: 'Reserve Viewing', value: 'reserve_viewing' }
        ];
      }
      return { text: lines.join('\n'), aiImages: imgs, quickReplies };
    } else {
      const lowest = CAR_DATABASE.slice().sort((a, b) => a.price - b.price).slice(0, 2);
      if (lowest.length) {
        lines.push(`Clean, verified cars typically start around GHS ${minPrice.toLocaleString()}.`);
        lines.push(`Closest strong value in our lineup: ${lowest[0].brand} ${lowest[0].model}.`);
        if (lowest[1]) lines.push(`Alternative: ${lowest[1].brand} ${lowest[1].model}.`);
        lines.push("Reasons to consider: low running costs, easy maintenance, proven reliability.");
        lines.push("If you like, I can help you stretch slightly for a better long-term value.");
        return {
          text: lines.join('\n'),
          aiImages: shouldAttachImages ? lowest.slice(0, 2).map(c => ((c as any).real_image || c.image_url)) : [],
          quickReplies: [
            { id: 'show_photos', text: 'Show Cars', value: 'show_photos' },
            { id: 'reserve_yes', text: 'Reserve Viewing', value: 'reserve_viewing' }
          ]
        };
      } else {
        lines.push("I can bring a strong value-focused option as soon as it lands.");
        lines.push(`Most verified units start around GHS ${minPrice.toLocaleString()}.`);
        lines.push("Should I alert you the moment one arrives?");
        return {
          text: lines.join('\n'),
          aiImages: [],
          quickReplies: [
            { id: 'alert_yes2', text: 'Yes, alert me', value: 'alert_me' },
            { id: 'alert_no2', text: 'Not now', value: 'not_now' }
          ]
        };
      }
    }
    return { text: lines.join('\n'), aiImages: imgs, quickReplies };
  }

  const scheduleFollowUp = () => {
    if (followUpTimerRef.current) {
      clearTimeout(followUpTimerRef.current);
      followUpTimerRef.current = null;
    }
    if (followUp24hRef.current) {
      clearTimeout(followUp24hRef.current);
      followUp24hRef.current = null;
    }
    if (followUp48hRef.current) {
      clearTimeout(followUp48hRef.current);
      followUp48hRef.current = null;
    }

    const tryNotify = async (title: string, body: string) => {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      try {
        const reg = await navigator.serviceWorker?.ready;
        if (reg?.showNotification) {
          reg.showNotification(title, {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png'
          });
          return;
        }
      } catch {}
      try {
        new Notification(title, { body });
      } catch {}
    };

    const triggerFollowUp = (kind: '24h' | '48h') => {
      const text =
        kind === '24h'
          ? 'The options you viewed are still available. Would you like to reserve one?'
          : 'Just checking in — want me to narrow this down to one best match?';
      const quickReplies = kind === '24h'
        ? [
            { id: 'fu24_reserve', text: 'Reserve Viewing', value: 'reserve_viewing' },
            { id: 'fu24_not', text: 'Not now', value: 'not_now' }
          ]
        : [
            { id: 'fu48_narrow', text: 'Narrow to 1', value: 'narrow_one' },
            { id: 'fu48_not', text: 'Not now', value: 'not_now' }
          ];
      const msg: Message = {
        id: (Date.now() + (kind === '24h' ? 3 : 4)).toString(),
        text,
        sender: 'ai',
        timestamp: new Date(),
        isProactive: true,
        quickReplies
      };
      setMessages(prev => [...prev, msg]);
      logService.addMessageToSession(msg);
      const title = kind === '24h' ? 'Drivemond Follow‑Up' : 'Drivemond Check‑In';
      tryNotify(title, text);
      try {
        localStorage.setItem(kind === '24h' ? NOTIF_24_SENT_KEY : NOTIF_48_SENT_KEY, '1');
      } catch {}
    };

    const now = Date.now();
    const due24 = now + 24 * 60 * 60 * 1000;
    const due48 = now + 48 * 60 * 60 * 1000;
    try {
      localStorage.setItem(NOTIF_24_DUE_KEY, String(due24));
      localStorage.setItem(NOTIF_48_DUE_KEY, String(due48));
      localStorage.setItem(NOTIF_24_SENT_KEY, '0');
      localStorage.setItem(NOTIF_48_SENT_KEY, '0');
    } catch {}
    followUpTimerRef.current = window.setTimeout(() => {
      const now = Date.now();
      if (now - lastUserActivityRef.current < 150000) return;
      if (now - lastAiActivityRef.current < 150000) return;
      const last = messages[messages.length - 1];
      if (last && (last.quickReplies?.length || last.bookingProposal || last.budgetSlider)) return;
      const followUpMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: "Still with me? I can compare these options for you.",
        sender: 'ai',
        timestamp: new Date(),
        isProactive: true,
        quickReplies: [
          { id: 'fu_compare', text: 'Compare Options', value: 'quick_comparison' },
          { id: 'fu_not', text: 'Not now', value: 'not_now' }
        ]
      };
      setMessages(prev => [...prev, followUpMsg]);
      logService.addMessageToSession(followUpMsg);
    }, 150000);

    followUp24hRef.current = window.setTimeout(() => {
      const t = Date.now();
      if (t - lastUserActivityRef.current < 24 * 60 * 60 * 1000) return;
      triggerFollowUp('24h');
    }, 24 * 60 * 60 * 1000);

    followUp48hRef.current = window.setTimeout(() => {
      const t = Date.now();
      if (t - lastUserActivityRef.current < 48 * 60 * 60 * 1000) return;
      triggerFollowUp('48h');
    }, 48 * 60 * 60 * 1000);
  };

  const typeOut = async (
    text: string,
    imgs?: string[],
    opts?: { showLocation?: boolean; quickReplies?: QuickReply[]; budgetSlider?: Message['budgetSlider'] }
  ) => {
    setIsTyping(true);
    const id = (Date.now() + Math.random()).toString();
    setMessages(prev => [...prev, { id, text: '', sender: 'ai', timestamp: new Date(), aiImages: imgs, showLocation: opts?.showLocation, budgetSlider: opts?.budgetSlider }]);
    await new Promise(r => setTimeout(r, 700));
    const words = text.split(' ');
    let current = '';
    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? '' : ' ') + words[i];
      setMessages(prev => prev.map(m => m.id === id ? { ...m, text: current } : m));
      let delay = 130 + Math.random() * 120 + words[i].length * 12;
      const w = words[i].toLowerCase();
      if (w.endsWith('.') || w.endsWith('?') || w.endsWith('!')) delay += 1200 + Math.random() * 700;
      else if (w.endsWith(',') || w.endsWith(';') || w.endsWith(':')) delay += 600 + Math.random() * 300;
      else if (w.length > 8) delay += 100 + Math.random() * 80;
      if (w.length < 3 && Math.random() > 0.7) delay = 50;
      await new Promise(r => setTimeout(r, delay));
    }
    setIsTyping(false);
    const finalMsg: Message = { id, text, sender: 'ai', timestamp: new Date(), aiImages: imgs, showLocation: opts?.showLocation, quickReplies: opts?.quickReplies, budgetSlider: opts?.budgetSlider };
    setMessages(prev => prev.map(m => m.id === id ? { ...m, quickReplies: opts?.quickReplies } : m));
    logService.addMessageToSession(finalMsg);
    lastAiActivityRef.current = Date.now();
    scheduleFollowUp();
  };

  const getLastBudget = (msgs: Message[]) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender !== 'user') continue;
      const b = parseBudget(msgs[i].text);
      if (b) return b;
    }
    return undefined;
  };

  const getLastType = (msgs: Message[]) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender !== 'user') continue;
      const t = parseType(msgs[i].text);
      if (t) return t;
    }
    return undefined;
  };

  const getLastProfile = (msgs: Message[]) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender !== 'user') continue;
      const p = parseBuyerProfile(msgs[i].text);
      if (p) return p;
    }
    return undefined;
  };

  const getLastPriority = (msgs: Message[]) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender !== 'user') continue;
      const p = parsePriority(msgs[i].text);
      if (p) return p;
    }
    return undefined;
  };

  const getLastFinancing = (msgs: Message[]) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender !== 'user') continue;
      const f = parseFinancing(msgs[i].text);
      if (f) return f;
    }
    return undefined;
  };

  const computeLeadScore = (msgs: Message[]) => {
    const userText = msgs.filter(m => m.sender === 'user').map(m => m.text).join(' ').toLowerCase();
    let score = 0;
    if (parseBuyerProfile(userText)) score += 10;
    if (parsePriority(userText)) score += 10;
    if (parseFinancing(userText)) score += 10;
    if (parseType(userText)) score += 10;
    if (parseBudget(userText)) score += 20;
    if (userText.includes('compare') || userText.includes(' vs ') || userText.includes('versus')) score += 10;
    if (userText.includes('test drive') || userText.includes('book') || userText.includes('viewing')) score += 25;
    if (userText.includes('today') || userText.includes('this week')) score += 10;
    return Math.min(100, score);
  };

  useEffect(() => {
    const score = computeLeadScore(messages);
    const hasBooking = messages.some(m => m.bookingProposal) || messages.some(m => m.text.toLowerCase().includes('booking confirmed'));
    let next: 'Browsing' | 'Interested' | 'Booking' = 'Browsing';
    if (showHandoff || hasBooking) next = 'Booking';
    else if (score >= 40 || messages.some(m => m.sender === 'user' && /budget|price|financing|test drive|viewing/i.test(m.text))) {
      next = 'Interested';
    }
    setStage(next);
  }, [messages, showHandoff]);

  const handleSendMessage = async (text: string, attachment?: Attachment) => {
    if (!text.trim() && !attachment) return;
    setIsAtBottom(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
      attachment,
      replyToId: replyingTo?.id,
      replyPreview: replyingTo ? replyingTo.text.slice(0, 140) : undefined,
      readReceipt: 'sent'
    };
    lastUserActivityRef.current = Date.now();
    try { localStorage.setItem(LAST_ACTIVITY_KEY, String(lastUserActivityRef.current)); } catch {}
    if (followUpTimerRef.current) {
      clearTimeout(followUpTimerRef.current);
      followUpTimerRef.current = null;
    }

    if (attachment?.type === 'image') {
      const url = attachment.url;
      if (url) {
        setChatBgUrl(url);
        try { localStorage.setItem('chat_bg_url', url); } catch {}
      }
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const currentMessages = [...messages];
    setMessages(prev => [...prev, userMessage]);
    logService.addMessageToSession(userMessage);
    track('message_sent', { text, hasAttachment: !!attachment });
    const scoringMessages = [...currentMessages, userMessage];
    const leadScore = computeLeadScore(scoringMessages);
    const leadTemp = leadScore >= 70 ? 'hot' : leadScore >= 40 ? 'warm' : 'cold';
    const lastScore = lastLeadScoreRef.current;
    const lastTemp = lastScore === null ? null : (lastScore >= 70 ? 'hot' : lastScore >= 40 ? 'warm' : 'cold');
    if (lastScore === null || Math.abs(leadScore - lastScore) >= 10 || lastTemp !== leadTemp) {
      logService.addLog({
        intent: 'lead_scoring',
        lead_temperature: leadTemp,
        lead_score: leadScore,
        messageText: `Lead score updated: ${leadScore}`
      });
      lastLeadScoreRef.current = leadScore;
    }
    const lowerUser = text.toLowerCase();
    if (lowerUser.includes('compare') || lowerUser.includes(' vs ') || lowerUser.includes('versus')) {
      logService.addLog({
        intent: 'compare_request',
        lead_temperature: 'warm',
        lead_score: leadScore,
        messageText: text
      });
    }
    if (lowerUser.includes('test drive')) {
      logService.addLog({
        intent: 'test_drive_request',
        lead_temperature: 'hot',
        lead_score: leadScore,
        messageText: text
      });
    }
    setIsLoading(true);
    setReplyingTo(null);
    setPresetText('');

    try {
      const answered = (() => {
        if (!openQuestion) return true;
        const t = text;
        
        if (openQuestion === 'purpose') {
          const purpose = parseBuyerProfile(t);
          if (purpose) {
            setSessionMemory(prev => ({ ...prev, purpose, askedQuestions: new Set([...prev.askedQuestions, 'purpose']) }));
            return true;
          }
          return false;
        }
        
        if (openQuestion === 'priority') {
          const priority = parsePriority(t);
          if (priority) {
            setSessionMemory(prev => ({ ...prev, priority, askedQuestions: new Set([...prev.askedQuestions, 'priority']) }));
            return true;
          }
          return false;
        }
        
        if (openQuestion === 'financing') {
          const financing = parseFinancing(t);
          if (financing) {
            setSessionMemory(prev => ({ ...prev, financing, askedQuestions: new Set([...prev.askedQuestions, 'financing']) }));
            return true;
          }
          return false;
        }
        
        if (openQuestion === 'budget') {
          const budget = parseBudget(t);
          if (budget) {
            setSessionMemory(prev => ({ ...prev, budget, askedQuestions: new Set([...prev.askedQuestions, 'budget']) }));
            return true;
          }
          return false;
        }
        
        if (openQuestion === 'type') {
          const carType = parseType(t);
          if (carType) {
            setSessionMemory(prev => ({ ...prev, carType, askedQuestions: new Set([...prev.askedQuestions, 'type']) }));
            return true;
          }
          return false;
        }
        
        return true;
      })();
      if (answered && openQuestion) setOpenQuestion(null);
      if (!answered) {
        let prompt = '';
        let qr: QuickReply[] | undefined;
        if (openQuestion === 'purpose') {
          prompt = 'What best describes your purpose?';
          qr = [
            { id: 'p_family', text: 'Family Use', value: 'Family Use' },
            { id: 'p_business', text: 'Business', value: 'Business Use' },
            { id: 'p_ride', text: 'Ride-hailing', value: 'Ride-Hailing' },
            { id: 'p_exec', text: 'Executive', value: 'Executive' },
            { id: 'p_personal', text: 'Personal Use', value: 'Personal Use' }
          ];
        } else if (openQuestion === 'priority') {
          prompt = 'What matters most to you?';
          qr = [
            { id: 'pr_fuel', text: 'Fuel Efficiency', value: 'Fuel Efficiency' },
            { id: 'pr_maint', text: 'Easy Maintenance', value: 'Easy Maintenance' },
            { id: 'pr_resale', text: 'Strong Resale Value', value: 'Strong Resale Value' },
            { id: 'pr_comfort', text: 'Comfort', value: 'Comfort' }
          ];
        } else if (openQuestion === 'financing') {
          prompt = 'Are you paying full or financing?';
          qr = [
            { id: 'pay_full', text: 'Paying Full', value: 'pay in full' },
            { id: 'pay_fin', text: 'Financing', value: 'financing' }
          ];
        } else if (openQuestion === 'budget') {
          prompt = "What's your comfortable budget range?";
          qr = [
            { id: 'b_under_100', text: 'Under GHS 100k', value: 'under_100k' },
            { id: 'b_150', text: 'GHS 150k', value: '150000' },
            { id: 'b_200', text: 'GHS 200k', value: '200000' },
            { id: 'b_250', text: 'GHS 250k', value: '250000' },
            { id: 'b_300_plus', text: 'GHS 300k & above', value: '300000+' }
          ];
        } else if (openQuestion === 'type') {
          prompt = 'Which type should I show — SUV, sedan, or pickup?';
          qr = [
            { id: 'type_suv', text: 'SUV', value: 'SUV' },
            { id: 'type_sedan', text: 'Sedan', value: 'Sedan' },
            { id: 'type_pickup', text: 'Pickup', value: 'Pickup' },
            { id: 'type_any', text: 'Any', value: 'any' }
          ];
        }
        await typeOut(prompt, undefined, { quickReplies: qr });
        setIsLoading(false);
        return;
      }
      let responseText = await sendChatMessage(currentMessages, text, attachment, leadInfo?.name, openQuestion || undefined as any, sessionMemory);
      const aiImages: string[] = [];
      let bookingProposal: { carId: string; carName: string } | undefined;
      let usedLocalDemo = false;

      // Log AI response for debugging
      console.log('[ChatArea] AI Response received:', {
        length: responseText.length,
        preview: responseText.substring(0, 100),
        hasImages: aiImages.length > 0
      });

      const processJsonAction = (data: any, originalText: string) => {
        if (data.action === 'send_car_images' || data.action === 'send_car_image' || data.recommended_car_id) {
          const carId = data.car_id || data.recommended_car_id;
          if (carId) {
            const car = CAR_DATABASE.find(c => c.id === String(carId));
            if (car) {
              const imgUrl = (car as any).real_image || car.image_url;
              if (!aiImages.includes(imgUrl)) aiImages.push(imgUrl);
            }
          }
        }
        if (data.action === 'propose_booking' && data.car_id) {
          const car = CAR_DATABASE.find(c => c.id === String(data.car_id));
          if (car) bookingProposal = { carId: car.id, carName: `${car.brand} ${car.model}` };
        }
        if (data.provider_used || data.fallback_used) {
          if (data.provider_used === 'local_demo' || data.fallback_used) {
            usedLocalDemo = true;
            setAiFallback(true);
            setTimeout(() => setAiFallback(false), 8000);
          }
          logService.addLog({
            intent: `provider:${data.provider_used || 'unknown'}`,
            lead_temperature: 'cold',
            messageText: originalText
          });
        }
        if (data.intent || data.lead_temperature) {
          logService.addLog({
            intent: data.intent || 'unknown',
            lead_temperature: data.lead_temperature || 'unknown',
            lead_score: typeof data.lead_score === 'number' ? data.lead_score : undefined,
            recommended_car_id: data.recommended_car_id,
            messageText: originalText
          });
          // Show sales handoff when lead is hot or intent is booking/negotiating
          if (data.lead_temperature === 'hot' || data.intent === 'booking' || data.intent === 'negotiating') {
            setShowHandoff(true);
          }
        }
      };

      const findAndStripJSON = (text: string) => {
        let clean = text;
        const orig = text;
        clean = clean.replace(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g, (_, json) => {
          try { processJsonAction(JSON.parse(json), orig); return ''; } catch { return _; }
        });
        const matches = clean.match(/\{[\s\S]*?\}/g);
        if (matches) matches.forEach(m => {
          try {
            const d = JSON.parse(m);
            if (d.intent || d.action || d.lead_temperature || d.recommended_car_id) {
              processJsonAction(d, orig);
              clean = clean.replace(m, '');
            }
          } catch {}
        });
        return clean.trim();
      };

      responseText = findAndStripJSON(responseText);

      const demoPhrase = responseText.toLowerCase().includes('abena here from drivemond');
      let localQuickReplies: QuickReply[] | undefined;
      if (usedLocalDemo || demoPhrase) {
        const name = leadInfo?.name;
        const shouldAddName = !!name && !nameGreeted;
        const lastBudget = getLastBudget(scoringMessages);
        const lastProfile = getLastProfile(scoringMessages);
        const lastPriority = getLastPriority(scoringMessages);
        const lastFinancing = getLastFinancing(scoringMessages);
        const lastType = getLastType(scoringMessages);
        const local = craftLocalReply(text, name, shouldAddName, lastBudget, lastProfile, lastPriority, lastFinancing, lastType);
        responseText = local.text;
        aiImages.splice(0, aiImages.length, ...local.aiImages);
        localQuickReplies = local.quickReplies;
      }
      if (!usedLocalDemo && !demoPhrase) {
        setAiFallback(false);
      }

      const allCarsKeywords = ['show me all', 'all cars', 'all the cars', 'full list', 'show all', 'list all', 'show your cars', 'what cars', 'your inventory', 'all models'];
      const askedForAll = allCarsKeywords.some(k => text.toLowerCase().includes(k));
      if (!askedForAll && aiImages.length > 2) {
        aiImages.splice(2);
      }

      setIsLoading(false);
      setIsTyping(true);

      const aiMsgId = (Date.now() + 1).toString();
      const locationKeywordsEarly = ['location', 'address', 'where are you', 'office', 'showroom', 'map', 'directions', 'find you', 'locate'];
      const isLocationQueryEarly = locationKeywordsEarly.some(k => text.toLowerCase().includes(k));

      const compareRequest = lowerUser.includes('compare') || lowerUser.includes(' vs ') || lowerUser.includes('versus');
      const compareCandidates = compareRequest ? findCarsInText(text) : [];
      const lastBudget = getLastBudget(scoringMessages);
      const lastType = getLastType(scoringMessages);
      const lastPriority = getLastPriority(scoringMessages);
      const fallbackPicks = compareRequest ? rankCars(selectCars(lastBudget, lastType), lastPriority) : [];
      const compareList = compareCandidates.length >= 2 ? compareCandidates : fallbackPicks;
      const compareCard = compareRequest && compareList.length >= 2
        ? { carId1: compareList[0].id, carId2: compareList[1].id }
        : undefined;

      const budgetPrompt = /budget|price range|how much|range/i.test(responseText.toLowerCase());
      // Only show budget slider once per session and if budget not already set
      const budgetSlider = (budgetPrompt && !budgetSliderShown && !sessionMemory.budget && !sessionMemory.askedQuestions.has('budget'))
        ? { min: 60000, max: 500000, step: 5000, unit: 'GHS' }
        : undefined;
      
      // Mark slider as shown if we're displaying it
      if (budgetSlider) {
        setBudgetSliderShown(true);
      }

      const scheduleWidget = bookingProposal
        ? { carId: bookingProposal.carId, carName: bookingProposal.carName }
        : undefined;

      const aiMsg: Message = {
        id: aiMsgId, text: '', sender: 'ai', timestamp: new Date(),
        aiImages: aiImages.length > 0 ? aiImages : undefined,
        bookingProposal,
        showLocation: isLocationQueryEarly,
        compareCard,
        budgetSlider,
        scheduleWidget
      };
      setMessages(prev => [...prev, aiMsg]);

      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

      const words = responseText.split(' ');
      let current = '';
      for (let i = 0; i < words.length; i++) {
        current += (i === 0 ? '' : ' ') + words[i];
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: current } : m));
        let delay = 130 + Math.random() * 120 + words[i].length * 12;
        const w = words[i].toLowerCase();
        if (w.endsWith('.') || w.endsWith('?') || w.endsWith('!')) delay += 1200 + Math.random() * 700;
        else if (w.endsWith(',') || w.endsWith(';') || w.endsWith(':')) delay += 600 + Math.random() * 300;
        else if (w.length > 8) delay += 100 + Math.random() * 80;
        if (w.length < 3 && Math.random() > 0.7) delay = 50;
        await new Promise(r => setTimeout(r, delay));
      }

      setIsTyping(false);

      const finalMsg: Message = {
        id: aiMsgId, text: responseText, sender: 'ai', timestamp: new Date(),
        aiImages: aiImages.length > 0 ? aiImages : undefined, bookingProposal,
        quickReplies: localQuickReplies,
        showLocation: isLocationQueryEarly,
        compareCard,
        budgetSlider,
        scheduleWidget
      };
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, quickReplies: localQuickReplies } : m));

      // Keep conversation human â€” no extra quick replies after the first choice

      logService.addMessageToSession(finalMsg);
      const qr = localQuickReplies || finalMsg.quickReplies;
      // Only set openQuestion if we're asking a NEW question (not if user just answered)
      // AND if we haven't already asked this question before
      if (!answered) {
        if (budgetSlider && !sessionMemory.askedQuestions.has('budget')) {
          setOpenQuestion('budget');
        } else if (qr && qr.length) {
          const ids = qr.map(q => q.id).join(' ');
          if (/(\bp_)/.test(ids) && !sessionMemory.askedQuestions.has('purpose')) setOpenQuestion('purpose');
          else if (/(\bpr_)/.test(ids) && !sessionMemory.askedQuestions.has('priority')) setOpenQuestion('priority');
          else if (/(\bpay_)/.test(ids) && !sessionMemory.askedQuestions.has('financing')) setOpenQuestion('financing');
          else if (/(\btype_)/.test(ids) && !sessionMemory.askedQuestions.has('type')) setOpenQuestion('type');
          else if (/(\bb_)/.test(ids) && !sessionMemory.askedQuestions.has('budget')) setOpenQuestion('budget');
        }
      }
      track('message_received', { length: finalMsg.text.length, images: (finalMsg.aiImages || []).length });
      lastAiActivityRef.current = Date.now();
      scheduleFollowUp();

      if (autoRead && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(responseText));
      }

      // Auto-open booking modal if proposed
      if (bookingProposal) {
        setTimeout(() => setBookingModal(bookingProposal!), 1000);
      }

    } catch (error) {
      setAiFallback(true);
      setTimeout(() => setAiFallback(false), 8000);
      const lower = text.toLowerCase();
      const wantsInventory = lower.includes('inventory') || lower.includes('show cars') || lower.includes('show') || lower.includes('cars');
      if (wantsInventory) {
        const imgs = CAR_DATABASE.map(c => (c as any).real_image || c.image_url);
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: "Network is acting up.\nSharing our current lineup now.\nPick what catches your eye 👀",
          sender: 'ai',
          timestamp: new Date(),
          aiImages: imgs
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const msg = error instanceof Error ? error.message : 'Please try again.';
        const is401 = /401/.test(String(msg));
        const helpful =
          is401
            ? "Authorization error (401).\nIf you added an API key, verify it’s valid and allowed for this site.\nQuick fix: clear any OPENROUTER_API_KEY/APIFREELLM_API_KEY from your browser storage, or add a valid key in .env as VITE_OPENROUTER_API_KEY or VITE_APIFREELLM_API_KEY.\nThen refresh and try again."
            : `Sorry, there was an error. ${msg}`;
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: helpful,
          sender: 'ai', timestamp: new Date()
        }]);
        setErrorToast(is401 ? 'Authorization error. Check API key.' : 'Something went wrong. Please try again.');
        setTimeout(() => setErrorToast(null), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReact = (id: string, emoji: string) => {
    setMessages(prev => prev.map(m => m.id === id
      ? { ...m, reactions: updateReactions(m.reactions || [], emoji) }
      : m));
  };

  function updateReactions(reactions: { emoji: string; count: number }[], emoji: string) {
    const idx = reactions.findIndex(r => r.emoji === emoji);
    if (idx >= 0) {
      const next = [...reactions];
      next[idx] = { emoji, count: next[idx].count + 1 };
      return next;
    }
    return [...reactions, { emoji, count: 1 }];
  }

  const handleReply = (id: string) => {
    const msg = messages.find(m => m.id === id) || null;
    setReplyingTo(msg);
  };

  const handleEdit = (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (!msg || msg.sender !== 'user') return;
    setPresetText(msg.text);
    setReplyingTo(null);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleDelete = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true, text: 'Message deleted' } : m));
  };

  const handleQuickReplySelect = async (value: string, text: string) => {
    setPresetText('');
    if (value === 'send_contact') {
      const nm = leadInfo?.name || 'a customer';
      const txt = encodeURIComponent(`Hi, I'm ${nm} and I'm interested in buying a car from Drivemond. Can you help me?`);
      window.open(`https://wa.me/233504512884?text=${txt}`, '_blank');
      return;
    }
    if (value === 'find_car') {
      setFlow({ stage: 'idle' });
      await typeOut(
        "Tell me your budget range and the type you want. I’ll suggest the best fit.",
        undefined,
        { budgetSlider: { min: 60000, max: 500000, step: 5000, unit: 'GHS' } }
      );
      return;
    }
    if (value === 'view_inventory') {
      const imgs = CAR_DATABASE.map(c => ((c as any).real_image || c.image_url));
      await typeOut('Here’s our current lineup. Which one catches your eye? 👀', imgs);
      return;
    }
    if (value === 'book_viewing') {
      setBookingModal({ carId: CAR_DATABASE[0].id, carName: `${CAR_DATABASE[0].brand} ${CAR_DATABASE[0].model}` });
      logService.addLog({
        intent: 'test_drive_click',
        lead_temperature: 'hot',
        messageText: 'Quick reply: book_viewing'
      });
      await typeOut(
        'Would you prefer a weekday or weekend viewing?',
        undefined,
        {
          quickReplies: [
            { id: 'view_weekday', text: 'Weekday', value: 'weekday' },
            { id: 'view_weekend', text: 'Weekend', value: 'weekend' }
          ]
        }
      );
      return;
    }
    if (value === 'reserve_viewing') {
      setBookingModal({ carId: CAR_DATABASE[0].id, carName: `${CAR_DATABASE[0].brand} ${CAR_DATABASE[0].model}` });
      await typeOut(
        'Would you prefer a weekday or weekend viewing?',
        undefined,
        {
          quickReplies: [
            { id: 'view_weekday2', text: 'Weekday', value: 'weekday' },
            { id: 'view_weekend2', text: 'Weekend', value: 'weekend' }
          ]
        }
      );
      return;
    }
    if (value === 'under_100k') {
      setSessionMemory(prev => ({ ...prev, budget: 100000, askedQuestions: new Set([...prev.askedQuestions, 'budget']) }));
      handleSendMessage('100000');
      return;
    }
    if (value === '150000') {
      setSessionMemory(prev => ({ ...prev, budget: 150000, askedQuestions: new Set([...prev.askedQuestions, 'budget']) }));
      handleSendMessage('150000');
      return;
    }
    if (value === '200000') {
      setSessionMemory(prev => ({ ...prev, budget: 200000, askedQuestions: new Set([...prev.askedQuestions, 'budget']) }));
      handleSendMessage('200000');
      return;
    }
    if (value === '250000') {
      setSessionMemory(prev => ({ ...prev, budget: 250000, askedQuestions: new Set([...prev.askedQuestions, 'budget']) }));
      handleSendMessage('250000');
      return;
    }
    if (value === '300000+') {
      setSessionMemory(prev => ({ ...prev, budget: 300000, askedQuestions: new Set([...prev.askedQuestions, 'budget']) }));
      handleSendMessage('300000');
      return;
    }
    if (value === 'location') {
      await typeOut('📍 East Legon, Accra.\nAsk me for directions or tap the map.', undefined, { showLocation: true });
      return;
    }
    if (value === 'directions' || value === 'send_pin') {
      await typeOut('📍 East Legon, Accra.\nHere is our location on the map.', undefined, { showLocation: true });
      return;
    }
    if (value === 'talk_sales') {
      await typeOut('Speak directly with our sales manager 📞 +233504512884 — quick and easy.');
      setShowHandoff(true);
      return;
    }
    if (value === 'help_decide') {
      await typeOut(
        "Happy to help. Which decision feels closest?",
        undefined,
        {
          quickReplies: [
            { id: 'hd_suv_sedan', text: 'Sedan vs SUV', value: 'Sedan vs SUV' },
            { id: 'hd_budget_comfort', text: 'Budget vs Comfort', value: 'Budget vs Comfort' },
            { id: 'hd_fuel_space', text: 'Fuel Savings vs Space', value: 'Fuel Savings vs Space' }
          ]
        }
      );
      return;
    }
    if (value === 'show_photos') {
      handleSendMessage('show photos');
      return;
    }
    if (value === 'more_options') {
      handleSendMessage('what else');
      return;
    }
    if (value === 'quick_comparison') {
      handleSendMessage('compare options');
      return;
    }
    if (value === 'save_option') {
      handleSendMessage('save this option');
      return;
    }
    if (value === 'alert_me') {
      handleSendMessage('alert me');
      return;
    }
    if (value === 'finance_yes') {
      handleSendMessage('finance_yes');
      return;
    }
    if (value === 'not_now') {
      handleSendMessage('not now');
      return;
    }
    if (value === 'weekday' || value === 'weekend') {
      handleSendMessage(value);
      return;
    }
    handleSendMessage(value);
  };

  return (
    <div className="flex flex-col w-full h-full bg-transparent relative overflow-hidden">
      {chatBgUrl && (
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: `url(${chatBgUrl})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Lead Capture Modal */}
      {showLeadModal && (
        <LeadCaptureModal onSubmit={handleLeadSubmit} />
      )}
      {showExpert && (
        <ExpertFormModal onClose={() => setShowExpert(false)} prefill={{ name: leadInfo?.name, phone: leadInfo?.phone }} />
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <BookingModal
          carId={bookingModal.carId}
          carName={bookingModal.carName}
          onConfirm={handleBookingConfirm}
          onClose={() => setBookingModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#202c33] border-b border-[#2f3b43] z-10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1771168493/eds_bjytks.png"
            alt="Abena"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[15px] font-semibold text-[#e9edef] leading-tight truncate">
                Abena
              </h2>
              {leadInfo?.name && (
                <span className="inline-block align-middle text-[10px] font-black text-[#E8E6E1] bg-[#2a2a2a] px-2 py-0.5 rounded-full border border-[#3a3a3a] truncate">
                  {leadInfo.name}
                </span>
              )}
            </div>
            <div className={cn("flex items-center gap-1.5 text-[11px] mt-0.5 truncate", isTyping ? "text-[#00a884] font-medium" : "text-[#8696a0]")}>
              {isTyping ? (
                <div className="flex items-center gap-1">
                  <span>typing</span>
                  <span className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              ) : (
                <>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${netOnline ? 'bg-[#00E676]' : 'bg-[#8696a0]'}`} />
                  {netOnline ? 'Online' : 'Offline'} · Drivemond Sales
                </>
              )}
            </div>
            <div className="mt-1">
              <div className="flex items-center gap-2 text-[9px] text-[#8696a0]">
                {(['Browsing', 'Interested', 'Booking'] as const).map((s, i) => (
                  <span key={s} className={s === stage ? 'text-[#00a884] font-bold' : ''}>{s}{i < 2 ? ' · ' : ''}</span>
                ))}
              </div>
              <div className="mt-1 h-1 rounded-full bg-[#1f2c34] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00a884] to-[#25D366]"
                  style={{ width: `${(stage === 'Browsing' ? 1 : stage === 'Interested' ? 2 : 3) / 3 * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 text-[#aebac1] flex-shrink-0">


          {/* Auto Read */}
          <button
            onClick={toggleAutoRead}
            title={autoRead ? "Disable Auto-read" : "Enable Auto-read"}
            className={cn("p-1 rounded-[6%] transition-colors", autoRead ? "text-[#00a884]" : "hover:bg-[#3b4a54]")}
          >
            {autoRead ? <Volume2 className="w-[18px] h-[18px]" /> : <VolumeX className="w-[18px] h-[18px]" />}
          </button>

          {/* Video icon removed */}

          {/* Phone button removed */}
          <button onClick={downloadTranscript} title="Download Transcript" className="hover:bg-[#3b4a54] p-1 rounded-[6%] transition-colors">
            <Download className="w-[16px] h-[16px]" />
          </button>
          <button onClick={exportTranscriptPDF} title="Export PDF" className="hover:bg-[#3b4a54] p-1 rounded-[6%] transition-colors">
            <FileText className="w-[16px] h-[16px]" />
          </button>
          <button onClick={finalizeSession} title="Email Transcript" className="hover:bg-[#3b4a54] p-1 rounded-[6%] transition-colors">
            <Share2 className="w-[16px] h-[16px]" />
          </button>

          {/* Clear */}
          <button onClick={clearChat} className="hover:bg-[#3b4a54] p-1 rounded-[6%] transition-colors">
            <MoreVertical className="w-[18px] h-[18px]" />
          </button>
          <button onClick={() => setShowExpert(true)} title="Ask Expert" className="hover:bg-[#3b4a54] p-1 rounded-[6%] transition-colors">
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>

          {/* Close */}
          {onClose && (
            <button onClick={onClose} className="hover:bg-[#3b4a54] p-1 rounded-[6%] transition-colors">
              <X className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </div>

      {/* Calling Overlay */}
      {isCalling && (
        <div className="absolute inset-0 z-50 bg-[#0b141a] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative mb-8">
            <img
              src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1771168493/eds_bjytks.png"
              alt="Abena"
              className="w-32 h-32 rounded-full object-cover border-4 border-[#00a884]"
            />
            <div className="absolute inset-0 rounded-full border-4 border-[#00a884] animate-ping opacity-20" />
          </div>
          <h2 className="text-2xl font-medium text-[#e9edef] mb-2">Abena</h2>
          <p className="text-[#8696a0] animate-pulse">Calling...</p>
          <button
            onClick={() => setIsCalling(false)}
            className="mt-12 w-16 h-16 bg-red-500 rounded-[6%] flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <Phone className="w-8 h-8 text-white rotate-[135deg] fill-current" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={() => {
          const el = messagesContainerRef.current;
          if (!el) return;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          setIsAtBottom(atBottom);
        }}
        className="flex-1 overflow-y-auto p-3 sm:p-4 z-10 min-h-0 custom-scroll"
      >
        {aiFallback && (
          <div className="mb-3 text-[11px] bg-[#2a3942] border border-[#3d4f5c] text-[#e9edef] px-3 py-2 rounded-lg">
            AI provider is offline. Running in local demo mode — responses may be limited.
          </div>
        )}
        {/* Error toast */}
        {errorToast && (
          <div className="fixed left-1/2 -translate-x-1/2 top-20 z-[1001] bg-[#202c33] border border-[#2f3b43] text-[#e9edef] text-xs px-3 py-2 rounded-full shadow-lg">
            {errorToast}
          </div>
        )}

        {/* Jump to latest */}
        {!isAtBottom && (
          <button
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
            className="fixed right-4 bottom-24 bg-[#1f2c34] text-[#e9edef] text-xs px-3 py-1.5 rounded-full border border-[#2f3b43] shadow hover:bg-[#2a3942] transition"
          >
            Jump to latest
          </button>
        )}

        <div className="flex flex-col space-y-1 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex justify-center my-4">
              <div className="bg-[#ffeecd] text-gray-700 text-xs px-4 py-2 rounded-lg shadow-sm text-center max-w-xs">
                Messages are end-to-end encrypted.
              </div>
            </div>
          )}
          {messages.length > 0 && (
            <div className="flex justify-center my-2">
              <button
                onClick={() => {
                  setMessages([]);
                  setShowHandoff(false);
                  setBookingModal(null);
                  setReplyingTo(null);
                }}
                className="text-[11px] px-3 py-1.5 rounded-full border border-[#2f3b43] text-[#aebac1] hover:bg-[#1f2c34] transition"
              >
                New chat
              </button>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onConfirmBooking={(carId, carName) => setBookingModal({ carId, carName })}
              onScheduleBooking={(carId, carName, date, time) => handleBookingConfirm(carId, carName, date, time)}
              onReact={handleReact}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQuickReplySelect={handleQuickReplySelect}
            />
          ))}

          {isLoading && (
            <div className="flex w-full mb-2 justify-start">
              <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-1.5">
                {[0, 150, 300].map(delay => (
                  <div key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sales Specialist Handoff â€” only shows after booking or strong purchase intent */}
      {showHandoff && (
        <div className="flex-shrink-0 px-3 py-2.5 bg-[#0d2b1f] border-t border-[#1a3a2a] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[#4ade80] text-[12px] font-bold leading-tight">🚗 Take the Next Step</p>
            <p className="text-[#8696a0] text-[10px] mt-0.5 leading-tight">Connect with a Sales Specialist to finalise details</p>
          </div>
          <a
            href="tel:+233504512884"
            className="flex-shrink-0 bg-[#0b141a] border-2 border-[#25D366] text-[#FFD700] hover:bg-[#25D366]/10 active:scale-95 text-[11px] font-black px-3 py-2 rounded-xl transition-all whitespace-nowrap shadow-md"
          >
            Speak to Sales →
          </a>
        </div>
      )}

      {/* Input */}
      <div className="z-10 flex-shrink-0">
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} replyingTo={replyingTo} onClearReply={() => setReplyingTo(null)} presetText={presetText} />
      </div>
      <style>{`
        .custom-scroll {
          scroll-behavior: smooth;
          scrollbar-gutter: stable;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #0b141a;
          border-radius: 8px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #2f3b43, #3d4f5c);
          border-radius: 8px;
          border: 2px solid #0b141a;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #3d4f5c, #4b6473);
        }
        .custom-scroll {
          scrollbar-width: thin;
          scrollbar-color: #3d4f5c #0b141a;
        }
        .typing-dots {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .typing-dots span {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #00a884;
          opacity: 0.4;
          animation: typingDot 1.2s infinite ease-in-out;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingDot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

