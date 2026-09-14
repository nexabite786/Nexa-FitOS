import React, { useState } from 'react';
import { Search, X, User, MessageSquare, AlertCircle } from 'lucide-react';
import { ContactOption } from '../../types/messaging';
import { Button } from '../ui/button';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: ContactOption[];
  onSelectContact: (contact: ContactOption) => Promise<void>;
  loading?: boolean;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onSelectContact,
  loading = false
}) => {
  const [search, setSearch] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.detailLabel || '').toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
    );
  });

  const handleContactClick = async (contact: ContactOption) => {
    try {
      setIsStarting(true);
      await onSelectContact(contact);
      onClose();
    } catch (err) {
      console.error('Error starting conversation:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'GYM_OWNER':
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">New Message</h3>
              <p className="text-xs text-zinc-400">Select an authorized coach or athlete</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800/80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or email..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
              autoFocus
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 p-2">
          {loading || isStarting ? (
            <div className="p-6 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">{isStarting ? 'Opening conversation...' : 'Loading contacts...'}</span>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No authorized contacts found</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                {search ? 'No matches found for your search term.' : 'No available contacts matching your permissions in this tenant.'}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.userId}
                onClick={() => handleContactClick(contact)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800/60 cursor-pointer transition-colors"
              >
                <div className="relative shrink-0">
                  {contact.avatarUrl ? (
                    <img
                      src={contact.avatarUrl}
                      alt={contact.name}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-sm font-bold text-amber-400">
                      {contact.name ? contact.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-zinc-100 truncate">{contact.name}</span>
                    {getRoleBadge(contact.role)}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {contact.detailLabel || contact.email || 'NEXA FITOS Member'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
