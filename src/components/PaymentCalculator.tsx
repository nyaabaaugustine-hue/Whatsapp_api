import { useState } from 'react';
import { X, Calculator } from 'lucide-react';

interface PaymentCalculatorProps {
  onClose: () => void;
  initialPrice?: number;
}

export function PaymentCalculator({ onClose, initialPrice }: PaymentCalculatorProps) {
  const [price, setPrice] = useState(initialPrice ? String(initialPrice) : '');
  const [deposit, setDeposit] = useState('20');
  const [months, setMonths] = useState('24');
  const [rate, setRate] = useState('18');

  const carPrice = parseFloat(price.replace(/,/g, '')) || 0;
  const depositPct = parseFloat(deposit) / 100;
  const depositAmt = carPrice * depositPct;
  const loanAmt = carPrice - depositAmt;
  const monthlyRate = parseFloat(rate) / 100 / 12;
  const n = parseInt(months);

  const monthly = monthlyRate > 0
    ? loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    : loanAmt / n;

  const fmt = (v: number) => v > 0
    ? `â‚µ${Math.round(v).toLocaleString('en-GH')}`
    : 'â€”';

  return (
    <div className="mx-2 my-1 bg-[#1f2c34] rounded-2xl overflow-hidden border border-[#2a3942] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#00a884]">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">Payment Calculator</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Price input */}
        <div>
          <label className="text-[#8696a0] text-xs mb-1.5 block">Car Price (â‚µ)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 85000"
            value={price}
            onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
          />
        </div>

        {/* Selects */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Deposit', val: deposit, set: setDeposit, opts: ['10','15','20','25','30','40','50'], suffix: '%' },
            { label: 'Duration', val: months, set: setMonths, opts: ['12','18','24','36','48','60'], suffix: 'mo' },
            { label: 'Rate', val: rate, set: setRate, opts: ['12','15','18','21','24'], suffix: '%' },
          ].map(({ label, val, set, opts, suffix }) => (
            <div key={label}>
              <label className="text-[#8696a0] text-xs mb-1.5 block">{label}</label>
              <select
                value={val}
                onChange={e => set(e.target.value)}
                className="w-full bg-[#2a3942] text-[#e9edef] rounded-xl px-2 py-2.5 text-xs outline-none"
              >
                {opts.map(o => <option key={o} value={o}>{o}{suffix}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Results */}
        {carPrice > 0 && (
          <div className="bg-[#0b141a] rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#8696a0]">Upfront Deposit ({deposit}%)</span>
              <span className="text-[#e9edef] font-semibold">{fmt(depositAmt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8696a0]">Loan Amount</span>
              <span className="text-[#e9edef] font-semibold">{fmt(loanAmt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8696a0]">Total Repayable</span>
              <span className="text-[#e9edef] font-semibold">{fmt(monthly * n)}</span>
            </div>
            <div className="border-t border-[#2a3942] pt-2 flex justify-between items-center">
              <span className="text-[#00a884] text-sm font-bold">Monthly Payment</span>
              <span className="text-[#00a884] text-base font-black">{fmt(monthly)}<span className="text-xs font-normal">/mo</span></span>
            </div>
          </div>
        )}

        <p className="text-[10px] text-[#8696a0] text-center leading-relaxed">
          *Estimates only. Contact us for actual financing rates.
        </p>
      </div>
    </div>
  );
}

