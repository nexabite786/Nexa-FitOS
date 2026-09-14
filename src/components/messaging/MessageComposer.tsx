import React, { useState, useRef } from 'react';
import { Send, Paperclip, Image as ImageIcon, Mic, X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { AudioRecorder } from './AudioRecorder';
import { AttachmentMetadata, MessageType } from '../../types/messaging';

interface MessageComposerProps {
  onSendMessage: (payload: {
    type: MessageType;
    text?: string;
    attachment?: AttachmentMetadata;
    attachmentFile?: File;
  }) => Promise<void>;
  onSendVoiceNote: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
  isSending?: boolean;
  isOffline?: boolean;
  placeholder?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onSendVoiceNote,
  isSending = false,
  isOffline = false,
  placeholder = 'Type a message...'
}) => {
  const [text, setText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_CHAR_COUNT = 5000;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHAR_COUNT) {
      setText(val);
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter without Shift (Desktop experience)
    if (e.key === 'Enter' && !e.shiftKey) {
      // If mobile width (<768px), allow standard enter for newline unless button pressed
      if (window.innerWidth >= 768) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isImageOnly: boolean) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      setFileError('File size exceeds 15MB limit.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }

    // Reset input
    e.target.value = '';
  };

  const removeSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileError(null);
  };

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText && !selectedFile) return;
    if (isSending) return;

    try {
      if (selectedFile) {
        const isImage = selectedFile.type.startsWith('image/');
        await onSendMessage({
          type: isImage ? 'IMAGE' : 'FILE',
          text: trimmedText || undefined,
          attachmentFile: selectedFile
        });
        removeSelectedFile();
      } else {
        await onSendMessage({
          type: 'TEXT',
          text: trimmedText
        });
      }

      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    }
  };

  if (isRecordingVoice) {
    return (
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/90">
        <AudioRecorder
          onSendVoiceNote={async (blob, dur) => {
            await onSendVoiceNote(blob, dur);
            setIsRecordingVoice(false);
          }}
          onCancel={() => setIsRecordingVoice(false)}
          isSending={isSending}
        />
      </div>
    );
  }

  const charCount = text.length;
  const isNearLimit = charCount > MAX_CHAR_COUNT - 300;

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md p-3 sm:p-4 space-y-2">
      {/* File Validation Error Banner */}
      {fileError && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>{fileError}</span>
          </div>
          <button onClick={() => setFileError(null)} className="text-zinc-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected Attachment Preview Bar */}
      {selectedFile && (
        <div className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-800 rounded-xl animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            {filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt="Upload preview"
                className="w-12 h-12 object-cover rounded-lg border border-zinc-700 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate max-w-xs">{selectedFile.name}</p>
              <p className="text-[11px] text-zinc-400 font-mono">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={removeSelectedFile}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center shrink-0"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Composer Bar */}
      <div className="flex items-end gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1.5 sm:p-2 focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all">
        {/* Attachment Pickers */}
        <div className="flex items-center gap-1 pb-1">
          {/* Hidden Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e, true)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.csv"
            className="hidden"
            onChange={(e) => handleFileSelect(e, false)}
          />

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Attach Photo"
            aria-label="Attach Photo"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Attach Document"
            aria-label="Attach Document"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={isOffline ? 'You are offline. Typing draft...' : placeholder}
            rows={1}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 resize-none outline-none py-1.5 max-h-36 min-h-[36px]"
          />
          {isNearLimit && (
            <span className="absolute right-1 bottom-1 text-[10px] font-mono text-amber-400">
              {MAX_CHAR_COUNT - charCount}
            </span>
          )}
        </div>

        {/* Voice Note & Send Actions */}
        <div className="flex items-center gap-1 pb-1">
          {!text.trim() && !selectedFile ? (
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              className="w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-400 flex items-center justify-center transition-all"
              title="Record Voice Note"
              aria-label="Record Voice Note"
            >
              <Mic className="w-4 h-4" />
            </button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSending || (!text.trim() && !selectedFile)}
              className="w-9 h-9 p-0 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center justify-center shrink-0 shadow-sm"
              aria-label="Send message"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
