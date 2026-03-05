import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { biometricService, BiometricType } from '../../services/biometric';

const { width } = Dimensions.get('window');

// Country data for phone login
interface Country {
  name: string;
  code: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'UAE', code: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
];

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    login, loginWithGoogle, loginWithApple, loginWithFacebook,
    sendPhoneOTP, verifyPhoneOTP, isLoading, error, clearError,
    biometricPending, authenticateWithBiometric,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpUserId, setOtpUserId] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse for logo
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, []);

  // Check biometric
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometricService.isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await biometricService.getBiometricType();
        setBiometricType(type);
      }
      if (available && biometricPending) {
        await authenticateWithBiometric();
      }
    };
    checkBiometric();
  }, [biometricPending]);

  const handleBiometricLogin = async () => {
    const success = await authenticateWithBiometric();
    if (!success) {
      Alert.alert('Authentication Failed', 'Biometric authentication failed. Please try another sign in method.');
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    clearError();
    setEmailError('');
    setPasswordError('');

    if (!email) { setEmailError('Email is required'); return; }
    if (!validateEmail(email)) { setEmailError('Please enter a valid email'); return; }
    if (!password) { setPasswordError('Password is required'); return; }
    if (password.length < 8) { setPasswordError('Password must be at least 8 characters'); return; }

    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Please check your credentials');
    }
  };

  const handleGoogleLogin = async () => {
    try { await loginWithGoogle(); }
    catch (err: any) { Alert.alert('Google Login Failed', err.message || 'Please try again'); }
  };

  const handleAppleLogin = async () => {
    try { await loginWithApple(); }
    catch (err: any) { Alert.alert('Apple Login Failed', err.message); }
  };

  const handleFacebookLogin = async () => {
    try { await loginWithFacebook(); }
    catch (err: any) { Alert.alert('Facebook Login Failed', err.message || 'Please try again'); }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }
    try {
      const formattedPhone = `${selectedCountry.code}${phoneNumber.replace(/[\s\-()]/g, '')}`;
      const userId = await sendPhoneOTP(formattedPhone);
      setOtpUserId(userId);
      setOtpSent(true);
      setShowOtpModal(true);
    } catch (err: any) {
      Alert.alert('OTP Failed', err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }
    try {
      await verifyPhoneOTP(otpUserId, otpCode);
      setShowOtpModal(false);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP');
    }
  };

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  return (
    <AnimatedBackground variant="default" showParticles={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo with Purple Glow */}
          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoGlowWrapper}>
              <Animated.View style={[styles.logoGlow, { opacity: glowAnim }]} />
              <View style={styles.logoIconWrapper}>
                <Image
                  source={require('../../assets/images/logo-icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.title}>MarketingTool</Text>
            <Text style={styles.subtitle}>AI-Powered Marketing Platform</Text>
          </Animated.View>

          {/* Quick Login - Phone */}
          <Animated.View style={[styles.quickLoginCard, { opacity: fadeAnim }]}>
            <View style={styles.quickLoginHeader}>
              <Feather name="phone" size={18} color={Colors.accent} />
              <Text style={styles.quickLoginTitle}>Quick Login</Text>
            </View>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                <Feather name="chevron-down" size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone"
                placeholderTextColor={Colors.textTertiary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={15}
              />
              <TouchableOpacity
                style={styles.phoneSendButton}
                onPress={handleSendOTP}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#7C3AED', '#8B5CF6']}
                  style={styles.phoneSendGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Feather name="arrow-right" size={20} color={Colors.white} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* OR CONTINUE WITH */}
          <Animated.View style={[styles.socialSection, { opacity: fadeAnim }]}>
            <Text style={styles.orText}>OR CONTINUE WITH</Text>
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin} disabled={isLoading}>
                <Feather name="search" size={22} color={Colors.textSecondary} />
                <Text style={styles.socialLabel}>Google</Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin} disabled={isLoading}>
                  <Feather name="command" size={22} color={Colors.textSecondary} />
                  <Text style={styles.socialLabel}>Apple</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.socialButton} onPress={() => setShowEmailModal(true)} disabled={isLoading}>
                <Feather name="mail" size={22} color={Colors.textSecondary} />
                <Text style={styles.socialLabel}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin} disabled={isLoading}>
                <Feather name="facebook" size={22} color={Colors.textSecondary} />
                <Text style={styles.socialLabel}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Biometric Login */}
            {biometricAvailable && (
              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
                <Feather
                  name={biometricType === 'face' ? 'smartphone' : 'smartphone'}
                  size={18}
                  color={Colors.accent}
                />
                <Text style={styles.biometricText}>Biometric Login</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Features Banner */}
          <View style={styles.featuresBanner}>
            <View style={styles.featureItem}>
              <Feather name="zap" size={16} color={Colors.gold} />
              <Text style={styles.featureText}>AI Tools</Text>
            </View>
            <Text style={styles.featureDot}>·</Text>
            <View style={styles.featureItem}>
              <Feather name="shield" size={16} color={Colors.success} />
              <Text style={styles.featureText}>Secure</Text>
            </View>
            <Text style={styles.featureDot}>·</Text>
            <View style={styles.featureItem}>
              <Feather name="clock" size={16} color={Colors.cyan} />
              <Text style={styles.featureText}>7-Day Trial</Text>
            </View>
          </View>

          {/* Sign Up */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up Free</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.countryModalOverlay}>
          <View style={styles.countryModalContent}>
            <View style={styles.countryModalHandle} />
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Feather name="x" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.countrySearchContainer}>
              <Feather name="search" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.countrySearchInput}
                placeholder="Search country..."
                placeholderTextColor={Colors.textTertiary}
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountry.name === item.name && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <View style={styles.countryItemInfo}>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCode}>{item.code}</Text>
                  </View>
                  {selectedCountry.name === item.name && (
                    <Feather name="check" size={20} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* OTP Modal */}
      <Modal
        visible={showOtpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter OTP</Text>
              <TouchableOpacity onPress={() => setShowOtpModal(false)} style={styles.modalClose}>
                <Feather name="x" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.otpSentText}>
                OTP sent to {selectedCountry.code}{phoneNumber}
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { textAlign: 'center', letterSpacing: 8, fontSize: 24, fontWeight: 'bold' }]}
                  placeholder="000000"
                  placeholderTextColor={Colors.textTertiary}
                  value={otpCode}
                  onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              <TouchableOpacity onPress={handleVerifyOTP} disabled={isLoading} style={styles.verifyButton}>
                <LinearGradient
                  colors={['#7C3AED', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.verifyGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.verifyText}>Verify & Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setOtpSent(false); setOtpCode(''); setShowOtpModal(false); }}
                style={styles.changeNumberBtn}
              >
                <Text style={styles.changeNumberText}>Change Number</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Login Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sign in with Email</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)} style={styles.modalClose}>
                <Feather name="x" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                <Feather name="mail" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={Colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

              <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                <Feather name="lock" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

              <TouchableOpacity
                onPress={() => { setShowEmailModal(false); navigation.navigate('ForgotPassword'); }}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleLogin} disabled={isLoading} style={styles.verifyButton}>
                <LinearGradient
                  colors={['#7C3AED', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.verifyGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.verifyText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGlowWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  logoIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  // Quick Login Phone
  quickLoginCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickLoginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  quickLoginTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 11, 40, 0.8)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCode: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'rgba(6, 11, 40, 0.8)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  phoneSendButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  phoneSendGradient: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Social Section
  socialSection: {
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  orText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  socialButton: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(6, 11, 40, 0.6)',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  socialLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  // Biometric
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  biometricText: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '500',
  },
  // Features Banner
  featuresBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 65, 165, 0.1)',
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 65, 165, 0.2)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '500',
  },
  featureDot: {
    fontSize: 16,
    color: Colors.textTertiary,
    marginHorizontal: 10,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  registerLink: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  // Country Picker Modal
  countryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  countryModalContent: {
    backgroundColor: '#060b28',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  countryModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textTertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  countryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  countryModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
  },
  countrySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 11, 40, 0.8)',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countrySearchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: Colors.white,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: 14,
  },
  countryItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  countryItemFlag: {
    fontSize: 24,
  },
  countryItemInfo: {
    flex: 1,
  },
  countryItemName: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '500',
  },
  countryItemCode: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  // Shared Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(6, 11, 40, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: Spacing.lg,
  },
  otpSentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.white,
  },
  eyeIcon: {
    padding: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: -8,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  verifyButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  verifyGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  verifyText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  changeNumberBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  changeNumberText: {
    color: Colors.accent,
    fontSize: 14,
  },
});

export default LoginScreen;
