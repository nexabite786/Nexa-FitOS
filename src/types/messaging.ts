export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type MessageStatus = 'SENDING' | 'SENT' | 'READ' | 'FAILED';

export interface ParticipantInfo {
  userId: string;
  name: string;
  role: 'GYM_OWNER' | 'TRAINER' | 'CLIENT' | 'ADMIN';
  avatarUrl?: string;
  email?: string;
  clientId?: string;
  trainerId?: string;
  title?: string;
}

export interface AttachmentMetadata {
  url: string;
  storagePath?: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface Conversation {
  id: string;
  tenantId: string;
  type: ConversationType;
  title?: string;
  participantIds: string[];
  participants: Record<string, ParticipantInfo>;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  lastMessageType?: MessageType;
  createdBy: string;
  isArchived?: boolean;
  archivedBy?: string[];
  unreadCounts?: Record<string, number>;
}

export interface Message {
  id: string;
  tenantId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'GYM_OWNER' | 'TRAINER' | 'CLIENT' | 'ADMIN';
  senderAvatarUrl?: string;
  type: MessageType;
  text?: string;
  attachment?: AttachmentMetadata;
  createdAt: string;
  updatedAt: string;
  readBy: string[];
  status: MessageStatus;
  clientTempId?: string;
}

export interface MessageNotificationPreferences {
  messagesEnabled: boolean;
  voiceNotesEnabled: boolean;
  emailNotificationsEnabled: boolean;
  soundEnabled: boolean;
}

export interface ContactOption {
  userId: string;
  name: string;
  email?: string;
  role: 'GYM_OWNER' | 'TRAINER' | 'CLIENT';
  avatarUrl?: string;
  clientId?: string;
  trainerId?: string;
  detailLabel?: string;
}
