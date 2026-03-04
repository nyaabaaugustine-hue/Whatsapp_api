import { QuickReply } from '../types';
import {
  Car,
  CarFront,
  Users,
  Briefcase,
  Crown,
  User,
  Fuel,
  Wrench,
  TrendingUp,
  Sofa,
  Banknote,
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
    if (t.includes('family')) return <Users className="w-3.5 h-3.5" />;
    if (t.includes('business')) return <Briefcase className="w-3.5 h-3.5" />;
    if (t.includes('daily')) return <Car className="w-3.5 h-3.5" />;
    if (t.includes('executive') || t.includes('luxury')) return <Crown className="w-3.5 h-3.5" />;
    if (t.includes('personal')) return <User className="w-3.5 h-3.5" />;
    if (t.includes('ride') || t.includes('uber') || t.includes('bolt')) return <CarFront className="w-3.5 h-3.5" />;
    if (t.includes('fuel')) return <Fuel className="w-3.5 h-3.5" />;
    if (t.includes('maintenance')) return <Wrench className="w-3.5 h-3.5" />;
    if (t.includes('resale')) return <TrendingUp className="w-3.5 h-3.5" />;
    if (t.includes('comfort') || t.includes('spacious')) return <Sofa className="w-3.5 h-3.5" />;
    if (t.includes('power')) return <Car className="w-3.5 h-3.5" />;
    if (t.includes('sedan')) return <Car className="w-3.5 h-3.5" />;
    if (t.includes('suv')) return <CarFront className="w-3.5 h-3.5" />;
    if (t.includes('pickup') || t.includes('truck')) return <Truck className="w-3.5 h-3.5" />;
    if (t.includes('recommend')) return <HelpCircle className="w-3.5 h-3.5" />;
    if (t.includes('book') || t.includes('reserve') || t.includes('viewing')) return <CalendarCheck className="w-3.5 h-3.5" />;
    if (t.includes('photo')) return <ImageIcon className="w-3.5 h-3.5" />;
    if (t.includes('sales') || t.includes('call')) return <PhoneCall className="w-3.5 h-3.5" />;
    if (t.includes('financing') || t.includes('finance')) return <CreditCard className="w-3.5 h-3.5" />;
    if (t.includes('paying full') || t.includes('cash')) return <Banknote className="w-3.5 h-3.5" />;
    if (t.includes('direction') || t.includes('pin')) return <MapPin className="w-3.5 h-3.5" />;
    if (t.includes('alert')) return <Bell className="w-3.5 h-3.5" />;
    if (t.includes('not now')) return <XCircle className="w-3.5 h-3.5" />;
    if (t.includes('ghs') || t.includes('under') || t.includes('budget')) return <Banknote className="w-3.5 h-3.5" />;
    return <HelpCircle className="w-3.5 h-3.5" />;
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-1">
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => onSelect(reply.value, reply.text)}
          className="inline-flex items-center gap-2 bg-[#0b141a] hover:bg-[#0f2d25] text-[#dff8f0] px-3 py-1.5 rounded-[6%] text-xs font-semibold transition-colors border border-[#25D366] shadow-sm scale-[1.5]"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-[#0b141a]">
            {iconFor(reply)}
          </span>
          {reply.text}
        </button>
      ))}
    </div>
  );
}
