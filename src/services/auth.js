import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// ─── Sign Up ─────────────────────────────────────────────────
export const signUp = async (name, email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  await setDoc(doc(db, 'users', user.uid), {
    uid:        user.uid,
    name:       name.trim(),
    email:      email.trim().toLowerCase(),
    coupleId:   null,
    inviteCode: null,
    avatarUrl:  null,
    status:     'Missing you ❤️',
    createdAt:  serverTimestamp(),
  });
  return user;
};

// ─── Sign In ─────────────────────────────────────────────────
export const signIn = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

// ─── Sign Out ────────────────────────────────────────────────
export const logOut = () => signOut(auth);

// ─── Password Reset ──────────────────────────────────────────
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

// ─── Fetch user doc from Firestore ───────────────────────────
export const getUserDoc = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};
