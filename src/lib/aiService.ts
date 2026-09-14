import { auth } from './firebase';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export const aiService = {
  async sendMessage(tenantId: string, message: string, history: AIChatMessage[]): Promise<{ text: string, error?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const idToken = await user.getIdToken();

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          tenantId,
          message,
          history: history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      return { text: data.text };
    } catch (error: any) {
      console.error('Error calling AI service:', error);
      return { text: '', error: error.message || 'Failed to connect to NEXA AI' };
    }
  },
  
  async getInsights(tenantId: string): Promise<{ text: string, error?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const idToken = await user.getIdToken();

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          tenantId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      return { text: data.text };
    } catch (error: any) {
      console.error('Error fetching AI insights:', error);
      return { text: '', error: error.message || 'Failed to generate insights' };
    }
  }
};
