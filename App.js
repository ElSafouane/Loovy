import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TabNavigator from './src/navigation/TabNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { colors } from './src/theme/colors';

export default function App() {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has already run the app and finished onboarding
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('@hasOnboarded');
        if (value === 'true') {
          setHasOnboarded(true);
        }
      } catch (e) {
        console.error("Error reading onboarding status:", e);
      } finally {
        setLoading(false);
      }
    };
    
    checkOnboarding();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {hasOnboarded ? (
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      ) : (
        <OnboardingScreen onComplete={() => setHasOnboarded(true)} />
      )}
    </GestureHandlerRootView>
  );
}
