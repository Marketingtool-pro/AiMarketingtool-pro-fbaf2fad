import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();

  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    marketingEmails: false,
    biometricLogin: true,
    darkMode: true,
    autoSave: true,
    hapticFeedback: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deleted', 'Your account has been scheduled for deletion.');
            logout();
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
  };

  const settingsSections = [
    {
      title: 'Notifications',
      items: [
        {
          icon: 'bell',
          label: 'Push Notifications',
          description: 'Receive push notifications',
          key: 'notifications',
          type: 'switch',
        },
        {
          icon: 'mail',
          label: 'Email Updates',
          description: 'Get product updates via email',
          key: 'emailUpdates',
          type: 'switch',
        },
        {
          icon: 'gift',
          label: 'Marketing Emails',
          description: 'Receive offers and promotions',
          key: 'marketingEmails',
          type: 'switch',
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: 'smartphone',
          label: 'Biometric Login',
          description: 'Use Face ID / Touch ID to login',
          key: 'biometricLogin',
          type: 'switch',
        },
        {
          icon: 'lock',
          label: 'Change Password',
          description: 'Update your password',
          type: 'action',
          action: () => Alert.alert('Change Password', 'Password change feature coming soon'),
        },
        {
          icon: 'key',
          label: 'Two-Factor Authentication',
          description: 'Phone OTP + Biometric available',
          type: 'action',
          action: () => Alert.alert('2FA', 'Two-factor authentication coming soon'),
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: 'moon',
          label: 'Dark Mode',
          description: 'Use dark theme',
          key: 'darkMode',
          type: 'switch',
        },
        {
          icon: 'smartphone',
          label: 'Haptic Feedback',
          description: 'Vibration for interactions',
          key: 'hapticFeedback',
          type: 'switch',
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          icon: 'save',
          label: 'Auto-Save',
          description: 'Automatically save generations',
          key: 'autoSave',
          type: 'switch',
        },
        {
          icon: 'trash-2',
          label: 'Clear Cache',
          description: 'Free up storage space',
          type: 'action',
          action: handleClearCache,
        },
        {
          icon: 'download',
          label: 'Export Data',
          description: 'Download your data',
          type: 'action',
          action: () => Alert.alert('Export', 'Data export feature coming soon'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'info',
          label: 'App Version',
          description: '1.3.2 (Build 48)',
          type: 'info',
        },
        {
          icon: 'file-text',
          label: 'Terms of Service',
          type: 'action',
          action: () => Alert.alert('Terms', 'Opening Terms of Service'),
        },
        {
          icon: 'shield',
          label: 'Privacy Policy',
          type: 'action',
          action: () => Alert.alert('Privacy', 'Opening Privacy Policy'),
        },
        {
          icon: 'book-open',
          label: 'Open Source Licenses',
          type: 'action',
          action: () => Alert.alert('Licenses', 'Opening licenses'),
        },
      ],
    },
  ];

  return (
    <AnimatedBackground variant="profile" showParticles={true}>
      {/* Header */}
      <LinearGradient colors={Gradients.dark} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <LinearGradient colors={Gradients.primary} style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Feather name="edit-2" size={18} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.settingItem}
                  onPress={item.type === 'action' ? item.action : undefined}
                  disabled={item.type === 'switch' || item.type === 'info'}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIcon}>
                      <Feather name={item.icon as any} size={20} color={Colors.accent} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      {item.description && (
                        <Text style={styles.settingDescription}>{item.description}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.settingRight}>
                    {item.type === 'switch' && 'key' in item && (
                      <Switch
                        value={settings[item.key as keyof typeof settings]}
                        onValueChange={() => toggleSetting(item.key as keyof typeof settings)}
                        trackColor={{ false: Colors.border, true: Colors.accent + '50' }}
                        thumbColor={settings[item.key as keyof typeof settings] ? Colors.primary : Colors.textTertiary}
                      />
                    )}
                    {item.type === 'action' && (
                      <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
          <View style={styles.sectionItems}>
            <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.error + '15' }]}>
                  <Feather name="trash-2" size={20} color={Colors.error} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: Colors.error }]}>Delete Account</Text>
                  <Text style={styles.settingDescription}>Permanently delete your account and data</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248,248,248,0.06)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionItems: {
    backgroundColor: 'rgba(248,248,248,0.06)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.white,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingRight: {
    marginLeft: Spacing.md,
  },
});

export default SettingsScreen;
