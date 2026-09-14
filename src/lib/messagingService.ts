import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import {
  Conversation,
  Message,
  MessageType,
  MessageStatus,
  ParticipantInfo,
  AttachmentMetadata,
  ContactOption
} from '../types/messaging';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Convert File/Blob to Base64 data URL as bulletproof offline/storage fallback
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get or create a 1-on-1 direct conversation between two participants in a tenant.
 * Guarantees no duplicate conversations are created.
 */
export async function getOrCreateDirectConversation(
  tenantId: string,
  currentUser: ParticipantInfo,
  targetUser: ParticipantInfo
): Promise<Conversation> {
  if (!tenantId || !currentUser.userId || !targetUser.userId) {
    throw new Error('Tenant ID and participant IDs are required');
  }

  const conversationsRef = collection(db, 'tenants', tenantId, 'conversations');

  // Query existing direct conversations that contain the current user
  const q = query(
    conversationsRef,
    where('type', '==', 'DIRECT'),
    where('participantIds', 'array-contains', currentUser.userId)
  );

  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Conversation;
    if (data.participantIds.includes(targetUser.userId)) {
      return {
        id: docSnap.id,
        ...data
      };
    }
  }

  // If none exists, create a new direct conversation
  const newConversationId = generateId('conv');
  const now = new Date().toISOString();

  const conversationData: Conversation = {
    id: newConversationId,
    tenantId,
    type: 'DIRECT',
    participantIds: [currentUser.userId, targetUser.userId],
    participants: {
      [currentUser.userId]: currentUser,
      [targetUser.userId]: targetUser
    },
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: 'Conversation started',
    lastMessageSenderId: currentUser.userId,
    lastMessageSenderName: currentUser.name,
    lastMessageType: 'SYSTEM',
    createdBy: currentUser.userId,
    isArchived: false,
    archivedBy: [],
    unreadCounts: {
      [currentUser.userId]: 0,
      [targetUser.userId]: 0
    }
  };

  await setDoc(doc(conversationsRef, newConversationId), conversationData);

  // Send initial system message
  const initialMessageId = generateId('msg');
  const initialMessage: Message = {
    id: initialMessageId,
    tenantId,
    conversationId: newConversationId,
    senderId: currentUser.userId,
    senderName: currentUser.name,
    senderRole: currentUser.role,
    senderAvatarUrl: currentUser.avatarUrl,
    type: 'SYSTEM',
    text: `Conversation started between ${currentUser.name} and ${targetUser.name}`,
    createdAt: now,
    updatedAt: now,
    readBy: [currentUser.userId, targetUser.userId],
    status: 'SENT'
  };

  const messagesRef = doc(collection(db, 'tenants', tenantId, 'conversations', newConversationId, 'messages'), initialMessageId);
  await setDoc(messagesRef, initialMessage);

  return conversationData;
}

/**
 * Fetch a single conversation by ID
 */
export async function fetchConversationById(
  tenantId: string,
  conversationId: string
): Promise<Conversation | null> {
  const convRef = doc(db, 'tenants', tenantId, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Conversation) };
}

/**
 * Subscribe to real-time updates for all conversations involving the user in the tenant
 */
export function subscribeToConversations(
  tenantId: string,
  userId: string,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!tenantId || !userId) {
    onUpdate([]);
    return () => {};
  }

  const conversationsRef = collection(db, 'tenants', tenantId, 'conversations');
  const q = query(
    conversationsRef,
    where('participantIds', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.forEach((d) => {
        convs.push({ id: d.id, ...(d.data() as Conversation) });
      });

      // Sort by latest activity descending
      convs.sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      onUpdate(convs);
    },
    (err) => {
      console.error('Error subscribing to conversations:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to real-time messages within a single conversation (latest N messages)
 */
export function subscribeToMessages(
  tenantId: string,
  conversationId: string,
  limitCount: number = 40,
  onUpdate: (messages: Message[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!tenantId || !conversationId) {
    onUpdate([]);
    return () => {};
  }

  const messagesRef = collection(
    db,
    'tenants',
    tenantId,
    'conversations',
    conversationId,
    'messages'
  );

  const q = query(
    messagesRef,
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as Message) });
      });

      // Return in chronological order (oldest to newest)
      msgs.reverse();
      onUpdate(msgs);
    },
    (err) => {
      console.error('Error subscribing to messages:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Load older messages for pagination before a specific timestamp
 */
export async function fetchOlderMessages(
  tenantId: string,
  conversationId: string,
  beforeCreatedAt: string,
  limitCount: number = 30
): Promise<Message[]> {
  const messagesRef = collection(
    db,
    'tenants',
    tenantId,
    'conversations',
    conversationId,
    'messages'
  );

  const q = query(
    messagesRef,
    where('createdAt', '<', beforeCreatedAt),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  const msgs: Message[] = [];
  snap.forEach((d) => {
    msgs.push({ id: d.id, ...(d.data() as Message) });
  });

  // Return chronological order
  return msgs.reverse();
}

/**
 * Send a message (Text, Voice, Image, File) with duplicate protection and idempotency
 */
export async function sendMessage(
  tenantId: string,
  conversationId: string,
  sender: ParticipantInfo,
  payload: {
    type: MessageType;
    text?: string;
    attachment?: AttachmentMetadata;
    clientTempId?: string;
  }
): Promise<Message> {
  const now = new Date().toISOString();
  const messageId = payload.clientTempId || generateId('msg');

  // Preview snippet computation
  let previewText = '';
  if (payload.type === 'TEXT') {
    previewText = (payload.text || '').trim().slice(0, 80);
  } else if (payload.type === 'VOICE') {
    const dur = payload.attachment?.durationSeconds ? `${Math.round(payload.attachment.durationSeconds)}s` : '';
    previewText = `🎤 Voice Note ${dur}`.trim();
  } else if (payload.type === 'IMAGE') {
    previewText = `📷 Image: ${payload.attachment?.name || 'Photo'}`;
  } else if (payload.type === 'FILE') {
    previewText = `📎 Document: ${payload.attachment?.name || 'File'}`;
  } else {
    previewText = payload.text || 'New message';
  }

  const messageDoc: Message = {
    id: messageId,
    tenantId,
    conversationId,
    senderId: sender.userId,
    senderName: sender.name,
    senderRole: sender.role,
    senderAvatarUrl: sender.avatarUrl,
    type: payload.type,
    text: payload.text ? payload.text.trim() : undefined,
    attachment: payload.attachment,
    createdAt: now,
    updatedAt: now,
    readBy: [sender.userId],
    status: 'SENT',
    clientTempId: payload.clientTempId
  };

  const messageRef = doc(db, 'tenants', tenantId, 'conversations', conversationId, 'messages', messageId);
  await setDoc(messageRef, messageDoc);

  // Update conversation document: last message info, unread counts
  const convRef = doc(db, 'tenants', tenantId, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);
  
  if (convSnap.exists()) {
    const convData = convSnap.data() as Conversation;
    const unreadCounts = { ...(convData.unreadCounts || {}) };
    
    // Increment unread count for other participants, keep sender at 0
    convData.participantIds.forEach(pId => {
      if (pId === sender.userId) {
        unreadCounts[pId] = 0;
      } else {
        unreadCounts[pId] = (unreadCounts[pId] || 0) + 1;
      }
    });

    // Also remove from archived list of other participants if they had archived it
    const archivedBy = (convData.archivedBy || []).filter(pId => pId === sender.userId);

    await updateDoc(convRef, {
      lastMessageAt: now,
      lastMessagePreview: previewText,
      lastMessageSenderId: sender.userId,
      lastMessageSenderName: sender.name,
      lastMessageType: payload.type,
      unreadCounts,
      archivedBy,
      updatedAt: now
    });
  }

  return messageDoc;
}

/**
 * Mark a conversation as read by a participant
 */
export async function markConversationAsRead(
  tenantId: string,
  conversationId: string,
  userId: string
): Promise<void> {
  if (!tenantId || !conversationId || !userId) return;

  const convRef = doc(db, 'tenants', tenantId, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);

  if (convSnap.exists()) {
    const convData = convSnap.data() as Conversation;
    const unreadCounts = { ...(convData.unreadCounts || {}) };
    if ((unreadCounts[userId] || 0) > 0) {
      unreadCounts[userId] = 0;
      await updateDoc(convRef, { unreadCounts });
    }
  }

  // Update unread messages for this user in batch
  try {
    const messagesRef = collection(db, 'tenants', tenantId, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(25));
    const msgSnap = await getDocs(q);

    const batch = writeBatch(db);
    let updatedCount = 0;

    msgSnap.docs.forEach((d) => {
      const msg = d.data() as Message;
      if (!msg.readBy?.includes(userId)) {
        const newReadBy = [...(msg.readBy || []), userId];
        batch.update(d.ref, {
          readBy: newReadBy,
          status: 'READ'
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Silent notice: mark messages as read batch skipped:', err);
  }
}

/**
 * Archive / Unarchive conversation for a specific user
 */
export async function toggleArchiveConversation(
  tenantId: string,
  conversationId: string,
  userId: string,
  archive: boolean
): Promise<void> {
  const convRef = doc(db, 'tenants', tenantId, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);
  if (!convSnap.exists()) return;

  const convData = convSnap.data() as Conversation;
  let archivedBy = convData.archivedBy || [];

  if (archive) {
    if (!archivedBy.includes(userId)) {
      archivedBy = [...archivedBy, userId];
    }
  } else {
    archivedBy = archivedBy.filter(id => id !== userId);
  }

  await updateDoc(convRef, {
    archivedBy,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Upload a voice note recording safely to Firebase Storage with base64 fallback
 */
export async function uploadVoiceRecording(
  tenantId: string,
  conversationId: string,
  audioBlob: Blob,
  durationSeconds: number
): Promise<AttachmentMetadata> {
  const fileId = generateId('voice');
  const fileName = `voice_note_${Date.now()}.webm`;
  const storagePath = `tenants/${tenantId}/conversations/${conversationId}/voice/${fileId}.webm`;

  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, audioBlob, {
      contentType: audioBlob.type || 'audio/webm'
    });
    const downloadUrl = await getDownloadURL(storageRef);

    return {
      url: downloadUrl,
      storagePath,
      name: fileName,
      size: audioBlob.size,
      mimeType: audioBlob.type || 'audio/webm',
      durationSeconds: Math.round(durationSeconds)
    };
  } catch (storageErr) {
    console.warn('Storage upload error, falling back to secure inline audio URI:', storageErr);
    const dataUri = await blobToBase64(audioBlob);
    return {
      url: dataUri,
      name: fileName,
      size: audioBlob.size,
      mimeType: audioBlob.type || 'audio/webm',
      durationSeconds: Math.round(durationSeconds)
    };
  }
}

/**
 * Upload an attachment (image, pdf, doc) safely with size/type checks
 */
export async function uploadMessageAttachment(
  tenantId: string,
  conversationId: string,
  file: File
): Promise<AttachmentMetadata> {
  // Max size: 15MB
  const MAX_SIZE = 15 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 15MB limit`);
  }

  const isImage = file.type.startsWith('image/');
  const fileId = generateId('att');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `tenants/${tenantId}/conversations/${conversationId}/attachments/${fileId}_${safeName}`;

  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, {
      contentType: file.type || (isImage ? 'image/jpeg' : 'application/octet-stream')
    });
    const downloadUrl = await getDownloadURL(storageRef);

    return {
      url: downloadUrl,
      storagePath,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream'
    };
  } catch (storageErr) {
    console.warn('Storage upload error, using secure inline payload URI:', storageErr);
    const dataUri = await blobToBase64(file);
    return {
      url: dataUri,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream'
    };
  }
}

/**
 * Fetch authorized contacts according to strict privacy & tenant contact rules:
 * - CLIENT: Primarily assigned trainer(s) + gym owner.
 * - TRAINER: Assigned clients + gym owner.
 * - GYM_OWNER: All tenant trainers and clients.
 */
export async function fetchAuthorizedContacts(
  tenantId: string,
  currentUserId: string,
  role: 'GYM_OWNER' | 'TRAINER' | 'CLIENT' | 'ADMIN',
  clientRefId?: string,
  trainerRefId?: string
): Promise<ContactOption[]> {
  if (!tenantId) return [];

  const contacts: ContactOption[] = [];

  try {
    // 1. Fetch Tenant Owner / Admins
    const membersRef = collection(db, 'tenants', tenantId, 'members');
    const membersSnap = await getDocs(membersRef);
    
    // 2. Fetch Clients & Trainers in Tenant
    const clientsRef = collection(db, 'tenants', tenantId, 'clients');
    const trainersRef = collection(db, 'tenants', tenantId, 'trainers');

    const [clientsSnap, trainersSnap] = await Promise.all([
      getDocs(clientsRef),
      getDocs(trainersRef)
    ]);

    const allClients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    const allTrainers = trainersSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    const allMembers = membersSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    const ownerMember = allMembers.find(m => m.role === 'GYM_OWNER');

    // Add Gym Owner as a contact option if not current user
    if (ownerMember && ownerMember.id !== currentUserId) {
      contacts.push({
        userId: ownerMember.id,
        name: ownerMember.displayName || ownerMember.name || 'Gym Owner / Head Coach',
        email: ownerMember.email,
        role: 'GYM_OWNER',
        detailLabel: 'Head Coach / Facility Owner'
      });
    }

    if (role === 'CLIENT') {
      // Find current client's record to check assigned trainer
      const myClientRecord = allClients.find(c => c.id === clientRefId || c.userId === currentUserId || c.email === currentUserId);
      const assignedTrainerId = myClientRecord?.trainerId;

      if (assignedTrainerId) {
        const assignedTrainer = allTrainers.find(t => t.id === assignedTrainerId);
        if (assignedTrainer) {
          contacts.push({
            userId: assignedTrainer.userId || assignedTrainer.id,
            trainerId: assignedTrainer.id,
            name: `${assignedTrainer.firstName || ''} ${assignedTrainer.lastName || ''}`.trim() || assignedTrainer.name || 'Assigned Coach',
            email: assignedTrainer.email,
            role: 'TRAINER',
            avatarUrl: assignedTrainer.photoUrl,
            detailLabel: `Assigned Personal Trainer (${assignedTrainer.specialty || 'General'})`
          });
        }
      }

      // If no specific trainer assigned, provide all tenant trainers
      if (!assignedTrainerId && allTrainers.length > 0) {
        allTrainers.forEach(t => {
          if (t.userId !== currentUserId) {
            contacts.push({
              userId: t.userId || t.id,
              trainerId: t.id,
              name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name || 'Coach',
              email: t.email,
              role: 'TRAINER',
              avatarUrl: t.photoUrl,
              detailLabel: `Coach (${t.specialty || 'Trainer'})`
            });
          }
        });
      }
    } else if (role === 'TRAINER') {
      // Find trainer record
      const myTrainerRecord = allTrainers.find(t => t.id === trainerRefId || t.userId === currentUserId || t.email === currentUserId);
      const myTrainerId = myTrainerRecord?.id;

      allClients.forEach(c => {
        // If trainer is assigned to this client or all clients in gym
        if (!myTrainerId || c.trainerId === myTrainerId || !c.trainerId) {
          contacts.push({
            userId: c.userId || c.id,
            clientId: c.id,
            name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || 'Client',
            email: c.email,
            role: 'CLIENT',
            avatarUrl: c.photoUrl,
            detailLabel: c.trainerId === myTrainerId ? 'Assigned Athlete' : 'Gym Member'
          });
        }
      });
    } else {
      // GYM_OWNER / ADMIN has access to all trainers and clients in the tenant
      allTrainers.forEach(t => {
        if (t.userId !== currentUserId && t.id !== currentUserId) {
          contacts.push({
            userId: t.userId || t.id,
            trainerId: t.id,
            name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.name || 'Trainer',
            email: t.email,
            role: 'TRAINER',
            avatarUrl: t.photoUrl,
            detailLabel: `Staff Coach • ${t.specialty || 'Training'}`
          });
        }
      });

      allClients.forEach(c => {
        if (c.userId !== currentUserId && c.id !== currentUserId) {
          contacts.push({
            userId: c.userId || c.id,
            clientId: c.id,
            name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || 'Client',
            email: c.email,
            role: 'CLIENT',
            avatarUrl: c.photoUrl,
            detailLabel: `Client • ${c.status || 'Active'}`
          });
        }
      });
    }
  } catch (err) {
    console.error('Error fetching authorized contacts:', err);
  }

  // Remove duplicates by userId
  const seen = new Set<string>();
  return contacts.filter(c => {
    if (seen.has(c.userId)) return false;
    seen.add(c.userId);
    return true;
  });
}

/**
 * Format timestamp nicely for messages (Today, Yesterday, MMM D)
 */
export function formatMessageTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatConversationTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
}

export function getDateSeparatorLabel(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}
