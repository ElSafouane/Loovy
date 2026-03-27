import {
  doc, setDoc, updateDoc, getDoc, deleteDoc,
  collection, query, where, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Readable 6-char code — avoids confusable chars (0/O, 1/I/L)
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

// ─── Generate & store an invite code for the current user ────
// Writes to inviteCodes/{code} so the generator can listen to it,
// AND caches the code on the user doc for cleanup later.
export const createInviteCode = async (uid) => {
  const code = generateCode();

  // Primary store — inviteCodes collection (User A listens here)
  await setDoc(doc(db, 'inviteCodes', code), {
    createdBy:  uid,
    createdAt:  serverTimestamp(),
  });

  // Cache on user doc for display / cleanup reference
  await updateDoc(doc(db, 'users', uid), { inviteCode: code });

  return code;
};

// ─── Join a couple using a partner's invite code ─────────────
// Architecture note: we intentionally never write to the partner's user doc
// because Firestore rules only allow a user to write their own doc.
// Instead we update the inviteCodes/{code} doc with { joinerUid, coupleId }.
// The code generator is listening to that doc and will write coupleId to
// their own user doc when they see the update.
export const joinCouple = async (myUid, rawCode) => {
  const code = rawCode.trim().toUpperCase();

  // 1. Look up the invite code in the dedicated collection
  const codeSnap = await getDoc(doc(db, 'inviteCodes', code));

  if (!codeSnap.exists())
    throw new Error('No account found with that code.\nAsk your partner to share their code from the app.');

  const { createdBy: partnerId } = codeSnap.data();

  if (partnerId === myUid)
    throw new Error("That's your own code — share it with your partner instead.");

  // 2. Verify partner exists and isn't already paired
  const partnerSnap = await getDoc(doc(db, 'users', partnerId));
  if (!partnerSnap.exists())
    throw new Error('Partner account not found. Try asking them to regenerate their code.');

  const partnerData = partnerSnap.data();
  if (partnerData.coupleId)
    throw new Error('This code is no longer valid. Your partner is already paired.');

  // 3. Deterministic coupleId so both sides produce the same string
  const ids      = [myUid, partnerId].sort();
  const coupleId = `${ids[0]}_${ids[1]}`;

  // 4. Create couple doc (allowed by the create rule that checks user1/user2)
  await setDoc(doc(db, 'couples', coupleId), {
    user1:           ids[0],
    user2:           ids[1],
    createdAt:       serverTimestamp(),
    anniversaryDate: null,
  });

  // 5. Write coupleId to joiner's OWN user doc (only allowed for own doc)
  await updateDoc(doc(db, 'users', myUid), { coupleId, inviteCode: null });

  // 6. Signal the code generator by writing joinerUid + coupleId to the
  //    invite code doc. They're listening via onSnapshot and will write
  //    coupleId to their own user doc when they see this.
  await updateDoc(doc(db, 'inviteCodes', code), {
    joinerUid: myUid,
    coupleId,
    joinedAt:  serverTimestamp(),
  });

  return { coupleId, partnerId, partnerName: partnerData.name };
};

// ─── Called by the code generator after their listener fires ─
// Writes coupleId to their own user doc (critical), then deletes the invite
// code (best-effort cleanup). Sequential so a deleteDoc failure never
// prevents the user doc write from completing.
export const completeInviteHandshake = async (uid, code, coupleId) => {
  // Step 1 — critical: write coupleId to own user doc
  await updateDoc(doc(db, 'users', uid), { coupleId, inviteCode: null });

  // Step 2 — cleanup: delete the used invite code (non-critical, don't throw)
  try {
    await deleteDoc(doc(db, 'inviteCodes', code));
  } catch (e) {
    console.warn('[couple] invite code cleanup failed (non-critical):', e.message);
  }
};

// ─── Set (or update) the anniversary date for a couple ───────
export const setAnniversary = async (coupleId, date) => {
  await updateDoc(doc(db, 'couples', coupleId), {
    anniversaryDate: date.toISOString(),
  });
};

// ─── Fetch both users in a couple ────────────────────────────
export const getCoupleMembers = async (coupleId) => {
  const coupleSnap = await getDoc(doc(db, 'couples', coupleId));
  if (!coupleSnap.exists()) return null;

  const { user1, user2 } = coupleSnap.data();
  const [snap1, snap2]   = await Promise.all([
    getDoc(doc(db, 'users', user1)),
    getDoc(doc(db, 'users', user2)),
  ]);

  return {
    couple:   coupleSnap.data(),
    members: [snap1.data(), snap2.data()].filter(Boolean),
  };
};
