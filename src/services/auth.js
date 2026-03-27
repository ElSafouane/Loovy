import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// ─── Sign Up ─────────────────────────────────────────────────
export const signUp = async (name, email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  await setDoc(doc(db, 'users', user.uid), {
    uid:                user.uid,
    name:               name.trim(),
    email:              email.trim().toLowerCase(),
    coupleId:           null,
    inviteCode:         null,
    avatarUrl:          null,
    status:             'Missing you ❤️',
    onboardingComplete: false,
    createdAt:          serverTimestamp(),
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

// ─── Google Sign-In (credential from expo-auth-session) ──────
// Call this AFTER getting the id_token from Google OAuth
export const signInWithGoogle = async (idToken) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);

  // Upsert user doc — create on first login, skip if already exists
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      uid:                user.uid,
      name:               user.displayName || 'User',
      email:              user.email?.toLowerCase() || '',
      coupleId:           null,
      inviteCode:         null,
      avatarUrl:          user.photoURL || null,
      status:             'Missing you ❤️',
      onboardingComplete: false,
      createdAt:          serverTimestamp(),
    });
  }
  return user;
};
