import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase'

function requireFirebase(service, name) {
  if (!service) throw new Error(`${name} is not configured yet.`)
}

export function getConversationId(selectedId) {
  return `conversation-${selectedId}`
}

function messageCollection(conversationId) {
  requireFirebase(db, 'Cloud Firestore')
  return collection(db, 'conversations', conversationId, 'messages')
}

function toDate(createdAt, clientCreatedAt) {
  if (createdAt?.toDate) return createdAt.toDate()
  if (clientCreatedAt) return new Date(clientCreatedAt)
  return new Date()
}

function toUiMessage(messageDoc, currentUserId) {
  const data = messageDoc.data()
  const date = toDate(data.createdAt, data.clientCreatedAt)

  return {
    id: messageDoc.id,
    side: data.senderId === currentUserId ? 'out' : 'in',
    kind: data.kind || 'text',
    text: data.text || '',
    edited: Boolean(data.edited),
    fileName: data.fileName || '',
    fileSize: data.fileSize || 0,
    mimeType: data.mimeType || '',
    fileUrl: data.fileUrl || '',
    storagePath: data.storagePath || '',
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

async function touchConversation(conversationId, payload) {
  const conversationRef = doc(db, 'conversations', conversationId)
  await setDoc(
    conversationRef,
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function subscribeToMessages({ conversationId, currentUserId, onMessages, onError }) {
  const q = query(
    messageCollection(conversationId),
    orderBy('createdAt', 'desc'),
    limit(100),
  )

  return onSnapshot(
    q,
    snapshot => {
      const messages = snapshot.docs
        .map(messageDoc => toUiMessage(messageDoc, currentUserId))
        .reverse()

      onMessages(messages)
    },
    error => onError?.(error),
  )
}

export async function sendTextMessage({ conversationId, senderId, text }) {
  const cleanText = text.trim()
  if (!cleanText) return

  await addDoc(messageCollection(conversationId), {
    senderId,
    kind: 'text',
    text: cleanText,
    edited: false,
    editedAt: null,
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),
  })

  await touchConversation(conversationId, {
    lastMessage: cleanText,
    lastMessageKind: 'text',
    lastMessageAt: serverTimestamp(),
  })
}

function safeFileName(name = 'attachment') {
  return name.replace(/[\\/#?%*:|"<>]/g, '-')
}

export async function sendFileMessage({
  conversationId,
  senderId,
  file,
  kind = 'file',
}) {
  requireFirebase(storage, 'Cloud Storage')

  const messageRef = doc(messageCollection(conversationId))
  const fileName = safeFileName(file.name || `${kind}-${Date.now()}`)
  const storagePath = `chat/${conversationId}/${senderId}/${messageRef.id}/${fileName}`
  const fileRef = ref(storage, storagePath)

  await uploadBytes(fileRef, file, {
    contentType: file.type || 'application/octet-stream',
  })
  const fileUrl = await getDownloadURL(fileRef)

  await setDoc(messageRef, {
    senderId,
    kind,
    fileName,
    fileSize: file.size || 0,
    mimeType: file.type || '',
    fileUrl,
    storagePath,
    edited: false,
    createdAt: serverTimestamp(),
    clientCreatedAt: Date.now(),
  })

  await touchConversation(conversationId, {
    lastMessage: kind === 'audio' ? 'Voice message' : fileName,
    lastMessageKind: kind,
    lastMessageAt: serverTimestamp(),
  })
}

export async function editTextMessage({
  conversationId,
  messageId,
  senderId,
  text,
}) {
  const cleanText = text.trim()
  if (!cleanText) return

  const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId)
  await updateDoc(messageRef, {
    text: cleanText,
    edited: true,
    editedAt: serverTimestamp(),
  })

  await touchConversation(conversationId, {
    lastEditedBy: senderId,
  })
}
