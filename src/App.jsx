import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, firebaseEnabled } from './firebase'
import {
  editTextMessage,
  getConversationId,
  sendFileMessage,
  sendTextMessage,
  subscribeToMessages,
} from './services/chatService'
import logo from './assets/talk4impact-logo.png'
import listAvatar from './assets/list-avatar.png'
import accountAvatar from './assets/account-avatar.png'
import tutorProfile from './assets/tutor-profile.png'

const conversationsSeed = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  name: 'Ahmed Mohamed',
  preview: 'No messages yet',
  time: '',
  unread: index === 1 || index === 4,
  hidden: index === 7,
}))

const navigation = [
  { label: 'Home', href: 'https://talk4impact.com/', className: 'active' },
  { label: 'Find Tutors', href: 'https://talk4impact.com/instructors' },
  { label: 'Conversations', href: 'https://talk4impact.com/sessions' },
  { label: 'Group sessions', href: '#group-sessions', className: 'accent-link' },
  { label: 'My Lessons', href: 'https://talk4impact.com/my-lessons/calendar' },
  { label: 'Blogs', href: '#blogs' },
]

function makeId(prefix = 'msg') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
  return Promise.resolve()
}

function useBlobUrl(blob) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!(blob instanceof Blob)) {
      setUrl('')
      return undefined
    }

    const nextUrl = URL.createObjectURL(blob)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [blob])

  return url
}

function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  const paths = {
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    messages: <><path d="M21 15a4 4 0 0 1-4 4H9l-5 3v-7a4 4 0 0 1-1-2.6V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8" /><path d="M8 13h5" /></>,
    close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    reply: <><path d="m9 17-5-5 5-5" /><path d="M4 12h9a7 7 0 0 1 7 7" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8" /><path d="M8 12h8" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 17v4" /></>,
    stop: <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" stroke="none" />,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4" /><path d="m8.6 13.5 6.8 4" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    check: <><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="9" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  }

  return <svg {...common}>{paths[name]}</svg>
}

function AnnouncementBar() {
  return (
    <div className="announcement">
      <span className="africa-mark">◆</span>
      <span>Talk 4 Impact stands with Orphans in Africa, </span>
      <a href="#join">Join Us</a>
    </div>
  )
}

function Header() {
  return (
    <header className="main-header">
      <div className="brand-wrap">
        <img src={logo} alt="Talk 4 Impact" className="brand-logo" />
      </div>
      <nav className="nav-links" aria-label="Primary navigation">
        {navigation.map(item => (
          <a key={item.label} href={item.href} className={item.className || ''}>{item.label}</a>
        ))}
      </nav>
      <div className="header-actions">
        <button className="icon-button" aria-label="Favorites"><Icon name="heart" size={22} /></button>
        <button className="icon-button" aria-label="Notifications"><Icon name="bell" size={22} /></button>
        <button className="icon-button" aria-label="Messages"><Icon name="messages" size={22} /></button>
        <div className="account-avatar" aria-label="Your profile">
          <img src={accountAvatar} alt="Your account" />
        </div>
      </div>
    </header>
  )
}

function ConversationSidebar({ activeTab, setActiveTab, selectedId, onSelectConversation, onOpenTutor }) {
  const filtered = useMemo(() => {
    if (activeTab === 'unread') return conversationsSeed.filter(item => item.unread)
    if (activeTab === 'hidden') return conversationsSeed.filter(item => item.hidden)
    return conversationsSeed
  }, [activeTab])

  return (
    <aside className="conversation-sidebar">
      <div className="sidebar-tabs">
        {['all', 'unread', 'hidden'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All' : tab}
          </button>
        ))}
      </div>

      <div className="conversation-list">
        {filtered.map(item => (
          <button
            className={selectedId === item.id ? 'conversation-row selected' : 'conversation-row'}
            key={item.id}
            onClick={() => onSelectConversation(item.id)}
          >
            <img
              src={listAvatar}
              alt={`${item.name} tutor`}
              className="conversation-avatar"
              onClick={(event) => {
                event.stopPropagation()
                onOpenTutor(item.id)
              }}
            />
            <span className="conversation-copy">
              <strong>{item.name}</strong>
              <span>{item.preview}</span>
            </span>
            <span className="conversation-time">{item.time}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

function ImageMessage({ message }) {
  const blobUrl = useBlobUrl(message.blob)
  const url = message.fileUrl || blobUrl
  if (!url) return <span>Image</span>

  return (
    <a href={url} target="_blank" rel="noreferrer" className="image-message-link" title="Open image">
      <img src={url} alt={message.fileName || 'Shared image'} className="chat-image" />
      {message.fileName && <span className="media-caption">{message.fileName}</span>}
    </a>
  )
}

function VideoMessage({ message }) {
  const blobUrl = useBlobUrl(message.blob)
  const url = message.fileUrl || blobUrl
  if (!url) return <span>Video</span>

  return (
    <div className="video-message">
      <video controls preload="metadata" src={url} />
      {message.fileName && <span className="media-caption">{message.fileName}</span>}
    </div>
  )
}

function FileMessage({ message }) {
  const blobUrl = useBlobUrl(message.blob)
  const url = message.fileUrl || blobUrl
  return (
    <a className="file-message" href={url || undefined} download={message.fileName || 'attachment'}>
      <span className="file-icon"><Icon name="file" size={21} /></span>
      <span className="file-meta">
        <strong>{message.fileName || 'Attachment'}</strong>
        <span>{formatFileSize(message.fileSize)}</span>
      </span>
      <Icon name="download" size={17} />
    </a>
  )
}

function AudioMessage({ message }) {
  const blobUrl = useBlobUrl(message.blob)
  const url = message.fileUrl || blobUrl
  return (
    <div className="audio-message">
      <span className="audio-mic"><Icon name="mic" size={18} /></span>
      {url ? <audio controls preload="metadata" src={url} /> : <span>Voice message</span>}
    </div>
  )
}

function MessageContent({ message }) {
  if (message.kind === 'image') return <ImageMessage message={message} />
  if (message.kind === 'video') return <VideoMessage message={message} />
  if (message.kind === 'file') return <FileMessage message={message} />
  if (message.kind === 'audio') return <AudioMessage message={message} />
  return <div className="message-text">{message.text}</div>
}

function MessageBubble({ message, onOpenTutor, onEdit }) {
  const incoming = message.side === 'in'
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.text || '')
  const [copied, setCopied] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    setEditValue(message.text || '')
  }, [message.text])

  useEffect(() => {
    if (!menuOpen) return undefined

    const close = event => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const handleCopy = async () => {
    if (message.kind !== 'text' || !message.text) return
    await copyText(message.text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1000)
  }

  const saveEdit = () => {
    const text = editValue.trim()
    if (!text) return
    onEdit(message.id, text)
    setEditing(false)
    setMenuOpen(false)
  }

  return (
    <div className={`message-line ${incoming ? 'incoming' : 'outgoing'}`}>
      {incoming && (
        <button className="message-avatar-button" onClick={onOpenTutor} aria-label="Open tutor profile">
          <img src={listAvatar} className="message-avatar" alt="Tutor" />
        </button>
      )}

      {!incoming && message.kind === 'text' && (
        <div className="message-actions left-actions" ref={menuRef}>
          <div className="message-menu-wrap">
            <button aria-label="Message options" onClick={() => setMenuOpen(current => !current)}><Icon name="more" size={15} /></button>
            {menuOpen && (
              <div className="message-menu" role="menu">
                <button type="button" onClick={handleCopy} role="menuitem">
                  <Icon name="copy" size={15} />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button type="button" onClick={() => { setEditing(true); setMenuOpen(false) }} role="menuitem">
                  <Icon name="edit" size={15} />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
          <button aria-label="Reply"><Icon name="reply" size={14} /></button>
        </div>
      )}

      <div className={`bubble ${incoming ? 'bubble-in' : 'bubble-out'} ${message.kind !== 'text' ? 'bubble-media' : ''}`}>
        {editing ? (
          <div className="edit-message-box">
            <textarea value={editValue} onChange={event => setEditValue(event.target.value)} autoFocus rows={2} />
            <div className="edit-actions">
              <button type="button" onClick={() => { setEditing(false); setEditValue(message.text || '') }}>Cancel</button>
              <button type="button" onClick={saveEdit}>Save</button>
            </div>
          </div>
        ) : (
          <>
            <MessageContent message={message} />
            {message.edited && message.kind === 'text' && (
              <div className="message-edited-label">Edited</div>
            )}
          </>
        )}
      </div>

      {incoming && (
        <div className="message-actions right-actions">
          <button aria-label="Reply"><Icon name="reply" size={14} /></button>
        </div>
      )}
    </div>
  )
}

function Composer({ value, onChange, onSend, onSendFiles, onSendAudio, syncNotice }) {
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingError, setRecordingError] = useState('')
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const menuRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const cancelledRef = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || recording) return

    const maxHeight = 132
    textarea.style.height = 'auto'
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [value, recording])

  useEffect(() => {
    if (!attachmentOpen) return undefined
    const close = event => {
      if (!menuRef.current?.contains(event.target)) setAttachmentOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [attachmentOpen])

  const onKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  const stopRecordingResources = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setRecording(false)
    setRecordingSeconds(0)
  }

  const startRecording = async () => {
    setRecordingError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Voice recording is not supported by this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      cancelledRef.current = false
      streamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = event => {
        if (event.data?.size) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        stopRecordingResources()
        if (!wasCancelled && blob.size) onSendAudio(blob)
      }

      recorder.start()
      setRecording(true)
      setRecordingSeconds(0)
      timerRef.current = window.setInterval(() => setRecordingSeconds(value => value + 1), 1000)
    } catch (error) {
      setRecordingError(error?.name === 'NotAllowedError' ? 'Microphone permission was not allowed.' : 'Could not start the microphone.')
      stopRecordingResources()
    }
  }

  const finishRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
  }

  const cancelRecording = () => {
    cancelledRef.current = true
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    else stopRecordingResources()
  }

  const handlePickedFiles = (event, forceKind) => {
    const files = Array.from(event.target.files || [])
    if (files.length) onSendFiles(files, forceKind)
    event.target.value = ''
    setAttachmentOpen(false)
  }

  return (
    <div className="composer-wrap">
      {(recordingError || syncNotice) && <div className="composer-notice">{recordingError || syncNotice}</div>}
      <div className={`composer-shell ${recording ? 'is-recording' : ''}`}>
        <div className="attachment-wrap" ref={menuRef}>
          <button className="composer-icon" aria-label="Attach" onClick={() => setAttachmentOpen(current => !current)} disabled={recording}>
            <Icon name="plus" size={20} />
          </button>
          {attachmentOpen && (
            <div className="attachment-menu">
              <button type="button" onClick={() => imageInputRef.current?.click()}>
                <span className="attachment-option-icon image-option"><Icon name="image" size={20} /></span>
                <span><strong>Photos & videos</strong><small>Send images from your device</small></span>
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                <span className="attachment-option-icon file-option"><Icon name="file" size={20} /></span>
                <span><strong>Document</strong><small>PDF, Word, Excel and more</small></span>
              </button>
            </div>
          )}
          <input ref={imageInputRef} className="hidden-file-input" type="file" accept="image/*,video/*" multiple onChange={event => handlePickedFiles(event, 'media')} />
          <input ref={fileInputRef} className="hidden-file-input" type="file" multiple onChange={event => handlePickedFiles(event, 'file')} />
        </div>

        {recording ? (
          <div className="recording-status">
            <span className="recording-dot" />
            <span>Recording</span>
            <strong>{formatDuration(recordingSeconds)}</strong>
            <button type="button" className="record-cancel" onClick={cancelRecording}>Cancel</button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={event => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Send message"
            rows={1}
            aria-label="Message"
          />
        )}

        <div className="composer-actions">
          <button
            className={`composer-icon ${recording ? 'recording-stop' : ''}`}
            aria-label={recording ? 'Stop and send voice message' : 'Record voice message'}
            onClick={recording ? finishRecording : startRecording}
          >
            <Icon name={recording ? 'stop' : 'mic'} size={19} />
          </button>
          {!recording && (
            <button className="composer-icon send-button" onClick={onSend} aria-label="Send message"><Icon name="send" size={19} /></button>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatPane({ messages, composer, setComposer, onSend, onSendFiles, onSendAudio, onOpenTutor, onEditMessage, syncNotice }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <main className="chat-pane">
      <div className={`message-scroll ${messages.length === 0 ? 'empty-message-scroll' : ''}`}>
        {messages.length === 0 ? (
          <div className="empty-conversation">
            <div className="empty-conversation-icon"><Icon name="messages" size={32} /></div>
            <p>No messages yet</p>
            <span>Send a message, photo, file, or voice note to start the conversation.</span>
          </div>
        ) : (
          <>
            <div className="day-label">Today</div>
            <div className="message-stack">
              {messages.map(message => (
                <MessageBubble key={message.id} message={message} onOpenTutor={onOpenTutor} onEdit={onEditMessage} />
              ))}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
      <div className="composer-area">
        <Composer
          value={composer}
          onChange={setComposer}
          onSend={onSend}
          onSendFiles={onSendFiles}
          onSendAudio={onSendAudio}
          syncNotice={syncNotice}
        />
      </div>
    </main>
  )
}

function ProfilePanel({ onClose }) {
  return (
    <aside className="profile-panel">
      <div className="profile-header">
        <h2>Thomas Details</h2>
        <button className="icon-button close-button" onClick={onClose} aria-label="Close details"><Icon name="close" size={22} /></button>
      </div>

      <div className="profile-photo-wrap">
        <img src={tutorProfile} alt="Tutor profile" className="profile-photo" />
        <div className="profile-photo-actions">
          <button aria-label="Favorite"><Icon name="heart" size={16} /></button>
          <button aria-label="Share"><Icon name="share" size={15} /></button>
        </div>
      </div>

      <div className="profile-name-row">
        <h3>Thomas M.</h3>
        <span className="verified"><Icon name="check" size={16} /></span>
      </div>

      <div className="badge-row">
        <span className="badge blue">English</span>
        <span className="badge green">Native Speaker</span>
      </div>

      <div className="profile-stats">
        <div><strong>5 <span className="star">★</span></strong><span>11 Review</span></div>
        <div><strong>30 SAR</strong><span>Per Session</span></div>
        <div><strong>135</strong><span>Sessions</span></div>
      </div>

      <div className="activity-line">
        <Icon name="users" size={14} />
        <span><strong>15</strong> Active Student, 135 Session</span>
      </div>

      <p className="profile-description">
        Lorem Ipsum Is Simply Dummy Text Of The Printing And Typesetting Industry. Lorem Ipsum Has Been
        <a href="#read-more"> Read More</a>
      </p>

      <div className="profile-cta">
        <button className="primary-cta">Book a Session</button>
        <button className="secondary-cta">View Schedule</button>
      </div>
    </aside>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedId, setSelectedId] = useState(1)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [messagesByConversation, setMessagesByConversation] = useState({})
  const [composer, setComposer] = useState('')
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [syncNotice, setSyncNotice] = useState('')
  const channelRef = useRef(null)
  const clientIdRef = useRef(`client-${Math.random().toString(36).slice(2)}`)

  const messages = messagesByConversation[selectedId] || []

  const addMessage = (conversationId, message) => {
    setMessagesByConversation(current => ({
      ...current,
      [conversationId]: [...(current[conversationId] || []), message],
    }))
  }

  useEffect(() => {
    if (!firebaseEnabled || !auth) return undefined

    let signingIn = false
    const unsubscribe = onAuthStateChanged(auth, user => {
      setFirebaseUser(user)

      if (!user && !signingIn) {
        signingIn = true
        signInAnonymously(auth)
          .catch(error => {
            console.error('Firebase anonymous sign-in failed:', error)
            setSyncNotice('Firebase Authentication is not ready. Enable Anonymous sign-in in Firebase Console.')
          })
          .finally(() => {
            signingIn = false
          })
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!firebaseEnabled || !firebaseUser || !selectedId) return undefined

    const conversationId = getConversationId(selectedId)
    setSyncNotice('')

    return subscribeToMessages({
      conversationId,
      currentUserId: firebaseUser.uid,
      onMessages: nextMessages => {
        setMessagesByConversation(current => ({
          ...current,
          [selectedId]: nextMessages,
        }))
      },
      onError: error => {
        console.error('Firestore listener failed:', error)
        setSyncNotice('Could not read Firestore. Check Firestore creation and Security Rules.')
      },
    })
  }, [firebaseUser, selectedId])

  useEffect(() => {
    if (firebaseEnabled || !('BroadcastChannel' in window)) return undefined

    const channel = new BroadcastChannel('talk4impact-chat-live-preview')
    channelRef.current = channel
    channel.onmessage = event => {
      const packet = event.data
      if (!packet || packet.clientId === clientIdRef.current) return

      if (packet.type === 'message') {
        const incomingMessage = { ...packet.message, side: 'in' }
        setMessagesByConversation(current => {
          const existing = current[packet.conversationId] || []
          if (existing.some(item => item.id === incomingMessage.id)) return current
          return { ...current, [packet.conversationId]: [...existing, incomingMessage] }
        })
      }

      if (packet.type === 'message-edit') {
        setMessagesByConversation(current => {
          const existing = current[packet.conversationId] || []
          return {
            ...current,
            [packet.conversationId]: existing.map(item => item.id === packet.messageId ? { ...item, text: packet.text, edited: true } : item),
          }
        })
      }
    }

    return () => channel.close()
  }, [])

  const sendPacket = message => {
    channelRef.current?.postMessage({
      type: 'message',
      conversationId: selectedId,
      message,
      clientId: clientIdRef.current,
    })
  }

  const sendMessage = async () => {
    const text = composer.trim()
    if (!text || !selectedId) return

    if (firebaseEnabled) {
      if (!firebaseUser) {
        setSyncNotice('Connecting to Firebase Authentication...')
        return
      }

      setComposer('')
      try {
        await sendTextMessage({
          conversationId: getConversationId(selectedId),
          senderId: firebaseUser.uid,
          text,
        })
        setSyncNotice('')
      } catch (error) {
        console.error('Sending Firebase message failed:', error)
        setComposer(text)
        setSyncNotice('Message was not sent. Check Firestore and its Security Rules.')
      }
      return
    }

    const message = {
      id: makeId(),
      side: 'out',
      kind: 'text',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    addMessage(selectedId, message)
    setComposer('')
    sendPacket(message)
  }

  const sendFiles = async (files, forceKind) => {
    if (!selectedId) return

    if (firebaseEnabled) {
      if (!firebaseUser) {
        setSyncNotice('Connecting to Firebase Authentication...')
        return
      }

      try {
        for (const file of files) {
          const imageLike = file.type.startsWith('image/')
          const videoLike = file.type.startsWith('video/')
          const kind = forceKind === 'media' && imageLike ? 'image' : forceKind === 'media' && videoLike ? 'video' : 'file'

          await sendFileMessage({
            conversationId: getConversationId(selectedId),
            senderId: firebaseUser.uid,
            file,
            kind,
          })
        }
        setSyncNotice('')
      } catch (error) {
        console.error('Firebase file upload failed:', error)
        setSyncNotice('Attachment was not uploaded. Cloud Storage must be enabled and its Rules published.')
      }
      return
    }

    files.forEach(file => {
      const imageLike = file.type.startsWith('image/')
      const videoLike = file.type.startsWith('video/')
      const kind = forceKind === 'media' && imageLike ? 'image' : forceKind === 'media' && videoLike ? 'video' : 'file'
      const message = {
        id: makeId('file'),
        side: 'out',
        kind,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        blob: file,
        videoLike,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      addMessage(selectedId, message)
      sendPacket(message)
    })
  }

  const sendAudio = async blob => {
    if (!selectedId) return

    if (firebaseEnabled) {
      if (!firebaseUser) {
        setSyncNotice('Connecting to Firebase Authentication...')
        return
      }

      try {
        const audioFile = new File(
          [blob],
          `voice-${Date.now()}.webm`,
          { type: blob.type || 'audio/webm' },
        )

        await sendFileMessage({
          conversationId: getConversationId(selectedId),
          senderId: firebaseUser.uid,
          file: audioFile,
          kind: 'audio',
        })
        setSyncNotice('')
      } catch (error) {
        console.error('Firebase voice upload failed:', error)
        setSyncNotice('Voice message was not uploaded. Check Cloud Storage.')
      }
      return
    }

    const message = {
      id: makeId('audio'),
      side: 'out',
      kind: 'audio',
      blob,
      mimeType: blob.type,
      fileSize: blob.size,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    addMessage(selectedId, message)
    sendPacket(message)
  }

  const editMessage = async (messageId, text) => {
    if (firebaseEnabled) {
      if (!firebaseUser) return

      try {
        await editTextMessage({
          conversationId: getConversationId(selectedId),
          messageId,
          senderId: firebaseUser.uid,
          text,
        })
        setSyncNotice('')
      } catch (error) {
        console.error('Firebase message edit failed:', error)
        setSyncNotice('Edit was not saved. Only the sender can edit this message.')
      }
      return
    }

    setMessagesByConversation(current => ({
      ...current,
      [selectedId]: (current[selectedId] || []).map(item => item.id === messageId ? { ...item, text, edited: true } : item),
    }))

    channelRef.current?.postMessage({
      type: 'message-edit',
      conversationId: selectedId,
      messageId,
      text,
      clientId: clientIdRef.current,
    })
  }

  const selectConversation = id => {
    setSelectedId(id)
    setDetailsOpen(false)
    setComposer('')
  }

  const openTutor = id => {
    if (id) setSelectedId(id)
    setDetailsOpen(true)
  }

  return (
    <div className="app-shell">
      <AnnouncementBar />
      <Header />
      <div className={`workspace ${detailsOpen ? 'details-open' : ''}`}>
        <ConversationSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedId={selectedId}
          onSelectConversation={selectConversation}
          onOpenTutor={openTutor}
        />
        <ChatPane
          messages={messages}
          composer={composer}
          setComposer={setComposer}
          onSend={sendMessage}
          onSendFiles={sendFiles}
          onSendAudio={sendAudio}
          onOpenTutor={() => openTutor(selectedId)}
          onEditMessage={editMessage}
          syncNotice={syncNotice}
        />
        {detailsOpen && <ProfilePanel onClose={() => setDetailsOpen(false)} />}
      </div>
    </div>
  )
}

export default App
