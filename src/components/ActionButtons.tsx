import { ActionButton } from '../types';
import { Calendar, Calculator, GitCompare, Phone, MapPin, ExternalLink } from 'lucide-react';

interface ActionButtonsProps {
  buttons: ActionButton[];
  onAction: (action: string, data?: any) => void;
}

export function ActionButtons({ buttons, onAction }: ActionButtonsProps) {
  const getIcon = (action: string) => {
    switch (action) {
      case 'book':
        return <Calendar className="w-4 h-4" />;
      case 'calculate':
        return <Calculator className="w-4 h-4" />;
      case 'compare':
        return <GitCompare className="w-4 h-4" />;
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      default:
        return <ExternalLink className="w-4 h-4" />;
    }
  };

  const getButtonStyle = (action: string) => {
    switch (action) {
      case 'book':
        return 'bg-[#00a884] hover:bg-[#00916f] text-white';
      case 'call':
        return 'bg-[#25D366] hover:bg-[#20bd5a] text-white';
      case 'location':
        return 'bg-[#1e3a8a] hover:bg-[#1e40af] text-white';
      default:
        return 'bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border border-[#2f3b43]';
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-3">
      {buttons.map((button) => (
        <button
          key={button.id}
          onClick={() => onAction(button.action, button.data)}
          className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all shadow-sm ${getButtonStyle(button.action)}`}
        >
          {getIcon(button.action)}
          <span>{button.text}</span>
        </button>
      ))}
    </div>
  );
}
