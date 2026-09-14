import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { GoogleGenAI } from '@google/genai';
import { buildClientAIContext } from './src/server/aiContext';

// Initialize Firebase Admin
let firebaseInitialized = false;
try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    });
    firebaseInitialized = true;
  }
} catch (error) {
  console.warn('Firebase Admin failed to initialize (FIREBASE_SERVICE_ACCOUNT_JSON might be invalid or missing):', error);
}

const db = firebaseInitialized ? getFirestore() : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Razorpay Webhook
  app.post(
    '/api/billing/webhook',
    express.json(),
    async (req, res) => {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        return res.status(400).send('Razorpay webhook secret not configured.');
      }
      if (!db) {
        return res.status(500).send('Database not initialized.');
      }

      const signature = req.headers['x-razorpay-signature'];
      if (!signature) {
        return res.status(400).send('Missing signature');
      }

      try {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (expectedSignature !== signature) {
          return res.status(400).send('Invalid signature');
        }
      } catch (err: any) {
        console.error('Webhook Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      const event = req.body;
      
      try {
        // Record webhook event for idempotency
        const eventRef = db.collection('billingWebhookEvents').doc(event.id);
        const eventDoc = await eventRef.get();
        if (eventDoc.exists) {
           return res.json({ received: true, message: 'Already processed' });
        }
        
        await eventRef.set({
          eventId: event.id,
          eventType: event.event,
          receivedAt: new Date().toISOString(),
          status: 'PROCESSING'
        });

        // Handle subscription events
        if (event.event.startsWith('subscription.')) {
          const subscription = event.payload.subscription.entity;
          const subscriptionId = subscription.id;
          const notes = subscription.notes || {};
          const tenantId = notes.tenantId;

          if (tenantId) {
            let planId = 'free';
            if (subscription.plan_id === 'plan_essential') planId = 'essential';
            if (subscription.plan_id === 'plan_pro') planId = 'pro';
            if (subscription.plan_id === 'plan_elite') planId = 'elite';

            let mappedStatus = 'INACTIVE';
            switch (subscription.status) {
               case 'active': mappedStatus = 'ACTIVE'; break;
               case 'created': mappedStatus = 'INCOMPLETE'; break;
               case 'authenticated': mappedStatus = 'INCOMPLETE'; break;
               case 'pending': mappedStatus = 'INCOMPLETE'; break;
               case 'halted': mappedStatus = 'PAST_DUE'; break;
               case 'cancelled': mappedStatus = 'CANCELLED'; break;
               case 'completed': mappedStatus = 'EXPIRED'; break;
               case 'expired': mappedStatus = 'EXPIRED'; break;
               case 'paused': mappedStatus = 'PAUSED'; break;
            }

            await db.collection('tenants').doc(tenantId).collection('billing').doc('subscription').set({
              provider: 'razorpay',
              providerSubscriptionId: subscriptionId,
              providerCustomerId: subscription.customer_id,
              planId: planId,
              status: mappedStatus,
              currentPeriodStart: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
              currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end ? true : false,
              updatedAt: new Date().toISOString(),
              lastWebhookAt: new Date().toISOString()
            }, { merge: true });
          }
        }

        await eventRef.update({
          processedAt: new Date().toISOString(),
          status: 'COMPLETED'
        });
      } catch (err) {
        console.error('Error processing webhook:', err);
        return res.status(500).send('Webhook processing error');
      }

      res.json({ received: true });
    }
  );

  // Standard JSON body parser for other API routes
  app.use(express.json());

  async function checkAIEntitlement(tenantId: string, db: FirebaseFirestore.Firestore) {
    const tenantDoc = await db.collection('tenants').doc(tenantId).collection('billing').doc('subscription').get();
    if (!tenantDoc.exists) return false;
    const data = tenantDoc.data();
    if (!data) return false;
    const status = data.status;
    const planId = data.planId;
    if (status !== 'ACTIVE' && status !== 'TRIALING') return false;
    return planId === 'pro' || planId === 'elite';
  }

  // AI Chat Route
  app.post('/api/ai/chat', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'AI capabilities are currently unavailable.' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { tenantId, message, history } = req.body;
      const clientId = decodedToken.uid; // We assume the user requesting is the client

      if (!tenantId || !message) {
        return res.status(400).json({ error: 'Missing tenantId or message' });
      }
      
      if (!db) {
        return res.status(500).json({ error: 'Database uninitialized' });
      }

      const hasAI = await checkAIEntitlement(tenantId, db);
      if (!hasAI) {
         return res.status(403).json({ error: 'AI Coach is only available on Pro and Elite plans.' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      let contextStr = '';
      if (db) {
        contextStr = await buildClientAIContext(tenantId, clientId, db);
      }

      const systemInstruction = `You are NEXA AI Coach, a professional fitness and wellness assistant.
You have access to the user's logged data in NEXA FITOS (provided in the context block below).
ALWAYS USE THE CONTEXT TO ANSWER QUESTIONS ABOUT THE USER.
If the information is not in the context, explicitly say that you don't have that information.
IMPORTANT SAFETY RULES:
- Do not make medical diagnoses.
- Do not prescribe medication.
- If asked a high-risk medical question, recommend consulting a doctor.
- Do not silently change the user's workout program. Only offer recommendations.

CONTEXT BLOCK:
${contextStr}
`;

      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: { systemInstruction }
      });

      // Send the history if we had any
      // Since ai.chats doesn't take initial history easily in this SDK version without specific format,
      // We will just bundle history into the system instruction for this prototype, or format it into the prompt.
      let prompt = '';
      if (history && history.length > 0) {
         prompt += 'Previous conversation:\n';
         history.forEach((h: any) => {
           prompt += `${h.role}: ${h.parts[0].text}\n`;
         });
         prompt += '\nNew message from user: ';
      }
      prompt += message;

      const response = await chat.sendMessage({ message: prompt });

      // Track usage
      const period = new Date().toISOString().substring(0, 7); // YYYY-MM
      const usageRef = db.collection('tenants').doc(tenantId).collection('aiUsage').doc(period);
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(usageRef);
        if (!doc.exists) {
          transaction.set(usageRef, { messageCount: 1, updatedAt: new Date().toISOString() });
        } else {
          transaction.update(usageRef, {
            messageCount: (doc.data()?.messageCount || 0) + 1,
            updatedAt: new Date().toISOString()
          });
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // AI Insights Route
  app.post('/api/ai/insights', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'AI capabilities are currently unavailable.' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { tenantId } = req.body;
      const clientId = decodedToken.uid;

      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenantId' });
      }

      if (!db) {
        return res.status(500).json({ error: 'Database uninitialized' });
      }

      const hasAI = await checkAIEntitlement(tenantId, db);
      if (!hasAI) {
         return res.status(403).json({ error: 'AI Coach is only available on Pro and Elite plans.' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      let contextStr = '';
      if (db) {
        contextStr = await buildClientAIContext(tenantId, clientId, db);
      }

      const systemInstruction = `You are NEXA AI Coach, a professional fitness and wellness assistant.
Using the following user context, generate a short "Today's Guidance" insight block (maximum 3-4 sentences).
Highlight any positive trends or suggest a small focus for today.
Do not invent stats. Do not provide medical advice.

CONTEXT BLOCK:
${contextStr}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: 'Generate my daily insight.',
        config: { systemInstruction }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('AI Insights Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // API Route: Create Checkout Session (Razorpay Subscription)
  app.post('/api/billing/create-subscription', async (req, res) => {
    try {
      const { planId, tenantId } = req.body;
      
      const key_id = process.env.RAZORPAY_KEY_ID;
      const key_secret = process.env.RAZORPAY_KEY_SECRET;

      if (!key_id || !key_secret) {
        return res.status(400).json({ error: 'Razorpay is not configured on this server.' });
      }

      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      const instance = new Razorpay({
        key_id,
        key_secret
      });
      
      const subscription = await instance.subscriptions.create({
        plan_id: planId,
        total_count: 120, // max number of billing cycles (10 years)
        customer_notify: 1,
        notes: {
          tenantId: tenantId
        }
      });

      res.json({ 
        subscriptionId: subscription.id,
        key: key_id
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', firebase: firebaseInitialized });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
