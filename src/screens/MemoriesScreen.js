import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Modal, TextInput, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInRight, FadeIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, gradients } from '../theme/colors';

export default function MemoriesScreen() {
  const [activeSegment, setActiveSegment] = useState('Timeline');
  const [editingMemory, setEditingMemory] = useState(null);

  // ─── Memories ───
  const [memories, setMemories] = useState([]);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [newEmoji, setNewEmoji] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [mediaType, setMediaType] = useState('emoji');
  const [showMemDatePicker, setShowMemDatePicker] = useState(false);

  // ─── Capsules ───
  const [capsules, setCapsules] = useState([]);
  const [showCreateCapsule, setShowCreateCapsule] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState(null);
  const [countdown, setCountdown] = useState({});
  const [partnerName, setPartnerName] = useState('Partner');
  const [capTitle, setCapTitle] = useState('');
  const [capMessage, setCapMessage] = useState('');
  const [capUnlockDate, setCapUnlockDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [capAuthor, setCapAuthor] = useState('me');
  const [showCapDatePicker, setShowCapDatePicker] = useState(false);

  // ─── Load on mount ───
  useEffect(() => {
    AsyncStorage.multiGet(['@memories', '@capsules', '@partnerName']).then(pairs => {
      if (pairs[0][1]) setMemories(JSON.parse(pairs[0][1]));
      if (pairs[1][1]) setCapsules(JSON.parse(pairs[1][1]));
      if (pairs[2][1]) setPartnerName(pairs[2][1]);
    }).catch(() => {});
  }, []);

  // ─── Live countdown (only when Capsules tab is active) ───
  useEffect(() => {
    if (activeSegment !== 'Capsules') return;
    const tick = () => {
      const now = Date.now();
      const updated = {};
      capsules.forEach(cap => {
        const diff = new Date(cap.unlockDate).getTime() - now;
        updated[cap.id] = diff <= 0
          ? { days: 0, hours: 0, mins: 0, secs: 0, unlocked: true }
          : {
              days: Math.floor(diff / 86400000),
              hours: Math.floor((diff / 3600000) % 24),
              mins: Math.floor((diff / 60000) % 60),
              secs: Math.floor((diff / 1000) % 60),
              unlocked: false,
            };
      });
      setCountdown(updated);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSegment, capsules]);

  // ─── Helpers ───
  const isUnlocked = (cap) => new Date(cap.unlockDate) <= new Date();

  const formatDate = (isoStr) =>
    new Date(isoStr).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  // ─── Memory handlers ───
  const pickMemoryImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setNewImage(result.assets[0].uri);
  };

  const resetMemoryForm = () => {
    setNewTitle(''); setNewDescription(''); setNewDate(new Date());
    setNewEmoji(''); setNewImage(null); setMediaType('emoji');
    setShowMemDatePicker(false); setEditingMemory(null);
  };

  const saveMemory = async () => {
    if (!newTitle.trim()) return Alert.alert('Title required', 'Please add a title for this memory.');
    const memoryData = {
      id: editingMemory ? editingMemory.id : Date.now().toString(),
      title: newTitle.trim(),
      description: newDescription.trim(),
      date: newDate.toISOString(),
      emoji: mediaType === 'emoji' ? newEmoji.trim() : null,
      image: mediaType === 'image' ? newImage : null,
    };
    const updated = editingMemory
      ? memories.map(m => m.id === editingMemory.id ? memoryData : m)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      : [...memories, memoryData].sort((a, b) => new Date(a.date) - new Date(b.date));
    await AsyncStorage.setItem('@memories', JSON.stringify(updated));
    setMemories(updated);
    resetMemoryForm();
    setShowAddMemory(false);
  };

  const openEditMemory = (mem) => {
    setEditingMemory(mem);
    setNewTitle(mem.title);
    setNewDescription(mem.description || '');
    setNewDate(new Date(mem.date));
    setNewEmoji(mem.emoji || '');
    setNewImage(mem.image || null);
    setMediaType(mem.image ? 'image' : 'emoji');
    setShowAddMemory(true);
  };

  const deleteMemory = (mem) => {
    Alert.alert(
      'Delete Memory',
      `Remove "${mem.title}" from your timeline?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = memories.filter(m => m.id !== mem.id);
            await AsyncStorage.setItem('@memories', JSON.stringify(updated));
            setMemories(updated);
          },
        },
      ]
    );
  };

  // ─── Capsule handlers ───
  const saveCapsule = async () => {
    if (!capTitle.trim()) return Alert.alert('Title required');
    if (!capMessage.trim()) return Alert.alert('Message required');
    if (capUnlockDate <= new Date()) return Alert.alert('Invalid date', 'Unlock date must be in the future.');

    // ⚠️ Confirmation: once sent, capsules cannot be edited or deleted
    Alert.alert(
      '🔒 Send Capsule?',
      'Once sent, this capsule cannot be edited or deleted. Are you sure you want to seal it?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send it 💌',
          style: 'default',
          onPress: async () => {
            const capsule = {
              id: Date.now().toString(),
              title: capTitle.trim(),
              message: capMessage.trim(),
              unlockDate: capUnlockDate.toISOString(),
              createdDate: new Date().toISOString(),
              author: capAuthor,
              isOpened: false,
            };
            const updated = [...capsules, capsule].sort((a, b) => new Date(a.unlockDate) - new Date(b.unlockDate));
            await AsyncStorage.setItem('@capsules', JSON.stringify(updated));
            setCapsules(updated);
            setCapTitle(''); setCapMessage(''); setCapAuthor('me'); setShowCapDatePicker(false);
            setCapUnlockDate(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; });
            setShowCreateCapsule(false);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const markOpened = async (capsule) => {
    const updated = capsules.map(c => c.id === capsule.id ? { ...c, isOpened: true } : c);
    await AsyncStorage.setItem('@capsules', JSON.stringify(updated));
    setCapsules(updated);
    setSelectedCapsule({ ...capsule, isOpened: true });
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER SECTIONS
  // ═══════════════════════════════════════════════════════════

  const renderTimeline = () => (
    <Animated.View entering={FadeIn.duration(500)}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Relationship Timeline</Text>
      </View>

      {memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💝</Text>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptySubtitle}>Tap + to add your first memory</Text>
        </View>
      ) : (
        <View style={styles.timelineContainer}>
          <View style={styles.timelineLine} />
          {memories.map((mem, index) => (
            <Animated.View key={mem.id} entering={FadeInUp.delay(index * 100).duration(800)} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <BlurView intensity={15} tint="light" style={styles.timelineCard}>
                <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />

                {/* Main row — tap opens detail */}
                <TouchableOpacity onPress={() => setSelectedMemory(mem)} activeOpacity={0.8}>
                  <View style={styles.timelineCardInner}>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineDate}>{formatDate(mem.date)}</Text>
                      <Text style={styles.timelineText}>{mem.title}</Text>
                      {!!mem.description && (
                        <Text style={styles.timelinePreview} numberOfLines={2}>{mem.description}</Text>
                      )}
                    </View>
                    {mem.image ? (
                      <Image source={{ uri: mem.image }} style={styles.timelineThumb} />
                    ) : (
                      <View style={styles.timelineEmojiBox}>
                        <Text style={styles.timelineEmoji}>{mem.emoji || '❤️'}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Edit / Delete action bar */}
                <View style={styles.timelineActions}>
                  <TouchableOpacity style={styles.timelineActionBtn} onPress={() => openEditMemory(mem)}>
                    <Ionicons name="pencil-outline" size={13} color={colors.primary} />
                    <Text style={styles.timelineActionText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.timelineActionDivider} />
                  <TouchableOpacity style={styles.timelineActionBtn} onPress={() => deleteMemory(mem)}>
                    <Ionicons name="trash-outline" size={13} color="#E94057" />
                    <Text style={[styles.timelineActionText, { color: '#E94057' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>

              </BlurView>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddMemory(true)}>
        <LinearGradient colors={gradients.love} style={[StyleSheet.absoluteFill, { borderRadius: 30 }]} />
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCapsules = () => (
    <Animated.View entering={FadeIn.duration(500)}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vaulted Messages</Text>
        <TouchableOpacity style={styles.addCapBtn} onPress={() => setShowCreateCapsule(true)}>
          <LinearGradient colors={gradients.active} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addCapBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {capsules.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⏳</Text>
          <Text style={styles.emptyTitle}>No capsules yet</Text>
          <Text style={styles.emptySubtitle}>Create a message locked in time</Text>
        </View>
      ) : (
        capsules.map((cap, index) => {
          const cd = countdown[cap.id];
          const unlocked = isUnlocked(cap);
          return (
            <TouchableOpacity key={cap.id} onPress={() => setSelectedCapsule(cap)} activeOpacity={0.8}>
              <Animated.View entering={FadeInUp.delay(index * 100).duration(800)} style={{ marginBottom: 15 }}>
                <BlurView intensity={20} tint="light" style={styles.capsuleCard}>
                  <LinearGradient
                    colors={unlocked
                      ? ['rgba(242,113,33,0.25)', 'rgba(233,64,87,0.10)']
                      : ['rgba(242,113,33,0.12)', 'rgba(233,64,87,0.04)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.capsuleRow}>
                    <View style={[styles.capsuleLockCircle, unlocked && styles.capsuleLockCircleOpen]}>
                      <Ionicons
                        name={unlocked ? 'lock-open-outline' : 'lock-closed'}
                        size={22}
                        color={unlocked ? '#F27121' : colors.tertiary}
                      />
                    </View>
                    <View style={styles.capsuleInfo}>
                      <Text style={styles.capsuleTitle}>{cap.title}</Text>
                      <Text style={styles.capsuleAuthor}>
                        From {cap.author === 'me' ? 'you' : partnerName} · {formatDate(cap.createdDate)}
                      </Text>
                      {unlocked ? (
                        cap.isOpened ? (
                          <View style={styles.openedBadge}>
                            <Text style={styles.openedBadgeText}>Opened ✓</Text>
                          </View>
                        ) : (
                          <View style={styles.revealBadge}>
                            <Text style={styles.revealBadgeText}>✨ Tap to reveal</Text>
                          </View>
                        )
                      ) : cd ? (
                        <Text style={styles.capsuleCountdown}>
                          🔒 {cd.days}d {String(cd.hours).padStart(2, '0')}h {String(cd.mins).padStart(2, '0')}m {String(cd.secs).padStart(2, '0')}s
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </BlurView>
              </Animated.View>
            </TouchableOpacity>
          );
        })
      )}
    </Animated.View>
  );

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInRight.duration(800)} style={styles.header}>
          <Text style={styles.greeting}>Our History</Text>
          <Text style={styles.subGreeting}>A digital archive of our love</Text>
        </Animated.View>

        {/* Modern Segmented Controls */}
        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.segmentContainer}>
          {[
            { key: 'Timeline', icon: 'time-outline',     label: 'Timeline' },
            { key: 'Capsules', icon: 'lock-closed-outline', label: 'Capsules' },
          ].map(({ key, icon, label }) => {
            const isActive = activeSegment === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                onPress={() => setActiveSegment(key)}
                activeOpacity={0.75}
              >
                {isActive && (
                  <LinearGradient
                    colors={gradients.active}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
                )}
                <Ionicons name={icon} size={15} color={isActive ? '#fff' : colors.textSecondary} />
                <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Dynamic Content */}
        <View style={styles.dynamicContent}>
          {activeSegment === 'Timeline' && renderTimeline()}
          {activeSegment === 'Capsules' && renderCapsules()}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════
          ADD MEMORY MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={showAddMemory} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <BlurView intensity={50} tint="dark" style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingMemory ? 'Edit Memory ✏️' : 'Add a Memory'}</Text>
                  <TouchableOpacity onPress={() => { setShowAddMemory(false); resetMemoryForm(); }}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <View style={styles.inputContainer}>
                  <Ionicons name="heart-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Memory title..."
                    placeholderTextColor="#888"
                    value={newTitle}
                    onChangeText={setNewTitle}
                  />
                </View>

                {/* Date */}
                {!showMemDatePicker ? (
                  <TouchableOpacity style={styles.inputContainer} onPress={() => setShowMemDatePicker(true)}>
                    <Ionicons name="calendar" size={20} color={colors.primary} style={styles.inputIcon} />
                    <Text style={[styles.input, { paddingTop: Platform.OS === 'ios' ? 14 : 0 }]}>
                      {newDate.toDateString()}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={newDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(e, d) => {
                        if (Platform.OS === 'android') setShowMemDatePicker(false);
                        if (d) setNewDate(d);
                      }}
                      maximumDate={new Date()}
                      textColor="white"
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity onPress={() => setShowMemDatePicker(false)} style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>Confirm Date</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Media type toggle */}
                <Text style={styles.pickerLabel}>Attach</Text>
                <View style={styles.mediaToggle}>
                  {['emoji', 'image'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.mediaToggleBtn, mediaType === type && styles.mediaToggleBtnActive]}
                      onPress={() => setMediaType(type)}
                    >
                      {mediaType === type && (
                        <LinearGradient colors={gradients.active} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
                      )}
                      <Ionicons
                        name={type === 'emoji' ? 'happy-outline' : 'image-outline'}
                        size={18}
                        color={mediaType === type ? '#fff' : '#888'}
                      />
                      <Text style={[styles.mediaToggleText, mediaType === type && { color: '#fff' }]}>
                        {type === 'emoji' ? 'Emoji' : 'Photo'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {mediaType === 'emoji' ? (
                  <View style={styles.inputContainer}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{newEmoji || '😊'}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Type an emoji..."
                      placeholderTextColor="#888"
                      value={newEmoji}
                      onChangeText={t => setNewEmoji(t.slice(-2))}
                      maxLength={2}
                    />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePicker} onPress={pickMemoryImage}>
                    {newImage ? (
                      <Image source={{ uri: newImage }} style={styles.imagePickerPreview} />
                    ) : (
                      <View style={styles.imagePickerPlaceholder}>
                        <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
                        <Text style={styles.imagePickerText}>Tap to choose a photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* Description */}
                <View style={[styles.inputContainer, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                  <Ionicons name="pencil-outline" size={20} color={colors.primary} style={[styles.inputIcon, { marginTop: 2 }]} />
                  <TextInput
                    style={[styles.input, { height: 76 }]}
                    placeholder="Describe this memory..."
                    placeholderTextColor="#888"
                    value={newDescription}
                    onChangeText={setNewDescription}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={saveMemory}>
                  <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
                  <Text style={styles.saveBtnText}>{editingMemory ? 'Update Memory ✏️' : 'Save Memory 💕'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          MEMORY DETAIL MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={!!selectedMemory} transparent animationType="fade">
        <BlurView intensity={50} tint="dark" style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMemory(null)}>
              <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            {selectedMemory && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedMemory.image ? (
                  <Image source={{ uri: selectedMemory.image }} style={styles.detailImage} />
                ) : (
                  <View style={styles.detailEmojiBox}>
                    <Text style={styles.detailEmoji}>{selectedMemory.emoji || '❤️'}</Text>
                  </View>
                )}
                <Text style={styles.detailTitle}>{selectedMemory.title}</Text>
                <Text style={styles.detailDate}>{formatDate(selectedMemory.date)}</Text>
                {!!selectedMemory.description && (
                  <Text style={styles.detailDescription}>{selectedMemory.description}</Text>
                )}
              </ScrollView>
            )}
          </View>
        </BlurView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          CREATE CAPSULE MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={showCreateCapsule} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <BlurView intensity={50} tint="dark" style={styles.modalBg}>
            <View style={styles.modalContent}>
              <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Bury a Message ⏳</Text>
                  <TouchableOpacity onPress={() => setShowCreateCapsule(false)}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <View style={styles.inputContainer}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Capsule title..."
                    placeholderTextColor="#888"
                    value={capTitle}
                    onChangeText={setCapTitle}
                  />
                </View>

                {/* Author toggle */}
                <Text style={styles.pickerLabel}>From</Text>
                <View style={styles.mediaToggle}>
                  {[{ key: 'me', label: 'Me' }, { key: 'partner', label: partnerName }].map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.mediaToggleBtn, capAuthor === opt.key && styles.mediaToggleBtnActive]}
                      onPress={() => setCapAuthor(opt.key)}
                    >
                      {capAuthor === opt.key && (
                        <LinearGradient colors={['#F27121', '#E94057']} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
                      )}
                      <Text style={[styles.mediaToggleText, capAuthor === opt.key && { color: '#fff' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Unlock Date */}
                <Text style={styles.pickerLabel}>Unlock Date</Text>
                {!showCapDatePicker ? (
                  <TouchableOpacity style={styles.inputContainer} onPress={() => setShowCapDatePicker(true)}>
                    <Ionicons name="calendar" size={20} color={colors.tertiary} style={styles.inputIcon} />
                    <Text style={[styles.input, { paddingTop: Platform.OS === 'ios' ? 14 : 0 }]}>
                      {capUnlockDate.toDateString()}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={capUnlockDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(e, d) => {
                        if (Platform.OS === 'android') setShowCapDatePicker(false);
                        if (d) setCapUnlockDate(d);
                      }}
                      minimumDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })()}
                      textColor="white"
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity onPress={() => setShowCapDatePicker(false)} style={[styles.doneBtn, { backgroundColor: colors.tertiary }]}>
                        <Text style={styles.doneBtnText}>Confirm Date</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Message */}
                <View style={[styles.inputContainer, { height: 140, alignItems: 'flex-start', paddingTop: 12 }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.tertiary} style={[styles.inputIcon, { marginTop: 2 }]} />
                  <TextInput
                    style={[styles.input, { height: 116 }]}
                    placeholder="Write your message..."
                    placeholderTextColor="#888"
                    value={capMessage}
                    onChangeText={setCapMessage}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={saveCapsule}>
                  <LinearGradient colors={['#F27121', '#E94057']} style={StyleSheet.absoluteFill} />
                  <Text style={styles.saveBtnText}>Bury Message 🔒</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          CAPSULE DETAIL MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={!!selectedCapsule} transparent animationType="fade">
        <BlurView intensity={50} tint="dark" style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <LinearGradient colors={['#302b63', '#24243e']} style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedCapsule(null)}>
              <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            {selectedCapsule && (() => {
              const unlocked = isUnlocked(selectedCapsule);
              const cd = countdown[selectedCapsule.id];
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.capsuleDetailIcon}>
                    <Ionicons
                      name={unlocked ? 'mail-open-outline' : 'lock-closed'}
                      size={60}
                      color={unlocked ? '#F27121' : colors.tertiary}
                    />
                  </View>
                  <Text style={styles.detailTitle}>{selectedCapsule.title}</Text>
                  <Text style={styles.detailDate}>
                    From {selectedCapsule.author === 'me' ? 'you' : partnerName} · {formatDate(selectedCapsule.createdDate)}
                  </Text>
                  {unlocked ? (
                    <>
                      <View style={styles.messageBox}>
                        <LinearGradient colors={['rgba(242,113,33,0.15)', 'rgba(233,64,87,0.05)']} style={StyleSheet.absoluteFill} />
                        <Text style={styles.messageText}>{selectedCapsule.message}</Text>
                      </View>
                      {!selectedCapsule.isOpened && (
                        <TouchableOpacity style={[styles.saveBtn, { marginTop: 15 }]} onPress={() => markOpened(selectedCapsule)}>
                          <LinearGradient colors={['#F27121', '#E94057']} style={StyleSheet.absoluteFill} />
                          <Text style={styles.saveBtnText}>Mark as Opened 💌</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <View style={styles.lockedState}>
                      <Text style={styles.lockedText}>This message is still locked 🔒</Text>
                      {cd && (
                        <Text style={styles.lockedCountdown}>
                          {cd.days}d {String(cd.hours).padStart(2, '0')}h {String(cd.mins).padStart(2, '0')}m {String(cd.secs).padStart(2, '0')}s
                        </Text>
                      )}
                      <Text style={styles.lockedUnlockDate}>Unlocks on {formatDate(selectedCapsule.unlockDate)}</Text>
                    </View>
                  )}
                </ScrollView>
              );
            })()}
          </View>
        </BlurView>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  subGreeting: { fontSize: 16, color: colors.textSecondary, marginTop: 5 },

  // Segmented control — modern pill
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 5,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    overflow: 'hidden',
    gap: 6,
  },
  segmentBtnActive: {},
  segmentText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#fff', fontWeight: '700', fontSize: 14 },

  dynamicContent: { minHeight: 400 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, color: colors.textSecondary, fontWeight: '600' },

  // Add cap button
  addCapBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, overflow: 'hidden',
  },
  addCapBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 4 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: colors.textSecondary, fontSize: 15 },

  // Timeline
  timelineContainer: { paddingLeft: 20, position: 'relative' },
  timelineLine: {
    position: 'absolute', left: 27, top: 8, bottom: 0, width: 2,
    backgroundColor: 'rgba(233,64,87,0.3)',
  },
  timelineItem: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  timelineDot: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary,
    borderWidth: 3, borderColor: '#24243e', marginRight: 16, zIndex: 2, flexShrink: 0,
  },
  timelineCard: {
    flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder,
  },
  timelineCardInner: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  timelineContent: { flex: 1, marginRight: 12 },
  timelineDate: { color: colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  timelineText: { color: colors.text, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  timelinePreview: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  timelineThumb: { width: 70, height: 70, borderRadius: 12, flexShrink: 0 },
  timelineEmojiBox: {
    width: 70, height: 70, borderRadius: 12, backgroundColor: 'rgba(233,64,87,0.1)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  timelineEmoji: { fontSize: 34 },

  // Timeline action bar (Edit / Delete)
  timelineActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  timelineActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 5,
  },
  timelineActionDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  timelineActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  // FAB
  fab: {
    width: 60, height: 60, borderRadius: 30, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginTop: 24,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },

  // Capsule cards
  capsuleCard: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(242, 113, 33, 0.3)',
  },
  capsuleRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  capsuleLockCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(242,113,33,0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14, flexShrink: 0,
  },
  capsuleLockCircleOpen: { backgroundColor: 'rgba(242,113,33,0.25)' },
  capsuleInfo: { flex: 1 },
  capsuleTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
  capsuleAuthor: { color: colors.textSecondary, fontSize: 12, marginBottom: 6 },
  capsuleCountdown: { color: colors.tertiary, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  revealBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(242,113,33,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(242,113,33,0.5)',
  },
  revealBadgeText: { color: '#F27121', fontSize: 12, fontWeight: 'bold' },
  openedBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  openedBadgeText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

  bottomSpacer: { height: 100 },

  // MODALS
  modalBg: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 20, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '100%', backgroundColor: '#24243e', borderRadius: 24,
    padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 25,
  },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15,
    paddingHorizontal: 15, marginBottom: 15, height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 16 },

  datePickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15,
    padding: 15, marginBottom: 15, alignItems: 'center',
  },
  doneBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: 20, marginTop: 15,
  },
  doneBtnText: { color: '#fff', fontWeight: 'bold' },

  pickerLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 10, fontWeight: '600' },

  // Media toggle
  mediaToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 4, marginBottom: 15,
  },
  mediaToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, overflow: 'hidden', gap: 6,
  },
  mediaToggleBtnActive: {},
  mediaToggleText: { color: '#888', fontWeight: '600', fontSize: 14 },

  // Image picker
  imagePicker: {
    borderRadius: 15, borderWidth: 1.5, borderColor: 'rgba(233,64,87,0.4)',
    borderStyle: 'dashed', marginBottom: 15, overflow: 'hidden',
  },
  imagePickerPreview: { width: '100%', height: 160 },
  imagePickerPlaceholder: { alignItems: 'center', paddingVertical: 30 },
  imagePickerText: { color: colors.textSecondary, marginTop: 8, fontSize: 14 },

  saveBtn: { overflow: 'hidden', borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Close button (top-right of detail modals)
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 10 },

  // Memory detail
  detailImage: { width: '100%', height: 220, borderRadius: 18, marginBottom: 20, marginTop: 10 },
  detailEmojiBox: {
    alignItems: 'center', paddingVertical: 30, marginTop: 10,
  },
  detailEmoji: { fontSize: 72 },
  detailTitle: {
    color: colors.text, fontSize: 24, fontWeight: '800',
    marginBottom: 8, paddingTop: 4,
  },
  detailDate: { color: colors.primary, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  detailDescription: {
    color: colors.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 20,
  },

  // Capsule detail
  capsuleDetailIcon: { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  messageBox: {
    borderRadius: 16, padding: 20, marginVertical: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(242,113,33,0.3)',
  },
  messageText: { color: colors.text, fontSize: 16, lineHeight: 26 },
  lockedState: { alignItems: 'center', paddingVertical: 24 },
  lockedText: { color: colors.textSecondary, fontSize: 16, marginBottom: 16 },
  lockedCountdown: {
    color: colors.tertiary, fontSize: 28, fontWeight: '800',
    marginBottom: 12, fontVariant: ['tabular-nums'],
  },
  lockedUnlockDate: { color: colors.textSecondary, fontSize: 14 },
});
