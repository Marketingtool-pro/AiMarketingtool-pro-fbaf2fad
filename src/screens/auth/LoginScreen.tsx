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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as LocalAuthentication from 'expo-local-authentication';
import LottieView from 'lottie-react-native';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const { width, height } = Dimensions.get('window');

// Login method options
interface LoginMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string[];
  description: string;
}

const loginMethods: LoginMethod[] = [
  {
    id: 'phone',
    name: 'Phone',
    icon: 'phone',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    description: 'Sign in with OTP',
  },
  {
    id: 'google',
    name: 'Google',
    icon: 'chrome',
    color: '#4285F4',
    gradient: ['#4285F4', '#34A853'],
    description: 'Sign in with your Google account',
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: 'command',
    color: '#000000',
    gradient: ['#1D1D1F', '#555555'],
    description: 'Sign in with your Apple ID',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    gradient: ['#1877F2', '#3B5998'],
    description: 'Sign in with Facebook',
  },
  {
    id: 'email',
    name: 'Email',
    icon: 'mail',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#EE5A5A'],
    description: 'Sign in with email & password',
  },
  {
    id: 'biometric',
    name: 'Face ID',
    icon: 'smartphone',
    color: '#34D399',
    gradient: ['#34D399', '#10B981'],
    description: 'Use Face ID or Touch ID',
  },
];

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login, loginWithGoogle, loginWithApple, loginWithFacebook, sendOTP, verifyOTP, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [phoneError, setPhoneError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  // Timer for OTP cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim().toLowerCase());
  };

  const sanitizeInput = (text: string) => {
    return text.replace(/[<>\"\'&]/g, '');
  };

  const handleLogin = async () => {
    clearError();
    setEmailError('');
    setPasswordError('');

    const sanitizedEmail = email.trim().toLowerCase();

    if (!sanitizedEmail) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(sanitizedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setPasswordError('Password is required');
      return;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      await login(sanitizedEmail, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Please check your credentials');
    }
  };

  const handleBiometricAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert('Biometric authentication not available');
      return;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      Alert.alert('No biometrics enrolled');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login to MarketingTool',
      fallbackLabel: 'Use password',
    });

    if (result.success) {
      Alert.alert('Biometric login', 'Feature coming soon');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (__DEV__) console.log('[Login] Starting Google OAuth...');
      await loginWithGoogle();
      if (__DEV__) console.log('[Login] Google OAuth completed');
    } catch (err: any) {
      if (__DEV__) console.error('[Login] Google OAuth error:', err);
      Alert.alert(
        'Google Login Failed',
        err.message || 'Please check your internet connection and try again'
      );
    }
  };

  const handleAppleLogin = async () => {
    try {
      await loginWithApple();
    } catch (err: any) {
      Alert.alert('Apple Login Failed', err.message);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      if (loginWithFacebook) {
        await loginWithFacebook();
      } else {
        Alert.alert('Coming Soon', 'Facebook login will be available soon');
      }
    } catch (err: any) {
      Alert.alert('Facebook Login Failed', err.message);
    }
  };

  const handleSendOTP = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!canResend) {
      setPhoneError(`Please wait ${countdown} seconds before requesting a new code`);
      return;
    }

    clearError();
    setPhoneError('');
    try {
      await sendOTP(cleanPhone);
      setPhoneStep('otp');
      setCountdown(60); // Start 60s cooldown
    } catch (err: any) {
      setPhoneError(err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      setPhoneError('Please enter a valid 6-digit code');
      return;
    }
    clearError();
    setPhoneError('');
    try {
      await verifyOTP(cleanOtp);
      setShowPhoneModal(false);
    } catch (err: any) {
      setPhoneError(err.message || 'Invalid OTP. Please check the code and try again.');
    }
  };

  const handleLoginMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    switch (methodId) {
      case 'phone':
        setShowPhoneModal(true);
        setPhoneStep('phone');
        setPhoneNumber('');
        setOtp('');
        setPhoneError('');
        break;
      case 'google':
        handleGoogleLogin();
        break;
      case 'apple':
        handleAppleLogin();
        break;
      case 'facebook':
        handleFacebookLogin();
        break;
      case 'email':
        setShowEmailModal(true);
        break;
      case 'biometric':
        handleBiometricAuth();
        break;
    }
    setTimeout(() => setSelectedMethod(null), 1000);
  };

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
          {/* Animated Header - Purple Circle Logo */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#7C3AED', '#A855F7']}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>M</Text>
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>MarketingTool</Text>
            <Text style={styles.subtitle}>AI-Powered Marketing Platform</Text>
          </Animated.View>

          {/* Quick Login - Phone Input on Main Screen */}
          <Animated.View style={[styles.quickLoginSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.quickLoginTitle}>Quick Login</Text>
            <View style={styles.phoneInputRow}>
              <TouchableOpacity style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </TouchableOpacity>
              <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor={Colors.textTertiary}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (phoneNumber.length >= 10) {
                  handleSendOTP();
                  setShowPhoneModal(true);
                  setPhoneStep('otp');
                } else {
                  handleLoginMethod('phone');
                }
              }}
              disabled={isLoading}
              style={styles.sendOtpBtn}
            >
              <LinearGradient
                colors={['#7C3AED', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {isLoading && selectedMethod === 'phone' ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.loginButtonText}>Send OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* OR CONTINUE WITH Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Icons Row */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => handleLoginMethod('google')}
              disabled={isLoading}
            >
              <View style={[styles.socialIcon, { backgroundColor: '#4285F4' + '20' }]}>
                {isLoading && selectedMethod === 'google' ? (
                  <ActivityIndicator color="#4285F4" size="small" />
                ) : (
                  <Feather name="chrome" size={24} color="#4285F4" />
                )}
              </View>
              <Text style={styles.socialLabel}>Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleLoginMethod('apple')}
                disabled={isLoading}
              >
                <View style={[styles.socialIcon, { backgroundColor: '#FFFFFF20' }]}>
                  {isLoading && selectedMethod === 'apple' ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Feather name="command" size={24} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.socialLabel}>Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => handleLoginMethod('facebook')}
              disabled={isLoading}
            >
              <View style={[styles.socialIcon, { backgroundColor: '#1877F2' + '20' }]}>
                {isLoading && selectedMethod === 'facebook' ? (
                  <ActivityIndicator color="#1877F2" size="small" />
                ) : (
                  <Feather name="facebook" size={24} color="#1877F2" />
                )}
              </View>
              <Text style={styles.socialLabel}>Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => handleLoginMethod('email')}
              disabled={isLoading}
            >
              <View style={[styles.socialIcon, { backgroundColor: '#FF6B6B' + '20' }]}>
                <Feather name="mail" size={24} color="#FF6B6B" />
              </View>
              <Text style={styles.socialLabel}>Email</Text>
            </TouchableOpacity>
          </View>

          {/* Biometric Login Button */}
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={() => handleLoginMethod('biometric')}
          >
            <Feather name="smartphone" size={20} color={Colors.success} />
            <Text style={styles.biometricText}>Biometric Login</Text>
          </TouchableOpacity>

          {/* Features Banner */}
          <View style={styles.featuresBanner}>
            <View style={styles.featureItem}>
              <Feather name="zap" size={18} color={Colors.gold} />
              <Text style={styles.featureText}>206+ Tools</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <Feather name="shield" size={18} color={Colors.success} />
              <Text style={styles.featureText}>Secure</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <Feather name="clock" size={18} color={Colors.cyan} />
              <Text style={styles.featureText}>7-Day Trial</Text>
            </View>
          </View>

          {/* Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up Free</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
              <View style={[styles.inputContainer, emailError && styles.inputError]}>
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

              <View style={[styles.inputContainer, passwordError && styles.inputError]}>
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
                onPress={() => {
                  setShowEmailModal(false);
                  navigation.navigate('ForgotPassword');
                }}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  handleLogin();
                }}
                disabled={isLoading}
                style={styles.modalLoginBtn}
              >
                <LinearGradient
                  colors={['#FF6B35', '#F7931E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Phone OTP Modal */}
      <Modal
        visible={showPhoneModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {phoneStep === 'phone' ? 'Sign in with Phone' : 'Verify OTP'}
              </Text>
              <TouchableOpacity onPress={() => setShowPhoneModal(false)} style={styles.modalClose}>
                <Feather name="x" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {phoneStep === 'phone' ? (
                <>
                  <Text style={styles.phoneLabel}>Enter your phone number</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                      <TextInput
                        style={styles.input}
                        placeholder="9999999999"
                        placeholderTextColor={Colors.textTertiary}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>
                  </View>
                  {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

                  <TouchableOpacity onPress={handleSendOTP} disabled={isLoading} style={styles.modalLoginBtn}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginButtonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <Text style={styles.loginButtonText}>Send OTP</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <Text style={styles.testNote}>Test: +91 99999 99999 / Code: 123456</Text>
                </>
              ) : (
                <>
                  <Text style={styles.phoneLabel}>Enter 6-digit OTP sent to +91 {phoneNumber}</Text>
                  <View style={[styles.inputContainer, styles.otpInputContainer]}>
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="000000"
                      placeholderTextColor={Colors.textTertiary}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

                  <TouchableOpacity onPress={handleVerifyOTP} disabled={isLoading} style={styles.modalLoginBtn}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginButtonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={Colors.white} />
                      ) : (
                        <Text style={styles.loginButtonText}>Verify OTP</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.resendContainer}>
                    {countdown > 0 ? (
                      <Text style={styles.resendTimerText}>Resend code in {countdown}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOTP} disabled={isLoading}>
                        <Text style={styles.resendLink}>Resend Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity onPress={() => setPhoneStep('phone')} style={styles.changePhoneBtn}>
                    <Text style={styles.changePhoneText}>Change Phone Number</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16132B',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.md,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  // Quick Login Section
  quickLoginSection: {
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(248,248,248,0.06)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickLoginTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  sendOtpBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.md,
    letterSpacing: 1,
  },
  // Social Row
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  socialBtn: {
    alignItems: 'center',
  },
  socialIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 6,
  },
  socialLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  // Biometric
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    gap: 8,
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },
  // Features Banner
  featuresBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
  },
  featureText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '500',
  },
  featureDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
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
  modalLoginBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  // Form Inputs
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
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
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
  // Phone OTP styles
  phoneLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  countryCode: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
  },
  countryCodeText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '500',
  },
  otpInputContainer: {
    marginBottom: Spacing.md,
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  testNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  changePhoneBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  changePhoneText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  resendContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  resendTimerText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
  resendLink: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
