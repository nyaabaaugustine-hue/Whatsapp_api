export interface Attachment {
  type: 'image' | 'audio';
  data: string;
  mimeType: string;
  url: string;
}

export interface QuickReply {
  id: string;
  text: string;
  value: string;
}

export interface ActionButton {
  id: string;
  text: string;
  icon?: string;
  action: 'book' | 'calculate' | 'compare' | 'call' | 'location' | 'custom';
  data?: any;
}

export interface CarComparison {
  carIds: string[];
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  attachment?: Attachment;
  aiImages?: string[];
  bookingProposal?: {
    carId: string;
    carName: string;
  };
  quickReplies?: QuickReply[];
  actionButtons?: ActionButton[];
  carComparison?: CarComparison;
  summaryCard?: {
    title: string;
    items: { label: string; value: string }[];
  };
}
