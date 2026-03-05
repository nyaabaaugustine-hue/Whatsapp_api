import { QuickReply } from '../types';
import {
  Crown,
  User,
  Wrench,
  TrendingUp,
  Sofa,
  CreditCard,
  Truck,
  HelpCircle,
  CalendarCheck,
  Image as ImageIcon,
  PhoneCall,
  MapPin,
  Bell,
  XCircle
} from 'lucide-react';

interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (value: string, text: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  const iconFor = (reply: QuickReply) => {
    const t = `${reply.text} ${reply.value}`.toLowerCase();
    if (t.includes('family')) return <span className="text-[13px]">👨‍👩‍👦‍👦</span>;
    if (t.includes('business')) return <span className="text-[12px]">💼</span>;
    if (t.includes('daily')) return <span className="text-[12px]">🚘</span>;
    if (t.includes('executive') || t.includes('luxury')) return <Crown className="w-4 h-4" />;
    if (t.includes('personal')) return <User className="w-4 h-4" />;
    if (t.includes('ride') || t.includes('uber') || t.includes('bolt')) return <span className="text-[12px]">🚘</span>;
    if (t.includes('fuel')) return <span className="text-[12px]">⛽</span>;
    if (t.includes('maintenance')) return <Wrench className="w-4 h-4" />;
    if (t.includes('resale')) return <TrendingUp className="w-4 h-4" />;
    if (t.includes('comfort') || t.includes('spacious')) return <Sofa className="w-4 h-4" />;
    if (t.includes('power')) return <span className="text-[12px]">🚘</span>;
    if (t.includes('sedan')) return <span className="text-[12px]">🚘</span>;
    if (t.includes('suv')) return <span className="text-[12px]">🚘</span>;
    if (t.includes('pickup') || t.includes('truck')) return <Truck className="w-4 h-4" />;
    if (t.includes('recommend')) return <HelpCircle className="w-4 h-4" />;
    if (t.includes('book') || t.includes('reserve') || t.includes('viewing')) return <CalendarCheck className="w-4 h-4" />;
    if (t.includes('show car') || t.includes('show cars')) return <span className="text-[12px]">🚘</span>;
    if (t.includes('photo')) return <ImageIcon className="w-4 h-4" />;
    if (t.includes('sales') || t.includes('call')) return <PhoneCall className="w-4 h-4" />;
    if (t.includes('financing') || t.includes('finance')) return <CreditCard className="w-4 h-4" />;
    if (t.includes('paying full') || t.includes('cash')) return <span className="text-[12px]">💰</span>;
    if (t.includes('direction') || t.includes('pin')) return <MapPin className="w-4 h-4" />;
    if (t.includes('alert')) return <Bell className="w-4 h-4" />;
    if (t.includes('not now')) return <XCircle className="w-4 h-4" />;
    if (t.includes('ghs') || t.includes('under') || t.includes('budget')) return <span className="text-[12px]">💰</span>;
    return <HelpCircle className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => onSelect(reply.value, reply.text)}
          className="inline-flex items-center gap-1.5 bg-[#0b141a] hover:bg-[#0f2d25] text-[#dff8f0] px-3 py-1 rounded-[6%] text-[12px] font-semibold transition-colors border border-[#25D366] shadow-sm"
        >
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#25D366] text-[#0b141a]">
            {iconFor(reply)}
          </span>
          {reply.text}
        </button>
      ))}
    </div>
  );
}
