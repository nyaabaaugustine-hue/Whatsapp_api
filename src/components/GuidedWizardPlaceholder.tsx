export default function GuidedWizardPlaceholder({ onBack }: { onBack?: () => void }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-2xl p-6">
          <div className="text-lg font-bold mb-2">Guided Wizard</div>
          <div className="text-sm text-[#aebac1] mb-4">Purpose → Budget → Type → Shortlist</div>
          <div className="grid gap-3">
            <div className="bg-[#0b141a] border border-[#2f3b43] rounded-xl px-4 py-3 text-sm">Step 1: Purpose</div>
            <div className="bg-[#0b141a] border border-[#2f3b43] rounded-xl px-4 py-3 text-sm">Step 2: Budget</div>
            <div className="bg-[#0b141a] border border-[#2f3b43] rounded-xl px-4 py-3 text-sm">Step 3: Type</div>
            <div className="bg-[#0b141a] border border-[#2f3b43] rounded-xl px-4 py-3 text-sm">Step 4: Shortlist</div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <button disabled className="px-4 py-2 rounded-lg bg-[#2a3942] text-white opacity-50 cursor-not-allowed">Continue</button>
            <button onClick={onBack} className="px-4 py-2 rounded-lg bg-[#2a3942] text-white">Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
