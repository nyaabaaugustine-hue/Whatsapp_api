import { Search, MoreVertical, MessageSquare, CircleDashed } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <div className={cn("flex flex-col w-full h-full bg-[#0b141a] border-r border-[#2f3b43]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#202c33] border-b border-[#2f3b43]">
        <img
          src="https://picsum.photos/seed/user/100/100"
          alt="User"
          className="w-10 h-10 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="flex items-center space-x-4 text-[#aebac1]">
          <button className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors">
            <CircleDashed className="w-5 h-5" />
          </button>
          <button className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="hover:bg-[#3b4a54] p-2 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 bg-[#0b141a] border-b border-[#2f3b43]">
        <div className="flex items-center bg-[#2a3942] rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-[#8696a0] mr-3" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="bg-transparent border-none focus:outline-none w-full text-sm text-[#e9edef] placeholder-[#8696a0]"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center px-3 py-3 hover:bg-[#202c33] cursor-pointer transition-colors">
          <img
            src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1771168493/eds_bjytks.png"
            alt="Abena"
            className="w-12 h-12 rounded-full object-cover mr-3"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0 border-b border-[#2f3b43] pb-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-normal text-[#e9edef] truncate">Abena</h2>
              <span className="text-xs text-[#8696a0]">Just now</span>
            </div>
            <p className="text-sm text-[#aebac1] truncate">Hello! I am Abena, your AI Whatsapp assistant...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
