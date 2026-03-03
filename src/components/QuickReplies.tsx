import { QuickReply } from '../types';

interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (value: string, text: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-1">
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => onSelect(reply.value, reply.text)}
          className="bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] px-2 py-1 rounded-[6%] text-xs font-medium transition-colors border border-[#25D366] shadow-sm"
        >
          {reply.text}
        </button>
      ))}
    </div>
  );
}
