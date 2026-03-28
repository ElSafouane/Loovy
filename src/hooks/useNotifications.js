import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    // Wrap entirely — a notification failure must never crash the app
    registerForPushNotifications()
      .then(token => {
        if (!token) return;
        setExpoPushToken(token);
        const uid = auth.currentUser?.uid;
        if (uid) {
          updateDoc(doc(db, 'users', uid), { expoPushToken: token }).catch(() => {});
        }
      })
      .catch(() => {}); // swallow all errors (simulator, permission denied, missing projectId…)

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
      responseListener.current     = Notifications.addNotificationResponseReceivedListener(() => {});
    } catch { /* notifications unavailable on this runtime */ }

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken };
}

async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[notifications] EAS projectId not found — skipping token fetch');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e94057',
    });
  }

  return token;
}
