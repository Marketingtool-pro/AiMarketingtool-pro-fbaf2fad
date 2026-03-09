import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { Canvas, RoundedRect, Blur, LinearGradient as SkiaGradient, vec } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// 2026 Refractive Glass Card Component
const GlassBentoCard = ({ children, height = 100, color = 'rgba(6, 11, 40, 0.7)' }: { children: React.ReactNode, height?: number, color?: string }) => (
  <View style={[styles.glassBentoContainer, { height }]}>
    <Canvas style={styles.skiaCanvas}>
      <RoundedRect
        x={0}
        y={0}
        width={width - 40}
        height={height}
        r={24}
        color={color}
      >
        <SkiaGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={['rgba(255,255,255,0.05)', 'transparent']}
        />
        <Blur blur={20} />
      </RoundedRect>
    </Canvas>
    <View style={styles.glassBentoContent}>
      {children}
    </View>
  </View>
);

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { profile, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(true);

  const stats = [
    { label: 'Generations', value: profile?.generationsUsed || 0, icon: 'cpu' },
    { label: 'Saved', value: 0, icon: 'bookmark' },
    { label: 'Tools', value: 75, icon: 'grid' },
  ];

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logout();
  };

  return (
    <AnimatedBackground variant="profile" showParticles={true}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Feather name="settings" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Profile Card Bento */}
        <View style={styles.section}>
          <GlassBentoCard height={180}>
            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={require('../../assets/images/logo-icon.png')} 
                  style={styles.avatar} 
                />
                <TouchableOpacity style={styles.editAvatar}>
                  <Feather name="camera" size={12} color={Colors.white} />
                </TouchableOpacity>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.userName}>{profile?.name || 'Marketing Pro'}</Text>
                <Text style={styles.userEmail}>{profile?.email || 'user@marketingtool.pro'}</Text>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{(profile?.subscription || 'Free').toUpperCase()}</Text>
                </View>
              </View>
            </View>
          </GlassBentoCard>
        </View>

        {/* Stats Grid Bento */}
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <GlassBentoCard height={100} color="rgba(124, 58, 237, 0.1)">
                <Feather name={stat.icon as any} size={20} color={Colors.secondary} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </GlassBentoCard>
            </View>
          ))}
        </View>

        {/* Upgrade Banner Bento */}
        <TouchableOpacity 
          style={styles.section} 
          onPress={() => navigation.navigate('Subscription')}
          activeOpacity={0.9}
        >
          <GlassBentoCard height={100}>
            <LinearGradient 
              colors={Gradients.accent} 
              start={{x:0, y:0}} 
              end={{x:1, y:0}} 
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeContent}>
                <View>
                  <Text style={styles.upgradeTitle}>Unlock Unlimited Power</Text>
                  <Text style={styles.upgradeSubtitle}>Upgrade to Pro Plan today</Text>
                </View>
                <Feather name="chevron-right" size={24} color={Colors.white} />
              </View>
            </LinearGradient>
          </GlassBentoCard>
        </TouchableOpacity>

        {/* Settings Bento Group */}
        <View style={styles.section}>
          <GlassBentoCard height={240}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <Feather name="bell" size={18} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch 
                value={notifications} 
                onValueChange={setNotifications}
                trackColor={{ false: '#3e3e3e', true: Colors.secondary }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <Feather name="shield" size={18} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>Biometric Security</Text>
              </View>
              <Switch 
                value={biometric} 
                onValueChange={setBiometric}
                trackColor={{ false: '#3e3e3e', true: Colors.secondary }}
              />
            </View>

            <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
              <View style={styles.settingLabelGroup}>
                <Feather name="log-out" size={18} color={Colors.error} />
                <Text style={[styles.settingLabel, { color: Colors.error }]}>Log Out</Text>
              </View>
            </TouchableOpacity>
          </GlassBentoCard>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  glassBentoContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skiaCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  glassBentoContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  profileText: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  planBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  upgradeGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  upgradeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  upgradeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});

export default ProfileScreen;
