import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, Platform, KeyboardAvoidingView, Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, gradients } from '../theme/colors';

const EMOJI_AVATARS = ['🐼', '🦊', '🐻', '🐱', '🐶', '🦁', '🐸', '🐨', '🦋', '🌸', '🌙', '⭐', '🌈', '❤️', '🫶'];

const LOVE_LANGUAGES = [
  { id: 'words', label: 'Words of Affirmation', emoji: '💬' },
  { id: 'quality', label: 'Quality Time', emoji: '⏳' },
  { id: 'gifts', label: 'Buying Gifts', emoji: '🎁' },
  { id: 'acts', label: 'Acts of Service', emoji: '🤝' },
  { id: 'touch', label: 'Physical Touch', emoji: '🤗' },
];

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Profile data
  const [myName, setMyName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [myAvatar, setMyAvatar] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [anniversary, setAnniversary] = useState(new Date('2023-08-14'));

  // Couple profile extras
  const [coupleNickname, setCoupleNickname] = useState('');
  const [relationshipSong, setRelationshipSong] = useState('');
  const [specialPlace, setSpecialPlace] = useState('');
  const [couplePromise, setCouplePromise] = useState('');
  const [myLoveLanguage, setMyLoveLanguage] = useState(null);

  // Pending states
  const [pendingAnniversary, setPendingAnniversary] = useState(null); // date awaiting partner confirmation
  const [pendingMeeting, setPendingMeeting] = useState(false);
  const [proposedMeetingDate, setProposedMeetingDate] = useState(new Date());

  // Modals
  const [isAvatarModalOpen, setAvatarModalOpen] = useState(false);
  const [isEmojiModalOpen, setEmojiModalOpen] = useState(false);
  const [isMeetingDateModalOpen, setMeetingDateModalOpen] = useState(false);
  const [isAnniversaryModalOpen, setAnniversaryModalOpen] = useState(false);
  const [isCoupleNicknameModalOpen, setCoupleNicknameModalOpen] = useState(false);
  const [isSongModalOpen, setSongModalOpen] = useState(false);
  const [isSpecialPlaceModalOpen, setSpecialPlaceModalOpen] = useState(false);
  const [isPromiseModalOpen, setPromiseModalOpen] = useState(false);
  const [isLoveLanguageModalOpen, setLoveLanguageModalOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAnnivPicker, setShowAnnivPicker] = useState(false);
  const [proposedAnniversary, setProposedAnniversary] = useState(new Date());

  // Temp input values for modals
  const [tempNickname, setTempNickname] = useState('');
  const [tempSong, setTempSong] = useState('');
  const [tempPlace, setTempPlace] = useState('');
  const [tempPromise, setTempPromise] = useState('');

  useEffect(() => {
    AsyncStorage.multiGet([
      '@myName', '@partnerName', '@myAvatar', '@anniversaryDate',
      '@coupleNickname', '@relationshipSong', '@specialPlace', '@couplePromise', '@myLoveLanguage'
    ]).then(entries => {
      const db = Object.fromEntries(entries);
      if (db['@myName']) setMyName(db['@myName']);
      if (db['@partnerName']) setPartnerName(db['@partnerName']);
      if (db['@myAvatar']) {
        if (db['@myAvatar'].length <= 4) setSelectedEmoji(db['@myAvatar']);
        else setMyAvatar(db['@myAvatar']);
      }
      if (db['@anniversaryDate']) setAnniversary(new Date(db['@anniversaryDate']));
      if (db['@coupleNickname']) setCoupleNickname(db['@coupleNickname']);
      if (db['@relationshipSong']) setRelationshipSong(db['@relationshipSong']);
      if (db['@specialPlace']) setSpecialPlace(db['@specialPlace']);
      if (db['@couplePromise']) setCouplePromise(db['@couplePromise']);
      if (db['@myLoveLanguage']) setMyLoveLanguage(db['@myLoveLanguage']);
    });
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setMyAvatar(uri);
      setSelectedEmoji(null);
      await AsyncStorage.setItem('@myAvatar', uri);
      setAvatarModalOpen(false);
    }
  };

  const selectEmoji = async (emoji) => {
    setSelectedEmoji(emoji);
    setMyAvatar(null);
    await AsyncStorage.setItem('@myAvatar', emoji);
    setEmojiModalOpen(false);
    setAvatarModalOpen(false);
  };

  const onMeetingDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setProposedMeetingDate(selectedDate);
  };

  const onAnnivChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowAnnivPicker(false);
    if (selectedDate) setProposedAnniversary(selectedDate);
  };

  const proposeMeetingDate = async () => {
    setPendingMeeting(true);
    await AsyncStorage.setItem('@proposedMeetingDate', proposedMeetingDate.toISOString());
    setMeetingDateModalOpen(false);
  };

  const proposeAnniversaryChange = () => {
    setPendingAnniversary(proposedAnniversary);
    setAnniversaryModalOpen(false);
    setShowAnnivPicker(false);
  };

  const saveTextField = async (key, value, setter, closeModal) => {
    setter(value);
    await AsyncStorage.setItem(key, value);
    closeModal();
  };

  const saveLoveLanguage = async (lang) => {
    setMyLoveLanguage(lang.id);
    await AsyncStorage.setItem('@myLoveLanguage', lang.id);
    setLoveLanguageModalOpen(false);
  };

  const myLoveLang = LOVE_LANGUAGES.find(l => l.id === myLoveLanguage);
  const avatarDisplay = selectedEmoji
    ? <View style={styles.emojiAvatarLarge}><Text style={{ fontSize: 50 }}>{selectedEmoji}</Text></View>
    : <Image source={{ uri: myAvatar || 'https://i.pravatar.cc/150?u=me' }} style={styles.largeAvatar} />;

  const Row = ({ icon, iconColor, label, value, pending, pendingText, onPress, destructive }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={[styles.settingIconBox, destructive && { backgroundColor: 'rgba(233,64,87,0.15)' }]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.primary : (iconColor || colors.text)} />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={[styles.settingLabel, destructive && { color: colors.primary }]}>{label}</Text>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        {pending && <Text style={styles.pendingText}>⏳ {pendingText || `Waiting for ${partnerName}'s approval`}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInRight.duration(800)} style={styles.header}>
          <Text style={styles.greeting}>Profile & Settings</Text>
          <Text style={styles.subGreeting}>Manage your relationship space</Text>
        </Animated.View>

        {/* My Profile Card */}
        <Animated.View entering={FadeInUp.delay(100).duration(800)}>
          <Text style={styles.sectionTitle}>My Profile</Text>
          <BlurView intensity={20} tint="light" style={styles.glassCard}>
            <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <TouchableOpacity onPress={() => setAvatarModalOpen(true)} style={styles.avatarWrapper}>
                {avatarDisplay}
                <View style={styles.editAvatarBadge}><Ionicons name="camera" size={14} color="#fff" /></View>
              </TouchableOpacity>
              <Text style={styles.profileName}>{myName || 'Your Name'}</Text>
              <Text style={styles.profileSub}>Tap to change photo or emoji</Text>
            </View>
          </BlurView>
        </Animated.View>

        {/* Couple Profile */}
        <Animated.View entering={FadeInUp.delay(150).duration(800)}>
          <Text style={styles.sectionTitle}>Couple Profile</Text>
          <BlurView intensity={20} tint="light" style={styles.glassCard}>
            <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />

            {/* Anniversary date */}
            <Row
              icon="calendar-heart"
              iconColor={colors.primary}
              label="Anniversary Date"
              value={
                pendingAnniversary
                  ? anniversary.toLocaleDateString()
                  : anniversary.toLocaleDateString()
              }
              pending={!!pendingAnniversary}
              pendingText={`Proposed ${proposedAnniversary.toDateString()} — waiting for ${partnerName}`}
              onPress={() => { setProposedAnniversary(anniversary); setAnniversaryModalOpen(true); }}
            />
            <View style={styles.divider} />

            {/* Couple nickname */}
            <Row
              icon="heart-circle-outline"
              label="Couple Name / Ship Name"
              value={coupleNickname || 'e.g. AynSaf'}
              onPress={() => { setTempNickname(coupleNickname); setCoupleNicknameModalOpen(true); }}
            />
            <View style={styles.divider} />

            {/* Our Song */}
            <Row
              icon="musical-notes-outline"
              label="Our Song"
              value={relationshipSong || 'Add your song'}
              onPress={() => { setTempSong(relationshipSong); setSongModalOpen(true); }}
            />
            <View style={styles.divider} />

            {/* Special Place */}
            <Row
              icon="location-outline"
              label="Our Special Place"
              value={specialPlace || 'Add a place'}
              onPress={() => { setTempPlace(specialPlace); setSpecialPlaceModalOpen(true); }}
            />
            <View style={styles.divider} />

            {/* Promise */}
            <Row
              icon="ribbon-outline"
              label="Our Promise"
              value={couplePromise ? `"${couplePromise}"` : 'Write a promise to each other'}
              onPress={() => { setTempPromise(couplePromise); setPromiseModalOpen(true); }}
            />
            <View style={styles.divider} />

            {/* Love Language */}
            <Row
              icon="hand-heart"
              iconColor="#f5a623"
              label="My Love Language"
              value={myLoveLang ? `${myLoveLang.emoji} ${myLoveLang.label}` : 'Not set'}
              onPress={() => setLoveLanguageModalOpen(true)}
            />
            <View style={styles.divider} />

            {/* Next Meeting */}
            <Row
              icon="airplane-outline"
              label="Propose Next Meeting"
              pending={pendingMeeting}
              onPress={() => setMeetingDateModalOpen(true)}
            />

          </BlurView>
        </Animated.View>

        {/* Premium */}
        <Animated.View entering={FadeInUp.delay(200).duration(800)}>
          <TouchableOpacity style={styles.premiumCard}>
            <LinearGradient colors={gradients.love} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={styles.premiumContent}>
              <Ionicons name="sparkles" size={28} color="#fff" />
              <View style={styles.premiumTextGroup}>
                <Text style={styles.premiumTitle}>LoveApp Premium</Text>
                <Text style={styles.premiumSub}>Unlock unlimited time capsules</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Preferences */}
        <Animated.View entering={FadeInUp.delay(300).duration(800)}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <BlurView intensity={20} tint="light" style={styles.glassCard}>
            <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />
            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}><Ionicons name="language" size={20} color={colors.text} /></View>
              <Text style={styles.settingLabel}>Language</Text>
              <View style={styles.rowValue}>
                <Text style={styles.settingValue}>English</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}><Ionicons name="notifications" size={20} color={colors.text} /></View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }} thumbColor="#fff" />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}><Ionicons name="location" size={20} color={colors.text} /></View>
              <Text style={styles.settingLabel}>Location Sharing</Text>
              <Switch value={locationEnabled} onValueChange={setLocationEnabled} trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }} thumbColor="#fff" />
            </View>
          </BlurView>
        </Animated.View>

        {/* Account */}
        <Animated.View entering={FadeInUp.delay(400).duration(800)}>
          <Text style={styles.sectionTitle}>Account & Privacy</Text>
          <BlurView intensity={20} tint="light" style={styles.glassCard}>
            <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingIconBox}><Ionicons name="shield-checkmark" size={20} color={colors.text} /></View>
              <Text style={styles.settingLabel}>Privacy Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(233,64,87,0.15)' }]}><Ionicons name="log-out-outline" size={20} color={colors.primary} /></View>
              <Text style={[styles.settingLabel, { color: colors.primary }]}>Sign Out</Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(800)}>
          <TouchableOpacity style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ====== MODALS ====== */}

      {/* Avatar Picker */}
      <Modal visible={isAvatarModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Profile Picture</Text>
              <TouchableOpacity onPress={() => setAvatarModalOpen(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.optionBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={22} color={colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.optionBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionBtn} onPress={() => { setAvatarModalOpen(false); setEmojiModalOpen(true); }}>
              <Text style={{ fontSize: 22, marginRight: 12 }}>😊</Text>
              <Text style={styles.optionBtnText}>Use an Emoji Instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Emoji Picker */}
      <Modal visible={isEmojiModalOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { paddingBottom: 30 }]}>
            <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick an Emoji Avatar</Text>
              <TouchableOpacity onPress={() => setEmojiModalOpen(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
            </View>
            <View style={styles.emojiGrid}>
              {EMOJI_AVATARS.map(em => (
                <TouchableOpacity key={em} style={[styles.emojiTile, selectedEmoji === em && styles.emojiTileSelected]} onPress={() => selectEmoji(em)}>
                  <Text style={{ fontSize: 34 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Anniversary Edit Modal */}
      <Modal visible={isAnniversaryModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Anniversary Date</Text>
                <TouchableOpacity onPress={() => { setAnniversaryModalOpen(false); setShowAnnivPicker(false); }}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
              </View>
              <Text style={styles.validationNote}>
                🔒 Both you and {partnerName} must agree to this change. A confirmation will be sent to {partnerName} before anything is updated.
              </Text>

              {!showAnnivPicker ? (
                <TouchableOpacity style={styles.inputContainer} onPress={() => setShowAnnivPicker(true)}>
                  <Ionicons name="calendar" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={{ color: '#fff', fontSize: 16 }}>{proposedAnniversary.toDateString()}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 10, marginBottom: 15 }}>
                  <DateTimePicker
                    value={proposedAnniversary}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onAnnivChange}
                    maximumDate={new Date()}
                    textColor="white"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => setShowAnnivPicker(false)} style={styles.doneBtn}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={proposeAnniversaryChange}>
                <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                <Text style={styles.saveBtnText}>Send Change Request 💌</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Couple Nickname */}
      <Modal visible={isCoupleNicknameModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Couple Name</Text>
                <TouchableOpacity onPress={() => setCoupleNicknameModalOpen(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
              </View>
              <Text style={styles.validationNote}>Your shared "ship name" — visible to both of you on the app.</Text>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="e.g. AynSaf" placeholderTextColor="#888" value={tempNickname} onChangeText={setTempNickname} autoFocus />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={() => saveTextField('@coupleNickname', tempNickname, setCoupleNickname, () => setCoupleNicknameModalOpen(false))}>
                <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Our Song */}
      <Modal visible={isSongModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Our Song 🎵</Text>
                <TouchableOpacity onPress={() => setSongModalOpen(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
              </View>
              <Text style={styles.validationNote}>Add the title of the song that means the most to both of you.</Text>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="Song title — Artist" placeholderTextColor="#888" value={tempSong} onChangeText={setTempSong} autoFocus />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={() => saveTextField('@relationshipSong', tempSong, setRelationshipSong, () => setSongModalOpen(false))}>
                <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Special Place */}
      <Modal visible={isSpecialPlaceModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Our Special Place 📍</Text>
                <TouchableOpacity onPress={() => setSpecialPlaceModalOpen(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
              </View>
              <Text style={styles.validationNote}>A city, restaurant, or any place that holds a special memory for both of you.</Text>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="e.g. The café in Paris where we met" placeholderTextColor="#888" value={tempPlace} onChangeText={setTempPlace} autoFocus />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={() => saveTextField('@specialPlace', tempPlace, setSpecialPlace, () => setSpecialPlaceModalOpen(false))}>
                <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Our Promise */}
      <Modal visible={isPromiseModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Our Promise 🎀</Text>
                <TouchableOpacity onPress={() => setPromiseModalOpen(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
              </View>
              <Text style={styles.validationNote}>A short promise or quote that defines your relationship — visible to both of you.</Text>
              <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 15 }]}>
                <TextInput style={[styles.input]} placeholder="Promise each other something…" placeholderTextColor="#888" value={tempPromise} onChangeText={setTempPromise} autoFocus multiline />
              </View>
              <TouchableOpacity style={[styles.saveBtn, { marginTop: 10 }]} onPress={() => saveTextField('@couplePromise', tempPromise, setCouplePromise, () => setPromiseModalOpen(false))}>
                <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Love Language */}
      <Modal visible={isLoveLanguageModalOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Love Language</Text>
              <TouchableOpacity onPress={() => setLoveLanguageModalOpen(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
            </View>
            <Text style={styles.validationNote}>How do you feel most loved? This helps your partner know how to show up for you.</Text>
            {LOVE_LANGUAGES.map(lang => (
              <TouchableOpacity key={lang.id} style={[styles.optionBtn, myLoveLanguage === lang.id && { borderWidth: 1, borderColor: colors.primary }]} onPress={() => saveLoveLanguage(lang)}>
                <Text style={{ fontSize: 22, marginRight: 12 }}>{lang.emoji}</Text>
                <Text style={styles.optionBtnText}>{lang.label}</Text>
                {myLoveLanguage === lang.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Propose Meeting */}
      <Modal visible={isMeetingDateModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Propose Next Meeting</Text>
                <TouchableOpacity onPress={() => setMeetingDateModalOpen(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
              </View>
              <Text style={styles.validationNote}>📬 Once you propose a date, {partnerName} will receive a notification to confirm before the event is created.</Text>
              {!showDatePicker ? (
                <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={{ color: '#fff', fontSize: 16 }}>{proposedMeetingDate.toDateString()}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 10, marginBottom: 15 }}>
                  <DateTimePicker value={proposedMeetingDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onMeetingDateChange} minimumDate={new Date()} textColor="white" />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <TouchableOpacity style={styles.saveBtn} onPress={proposeMeetingDate}>
                <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                <Text style={styles.saveBtnText}>Send Proposal 💌</Text>
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
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 25 },
  greeting: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  subGreeting: { fontSize: 16, color: colors.textSecondary, marginTop: 5 },
  sectionTitle: { fontSize: 16, color: colors.textSecondary, fontWeight: '600', marginBottom: 12, marginTop: 10, marginLeft: 5 },
  glassCard: { borderRadius: 24, padding: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },

  avatarWrapper: { width: 90, height: 90, marginBottom: 12 },
  largeAvatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: colors.primary },
  emojiAvatarLarge: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  profileSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },

  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  settingIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  settingLabel: { flex: 1, marginLeft: 0, fontSize: 15, color: colors.text, fontWeight: '500' },
  settingValue: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pendingText: { fontSize: 12, color: '#f5a623', marginTop: 2 },
  rowValue: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 2 },

  premiumCard: { borderRadius: 20, marginBottom: 25, overflow: 'hidden' },
  premiumContent: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  premiumTextGroup: { flex: 1, marginLeft: 15 },
  premiumTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  premiumSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  deleteBtn: { marginTop: 10, alignSelf: 'center', padding: 15 },
  deleteBtnText: { color: colors.textSecondary, fontSize: 15, textDecorationLine: 'underline' },
  bottomSpacer: { height: 100 },

  modalBg: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.65)' },
  modalContent: { width: '100%', backgroundColor: '#24243e', borderRadius: 24, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1 },
  validationNote: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, paddingHorizontal: 15, marginBottom: 15, height: 50 },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  doneBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 15, alignSelf: 'center' },
  saveBtn: { overflow: 'hidden', borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 15, padding: 16, marginBottom: 10 },
  optionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emojiTile: { width: '19%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  emojiTileSelected: { backgroundColor: 'rgba(233,64,87,0.25)', borderWidth: 2, borderColor: colors.primary },
});
