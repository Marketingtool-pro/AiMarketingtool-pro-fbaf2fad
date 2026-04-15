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
  AppState,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
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
];

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    login, loginWithGoogle, loginWithApple, loginWithFacebook,
    sendPhoneOTP, verifyPhoneOTP, verifyTOTP, authenticateWithBiometric, isLoading, 
    mfaPending, clearError,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[1]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpUserId, setOtpUserId] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [otpError, setOtpError] = useState('');
  const [totpError, setTotpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isBioAvailable, setIsBioAvailable] = useState(false);
  const [bioType, setBioType] = useState<BiometricType>('none');
  const [isBioEnabled, setIsBioEnabled] = useState(false);

  useEffect(() => {
    const checkBio = async () => {
      const available = await biometricService.isBiometricAvailable();
      const enabled = await biometricService.isBiometricEnabled();
      const type = await biometricService.getBiometricType();
      setIsBioAvailable(available);
      setIsBioEnabled(enabled);
      setBioType(type);
    };
    checkBio();
  }, []);

  const handleBiometricLogin = async () => {
    const success = await authenticateWithBiometric();
    if (!success) {
      Alert.alert('Authentication Failed', 'Could not authenticate biometrically.');
    }
  };

  const handleVerifyTOTP = async () => {
    setTotpError('');
    try {
      await verifyTOTP(totpCode);
    } catch (err: any) {
      setTotpError(err.message || 'Invalid 2FA code');
    }
  };

  // Cooldown timer for resend button (60 seconds)
  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // Restore OTP modal when app returns from Chrome reCAPTCHA (Firebase opens Chrome on iOS)
  useEffect(() => {
    SecureStore.getItemAsync('pendingOTP').then(pending => {
      if (pending) {
        try {
          const { phone, countryCode } = JSON.parse(pending);
          setPhoneNumber(phone);
          setOtpSent(true);
          setShowOtpModal(true);
          const country = COUNTRIES.find(c => c.code === countryCode);
          if (country) setSelectedCountry(country);
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !showOtpModal) {
        SecureStore.getItemAsync('pendingOTP').then(pending => {
          if (pending) {
            try {
              const { phone, countryCode } = JSON.parse(pending);
              setPhoneNumber(phone);
              setOtpSent(true);
              setShowOtpModal(true);
              const country = COUNTRIES.find(c => c.code === countryCode);
              if (country) setSelectedCountry(country);
            } catch {}
          }
        });
      }
    });
    return () => sub.remove();
  }, [showOtpModal]);

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Please check your credentials');
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      Alert.alert('Invalid Number', 'Please enter a phone number');
      return;
    }
    if (resendCooldown > 0) return;

    const formattedPhone = `${selectedCountry.code}${phoneNumber}`;
    setOtpError('');
    setOtpCode('');
    setOtpSending(true);

    // Save BEFORE Firebase call — survives Chrome reCAPTCHA redirect on iOS
    await SecureStore.setItemAsync('pendingOTP', JSON.stringify({
      phone: phoneNumber,
      countryCode: selectedCountry.code,
    }));

    try {
      // Firebase Phone Auth — may open Chrome for reCAPTCHA on iOS
      const userId = await sendPhoneOTP(formattedPhone);
      setOtpUserId(userId);
      setOtpSent(true);
      setShowOtpModal(true);
      setOtpSending(false);
      startCooldown();
    } catch (err: any) {
      setOtpSending(false);
      await SecureStore.deleteItemAsync('pendingOTP');
      Alert.alert('OTP Failed', err.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    try {
      await verifyPhoneOTP(otpUserId, otpCode);
      await SecureStore.deleteItemAsync('pendingOTP');
      setShowOtpModal(false);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid OTP. Please check and try again.');
    }
  };

  const handleCloseOtpModal = async () => {
    setShowOtpModal(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError('');
    // C2 fix: clear stale verificationId/tempPhone so the next login starts fresh
    useAuthStore.setState({ tempPhone: null, tempVerificationId: null });
    await SecureStore.deleteItemAsync('pendingOTP');
  };

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  return (
    <AnimatedBackground variant="default">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoIconBg}>
               <Image
                  source={require('../../../assets/images/logo-icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
            </View>
            <Text style={styles.title}>MarketingTool</Text>
            <Text style={styles.subtitle}>AI-Powered Marketing Platform</Text>
          </View>

          {/* Quick Login */}
          <View style={styles.quickLoginContainer}>
            <View style={styles.quickLoginHeader}>
              <Feather name="message-circle" size={16} color="#25D366" />
              <Text style={styles.quickLoginText}>WhatsApp Login</Text>
            </View>

            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                <Text style={styles.codeText}>{selectedCountry.code}</Text>
                <Feather name="chevron-down" size={14} color="#4A5568" />
              </TouchableOpacity>

              <TextInput
                style={styles.phoneInput}
                placeholder="Phone"
                placeholderTextColor="#4A5568"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                editable={!otpSent}
              />

              {!otpSent ? (
                <TouchableOpacity
                  style={[styles.arrowBtn, otpSending && { opacity: 0.5 }]}
                  onPress={handleSendOTP}
                  disabled={otpSending}
                >
                  <LinearGradient
                    colors={['#3D2914', '#16132B']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.arrowCircle}>
                    {otpSending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Feather name="arrow-right" size={20} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => {
                    setOtpSent(false); setOtpCode(''); setOtpError('');
                    useAuthStore.setState({ tempPhone: null, tempVerificationId: null });
                  }}
                >
                  <LinearGradient
                    colors={['#3D2914', '#16132B']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[styles.arrowCircle, { backgroundColor: '#4A5568' }]}>
                    <Feather name="edit-2" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* OTP Section - Inline */}
            {otpSent && (
              <View style={styles.otpSection}>
                <Text style={styles.otpSentText}>
                  Enter the 6-digit code sent via WhatsApp to {selectedCountry.code} {phoneNumber}
                </Text>

                {!!otpError && (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={16} color="#FF6B6B" />
                    <Text style={styles.errorText}>{otpError}</Text>
                  </View>
                )}

                <View style={styles.otpRow}>
                  <TextInput
                    style={[styles.otpInputInline, { letterSpacing: 8 }]}
                    placeholder="000000"
                    placeholderTextColor="#4A5568"
                    value={otpCode}
                    onChangeText={(text) => {
                      const digits = text.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(digits);
                      setOtpError('');
                      // Uber-style auto-verify when 6 digits filled (e.g. via iOS SMS autofill)
                      if (digits.length === 6) {
                        setTimeout(() => handleVerifyOTP(), 100);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                  />
                  <TouchableOpacity
                    style={[styles.verifyBtn, otpCode.length < 6 && { opacity: 0.5 }]}
                    onPress={handleVerifyOTP}
                    disabled={isLoading || otpCode.length < 6}
                  >
                    <LinearGradient
                      colors={['#9D4EDD', '#7B2CBF']}
                      style={styles.verifyBtnGrad}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Feather name="check" size={20} color="#FFFFFF" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleSendOTP}
                  disabled={isLoading || resendCooldown > 0}
                  style={{ alignSelf: 'center', marginTop: 12 }}
                >
                  <Text style={[styles.resendInlineText, resendCooldown > 0 && { opacity: 0.5 }]}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get code? Resend"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isBioEnabled && isBioAvailable && (
            <TouchableOpacity 
              style={styles.biometricBtn} 
              onPress={handleBiometricLogin}
            >
              <LinearGradient
                colors={['rgba(157, 78, 221, 0.1)', 'rgba(157, 78, 221, 0.05)']}
                style={styles.biometricBtnGrad}
              >
                <Ionicons
                  name={bioType === 'face' ? 'scan-circle' : 'finger-print'}
                  size={32}
                  color="#9D4EDD"
                />
                <Text style={styles.biometricText}>
                  Quick Login with {bioType === 'face' ? 'Face ID' : 'Touch ID'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.orContainer}>
            <Text style={styles.orText}>OR CONTINUE WITH</Text>
          </View>

          <View style={styles.socialRow}>
             <TouchableOpacity activeOpacity={0.7} onPress={loginWithGoogle}>
                <Image source={require('../../../assets/images/platforms/google.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
             </TouchableOpacity>
             <TouchableOpacity activeOpacity={0.7} onPress={loginWithFacebook}>
                <Image source={require('../../../assets/images/platforms/facebook.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
             </TouchableOpacity>
             <TouchableOpacity activeOpacity={0.7} onPress={() => setShowEmailModal(true)}>
                <Image source={require('../../../assets/images/platforms/messenger.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
             </TouchableOpacity>
             {Platform.OS === 'ios' && (
               <TouchableOpacity activeOpacity={0.7} onPress={loginWithApple}>
                  <Image source={require('../../../assets/images/platforms/soundcloud.png')} style={{ width: 56, height: 56 }} resizeMode="contain" />
               </TouchableOpacity>
             )}
          </View>

          <View style={styles.footer}>
             <Text style={styles.footerText}>Don't have an account? </Text>
             <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupText}>Sign Up Free</Text>
             </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Email Login Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Email Login</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="email@example.com"
                placeholderTextColor="#4A5568"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="••••••••"
                placeholderTextColor="#4A5568"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#9D4EDD', '#7B2CBF']}
                style={styles.btnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2FA TOTP Modal */}
      <Modal
        visible={mfaPending}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Two-Factor Auth</Text>
              <TouchableOpacity onPress={() => useAuthStore.setState({ mfaPending: false })}>
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Enter the 6-digit code from your authenticator app to continue.
            </Text>

            {!!totpError && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color="#FF6B6B" />
                <Text style={styles.errorText}>{totpError}</Text>
              </View>
            )}

            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#4A5568"
              value={totpCode}
              onChangeText={(text) => { setTotpCode(text); setTotpError(''); }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={handleVerifyTOTP}
              disabled={isLoading || totpCode.length < 6}
            >
              <LinearGradient
                colors={['#9D4EDD', '#7B2CBF']}
                style={styles.btnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>Verify & Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
               <Feather name="search" size={18} color="#4A5568" />
               <TextInput 
                style={styles.searchInput}
                placeholder="Search country..."
                placeholderTextColor="#4A5568"
                value={countrySearch}
                onChangeText={setCountrySearch}
               />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                  }}
                >
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryFlagLarge}>{item.flag}</Text>
                    <Text style={styles.countryName}>{item.name}</Text>
                  </View>
                  <View style={styles.countryCodeRow}>
                    <Text style={styles.countryCodeValue}>{item.code}</Text>
                    {selectedCountry.name === item.name && (
                      <Feather name="check" size={18} color="#9D4EDD" style={{ marginLeft: 10 }} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 8,
  },
  quickLoginContainer: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickLoginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  quickLoginText: {
    fontSize: 16,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 12,
    height: 56,
    borderRadius: 16,
    gap: 6,
  },
  flagText: {
    fontSize: 20,
  },
  codeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  arrowBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9D4EDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orContainer: {
    marginBottom: 24,
  },
  orText: {
    fontSize: 12,
    color: '#4A5568',
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 60,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#161824',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnImg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  googleG: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  footer: {
    flexDirection: 'row',
  },
  footerText: {
    color: '#A0AEC0',
  },
  signupText: {
    color: '#9D4EDD',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161824',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '70%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#FFFFFF',
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  countryFlagLarge: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  countryCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeValue: {
    fontSize: 16,
    color: '#A0AEC0',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: '#0A0A0A',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpInput: {
    backgroundColor: '#0A0A0A',
    height: 70,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#9D4EDD',
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendText: {
    color: '#9D4EDD',
    fontSize: 14,
    fontWeight: '500',
  },
  otpSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
  },
  otpSentText: {
    fontSize: 13,
    color: '#A0AEC0',
    marginBottom: 12,
    lineHeight: 18,
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  otpInputInline: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    height: 56,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#9D4EDD',
  },
  verifyBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  verifyBtnGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendInlineText: {
    color: '#9D4EDD',
    fontSize: 13,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  biometricBtn: {
    width: '100%',
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.2)',
  },
  biometricBtnGrad: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  biometricText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;

