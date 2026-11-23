export type ChannelType = "client" | "internal";

export type ParticipantRole = "user" | "expert" | "admin" | "system";

export interface OrderConversation {
  id: string;
  orderId: string;
  channelType: ChannelType;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  unreadCount?: number;
}

export interface OrderMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isSystem: boolean;
  createdAt: string;
  readAt: string | null;
  emailNotifiedAt?: string | null;
  senderEmail?: string | null;
  senderRole?: ParticipantRole;
}

export interface SendMessagePayload {
  orderId: string;
  channelType: ChannelType;
  body: string;
}

export interface TypingIndicatorState {
  userId: string;
  userName: string;
  isTyping: boolean;
}
