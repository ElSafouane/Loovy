const { onDocumentUpdated, onDocumentDeleted, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { Expo }              = require('expo-server-sdk');

initializeApp();
const db   = getFirestore();
const expo = new Expo();

// ─── Helper: send a push notification safely ─────────────────
async function sendPush(token, title, body, data = {}) {
  if (!token || !Expo.isExpoPushToken(token)) return;
  try {
    const receipts = await expo.sendPushNotificationsAsync([{
      to:       token,
      title,
      body,
      data,
      priority: 'high',
      sound:    'default',
    }]);
    receipts.forEach(r => {
      if (r.status === 'error') {
        console.error('[Expo push] delivery error:', r.message, r.details);
      }
    });
  } catch (err) {
    console.error('[Expo push] send failed:', err.message);
  }
}

// ─── Trigger: status change → notify partner ─────────────────
exports.onStatusChange = onDocumentUpdated('users/{uid}', async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  if (before.status === after.status) return null;
  if (!after.coupleId) return null;

  const coupleSnap = await db.doc(`couples/${after.coupleId}`).get();
  if (!coupleSnap.exists) return null;

  const { user1, user2 } = coupleSnap.data();
  const partnerUid = user1 === event.params.uid ? user2 : user1;

  const partnerSnap = await db.doc(`users/${partnerUid}`).get();
  if (!partnerSnap.exists) return null;

  const { expoPushToken } = partnerSnap.data();
  const senderName = after.name || 'Your love';
  const newStatus  = after.status || '';

  const titles = [
    `💭 ${senderName} just updated their vibe`,
    `✨ ${senderName} has something to share`,
    `💕 A little update from ${senderName}`,
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];

  await sendPush(expoPushToken, title, newStatus, {
    type: 'status_change',
    uid:  event.params.uid,
  });

  return null;
});

// ─── Trigger: heart sent → notify partner ─────────────────────
exports.onHeartSent = onDocumentUpdated('couples/{coupleId}', async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  if (before.lastHeartSentBy === after.lastHeartSentBy) return null;
  if (!after.lastHeartSentBy) return null;
  if (after.breakupBy) return null; // skip during breakup

  const senderUid   = after.lastHeartSentBy;
  const { user1, user2 } = after;
  const receiverUid = user1 === senderUid ? user2 : user1;

  const [senderSnap, receiverSnap] = await Promise.all([
    db.doc(`users/${senderUid}`).get(),
    db.doc(`users/${receiverUid}`).get(),
  ]);

  const senderName = senderSnap.data()?.name || 'Your love';
  const { expoPushToken } = receiverSnap.data() || {};

  const messages = [
    { title: '💕 A heart just for you',    body: `${senderName} is thinking about you right now 🥹` },
    { title: '🌸 Guess who misses you?',   body: `${senderName} sent you all their love 💓` },
    { title: '💌 You have a love note',    body: `${senderName} is sending you warm hugs from afar 🤗` },
    { title: '✨ Someone special is here', body: `${senderName} just thought of you and smiled 😊` },
    { title: '🩷 A little love tap',       body: `${senderName} wants you to know you're on their mind 💭` },
  ];
  const pick = messages[Math.floor(Math.random() * messages.length)];

  await sendPush(expoPushToken, pick.title, pick.body, { type: 'heart', senderUid });

  return null;
});

// ─── Trigger: breakup initiated → notify partner ─────────────
// breakupCouple() sets breakupBy on the couple doc BEFORE deleting it.
exports.onBreakupInitiated = onDocumentUpdated('couples/{coupleId}', async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  if (before.breakupBy || !after.breakupBy) return null;

  const breakerUid  = after.breakupBy;
  const { user1, user2 } = after;
  const partnerUid  = user1 === breakerUid ? user2 : user1;

  const [breakerSnap, partnerSnap] = await Promise.all([
    db.doc(`users/${breakerUid}`).get(),
    db.doc(`users/${partnerUid}`).get(),
  ]);

  const breakerName = breakerSnap.data()?.name || 'Your partner';
  const { expoPushToken } = partnerSnap.data() || {};

  await sendPush(
    expoPushToken,
    '💔 Relationship ended',
    `${breakerName} has ended the relationship. Take care of yourself 🤍`,
    { type: 'breakup' },
  );

  return null;
});

// ─── Trigger: couple doc deleted → clear both users' coupleId ─
// This is the reliable way to disconnect the partner when a breakup happens.
// The Firestore rule isCoupleMembers() calls get() on the couple doc;
// once it's deleted, partners get permission-denied on their listeners
// instead of a clean deletion event. Writing coupleId:null to their own
// user doc (which they CAN always read) solves the race condition.
exports.onCoupleDeleted = onDocumentDeleted('couples/{coupleId}', async (event) => {
  const data = event.data?.data();
  if (!data) return null;

  const { user1, user2 } = data;
  await Promise.all([
    db.doc(`users/${user1}`).update({ coupleId: null }).catch(() => {}),
    db.doc(`users/${user2}`).update({ coupleId: null }).catch(() => {}),
  ]);

  return null;
});

// ─── Trigger: anniversary change proposed → notify partner ────
exports.onAnniversaryProposed = onDocumentUpdated('couples/{coupleId}', async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();

  if (before.pendingAnniversaryChange || !after.pendingAnniversaryChange) return null;

  const proposerUid = after.pendingAnniversaryChange.proposedBy;
  const { user1, user2 } = after;
  const partnerUid  = user1 === proposerUid ? user2 : user1;

  const [proposerSnap, partnerSnap] = await Promise.all([
    db.doc(`users/${proposerUid}`).get(),
    db.doc(`users/${partnerUid}`).get(),
  ]);

  const proposerName = proposerSnap.data()?.name || 'Your partner';
  const { expoPushToken } = partnerSnap.data() || {};

  const proposed = new Date(after.pendingAnniversaryChange.proposedDate);
  const dateStr  = proposed.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  await sendPush(
    expoPushToken,
    '📅 Anniversary date change request',
    `${proposerName} wants to update your anniversary to ${dateStr}. Open Settings to approve 💕`,
    { type: 'anniversary_proposal' },
  );

  return null;
});
