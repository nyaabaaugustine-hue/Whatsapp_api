interface SummaryCardProps {
  title: string;
  items: { label: string; value: string }[];
}

export function SummaryCard({ title, items }: SummaryCardProps) {
  return (
    <div className="bg-[#1a2730] rounded-lg p-4 mt-3 border border-[#2f3b43]">
      <h3 className="text-[#00a884] font-bold text-sm mb-3 flex items-center">
        <span className="mr-2">📋</span>
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-start">
            <span className="text-[#8696a0] text-xs font-medium">{item.label}:</span>
            <span className="text-[#e9edef] text-xs font-semibold text-right ml-2">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
