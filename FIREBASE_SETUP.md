# Talk4Impact Chat v4 — Firebase setup

## What changed from v3

v3 was frontend-only. It used React state plus `BroadcastChannel`, so messages could mirror between browser tabs on the same device but were not stored on a real backend.

v4 keeps the same UI and adds:

- Firebase Authentication (Anonymous for prototype testing)
- Cloud Firestore for stored text messages and real-time updates
- Cloud Storage for photos, videos, files and voice notes
- Firestore edits that preserve the v3 `Edited` indicator
- A local BroadcastChannel fallback until Firebase environment variables are configured

## Files added

- `src/firebase.js`
- `src/services/chatService.js`
- `.env.example`
- `firestore.rules`
- `storage.rules`

## 1. Install packages

Run inside the project folder:

```bash
npm install
```

`package.json` now includes Firebase.

## 2. Create/register the Firebase web app

In Firebase Console:

1. Create/open a Firebase project.
2. In Project Overview, click the Web icon (`</>`).
3. Register the web app.
4. Copy the Firebase config values.

## 3. Create `.env.local`

Copy `.env.example` to `.env.local` and replace every placeholder with the values Firebase gives you.

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Restart Vite after changing `.env.local`.

## 4. Enable Authentication

Firebase Console → Authentication → Get started → Sign-in method → enable **Anonymous**.

This is only the v4 prototype identity. Later replace it with the real Talk4Impact authenticated user identity.

## 5. Create Firestore

Firebase Console → Firestore Database → Create database.

For this prototype, publish the contents of `firestore.rules` in Firestore → Rules.

Important: these rules are prototype rules. They require authentication and protect edits so only the sender can update their message, but they do not yet restrict conversation reading to actual conversation members.

## 6. Enable Storage

Firebase Console → Storage → Get started.

Publish `storage.rules` in Storage → Rules.

The upload path includes the Firebase UID:

```text
chat/{conversationId}/{senderUid}/{messageId}/{fileName}
```

The supplied Storage rule only lets that authenticated UID write to its own sender folder and caps uploaded files at 25 MB.

## 7. Start the app

```bash
npm run dev
```

## 8. Test true real-time messaging

Use two DIFFERENT browser identities, for example:

- normal Chrome
- Chrome Incognito

or two different devices.

Anonymous Firebase Auth is persisted in a browser profile. Two normal tabs in the same profile represent the same signed-in anonymous user.

Open the same conversation in both windows. Send a message in one. The other should receive it via Firestore `onSnapshot()` without refreshing.

## 9. See where the messages are stored

Firebase Console → Firestore Database → Data.

```text
conversations
  conversation-1
    lastMessage
    lastMessageAt
    updatedAt

    messages
      {messageId}
        senderId
        kind
        text
        edited
        editedAt
        createdAt
        clientCreatedAt
```

Attachments also store `fileName`, `fileSize`, `mimeType`, `fileUrl`, and `storagePath` in Firestore. The actual file bytes are in Firebase Storage.

## 10. Editing

Editing updates the same Firestore message document:

```text
text: "new text"
edited: true
editedAt: server timestamp
```

The existing v3 UI already checks `message.edited`, so `Edited` appears automatically after the real-time snapshot updates.

## Production step later

Before production, replace the prototype Firestore read rules with member-based rules and connect Firebase identity to the real Talk4Impact login instead of Anonymous Auth.
