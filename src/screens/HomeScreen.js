import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, SlideInRight, SlideInLeft, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Swipeable } from 'react-native-gesture-handler';
import * as Calendar from 'expo-calendar';
import * as Location from 'expo-location';
import Svg, { Path } from 'react-native-svg';
import { useCouple } from '../context/CoupleContext';
import { colors, gradients } from '../theme/colors';

const defaultMeetingDate = new Date();
defaultMeetingDate.setDate(defaultMeetingDate.getDate() + 14);

const MOODS = [
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'love', label: 'Love', emoji: '😍' },
  { id: 'sleepy', label: 'Sleepy', emoji: '😴' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'missing', label: 'Missing', emoji: '😭' },
  { id: 'angry', label: 'Angry', emoji: '😠' },
];

export default function HomeScreen() {
  // ── Live Firestore data via context ──────────────────────
  const {
    myProfile, partner, couple,
    events: firestoreEvents,
    updateMyProfile, addEvent, removeEvent,
  } = useCouple();

  // Derived profile values (fall back gracefully while data loads)
  const myName    = myProfile?.name    || '';
  const myAvatar  = myProfile?.avatarUrl || 'https://i.pravatar.cc/150?u=me';
  const myStatus  = myProfile?.status  || 'Thinking of you ❤️';
  const partnerName = myProfile?.partnerNickname || partner?.name || 'Partner';

  const relationshipStartDate = couple?.anniversaryDate
    ? new Date(couple.anniversaryDate)
    : new Date();

  // Partner data (from their live Firestore doc)
  const partnerAvatar   = partner?.avatarUrl || 'https://i.pravatar.cc/150?u=partner';
  const partnerMood     = partner?.status    || '…';
  const partnerLocation = partner?.locationStr || '—';
  const partnerCoords   = partner?.coords    || null;
  // Relative timezone difference (hours partner is ahead of me)
  const myUtcOffset      = -(new Date().getTimezoneOffset() / 60);
  const partnerUtcOffset = partner?.utcOffset ?? myUtcOffset;
  const timezoneRelative = partnerUtcOffset - myUtcOffset;

  // Events: use Firestore events (shared with partner), parsed to Date objects
  const events = firestoreEvents.map(e => ({
    ...e,
    date: new Date(e.date),
  }));

  // Heartbeat animation for partner avatar
  const heartScale = useSharedValue(1);
  const heartbeatStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  useEffect(() => {
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 350 }),
        withTiming(1.0, { duration: 200 }),
        withTiming(1.04, { duration: 250 }),
        withTiming(1.0, { duration: 800 }),
      ),
      -1, // infinite
      false
    );
  }, []);

  // Dynamic GPS state
  const [myLocationStr, setMyLocationStr] = useState('Loading...');
  const [myCoords, setMyCoords] = useState(null);
  const [actualDistance, setActualDistance] = useState('Calculations...');

  const [now, setNow] = useState(new Date());

  // Modals state
  const [isEventModalVisible, setEventModalVisible] = useState(false);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);
  const [isPartnerNameModalVisible, setPartnerNameModalVisible] = useState(false);

  // New Event Form
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date());
  const [newEventTime, setNewEventTime] = useState(new Date());
  const [newEventIcon, setNewEventIcon] = useState('star');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Status Form
  const [customStatus, setCustomStatus] = useState('');
  const [tempPartnerName, setTempPartnerName] = useState(partnerName);

  // Clock — ticks every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // GPS — fetch once, update local state AND write to Firestore so partner sees it
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMyLocationStr('Location Denied');
        setActualDistance('Unknown');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      setMyCoords(location.coords);

      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const locationStr = reverseGeocode?.[0]
        ? `${reverseGeocode[0].city || 'Unknown City'}, ${reverseGeocode[0].country || ''}`
        : 'GPS Unknown';

      setMyLocationStr(locationStr);

      // Persist to Firestore so the partner's Home screen shows our real location
      const utcOffset = -(new Date().getTimezoneOffset() / 60);
      updateMyProfile({ coords: { latitude, longitude }, locationStr, utcOffset }).catch(() => {});
    })();
  }, []);

  // Haversine Distance Calc — uses partner's Firestore coords
  useEffect(() => {
    if (myCoords && partnerCoords) {
      const toRad = x => (x * Math.PI) / 180;
      const R = 6371; // km
      const dLat = toRad(partnerCoords.latitude - myCoords.latitude);
      const dLon = toRad(partnerCoords.longitude - myCoords.longitude);
      const lat1 = toRad(myCoords.latitude);
      const lat2 = toRad(partnerCoords.latitude);

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = Math.round(R * c);
      setActualDistance(`${distance.toLocaleString()} km`);
    }
  }, [myCoords, partnerCoords]);

  const saveNewEvent = async () => {
    if (!newEventTitle.trim()) return alert('Please enter an event name.');

    // Merge picked date + picked time into one DateTime
    const combined = new Date(newEventDate);
    combined.setHours(newEventTime.getHours(), newEventTime.getMinutes(), 0, 0);

    // Write to Firestore — instantly visible to both partners
    await addEvent({
      title: newEventTitle.trim(),
      date:  combined.toISOString(),
      icon:  newEventIcon,
    });

    setEventModalVisible(false);
    setNewEventTitle('');
    setNewEventDate(new Date());
    setNewEventTime(new Date());
    setNewEventIcon('star');
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const deleteEvent = (id) => removeEvent(id);

  const addToCalendar = async (evt) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { alert('Calendar permission denied'); return; }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find(c => c.allowsModifications && c.source?.type === 'local') ||
        calendars.find(c => c.allowsModifications);

      if (!defaultCal) { alert('No writable calendar found on your device.'); return; }

      const start = new Date(evt.date);
      const end = new Date(evt.date);
      end.setHours(end.getHours() + 2);

      await Calendar.createEventAsync(defaultCal.id, {
        title: evt.title,
        startDate: start,
        endDate: end,
        notes: 'Added from LoveApp 💕',
        alarms: [{ relativeOffset: -60 }],
      });

      alert(`✅ "${evt.title}" has been added to your calendar!`);
    } catch (e) {
      console.error('Calendar error:', e);
      alert('Could not add event to calendar.');
    }
  };

  const updateMyStatus = (moodObj) => {
    const status = `${moodObj.label} ${moodObj.emoji}`;
    updateMyProfile({ status }).catch(() => {});
    setStatusModalVisible(false);
  };

  const updateCustomStatus = () => {
    if (customStatus.trim().length > 0) {
      updateMyProfile({ status: customStatus.trim() }).catch(() => {});
      setStatusModalVisible(false);
      setCustomStatus('');
    }
  };

  // "Partner name" is now a nickname stored on MY profile doc
  const savePartnerName = async () => {
    if (tempPartnerName.trim().length > 0) {
      await updateMyProfile({ partnerNickname: tempPartnerName.trim() });
    }
    setPartnerNameModalVisible(false);
  };

  const getCountdown = (targetDate) => {
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, isPast: true };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      mins: Math.floor((diff / 1000 / 60) % 60),
      secs: Math.floor((diff / 1000) % 60),
      isPast: false
    };
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setNewEventDate(selectedDate);
  };

  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedTime) setNewEventTime(selectedTime);
  };

  const renderRightActions = (id) => (
    <Animated.View entering={SlideInRight} style={styles.deleteSwipe}>
      <TouchableOpacity onPress={() => deleteEvent(id)} style={styles.swipeActionArea}>
        <Ionicons name="trash" size={32} color="#fff" />
        <Text style={styles.swipeActionText}>Delete</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderLeftActions = (evt) => (
    <Animated.View entering={SlideInLeft} style={styles.calendarSwipe}>
      <TouchableOpacity onPress={() => addToCalendar(evt)} style={styles.swipeActionArea}>
        <Ionicons name="calendar-outline" size={32} color="#fff" />
        <Text style={styles.swipeActionText}>Add to Apple Calendar</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Time calculations
  const myTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const partnerDate = new Date(now.getTime() + timezoneRelative * 3600 * 1000);
  const partnerTime = partnerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Relationship days
  const daysTogether = Math.max(0, Math.floor((now.getTime() - relationshipStartDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Next meeting countdown (first future event)
  const nextMeeting = events.find(e => e.date.getTime() > now.getTime());
  const daysToMeeting = nextMeeting
    ? Math.ceil((nextMeeting.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Time zone gap label
  const tzHours = Math.abs(timezoneRelative);
  const tzLabel = timezoneRelative > 0
    ? `${partnerName} is ${tzHours}h ahead`
    : timezoneRelative < 0
      ? `${partnerName} is ${tzHours}h behind`
      : 'Same timezone ✨';

  // Is it night for partner?
  const partnerHour = partnerDate.getHours();
  const partnerTimeOfDay = partnerHour >= 5 && partnerHour < 12 ? '🌅 Morning'
    : partnerHour >= 12 && partnerHour < 18 ? '☀️ Afternoon'
      : partnerHour >= 18 && partnerHour < 22 ? '🌆 Evening'
        : '🌙 Night';

  // Dynamic time-of-day greeting
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? '🌅 Good Morning' : hour < 18 ? '☀️ Good Afternoon' : '🌙 Good Evening';
  const greetingText = `${timeGreeting}${myName ? `, ${myName}` : ', My Love'}`;

  // Render a stat tile
  const StatTile = ({ icon, label, value, highlight }) => (
    <BlurView intensity={highlight ? 0 : 15} tint="light" style={[styles.statTile, highlight && styles.statTileHighlight]}>
      {highlight && <LinearGradient colors={['rgba(233,64,87,0.2)', 'rgba(138,35,135,0.1)']} style={StyleSheet.absoluteFill} />}
      {!highlight && <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />}
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </BlurView>
  );

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── HERO SECTION ── */}
        <Animated.View entering={FadeInDown.duration(800)}>
          <Text style={styles.greeting}>{greetingText}</Text>
        </Animated.View>

        {/* Avatar Row */}
        <Animated.View entering={FadeInUp.delay(80).duration(800)}>
          <BlurView intensity={15} tint="light" style={styles.heroBg}>
            <LinearGradient colors={['rgba(233,64,87,0.08)', 'rgba(138,35,135,0.04)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroAvatarRow}>
              <View style={styles.heroAvatarCol}>
                {myAvatar && myAvatar.length <= 4
                  ? <View style={styles.heroEmojiAvatar}><Text style={{ fontSize: 42 }}>{myAvatar}</Text></View>
                  : <Image source={{ uri: myAvatar }} style={styles.heroAvatar} />}
                <Text style={styles.heroAvatarName}>{myName || 'You'}</Text>
              </View>

              <View style={styles.heroHeartCol}>
                <Text style={styles.heroHeart}>❤️</Text>
                <View style={styles.daysTogetherBadge}>
                  <LinearGradient colors={gradients.active} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
                  <Text style={styles.daysTogether}>{daysTogether.toLocaleString()}</Text>
                  <Text style={styles.daysTogetherLabel}>days</Text>
                </View>
              </View>

              <View style={styles.heroAvatarCol}>
                <Animated.Image source={{ uri: partnerAvatar }} style={[styles.heroAvatar, heartbeatStyle]} />
                <Text style={styles.heroAvatarName}>{partnerName}</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* Love Dashboard */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionDot} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Love Dashboard</Text>
        </View>
        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.statsGrid}>
          <StatTile icon="📅" label="Days Together" value={daysTogether.toLocaleString()} highlight />
          <StatTile icon="✈️" label="Distance" value={actualDistance} />
          <StatTile icon="💌" label="Next Meet" value={daysToMeeting !== null ? `${daysToMeeting}d` : '—'} highlight />
          <StatTile icon="🌍" label="Timezone" value={tzLabel} />
        </Animated.View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={[styles.sectionRow, { marginBottom: 12 }]}>
            <View style={styles.sectionDot} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Your Status</Text>
          </View>
          <TouchableOpacity onPress={() => setStatusModalVisible(true)}>
            <Animated.View entering={FadeInUp.delay(150).duration(800)}>
              <BlurView intensity={20} tint="light" style={[styles.glassCard, { marginBottom: 15 }]}>
                <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
                <View style={styles.partnerInfo}>
                  <Image source={{ uri: myAvatar }} style={styles.avatar} />
                  <View style={styles.partnerText}>
                    <Text style={styles.partnerName}>You</Text>
                    <View style={styles.moodBadge}>
                      <Text style={styles.moodText}>{myStatus}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{myTime}</Text>
                      <Text style={styles.metaDivider}>|</Text>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{myLocationStr}</Text>
                    </View>
                  </View>
                  <Ionicons name="pencil" size={20} color={colors.primary} />
                </View>
              </BlurView>
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>{partnerName}'s Status</Text>
            <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} onPress={() => { setTempPartnerName(partnerName); setPartnerNameModalVisible(true); }}>
              <Ionicons name="pencil" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInUp.delay(200).duration(800)}>
            <BlurView intensity={20} tint="light" style={styles.glassCard}>
              <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />
              <View style={styles.partnerInfo}>
                <Animated.Image source={{ uri: partnerAvatar }} style={[styles.avatar, heartbeatStyle]} />
                <View style={styles.partnerText}>
                  <Text style={styles.partnerName}>{partnerName}</Text>
                  <View style={styles.moodBadgePartner}>
                    <Text style={styles.moodTextPartner}>{partnerMood}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{partnerTime}</Text>
                    <Text style={styles.metaDivider}>|</Text>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{partnerLocation}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.quickMessageBtn}>
                  <Ionicons name="heart" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        </View>

        {/* Events / Countdowns Header */}
        <View style={[styles.rowBetween, { marginTop: 10, marginBottom: 15 }]}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionDot} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Shared Events</Text>
          </View>
          <TouchableOpacity style={styles.addCounterBtn} onPress={() => setEventModalVisible(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addCounterText}>Add Event</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Events List */}
        {events.map((evt, index) => {
          const cd = getCountdown(evt.date);
          return (
            <Animated.View key={evt.id} entering={FadeInUp.delay(300 + (index * 100)).duration(800)} style={{ marginBottom: 15 }}>
              <Swipeable
                renderRightActions={() => renderRightActions(evt.id)}
                renderLeftActions={() => renderLeftActions(evt)}
                containerStyle={{ overflow: 'visible' }}
              >
                <BlurView intensity={20} tint="light" style={[styles.countdownCard, { marginBottom: 0 }]}>
                  <LinearGradient colors={index === 0 ? gradients.love : gradients.card} style={[StyleSheet.absoluteFill, { opacity: index === 0 ? 0.2 : 1 }]} />

                  <Text style={styles.countdownTitle}>{evt.title} <Ionicons name={evt.icon} size={20} /></Text>
                  <Text style={styles.countdownSubtitle}>
                    {new Date(evt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>

                  {cd.isPast ? (
                    <Text style={styles.pastEventText}>This event has passed.</Text>
                  ) : (
                    <View style={styles.timerRow}>
                      <View style={styles.timerBox}><Text style={styles.timerNum}>{cd.days}</Text><Text style={styles.timerLabel}>Days</Text></View>
                      <Text style={styles.timerColon}>:</Text>
                      <View style={styles.timerBox}><Text style={styles.timerNum}>{cd.hours}</Text><Text style={styles.timerLabel}>Hrs</Text></View>
                      <Text style={styles.timerColon}>:</Text>
                      <View style={styles.timerBox}><Text style={styles.timerNum}>{cd.mins}</Text><Text style={styles.timerLabel}>Min</Text></View>
                    </View>
                  )}
                </BlurView>
              </Swipeable>
            </Animated.View>
          );
        })}

        {/* Distance & Location Section using REAL GPS */}
        <View style={[styles.sectionRow, { marginTop: 15, marginBottom: 15 }]}>
          <View style={styles.sectionDot} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Current Distance</Text>
        </View>
        <Animated.View entering={FadeInUp.delay(600).duration(800)}>
          <BlurView intensity={20} tint="light" style={styles.distanceCard}>
            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.distanceValue}>{actualDistance}</Text>
            <Text style={styles.distanceSubtitle}>Between you and {partnerName}</Text>

            <View style={styles.locationsRow}>

              <View style={styles.locationBox}>
                <Image source={{ uri: myAvatar }} style={styles.locationAvatar} />
                <Text style={styles.locationLabel}>You</Text>
                <Text style={styles.locationCity}>{myLocationStr}</Text>
              </View>

              <View style={styles.svgContainer}>
                <Svg width="160" height="120" viewBox="0 0 200 130">
                  {/* Continuous airplane heart flight path */}
                  <Path
                    d={[
                      "M 8,92",
                      "C 30,90 52,85 68,81",
                      "C 78,79 86,78 93,80",
                      "C 102,68 120,50 136,37",
                      "C 150,24 148,7 133,4",
                      "C 118,1 105,14 93,33",
                      "C 81,14 68,1 53,4",
                      "C 38,7 36,24 50,37",
                      "C 68,52 87,70 93,80",
                      "C 106,88 138,104 175,118",
                    ].join(" ")}
                    fill="none"
                    stroke="rgba(233,64,87,0.7)"
                    strokeWidth="2.8"
                    strokeDasharray="9,6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Start dot */}
                  <Path
                    d="M 8,92 m -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0"
                    fill="rgba(233,64,87,0.7)"
                  />
                </Svg>
                {/* Airplane — positioned at the path exit point (≈ bottom-right) */}
                <View style={styles.airplaneBadge}>
                  <Text style={{ fontSize: 20, transform: [{ rotate: '22deg' }] }}>✈️</Text>
                </View>
              </View>

              <View style={styles.locationBox}>
                <Image source={{ uri: partnerAvatar }} style={styles.locationAvatar} />
                <Text style={styles.locationLabel}>{partnerName}</Text>
                <Text style={styles.locationCity}>{partnerLocation}</Text>
              </View>

            </View>
          </BlurView>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* --- ADD EVENT MODAL --- */}
      <Modal visible={isEventModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <BlurView intensity={50} tint="dark" style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>New Event Countdown</Text>
                  <TouchableOpacity onPress={() => setEventModalVisible(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="pricetag" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Event Name (e.g. Paris Trip)" placeholderTextColor="#888" value={newEventTitle} onChangeText={setNewEventTitle} />
                </View>

                {/* Date row */}
                {!showDatePicker ? (
                  <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar" size={20} color={colors.primary} style={styles.inputIcon} />
                    <Text style={[styles.input, { paddingTop: Platform.OS === 'ios' ? 14 : 0 }]}>{newEventDate.toDateString()}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={newEventDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                      minimumDate={new Date()}
                      textColor="white"
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>Confirm Date</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Time row */}
                {!showTimePicker ? (
                  <TouchableOpacity style={styles.inputContainer} onPress={() => setShowTimePicker(true)}>
                    <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                    <Text style={[styles.input, { paddingTop: Platform.OS === 'ios' ? 14 : 0 }]}>
                      {newEventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={newEventTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onTimeChange}
                      textColor="white"
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>Confirm Time</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.iconPicker}>
                  <Text style={styles.pickerLabel}>Choose Icon:</Text>
                  <View style={styles.iconRow}>
                    {['airplane', 'restaurant', 'heart', 'star', 'musical-notes', 'home'].map(i => (
                      <TouchableOpacity key={i} style={[styles.pickIconBtn, newEventIcon === i && styles.selectedIconBtn]} onPress={() => setNewEventIcon(i)}>
                        <Ionicons name={i} size={24} color={newEventIcon === i ? '#fff' : '#888'} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={saveNewEvent}>
                  <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                  <Text style={styles.saveBtnText}>Save Event</Text>
                </TouchableOpacity>
              </ScrollView>

            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- STATUS/MOOD MODAL (For "You") --- */}
      <Modal visible={isStatusModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <BlurView intensity={50} tint="dark" style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Your Status</Text>
                <TouchableOpacity onPress={() => setStatusModalVisible(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
              </View>

              <Text style={styles.pickerLabel}>Quick Mood</Text>
              <View style={styles.moodsGrid}>
                {MOODS.map(mood => (
                  <TouchableOpacity key={mood.id} style={styles.moodOption} onPress={() => updateMyStatus(mood)}>
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={styles.moodLabel}>{mood.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.pickerLabel, { marginTop: 20 }]}>Custom Text</Text>
              <View style={[styles.inputContainer, { marginBottom: 20 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="I am thinking about..."
                  placeholderTextColor="#888"
                  value={customStatus}
                  onChangeText={setCustomStatus}
                  onSubmitEditing={updateCustomStatus}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={updateCustomStatus}>
                <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                <Text style={styles.saveBtnText}>Set Status</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- EDIT PARTNER NICKNAME MODAL --- */}
      <Modal visible={isPartnerNameModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { padding: 30 }]}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <Text style={[styles.modalTitle, { marginBottom: 20, textAlign: 'center' }]}>Edit Partner Nickname</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={tempPartnerName}
                  onChangeText={setTempPartnerName}
                  autoFocus
                  onSubmitEditing={savePartnerName}
                />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={savePartnerName}>
                <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 56 },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.3, marginBottom: 16 },

  // Section label row (dot + title)
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },

  // Hero section
  heroBg: {
    borderRadius: 28, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(233,64,87,0.2)', marginBottom: 24, padding: 20,
  },
  heroAvatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  heroAvatarCol: { alignItems: 'center', width: 110 },
  heroAvatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.primary },
  heroEmojiAvatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 3, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  heroAvatarName: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 8 },
  heroHeartCol: { alignItems: 'center', marginHorizontal: 8 },
  heroHeart: { fontSize: 34, marginBottom: 8 },
  daysTogetherBadge: {
    overflow: 'hidden', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6,
    alignItems: 'center',
  },
  daysTogether: { color: '#fff', fontSize: 15, fontWeight: '800' },
  daysTogetherLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },

  // Stats grid — 2×2 centered
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24, gap: 10 },
  statTile: {
    width: '44%', borderRadius: 18, padding: 14, alignItems: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder,
  },
  statTileHighlight: { borderColor: 'rgba(233,64,87,0.35)' },
  statIcon: { fontSize: 18, marginBottom: 5 },
  statValue: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  statLabel: { color: colors.textSecondary, fontSize: 11, textAlign: 'center' },

  statusSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, color: colors.textSecondary, fontWeight: '700', marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  glassCard: { borderRadius: 24, padding: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  partnerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 55, height: 55, borderRadius: 27.5, borderWidth: 2, borderColor: colors.primary },
  partnerText: { marginLeft: 15, flex: 1 },
  partnerName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },

  moodBadge: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderBottomLeftRadius: 0, alignSelf: 'flex-start', marginBottom: 5 },
  moodText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  moodBadgePartner: { backgroundColor: 'rgba(233, 64, 87, 0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderBottomLeftRadius: 0, alignSelf: 'flex-start', marginBottom: 5 },
  moodTextPartner: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: colors.textSecondary, fontSize: 12, marginLeft: 4 },
  metaDivider: { color: colors.cardBorder, marginHorizontal: 8, fontSize: 12 },

  quickMessageBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  addCounterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  addCounterText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },

  countdownCard: { borderRadius: 24, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', marginBottom: 15 },
  countdownTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  countdownSubtitle: { color: colors.textSecondary, fontSize: 12, marginBottom: 16 },
  pastEventText: { color: colors.textSecondary, fontSize: 16, fontStyle: 'italic', marginBottom: 10 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, width: '100%' },
  timerBox: { alignItems: 'center', width: 60 },
  timerNum: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
  timerLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  timerColon: { color: colors.primary, fontSize: 30, fontWeight: 'bold', marginHorizontal: 10, paddingBottom: 15 },

  deleteSwipe: { backgroundColor: '#E94057', justifyContent: 'center', alignItems: 'flex-end', borderRadius: 24, paddingRight: 25, marginBottom: 15, width: 100 },
  calendarSwipe: { backgroundColor: '#2D8CFF', justifyContent: 'center', alignItems: 'flex-start', borderRadius: 24, paddingLeft: 25, marginBottom: 15, width: 160 },
  swipeActionArea: { alignItems: 'center', justifyContent: 'center', height: '100%' },
  swipeActionText: { color: '#fff', fontWeight: 'bold', marginTop: 5, fontSize: 11, textAlign: 'center' },

  // Distance Card Styles
  distanceCard: { borderRadius: 24, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
  distanceValue: { color: colors.text, fontSize: 34, fontWeight: '800', marginBottom: 8 },
  distanceSubtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 35 },
  locationsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  locationBox: { alignItems: 'center', width: 80 },
  locationAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(233,64,87,0.4)', marginBottom: 8 },
  locationLabel: { color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  locationCity: { color: colors.primary, fontSize: 11, textAlign: 'center' },

  svgContainer: { flex: 1, height: 120, justifyContent: 'center', alignItems: 'center', marginHorizontal: 2 },
  airplaneBadge: { position: 'absolute', bottom: 0, right: 10 },

  bottomSpacer: { height: 100 },

  // MODALS
  modalBg: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '100%', backgroundColor: '#24243e', borderRadius: 24, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, paddingHorizontal: 15, marginBottom: 15, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 16 },

  datePickerContainer: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 15, marginBottom: 15, alignItems: 'center' },
  doneBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 15 },
  doneBtnText: { color: '#fff', fontWeight: 'bold' },

  pickerLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 10, fontWeight: '600' },
  iconRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 25 },
  pickIconBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  selectedIconBtn: { backgroundColor: colors.primary },
  saveBtn: { overflow: 'hidden', borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  moodsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moodOption: { width: '31%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingVertical: 15, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moodEmoji: { fontSize: 28, marginBottom: 5 },
  moodLabel: { color: '#fff', fontSize: 13, fontWeight: '600' }
});
