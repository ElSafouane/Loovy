import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { auth }               from './src/config/firebase';
import { getUserDoc }         from './src/services/auth';
import TabNavigator           from './src/navigation/TabNavigator';
import AuthScreen             from './src/screens/AuthScreen';
import CoupleSetupScreen      from './src/screens/CoupleSetupScreen';
import { colors }             from './src/theme/colors';

// ── Auth states ─────────────────────────────────────────────
// 'loading'        – checking Firebase session
// 'unauthenticated'– no session → show login / register
// 'no-couple'      – logged in but not yet paired with partner
// 'ready'          – logged in + paired → show main app
// ────────────────────────────────────────────────────────────

export default function App() {
  const [appState, setAppState] = useState('loading');
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    // onAuthStateChanged resolves immediately from the persisted session
    // (AsyncStorage cache), so there's no blank flash on second launch.
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null);
        setAppState('unauthenticated');
        return;
      }

      setFirebaseUser(fbUser);

      try {
        const userDoc = await getUserDoc(fbUser.uid);
        if (userDoc?.coupleId) {
          setAppState('ready');
        } else {
          setAppState('no-couple');
        }
      } catch {
        // Firestore unreachable (offline, first-time, etc.) — still let them in
        setAppState('ready');
      }
    });

    return unsubscribe;
  }, []);

  // ── Loading spinner ────────────────────────────────────────
  if (appState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />

      {/* ── Not logged in ── */}
      {appState === 'unauthenticated' && (
        <AuthScreen onAuthenticated={async () => {
          const user = auth.currentUser;
          const doc  = await getUserDoc(user.uid);
          setFirebaseUser(user);
          setAppState(doc?.coupleId ? 'ready' : 'no-couple');
        }} />
      )}

      {/* ── Logged in but not yet paired ── */}
      {appState === 'no-couple' && firebaseUser && (
        <CoupleSetupScreen
          user={firebaseUser}
          onLinked={() => setAppState('ready')}
        />
      )}

      {/* ── Fully set up — main app ── */}
      {appState === 'ready' && (
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      )}
    </GestureHandlerRootView>
  );
}
