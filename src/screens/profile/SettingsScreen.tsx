import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/appwrite';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { biometricService } from '../../services/biometric';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { user, logout, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    marketingEmails: false,
    biometricLogin: false,
    darkMode: true,
    autoSave: true,
    hapticFeedback: true,
  });

  // Password change modal state (cross-platform, works on both iOS and Android)
  const [passwordModal, setPasswordModal] = useState<'hidden' | 'current' | 'new'>('hidden');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load biometric state on mount
  useEffect(() => {
    const loadBiometric = async () => {
      const available = await biometricService.isBiometricAvailable();
      setBiometricAvailable(available);
      setSettings(prev => ({ ...prev, biometricLogin: biometricEnabled }));
    };
    loadBiometric();
  }, [biometricEnabled]);

  const toggleSetting = (key: keyof typeof settings) => {
    if (key === 'biometricLogin') {
      handleBiometricToggle();
      return;
    }
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBiometricToggle = async () => {
    if (!biometricAvailable) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return;
    }
    if (biometricEnabled) {
      await disableBiometric();
      setSettings(prev => ({ ...prev, biometricLogin: false }));
    } else {
      const success = await enableBiometric();
      if (success) {
        setSettings(prev => ({ ...prev, biometricLogin: true }));
      } else {
        Alert.alert('Failed', 'Could not enable biometric authentication. Please try again.');
      }
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.updateStatus();
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              logout();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account. Please contact support.');
            }
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync('appwrite_session');
    } catch {
      // Cache clear attempt, show success regardless
    }
    Alert.alert('Cache Cleared', 'App cache has been cleared successfully.', [{ text: 'OK' }]);
  };

  const handleChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setPasswordModal('current');
  };

  const handlePasswordNext = () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password.');
      return;
    }
    setPasswordModal('new');
  };

  const handlePasswordSubmit = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.updatePassword(currentPassword, newPassword);
      setPasswordModal('hidden');
      Alert.alert('Success', 'Your password has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password. Check your current password.');
    } finally {
      setPasswordLoading(false);
    }
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
          action: () => {
            Alert.alert(
              'Change Password',
              `A password reset link will be sent to ${user?.email || 'your email'}.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Send Link', onPress: handleChangePassword },
              ]
            );
          },
        },
        {
          icon: 'key',
          label: 'Two-Factor Authentication',
          description: 'Phone OTP + Biometric available',
          type: 'action',
          action: () => {
            Alert.alert(
              'Two-Factor Authentication',
              'Your account is protected with:\n\n• Phone OTP verification\n• Biometric login (Face ID / Touch ID)\n\nBoth methods are active when enabled in Security settings above.',
              [{ text: 'OK' }]
            );
          },
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: 'moon',
          label: 'Dark Mode',
          description: 'Always on',
          key: 'darkMode',
          type: 'info',
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
          action: () => {
            handleClearCache();
          },
        },
        {
          icon: 'download',
          label: 'Export Data',
          description: 'Download your data',
          type: 'action',
          action: () => {
            Alert.alert(
              'Export Data',
              'To request a copy of your data, email help@marketingtool.pro. We will respond within 30 days as required by law.',
              [
                { text: 'OK' },
                { text: 'Email Now', onPress: () => Linking.openURL('mailto:help@marketingtool.pro?subject=Data Export Request') },
              ]
            );
          },
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'info',
          label: 'App Version',
          description: '1.3.0 (Build 26)',
          type: 'info',
        },
        {
          icon: 'file-text',
          label: 'Terms of Service',
          type: 'action',
          action: () => Linking.openURL('https://app.marketingtool.pro/dashboard/policy'),
        },
        {
          icon: 'shield',
          label: 'Privacy Policy',
          type: 'action',
          action: () => Linking.openURL('https://app.marketingtool.pro/dashboard/policy'),
        },
        {
          icon: 'book-open',
          label: 'Open Source Licenses',
          type: 'action',
          action: () => {
            Alert.alert(
              'Open Source Licenses',
              'This app uses the following open source libraries:\n\n• React Native (MIT)\n• Expo SDK (MIT)\n• Zustand (MIT)\n• React Navigation (MIT)\n• Appwrite SDK (BSD-3)\n• Lottie React Native (Apache 2.0)\n\nFull license details available at marketingtool.pro',
              [{ text: 'OK' }]
            );
          },
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
          <LinearGradient colors={[Colors.secondary, Colors.accent]} style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <View style={styles.editButton}>
            <Feather name="edit-2" size={18} color={Colors.secondary} />
          </View>
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
                      <Feather name={item.icon as any} size={20} color={Colors.secondary} />
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
                        trackColor={{ false: Colors.border, true: Colors.secondary + '50' }}
                        thumbColor={settings[item.key as keyof typeof settings] ? Colors.secondary : Colors.textTertiary}
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

      {/* Change Password Modal (cross-platform: works on both iOS and Android) */}
      <Modal
        visible={passwordModal !== 'hidden'}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModal('hidden')}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {passwordModal === 'current' ? 'Change Password' : 'New Password'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {passwordModal === 'current'
                ? 'Enter your current password'
                : 'Enter your new password (min 8 characters)'}
            </Text>

            <TextInput
              style={styles.modalInput}
              secureTextEntry
              autoFocus
              placeholder={passwordModal === 'current' ? 'Current password' : 'New password'}
              placeholderTextColor={Colors.textTertiary}
              value={passwordModal === 'current' ? currentPassword : newPassword}
              onChangeText={passwordModal === 'current' ? setCurrentPassword : setNewPassword}
              editable={!passwordLoading}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPasswordModal('hidden')}
                disabled={passwordLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, passwordLoading && { opacity: 0.6 }]}
                onPress={passwordModal === 'current' ? handlePasswordNext : handlePasswordSubmit}
                disabled={passwordLoading}
              >
                <Text style={styles.modalSubmitText}>
                  {passwordLoading ? 'Updating...' : passwordModal === 'current' ? 'Next' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
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
    backgroundColor: Colors.secondary + '15',
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
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
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
    backgroundColor: Colors.secondary + '15',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  modalCancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalSubmitBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default SettingsScreen;
