import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  User,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Download,
  FileText,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { Conversation, Message, ParticipantInfo, MessageType, AttachmentMetadata } from '../../types/messaging';
import {
  formatMessageTime,
  getDateSeparatorLabel,
  markConversationAsRead
} from '../../lib/messagingService';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { MessageComposer } from './MessageComposer';
import { Button } from '../ui/button';

interface ConversationDetailProps {
  tenantId: string;
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  currentUserRole: 'GYM_OWNER' | 'TRAINER' | 'CLIENT' | 'ADMIN';
  onBack?: () => void;
  onSendMessage: (payload: {
    type: MessageType;
    text?: string;
    attachment?: AttachmentMetadata;
    attachmentFile?: File;
  }) => Promise<void>;
  onSendVoiceNote: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
  onLoadOlderMessages: () => Promise<void>;
  hasMoreOlderMessages?: boolean;
  isLoadingOlder?: boolean;
  onToggleArchive: (archive: boolean) => void;
  isSending?: boolean;
  isOffline?: boolean;
  onRetryMessage?: (msg: Message) => void;
}

export const ConversationDetail: React.FC<ConversationDetailProps> = ({
  tenantId,
  conversation,
  messages,
  currentUserId,
  currentUserRole,
  onBack,
  onSendMessage,
  onSendVoiceNote,
  onLoadOlderMessages,
  hasMoreOlderMessages = false,
  isLoadingOlder = false,
  onToggleArchive,
  isSending = false,
  isOffline = false,
  onRetryMessage
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);

  // Identify recipient participant
  const otherParticipantId = conversation.participantIds.find((id) => id !== currentUserId);
  const otherParticipant: ParticipantInfo | undefined = otherParticipantId
    ? conversation.participants?.[otherParticipantId]
    : Object.values(conversation.participants || {})[0];

  const isArchived = (conversation.archivedBy || []).includes(currentUserId);

  // Mark as read whenever messages update or conversation is viewed
  useEffect(() => {
    if (tenantId && conversation.id && currentUserId) {
      markConversationAsRead(tenantId, conversation.id, currentUserId);
    }
  }, [tenantId, conversation.id, currentUserId, messages.length]);

  // Scroll management
  const checkIfNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 120;
    const isNear = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = isNear;
    if (isNear) {
      setShowNewMessageIndicator(false);
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      setShowNewMessageIndicator(false);
    }
  };

  // Initial scroll to bottom on mount or conversation change
  useEffect(() => {
    scrollToBottom(false);
  }, [conversation.id]);

  // Handle incoming messages scroll behavior
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMsg = messages[messages.length - 1];
      const isSentByMe = lastMsg?.senderId === currentUserId;

      if (isSentByMe || isNearBottomRef.current) {
        scrollToBottom(true);
      } else {
        setShowNewMessageIndicator(true);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUserId]);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'GYM_OWNER':
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">Gym Owner</span>;
      case 'TRAINER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider">Coach</span>;
      case 'CLIENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">Athlete</span>;
      default:
        return null;
    }
  };

  const renderDeliveryStatus = (msg: Message) => {
    if (msg.senderId !== currentUserId) return null;

    if (msg.status === 'FAILED') {
      return (
        <button
          onClick={() => onRetryMessage?.(msg)}
          className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300"
          title="Message failed to send. Click to retry."
        >
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="underline">Retry</span>
        </button>
      );
    }

    if (msg.status === 'SENDING') {
      return <Clock className="w-3 h-3 text-zinc-400 animate-spin" />;
    }

    // Check if recipient has read the message
    const isReadByRecipient = otherParticipantId && (msg.readBy || []).includes(otherParticipantId);

    if (isReadByRecipient || msg.status === 'READ') {
      return (
        <div title="Read" className="inline-flex">
          <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
        </div>
      );
    }

    return (
      <div title="Sent" className="inline-flex">
        <Check className="w-3 h-3 text-zinc-400" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
              aria-label="Back to messages list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Avatar */}
          <div className="relative shrink-0">
            {otherParticipant?.avatarUrl ? (
              <img
                src={otherParticipant.avatarUrl}
                alt={otherParticipant.name}
                className="w-10 h-10 rounded-full object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-sm font-bold text-amber-400">
                {otherParticipant?.name ? otherParticipant.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100 truncate">
                {otherParticipant?.name || 'Direct Conversation'}
              </h3>
              {getRoleBadge(otherParticipant?.role)}
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {otherParticipant?.email || 'NEXA FITOS Communication'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggleArchive(!isArchived)}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-8 px-2 text-xs"
            title={isArchived ? 'Unarchive conversation' : 'Archive conversation'}
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Unarchive</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Archive</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Offline Status Warning */}
      {isOffline && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>You're offline. Messages will send once your connection is restored.</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={checkIfNearBottom}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {/* Load older messages button */}
        {hasMoreOlderMessages && (
          <div className="flex justify-center py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadOlderMessages}
              disabled={isLoadingOlder}
              className="text-xs h-7 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              {isLoadingOlder ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                  Loading earlier messages...
                </>
              ) : (
                'Load earlier messages'
              )}
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-2 h-full min-h-[300px]">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
              <User className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-300">
              Direct communication with {otherParticipant?.name || 'coach'}
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm">
              Send a text message, voice note, workout query, or progress photo to get started.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSender = msg.senderId === currentUserId;
            const isSystem = msg.type === 'SYSTEM';

            // Check if date separator should appear
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const prevDateLabel = prevMsg ? getDateSeparatorLabel(prevMsg.createdAt) : '';
            const currentDateLabel = getDateSeparatorLabel(msg.createdAt);
            const showDateSeparator = !prevMsg || prevDateLabel !== currentDateLabel;

            return (
              <React.Fragment key={msg.id || index}>
                {/* Date Separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 tracking-wider shadow-sm">
                      {currentDateLabel}
                    </span>
                  </div>
                )}

                {/* System Message */}
                {isSystem ? (
                  <div className="flex justify-center my-2">
                    <span className="px-3 py-1 rounded-lg bg-zinc-900/70 border border-zinc-800/80 text-xs text-zinc-400 italic">
                      {msg.text}
                    </span>
                  </div>
                ) : (
                  /* Standard Message Bubble */
                  <div
                    className={`flex flex-col ${
                      isSender ? 'items-end' : 'items-start'
                    } space-y-1 animate-in fade-in duration-200`}
                  >
                    <div
                      className={`relative max-w-[85%] sm:max-w-md md:max-w-lg rounded-2xl p-3 shadow-sm ${
                        isSender
                          ? 'bg-amber-500/20 border border-amber-500/30 text-zinc-100 rounded-tr-sm'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-sm'
                      }`}
                    >
                      {/* Sender Name if not sender */}
                      {!isSender && (
                        <div className="text-[11px] font-bold text-zinc-400 mb-1">
                          {msg.senderName}
                        </div>
                      )}

                      {/* Content by Type */}
                      {msg.type === 'VOICE' && msg.attachment?.url && (
                        <VoiceNotePlayer
                          audioUrl={msg.attachment.url}
                          durationSeconds={msg.attachment.durationSeconds}
                          isSender={isSender}
                        />
                      )}

                      {msg.type === 'IMAGE' && msg.attachment?.url && (
                        <div className="space-y-2">
                          <img
                            src={msg.attachment.url}
                            alt={msg.attachment.name || 'Attachment'}
                            onClick={() => setSelectedImage(msg.attachment?.url || null)}
                            className="max-h-72 rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity border border-zinc-800"
                          />
                          {msg.text && (
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed pt-1">
                              {msg.text}
                            </p>
                          )}
                        </div>
                      )}

                      {msg.type === 'FILE' && msg.attachment && (
                        <div className="space-y-2">
                          <a
                            href={msg.attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={msg.attachment.name}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                          >
                            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-zinc-200 truncate">{msg.attachment.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                {(msg.attachment.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Download className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 shrink-0" />
                          </a>
                          {msg.text && (
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed pt-1">
                              {msg.text}
                            </p>
                          )}
                        </div>
                      )}

                      {msg.type === 'TEXT' && (
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.text}
                        </p>
                      )}

                      {/* Footer: Time + Read Receipts */}
                      <div className="flex items-center justify-end gap-1.5 mt-1 pt-0.5 text-[10px] font-mono text-zinc-400 opacity-80">
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {renderDeliveryStatus(msg)}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating "New Message" Indicator Pill */}
      {showNewMessageIndicator && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 transition-all z-20 animate-bounce"
        >
          <span>New message</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Message Composer */}
      <MessageComposer
        onSendMessage={onSendMessage}
        onSendVoiceNote={onSendVoiceNote}
        isSending={isSending}
        isOffline={isOffline}
        placeholder={`Message ${otherParticipant?.name || 'coach'}...`}
      />

      {/* Lightbox Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={selectedImage}
              alt="Expanded preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain border border-zinc-800 shadow-2xl"
            />
            <a
              href={selectedImage}
              target="_blank"
              rel="noopener noreferrer"
              download="image"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              <Download className="w-4 h-4" />
              <span>Download full image</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
