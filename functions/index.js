const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { Expo }              = require('expo-server-sdk');

initializeApp();
const db   = getFirestore();
const expo = new Expo();

// ─── Trigger: status change → notify partner ──────────────────
exports.onStatusChange = onDocumentUpdated('users/{uid}', async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  if (before.status === after.status) return null;
  if (!after.coupleId) return null;

  // Get partner uid
  const coupleSnap = await db.doc(`couples/${after.coupleId}`).get();
  if (!coupleSnap.exists) return null;

  const { user1, user2 } = coupleSnap.data();
  const partnerUid = user1 === event.params.uid ? user2 : user1;

  const partnerSnap = await db.doc(`users/${partnerUid}`).get();
  if (!partnerSnap.exists) return null;

  const { expoPushToken, name: partnerName } = partnerSnap.data();
  if (!expoPushToken || !Expo.isExpoPushToken(expoPushToken)) return null;

  await expo.sendPushNotificationsAsync([{
    to:    expoPushToken,
    title: `${after.name || 'Your partner'} updated their status`,
    body:  after.status,
    data:  { type: 'status_change', uid: event.params.uid },
  }]);

  return null;
});

// ─── Trigger: heart sent → notify partner ─────────────────────
exports.onHeartSent = onDocumentUpdated('couples/{coupleId}', async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  // Only react when lastHeartSentBy changes
  if (before.lastHeartSentBy === after.lastHeartSentBy) return null;
  if (!after.lastHeartSentBy) return null;

  const senderUid  = after.lastHeartSentBy;
  const { user1, user2 } = after;
  const receiverUid = user1 === senderUid ? user2 : user1;

  const [senderSnap, receiverSnap] = await Promise.all([
    db.doc(`users/${senderUid}`).get(),
    db.doc(`users/${receiverUid}`).get(),
  ]);

  const senderName = senderSnap.data()?.name || 'Your partner';
  const { expoPushToken } = receiverSnap.data() || {};

  if (!expoPushToken || !Expo.isExpoPushToken(expoPushToken)) return null;

  const messages = [
    `${senderName} is thinking about you 💭`,
    `${senderName} sent you a heart 💕`,
    `${senderName} misses you right now 😊`,
  ];
  const body = messages[Math.floor(Math.random() * messages.length)];

  await expo.sendPushNotificationsAsync([{
    to:    expoPushToken,
    title: '💌 New message',
    body,
    data:  { type: 'heart', senderUid },
  }]);

  return null;
});
