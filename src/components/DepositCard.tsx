import { Smartphone, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface DepositCardProps {
  carName: string;
  depositAmount: number;
  bookingId?: string;
}

export function DepositCard({ carName, depositAmount, bookingId }: DepositCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const accounts = [
    { name: 'MTN Mobile Money', number: '0541988383', icon: '🟡', label: 'MTN MoMo' },
    { name: 'Vodafone Cash', number: '0201988383', icon: '🔴', label: 'Voda Cash' },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-[#2f3b43] bg-[#111b21] mb-2 w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00a884]/20 to-[#005c4b]/20 px-3 py-3 border-b border-[#2f3b43]">
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="w-4 h-4 text-[#00a884]" />
          <span className="text-[#00a884] text-[12px] font-black">Secure Your {carName}</span>
        </div>
        <p className="text-[#8696a0] text-[10px]">Pay a deposit to reserve this vehicle today</p>
      </div>

      {/* Deposit amount */}
      <div className="px-3 py-3 border-b border-[#2f3b43] flex items-center justify-between">
        <div>
          <p className="text-[#8696a0] text-[10px] uppercase font-semibold">Deposit Amount</p>
          <p className="text-[#e9edef] text-[22px] font-black leading-tight">₵{depositAmount.toLocaleString()}</p>
          <p className="text-[#8696a0] text-[10px]">Refundable · Secures car for 48hrs</p>
        </div>
        {bookingId && (
          <div className="text-right">
            <p className="text-[#8696a0] text-[10px]">Booking ID</p>
            <p className="text-[#00a884] text-[11px] font-bold font-mono">{bookingId}</p>
          </div>
        )}
      </div>

      {/* Payment options */}
      <div className="p-2 space-y-2">
        {accounts.map((acc, i) => (
          <div key={i} className="bg-[#0b141a] rounded-xl px-3 py-2.5 flex items-center justify-between border border-[#2f3b43]">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{acc.icon}</span>
              <div>
                <p className="text-[#e9edef] text-[11px] font-bold">{acc.label}</p>
                <p className="text-[#8696a0] text-[11px] font-mono">{acc.number}</p>
              </div>
            </div>
            <button
              onClick={() => copy(acc.number, acc.label)}
              className="flex items-center gap-1 bg-[#2a3942] hover:bg-[#3d4f5c] text-[#8696a0] text-[10px] px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
            >
              {copied === acc.label
                ? <><Check className="w-3 h-3 text-[#00a884]" /><span className="text-[#00a884]">Copied!</span></>
                : <><Copy className="w-3 h-3" /><span>Copy</span></>
              }
            </button>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="px-3 pb-3">
        <p className="text-[#8696a0] text-[10px] leading-relaxed">
          After payment, send your screenshot to <span className="text-[#00a884] font-semibold">+233504512884</span> on WhatsApp with your Booking ID as reference.
        </p>
      </div>
    </div>
  );
}
