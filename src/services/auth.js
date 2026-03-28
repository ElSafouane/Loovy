import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
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

// ─── Apple Sign-In ────────────────────────────────────────────
// Uses expo-apple-authentication + Firebase OAuthProvider
export const signInWithApple = async () => {
  // Generate a cryptographic nonce for security
  const rawNonce = Array.from(
    await Crypto.getRandomBytesAsync(32),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  // Trigger Apple's native sign-in sheet
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  // Exchange for a Firebase credential
  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({
    idToken:  appleCredential.identityToken,
    rawNonce,
  });

  const { user } = await signInWithCredential(auth, firebaseCredential);

  // Build display name — Apple only sends it on the FIRST login
  const firstName = appleCredential.fullName?.givenName  || '';
  const lastName  = appleCredential.fullName?.familyName || '';
  const displayName = `${firstName} ${lastName}`.trim() || user.displayName || 'User';

  // Upsert user doc — create on first login, skip if already exists
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      uid:                user.uid,
      name:               displayName,
      email:              user.email?.toLowerCase() || '',
      coupleId:           null,
      inviteCode:         null,
      avatarUrl:          null,
      status:             'Missing you ❤️',
      onboardingComplete: false,
      createdAt:          serverTimestamp(),
    });
  }

  return user;
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
