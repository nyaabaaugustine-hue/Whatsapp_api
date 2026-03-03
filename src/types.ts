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
  showLocation?: boolean;
  isProactive?: boolean;
  compareCard?: { carId1: string; carId2: string };
  depositCard?: { carName: string; depositAmount: number };
  replyToId?: string;
  replyPreview?: string;
  edited?: boolean;
  deleted?: boolean;
  reactions?: { emoji: string; count: number }[];
  readReceipt?: 'sent' | 'delivered' | 'read';
}
