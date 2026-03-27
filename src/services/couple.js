import {
  doc, setDoc, updateDoc, getDoc,
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
export const createInviteCode = async (uid) => {
  const code = generateCode();
  await updateDoc(doc(db, 'users', uid), { inviteCode: code });
  return code;
};

// ─── Join a couple using a partner's invite code ─────────────
export const joinCouple = async (myUid, rawCode) => {
  const code = rawCode.trim().toUpperCase();

  const q = query(collection(db, 'users'), where('inviteCode', '==', code));
  const snap = await getDocs(q);

  if (snap.empty)
    throw new Error('No account found with that code.\nAsk your partner to share their code from the app.');

  const partnerSnap = snap.docs[0];
  const partnerId   = partnerSnap.id;
  const partnerData = partnerSnap.data();

  if (partnerId === myUid)
    throw new Error("That's your own code — share it with your partner instead.");

  if (partnerData.coupleId)
    throw new Error('This code is no longer valid. Your partner is already paired.');

  // Deterministic coupleId so both sides produce the same string
  const ids     = [myUid, partnerId].sort();
  const coupleId = `${ids[0]}_${ids[1]}`;

  await setDoc(doc(db, 'couples', coupleId), {
    user1:           ids[0],
    user2:           ids[1],
    createdAt:       serverTimestamp(),
    anniversaryDate: null,
  });

  // Link both users and clear the now-used invite code
  await Promise.all([
    updateDoc(doc(db, 'users', myUid),    { coupleId, inviteCode: null }),
    updateDoc(doc(db, 'users', partnerId), { coupleId, inviteCode: null }),
  ]);

  return { coupleId, partnerId, partnerName: partnerData.name };
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
