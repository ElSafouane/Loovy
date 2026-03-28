import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import HomeScreen     from '../screens/HomeScreen';
import DatesScreen    from '../screens/DatesScreen';
import MemoriesScreen from '../screens/MemoriesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useCouple }  from '../context/CoupleContext';
import { colors }     from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { couple, userId } = useCouple();

  // Show red dot only for the RECIPIENT — the person who needs to approve,
  // not the one who proposed (they already know about their own request).
  const pending = couple?.pendingAnniversaryChange;
  const hasPendingAction = !!(pending && pending.proposedBy !== userId);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 90,
        },
        tabBarBackground: () => (
          <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
        ),
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if      (route.name === 'Home')     iconName = focused ? 'heart'    : 'heart-outline';
          else if (route.name === 'Dates')    iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Memories') iconName = focused ? 'images'   : 'images-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';

          const icon = <Ionicons name={iconName} size={size} color={color} />;

          // Red dot badge on Settings when an action is required
          if (route.name === 'Settings' && hasPendingAction) {
            return (
              <View>
                {icon}
                <View style={styles.badge} />
              </View>
            );
          }

          return icon;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     />
      <Tab.Screen name="Dates"    component={DatesScreen}    />
      <Tab.Screen name="Memories" component={MemoriesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2, right: -4,
    width: 9, height: 9,
    borderRadius: 5,
    backgroundColor: '#e94057',
    borderWidth: 1.5,
    borderColor: '#0f0c29',
  },
});
