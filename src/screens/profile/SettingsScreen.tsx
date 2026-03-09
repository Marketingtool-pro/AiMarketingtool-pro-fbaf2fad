import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();

  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    marketingEmails: true,
    biometricLogin: false,
    darkMode: true,
    autoSave: true,
    hapticFeedback: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearCache = () => {
    Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
  };

  const settingsSections = [
    {
      title: 'NOTIFICATIONS',
      items: [
        { icon: 'bell', label: 'Push Notifications', desc: 'Receive push notifications', key: 'notifications' },
        { icon: 'mail', label: 'Email Updates', desc: 'Get product updates via email', key: 'emailUpdates' },
        { icon: 'gift', label: 'Marketing Emails', desc: 'Receive offers and promotions', key: 'marketingEmails' },
      ],
    },
    {
      title: 'SECURITY',
      items: [
        { icon: 'smartphone', label: 'Biometric Login', desc: 'Use Face ID / Touch ID to login', key: 'biometricLogin' },
        { icon: 'lock', label: 'Change Password', desc: 'Update your password', type: 'link', action: () => Alert.alert('Change Password', 'Password reset link sent to your email.') },
        { icon: 'key', label: 'Two-Factor Authentication', desc: 'Phone OTP + Biometric available', type: 'link' },
      ],
    },
    {
      title: 'APPEARANCE',
      items: [
        { icon: 'moon', label: 'Dark Mode', desc: 'Always on', type: 'info' },
        { icon: 'smartphone', label: 'Haptic Feedback', desc: 'Vibration for interactions', key: 'hapticFeedback' },
      ],
    },
    {
      title: 'DATA & STORAGE',
      items: [
        { icon: 'save', label: 'Auto-Save', desc: 'Automatically save generations', key: 'autoSave' },
        { icon: 'trash-2', label: 'Clear Cache', desc: 'Free up storage space', type: 'link', action: handleClearCache },
      ],
    },
  ];

  return (
    <AnimatedBackground variant="profile">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'A'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Admin User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'help@marketingtool.pro'}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Feather name="edit-2" size={18} color="#9D4EDD" />
          </TouchableOpacity>
        </View>

        {/* Sections */}
        {settingsSections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIdx) => (
                <TouchableOpacity 
                  key={itemIdx} 
                  style={[styles.item, itemIdx === section.items.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={item.action}
                  disabled={!item.action && item.key === undefined}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.iconBg}>
                      <Feather name={item.icon as any} size={18} color="#9D4EDD" />
                    </View>
                    <View>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemDesc}>{item.desc}</Text>
                    </View>
                  </View>
                  {item.key ? (
                    <Switch
                      value={settings[item.key as keyof typeof settings]}
                      onValueChange={() => toggleSetting(item.key as keyof typeof settings)}
                      trackColor={{ false: '#2D3748', true: '#9D4EDD' }}
                      thumbColor="#FFFFFF"
                    />
                  ) : item.type === 'link' ? (
                    <Feather name="chevron-right" size={20} color="#4A5568" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
           <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>DANGER ZONE</Text>
           <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.item} onPress={logout}>
                 <View style={styles.itemLeft}>
                    <View style={[styles.iconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                       <Feather name="log-out" size={18} color="#EF4444" />
                    </View>
                    <View>
                       <Text style={[styles.itemLabel, { color: '#EF4444' }]}>Logout</Text>
                       <Text style={styles.itemDesc}>Sign out of your account</Text>
                    </View>
                 </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.item} onPress={() => Alert.alert('Delete Account', 'Are you sure?')}>
                 <View style={styles.itemLeft}>
                    <View style={[styles.iconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                       <Feather name="trash-2" size={18} color="#EF4444" />
                    </View>
                    <View>
                       <Text style={[styles.itemLabel, { color: '#EF4444' }]}>Delete Account</Text>
                       <Text style={styles.itemDesc}>Permanently delete your account</Text>
                    </View>
                 </View>
              </TouchableOpacity>
           </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161824',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161824',
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 2,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#718096',
    marginBottom: 12,
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: '#161824',
    borderRadius: 24,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemDesc: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
});

export default SettingsScreen;
