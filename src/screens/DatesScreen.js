import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { colors, gradients } from '../theme/colors';

// MOCK DATA
const activities = [
  { id: 1, title: 'Movie Night: Inception', date: 'Tomorrow, 8:00 PM', type: 'movie', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400&auto=format&fit=crop' },
  { id: 2, title: 'Trivia Quiz Challenge', date: 'Saturday, 9:30 PM', type: 'game', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop' },
];

export default function DatesScreen() {
  return (
    <LinearGradient colors={colors.background === '#1A1A2E' ? ['#0f0c29', '#302b63', '#24243e'] : ['#1A1A2E', '#1A1A2E']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <Animated.View entering={FadeInRight.duration(800)} style={styles.header}>
          <Text style={styles.greeting}>Dates & Activities</Text>
          <Text style={styles.subGreeting}>Keep the spark alive</Text>
        </Animated.View>

        {/* Up Next Section */}
        <Text style={styles.sectionTitle}>Up Next</Text>
        {activities.map((activity, index) => (
          <Animated.View key={activity.id} entering={FadeInUp.delay(200 + index * 100).duration(800)}>
            <TouchableOpacity style={styles.activityCard}>
              <ImageBackground source={{ uri: activity.image }} style={styles.cardImage} imageStyle={{ borderRadius: 20 }}>
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.cardGradient}>
                  <View style={styles.cardContent}>
                    <View style={styles.typeBadge}>
                      <Ionicons name={activity.type === 'movie' ? 'film' : 'game-controller'} size={14} color="#fff" />
                      <Text style={styles.typeText}>{activity.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDate}>{activity.date}</Text>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Actions Section */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Explore Ideas</Text>
        <Animated.View entering={FadeInUp.delay(500).duration(800)} style={styles.actionGrid}>
          
          <TouchableOpacity style={[styles.actionBtn, styles.halfBtn]}>
            <BlurView intensity={30} tint="light" style={styles.glassBtn}>
              <LinearGradient colors={gradients.active} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} opacity={0.3} />
              <Ionicons name="restaurant" size={32} color={colors.text} />
              <Text style={styles.actionText}>Date Ideas</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.halfBtn]}>
            <BlurView intensity={30} tint="light" style={styles.glassBtn}>
              <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />
              <Ionicons name="calendar" size={32} color={colors.text} />
              <Text style={styles.actionText}>Plan Date</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.fullBtn]}>
            <BlurView intensity={30} tint="light" style={styles.glassBtn}>
              <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />
              <View style={styles.rowCenter}>
                <Ionicons name="notifications" size={24} color={colors.primary} />
                <Text style={styles.actionTextFull}>Set automatic reminders</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </BlurView>
          </TouchableOpacity>

        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  subGreeting: {
    fontSize: 16,
    color: colors.primary,
    marginTop: 5,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 15,
  },
  activityCard: {
    height: 180,
    marginBottom: 20,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: 20,
    padding: 20,
  },
  cardContent: {
    justifyContent: 'flex-end',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 8,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  activityTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activityDate: {
    color: '#f0f0f0',
    fontSize: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionBtn: {
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  halfBtn: {
    width: '48%',
    height: 120,
  },
  fullBtn: {
    width: '100%',
    height: 70,
  },
  glassBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  actionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  actionTextFull: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 15,
  },
  bottomSpacer: {
    height: 100,
  }
});
