import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  doc, collection, onSnapshot,
  query, orderBy, addDoc, updateDoc,
  deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// ─────────────────────────────────────────────────────────────
//  CoupleContext
//
//  Provides the whole app with live Firestore data for:
//    • myProfile  – current user's Firestore user doc
//    • partner    – partner's Firestore user doc (real-time)
//    • couple     – shared couple doc (anniversary, nickname…)
//    • memories   – subcollection, ordered by date asc
//    • capsules   – subcollection, ordered by unlockDate asc
//    • events     – subcollection, ordered by date asc
//
//  All writes go through the action helpers below so screens
//  never import firebase/firestore directly.
// ─────────────────────────────────────────────────────────────

const CoupleContext = createContext(null);

export function CoupleProvider({ coupleId, children }) {
  const userId = auth.currentUser?.uid;

  const [myProfile,  setMyProfile]  = useState(null);
  const [partner,    setPartner]    = useState(null);
  const [partnerUid, setPartnerUid] = useState(null);
  const [couple,     setCouple]     = useState(null);
  const [memories,   setMemories]   = useState([]);
  const [capsules,   setCapsules]   = useState([]);
  const [events,     setEvents]     = useState([]);

  // ── Main listeners (couple + subcollections + my profile) ──
  useEffect(() => {
    if (!coupleId || !userId) return;
    const unsubs = [];

    // Couple doc → also reveals partner UID
    unsubs.push(onSnapshot(doc(db, 'couples', coupleId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setCouple(data);
      const pUid = data.user1 === userId ? data.user2 : data.user1;
      setPartnerUid(pUid);
    }));

    // My own user doc
    unsubs.push(onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) setMyProfile(snap.data());
    }));

    // Memories — ordered oldest → newest
    unsubs.push(onSnapshot(
      query(collection(db, 'couples', coupleId, 'memories'), orderBy('date', 'asc')),
      (snap) => setMemories(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('[Firestore] memories:', err.message),
    ));

    // Capsules — ordered by unlock date
    unsubs.push(onSnapshot(
      query(collection(db, 'couples', coupleId, 'capsules'), orderBy('unlockDate', 'asc')),
      (snap) => setCapsules(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('[Firestore] capsules:', err.message),
    ));

    // Events — ordered by event date
    unsubs.push(onSnapshot(
      query(collection(db, 'couples', coupleId, 'events'), orderBy('date', 'asc')),
      (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('[Firestore] events:', err.message),
    ));

    return () => unsubs.forEach(u => u());
  }, [coupleId, userId]);

  // ── Partner listener (depends on partnerUid from above) ────
  useEffect(() => {
    if (!partnerUid) return;
    const unsub = onSnapshot(doc(db, 'users', partnerUid), (snap) => {
      if (snap.exists()) setPartner(snap.data());
    });
    return unsub;
  }, [partnerUid]);

  // ── Action helpers ─────────────────────────────────────────

  /** Update current user's Firestore profile doc */
  const updateMyProfile = (updates) =>
    updateDoc(doc(db, 'users', userId), updates);

  /** Update shared couple doc (anniversary, nickname, etc.) */
  const updateCouple = (updates) =>
    updateDoc(doc(db, 'couples', coupleId), updates);

  /** Add a memory to the shared subcollection */
  const addMemory = (memory) =>
    addDoc(collection(db, 'couples', coupleId, 'memories'), {
      ...memory,
      createdBy: userId,
      createdAt: serverTimestamp(),
    });

  /** Update a specific memory */
  const updateMemory = (id, updates) =>
    updateDoc(doc(db, 'couples', coupleId, 'memories', id), updates);

  /** Delete a memory */
  const removeMemory = (id) =>
    deleteDoc(doc(db, 'couples', coupleId, 'memories', id));

  /** Add a time-capsule message */
  const addCapsule = (capsule) =>
    addDoc(collection(db, 'couples', coupleId, 'capsules'), {
      ...capsule,
      createdAt: serverTimestamp(),
    });

  /** Update a capsule (e.g. mark as opened) */
  const updateCapsule = (id, updates) =>
    updateDoc(doc(db, 'couples', coupleId, 'capsules', id), updates);

  /** Add a shared event / countdown */
  const addEvent = (event) =>
    addDoc(collection(db, 'couples', coupleId, 'events'), {
      ...event,
      createdBy: userId,
      createdAt: serverTimestamp(),
    });

  /** Delete an event */
  const removeEvent = (id) =>
    deleteDoc(doc(db, 'couples', coupleId, 'events', id));

  return (
    <CoupleContext.Provider value={{
      // Data
      user: auth.currentUser,
      myProfile,
      partner,
      partnerUid,
      coupleId,
      couple,
      memories,
      capsules,
      events,
      // Actions
      updateMyProfile,
      updateCouple,
      addMemory,
      updateMemory,
      removeMemory,
      addCapsule,
      updateCapsule,
      addEvent,
      removeEvent,
    }}>
      {children}
    </CoupleContext.Provider>
  );
}

export const useCouple = () => {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error('useCouple must be used inside <CoupleProvider>');
  return ctx;
};
