import { Search, MoreVertical, MessageSquare, CircleDashed } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <div className={cn("flex flex-col w-full h-full bg-white border-r border-gray-200", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5]">
        <img
          src="https://picsum.photos/seed/user/100/100"
          alt="User"
          className="w-10 h-10 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="flex items-center space-x-4 text-gray-600">
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <CircleDashed className="w-5 h-5" />
          </button>
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="hover:bg-gray-200 p-2 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 bg-white border-b border-gray-200">
        <div className="flex items-center bg-[#f0f2f5] rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-gray-500 mr-3" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="bg-transparent border-none focus:outline-none w-full text-sm placeholder-gray-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center px-3 py-3 hover:bg-[#f5f6f6] cursor-pointer transition-colors">
          <img
            src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1771168493/eds_bjytks.png"
            alt="Abena"
            className="w-12 h-12 rounded-full object-cover mr-3"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0 border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-normal text-gray-900 truncate">Abena</h2>
              <span className="text-xs text-gray-500">Just now</span>
            </div>
            <p className="text-sm text-gray-500 truncate">Hello! I am Abena, your AI Whatsapp assistant...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
