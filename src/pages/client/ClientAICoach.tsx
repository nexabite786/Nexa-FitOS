import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { aiService, AIChatMessage } from '../../lib/aiService';
import { Send, Bot, Sparkles, AlertCircle, Loader2, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useEntitlements } from '../../lib/entitlements';

export default function ClientAICoach() {
  const { tenantId } = useTenantStore();
  const { hasFeature } = useEntitlements();
  const hasAICoach = hasFeature('ai_coach');
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function loadInsights() {
      if (!tenantId || !hasAICoach) return;
      try {
        setInsightLoading(true);
        const res = await aiService.getInsights(tenantId);
        if (res.error) {
          setError(res.error);
        } else {
          setInsight(res.text);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load insights');
      } finally {
        setInsightLoading(false);
      }
    }
    loadInsights();
  }, [tenantId, hasAICoach]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !tenantId || isLoading || !hasAICoach) return;

    const newUserMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await aiService.sendMessage(tenantId, newUserMessage.text, messages);
      
      if (res.error) {
        setError(res.error);
        setIsLoading(false);
        return;
      }

      const newBotMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: res.text,
        timestamp: new Date().toISOString()
      };
      
      setMessages([...updatedMessages, newBotMessage]);
    } catch (err: any) {
      setError('An error occurred communicating with NEXA AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  if (!hasAICoach) {
    return (
      <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="bg-card border border-border/50 rounded-xl p-8 shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">AI Coach Locked</h2>
          <p className="text-muted-foreground text-sm mb-6">
            NEXA AI Coach is available on Pro and Elite plans. Please contact your gym owner to upgrade their subscription to access premium AI features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      
      <div className="flex-none">
        <h1 className="text-3xl font-bold tracking-tight mb-2">NEXA AI Coach</h1>
        <p className="text-muted-foreground">Your intelligent training companion. Powered by real data.</p>
      </div>

      {error && (
        <div className="flex-none bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">AI Service Unavailable</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Insight Card */}
      <div className="flex-none bg-card rounded-xl border border-border/50 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24 text-primary" />
        </div>
        <div className="relative z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            Today's Guidance
          </h2>
          {insightLoading ? (
             <div className="flex items-center gap-2 text-muted-foreground">
               <Loader2 className="w-4 h-4 animate-spin" />
               <p className="text-sm">Analyzing your recent data...</p>
             </div>
          ) : insight ? (
             <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
               <ReactMarkdown>{insight}</ReactMarkdown>
             </div>
          ) : (
            <p className="text-sm text-muted-foreground">No insights available right now.</p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 bg-card rounded-xl border border-border/50 shadow-sm flex flex-col overflow-hidden">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">Ask NEXA Anything</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  I can analyze your workouts, track your progress, explain exercises, or help you adjust your habits.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                <button onClick={() => handleSuggestedPrompt("How am I progressing?")} className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors">How am I progressing?</button>
                <button onClick={() => handleSuggestedPrompt("What should I focus on today?")} className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors">What should I focus on today?</button>
                <button onClick={() => handleSuggestedPrompt("Summarize my week.")} className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors">Summarize my week.</button>
                <button onClick={() => handleSuggestedPrompt("How consistent have I been?")} className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors">How consistent have I been?</button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {msg.role === 'model' && (
                    <div className="flex items-center gap-2 mb-2 text-primary text-xs font-semibold uppercase tracking-wider">
                      <Bot className="w-4 h-4" />
                      NEXA Coach
                    </div>
                  )}
                  <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'text-primary-foreground' : 'dark:prose-invert'}`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">NEXA is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-none p-4 bg-background/50 border-t border-border/50">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your workouts, progress, or habits..."
              className="w-full bg-background border border-border rounded-full pl-6 pr-14 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-3">
             <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">NEXA AI can make mistakes. Consider verifying important information.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
