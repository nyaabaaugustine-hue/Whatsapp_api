import { QuickReply } from '../types';
import { cn } from '../lib/utils';
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
    if (t.includes('power')) return <span className="text-[12px]">⚡</span>;
    if (t.includes('sedan')) return <span className="text-[12px]">🚘</span>;
    if (t.includes('suv')) return <span className="text-[12px]">🚙</span>;
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

  const colorFor = (reply: QuickReply) => {
    const t = `${reply.text} ${reply.value}`.toLowerCase();
    // Vibrant color schemes for different categories
    if (t.includes('fuel')) return 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 border-green-400';
    if (t.includes('maintenance')) return 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-blue-400';
    if (t.includes('resale')) return 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 border-purple-400';
    if (t.includes('comfort')) return 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 border-orange-400';
    if (t.includes('power')) return 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 border-red-400';
    if (t.includes('paying full') || t.includes('cash')) return 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-700 hover:to-amber-600 border-yellow-400';
    if (t.includes('financing') || t.includes('finance')) return 'bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 border-indigo-400';
    // Default WhatsApp green
    return 'bg-[#0b141a] hover:bg-[#0f2d25] border-[#25D366]';
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => onSelect(reply.value, reply.text)}
          className={cn(
            "inline-flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 border shadow-md hover:shadow-lg transform hover:scale-105",
            colorFor(reply)
          )}
        >
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20">
            {iconFor(reply)}
          </span>
          {reply.text}
        </button>
      ))}
    </div>
  );
}
