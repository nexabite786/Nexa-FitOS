import React, { useState } from 'react';
import { Search, Archive, MessageSquare, Plus, CheckCircle2, User, UserCheck } from 'lucide-react';
import { Conversation, ParticipantInfo } from '../../types/messaging';
import { formatConversationTime } from '../../lib/messagingService';
import { Button } from '../ui/button';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  currentUserId: string;
  onSelectConversation: (conversationId: string) => void;
  onNewMessage: () => void;
  onToggleArchive: (conversationId: string, isArchived: boolean) => void;
  loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  currentUserId,
  onSelectConversation,
  onNewMessage,
  onToggleArchive,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'ARCHIVED'>('ALL');

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const isArchivedByMe = (conv.archivedBy || []).includes(currentUserId);
    const unreadCount = conv.unreadCounts?.[currentUserId] || 0;

    // Filter tab condition
    if (activeFilter === 'ARCHIVED') {
      if (!isArchivedByMe) return false;
    } else {
      if (isArchivedByMe) return false;
      if (activeFilter === 'UNREAD' && unreadCount === 0) return false;
    }

    // Search query condition
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();

    // Check participant names
    const participantNames = Object.values(conv.participants || {})
      .map((p) => p.name.toLowerCase())
      .join(' ');

    const preview = (conv.lastMessagePreview || '').toLowerCase();
    const title = (conv.title || '').toLowerCase();

    return participantNames.includes(query) || preview.includes(query) || title.includes(query);
  });

  const getOtherParticipant = (conv: Conversation): ParticipantInfo | undefined => {
    const otherId = conv.participantIds.find((id) => id !== currentUserId);
    if (otherId && conv.participants?.[otherId]) {
      return conv.participants[otherId];
    }
    // Fallback if none found
    return Object.values(conv.participants || {})[0];
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'GYM_OWNER':
      case 'ADMIN':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">Owner</span>;
      case 'TRAINER':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider">Coach</span>;
      case 'CLIENT':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">Athlete</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/60 border-r border-zinc-800/80">
      {/* Top Header & New Message Trigger */}
      <div className="p-4 border-b border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-display font-bold text-zinc-100">Messages</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {conversations.length}
            </span>
          </div>
          <Button
            type="button"
            onClick={onNewMessage}
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs h-8 px-3 rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Chat</span>
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations, athletes, coaches..."
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('UNREAD')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeFilter === 'UNREAD'
                ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <span>Unread</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('ARCHIVED')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeFilter === 'ARCHIVED'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Archive className="w-3 h-3" />
            <span>Archived</span>
          </button>
        </div>
      </div>

      {/* Conversation List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-zinc-800/60 shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-800/60 rounded w-1/3"></div>
                  <div className="h-2.5 bg-zinc-800/40 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-3 min-h-[260px]">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <MessageSquare className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300">
                {activeFilter === 'ARCHIVED'
                  ? 'No archived conversations'
                  : activeFilter === 'UNREAD'
                  ? 'No unread messages'
                  : searchQuery
                  ? 'No conversations found'
                  : 'No conversations yet'}
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                {searchQuery
                  ? 'Try searching with another name or phrase.'
                  : 'Start direct communication with your athlete or coach.'}
              </p>
            </div>
            {!searchQuery && activeFilter === 'ALL' && (
              <Button
                size="sm"
                onClick={onNewMessage}
                className="mt-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs h-8"
              >
                Start a Conversation
              </Button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const other = getOtherParticipant(conv);
            const isSelected = conv.id === activeConversationId;
            const unreadCount = conv.unreadCounts?.[currentUserId] || 0;
            const isArchived = (conv.archivedBy || []).includes(currentUserId);

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative flex items-start gap-3 p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-l-2 border-amber-500'
                    : 'hover:bg-zinc-900/60'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {other?.avatarUrl ? (
                    <img
                      src={other.avatarUrl}
                      alt={other.name}
                      className="w-11 h-11 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-sm font-bold text-amber-400">
                      {other?.name ? other.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                  )}
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-bold truncate ${
                        unreadCount > 0 ? 'text-white' : 'text-zinc-200'
                      }`}>
                        {other?.name || 'Direct Message'}
                      </span>
                      {getRoleBadge(other?.role)}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {formatConversationTime(conv.lastMessageAt || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${
                      unreadCount > 0
                        ? 'font-medium text-zinc-100'
                        : 'text-zinc-400'
                    }`}>
                      {conv.lastMessageSenderId === currentUserId && (
                        <span className="text-zinc-500 mr-1 font-normal">You:</span>
                      )}
                      {conv.lastMessagePreview || 'New message'}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-zinc-950 font-bold font-mono text-[10px] flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}

                      {/* Quick Archive Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleArchive(conv.id, !isArchived);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-zinc-300 rounded transition-opacity"
                        title={isArchived ? 'Unarchive conversation' : 'Archive conversation'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
