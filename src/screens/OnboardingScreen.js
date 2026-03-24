import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../theme/colors';

const MOODS = [
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'love', label: 'Love', emoji: '😍' },
  { id: 'sleepy', label: 'Sleepy', emoji: '😴' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'missing', label: 'Missing', emoji: '😭' },
  { id: 'angry', label: 'Angry', emoji: '😠' },
];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  
  const [myName, setMyName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [myAvatar, setMyAvatar] = useState(null);
  const [anniversary, setAnniversary] = useState(new Date());
  const [myMood, setMyMood] = useState(MOODS[0]);
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleNext = async () => {
    if (step === 0 && !myName.trim()) return alert("Please enter your name 😄");
    if (step === 1 && !partnerName.trim()) return alert("Please enter their name 😊");
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      try {
        const payload = [
          ['@myName', myName],
          ['@partnerName', partnerName],
          ['@anniversaryDate', anniversary.toISOString()],
          ['@myStatus', `${myMood.label} ${myMood.emoji}`],
          ['@hasOnboarded', 'true']
        ];
        if (myAvatar) payload.push(['@myAvatar', myAvatar]);

        await AsyncStorage.multiSet(payload);
        onComplete();
      } catch (e) {
        console.error("Failed to save onboarding data:", e);
        onComplete();
      }
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setMyAvatar(result.assets[0].uri);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setAnniversary(selectedDate);
  };

  const renderStepContent = () => {
    switch(step) {
      case 0:
        return (
          <Animated.View key="step0" entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>Let's start by getting to know you. What is your name?</Text>
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input} 
                placeholder="Your Name" 
                placeholderTextColor="#888"
                value={myName}
                onChangeText={setMyName}
                autoFocus
                onSubmitEditing={handleNext}
              />
            </View>
          </Animated.View>
        );
      case 1:
        return (
          <Animated.View key="step1" entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.title}>Nice to meet you, {myName}!</Text>
            <Text style={styles.subtitle}>What is your partner's name?</Text>
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input} 
                placeholder="Partner's Name" 
                placeholderTextColor="#888"
                value={partnerName}
                onChangeText={setPartnerName}
                autoFocus
                onSubmitEditing={handleNext}
              />
            </View>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View key="step2" entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.title}>Your Profile</Text>
            <Text style={styles.subtitle}>Let's put a face to the name! Choose a beautiful profile picture.</Text>
            
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarPicker}>
                {myAvatar ? (
                  <Image source={{ uri: myAvatar }} style={styles.previewAvatar} />
                ) : (
                  <>
                    <Ionicons name="camera" size={40} color={colors.primary} />
                    <Text style={styles.avatarPickerText}>Tap to add photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.skipBtn} onPress={handleNext}>
              <Text style={styles.skipBtnText}>{myAvatar ? "Looks great! Continue" : "Skip for now"}</Text>
            </TouchableOpacity>

          </Animated.View>
        );
      case 3:
        return (
          <Animated.View key="step3" entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.title}>Your Journey</Text>
            <Text style={styles.subtitle}>When did you and {partnerName} start this beautiful journey together?</Text>
            
            {!showDatePicker && (
              <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.input, { paddingTop: Platform.OS === 'ios' ? 14 : 0 }]}>
                  {anniversary.toDateString()}
                </Text>
              </TouchableOpacity>
            )}

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={anniversary}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  textColor="white"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                    <Text style={styles.doneBtnText}>Confirm Date</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>
        );
      case 4:
        return (
          <Animated.View key="step4" entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.title}>Almost there!</Text>
            <Text style={styles.subtitle}>How are you feeling right now? Your partner will see this.</Text>
            
            <View style={styles.moodsGrid}>
              {MOODS.map(m => (
                <TouchableOpacity 
                  key={m.id} 
                  style={[styles.moodOption, myMood.id === m.id && styles.moodOptionSelected]} 
                  onPress={() => setMyMood(m)}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, myMood.id === m.id && {color: '#fff'}]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <LinearGradient colors={colors.background === '#1A1A2E' ? ['#0f0c29', '#302b63', '#24243e'] : ['#1A1A2E', '#1A1A2E']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <View style={styles.innerContainer}>
          
          <View style={styles.content}>
            {renderStepContent()}
          </View>

          {step !== 2 && ( // For step 2 we have a custom skip/continue button directly inside the step view
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} />
              <Text style={styles.nextBtnText}>{step === 4 ? "Start Journey" : "Continue"}</Text>
            </TouchableOpacity>
          )}

        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1, padding: 30, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center' },
  stepContainer: { width: '100%' },
  
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
  subtitle: { fontSize: 18, color: colors.textSecondary, marginBottom: 35, lineHeight: 26 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, paddingHorizontal: 20, height: 60, borderWidth: 1, borderColor: colors.cardBorder },
  input: { flex: 1, color: '#fff', fontSize: 20 },

  avatarPicker: { width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  avatarPickerText: { color: colors.primary, marginTop: 10, fontSize: 12, fontWeight: 'bold' },
  previewAvatar: { width: 146, height: 146, borderRadius: 73 },

  skipBtn: { paddingVertical: 18, alignItems: 'center', marginTop: 30, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
  skipBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  datePickerContainer: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  doneBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 15 },
  doneBtnText: { color: '#fff', fontWeight: 'bold' },

  moodsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moodOption: { width: '31%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingVertical: 20, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moodOptionSelected: { backgroundColor: 'rgba(233, 64, 87, 0.2)', borderColor: colors.primary },
  moodEmoji: { fontSize: 34, marginBottom: 10 },
  moodLabel: { color: '#aaa', fontSize: 14, fontWeight: '600' },

  nextBtn: { overflow: 'hidden', borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginBottom: 40 },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
