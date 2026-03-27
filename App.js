import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { auth }                from './src/config/firebase';
import { getUserDoc }          from './src/services/auth';
import { useNotifications }    from './src/hooks/useNotifications';
import { CoupleProvider }      from './src/context/CoupleContext';
import TabNavigator            from './src/navigation/TabNavigator';
import AuthScreen              from './src/screens/AuthScreen';
import CoupleSetupScreen       from './src/screens/CoupleSetupScreen';
import OnboardingScreen        from './src/screens/OnboardingScreen';
import { colors }              from './src/theme/colors';

// ── App states ──────────────────────────────────────────────
// 'loading'         – resolving Firebase session from cache
// 'unauthenticated' – no session → AuthScreen
// 'onboarding'      – first login after sign-up → OnboardingScreen
// 'no-couple'       – logged in, not yet paired → CoupleSetupScreen
// 'ready'           – logged in + coupleId → main app
// ────────────────────────────────────────────────────────────

export default function App() {
  useNotifications(); // registers device and stores push token
  const [appState,     setAppState]     = useState('loading');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [coupleId,     setCoupleId]     = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null);
        setCoupleId(null);
        setAppState('unauthenticated');
        return;
      }
      setFirebaseUser(fbUser);
      try {
        const userDoc = await getUserDoc(fbUser.uid);
        if (userDoc?.coupleId) {
          setCoupleId(userDoc.coupleId);
          setAppState('ready');
        } else if (!userDoc?.onboardingComplete) {
          setAppState('onboarding');
        } else {
          setAppState('no-couple');
        }
      } catch {
        setAppState('no-couple');
      }
    });
    return unsub;
  }, []);

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

      {appState === 'unauthenticated' && (
        <AuthScreen onAuthenticated={async (user) => {
          setFirebaseUser(user);
          try {
            const userDoc = await getUserDoc(user.uid);
            if (userDoc?.coupleId) {
              setCoupleId(userDoc.coupleId);
              setAppState('ready');
            } else if (!userDoc?.onboardingComplete) {
              setAppState('onboarding');
            } else {
              setAppState('no-couple');
            }
          } catch {
            setAppState('no-couple');
          }
        }} />
      )}

      {appState === 'onboarding' && firebaseUser && (
        <OnboardingScreen
          user={firebaseUser}
          onComplete={() => setAppState('no-couple')}
        />
      )}

      {appState === 'no-couple' && firebaseUser && (
        <CoupleSetupScreen
          user={firebaseUser}
          onLinked={(id) => { setCoupleId(id); setAppState('ready'); }}
        />
      )}

      {appState === 'ready' && coupleId && (
        <CoupleProvider
          coupleId={coupleId}
          onBreakup={() => {
            setCoupleId(null);
            setAppState('no-couple');
          }}
        >
          <NavigationContainer>
            <TabNavigator />
          </NavigationContainer>
        </CoupleProvider>
      )}
    </GestureHandlerRootView>
  );
}
