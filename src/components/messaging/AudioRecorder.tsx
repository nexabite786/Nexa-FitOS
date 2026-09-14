import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface AudioRecorderProps {
  onSendVoiceNote: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
  onCancel: () => void;
  isSending?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
  isSending = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const MAX_RECORDING_SECONDS = 300; // 5 minutes

  // Start recording on mount
  useEffect(() => {
    startRecording();

    return () => {
      stopRecordingCleanup();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);
    setRecordedBlob(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported mimeType
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop all tracks to release mic hardware
        stream.getTracks().forEach((track) => track.stop());

        const blobType = recorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(audioChunksRef.current, { type: blobType });
        setRecordedBlob(finalBlob);

        const url = URL.createObjectURL(finalBlob);
        setPreviewUrl(url);
        setIsRecording(false);
      };

      recorder.start(200); // chunk every 200ms
      setIsRecording(true);

      // Start duration counter
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsedSecs);

        // Auto-stop when reaching max duration
        if (elapsedSecs >= MAX_RECORDING_SECONDS) {
          handleStop();
        }
      }, 500);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setError(err?.message || 'Could not access microphone. Please verify browser permissions.');
      setIsRecording(false);
    }
  };

  const handleStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePreviewPlay = () => {
    if (!previewUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(previewUrl);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        setPreviewTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewTime(0);
      };
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => {
        setIsPreviewPlaying(true);
      }).catch(() => {
        setIsPreviewPlaying(false);
      });
    }
  };

  const handleSend = async () => {
    if (!recordedBlob) return;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    await onSendVoiceNote(recordedBlob, recordingDuration || 1);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-950/30 border border-red-900/50 rounded-2xl text-xs text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-zinc-400 hover:text-white text-xs h-7">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-lg backdrop-blur-md animate-in fade-in duration-200">
      {isRecording ? (
        <>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute"></span>
              <span className="w-3 h-3 rounded-full bg-red-500 relative"></span>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm text-red-400 font-semibold">
              <Mic className="w-4 h-4" />
              <span>Recording {formatTime(recordingDuration)}</span>
              <span className="text-xs text-zinc-500 font-normal">/ 05:00 max</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-zinc-400 hover:text-red-400 h-9 px-3 text-xs"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStop}
              className="bg-red-500 hover:bg-red-600 text-white font-bold h-9 px-4 text-xs flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop & Review
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Review / Preview Audio */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="w-8 h-8 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center hover:bg-amber-400 shrink-0 shadow-sm"
              aria-label={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPreviewPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-200">Voice Note Preview</span>
              <span className="text-[11px] font-mono text-zinc-400">
                {formatTime(previewTime)} / {formatTime(recordingDuration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSending}
              className="text-zinc-400 hover:text-red-400 h-9 px-3 text-xs"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Discard
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={isSending || !recordedBlob}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold h-9 px-4 text-xs flex items-center gap-1.5"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Voice Note</span>
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
