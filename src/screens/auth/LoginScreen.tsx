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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    clearError();
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
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
      await login(email, password);
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
      console.log('[Login] Starting Google OAuth...');
      await loginWithGoogle();
      console.log('[Login] Google OAuth completed');
    } catch (err: any) {
      console.error('[Login] Google OAuth error:', err);
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
    if (!phoneNumber || phoneNumber.length < 10) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    clearError();
    setPhoneError('');
    try {
      await sendOTP(phoneNumber);
      setPhoneStep('otp');
    } catch (err: any) {
      setPhoneError(err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setPhoneError('Please enter 6-digit OTP');
      return;
    }
    clearError();
    setPhoneError('');
    try {
      await verifyOTP(otp);
      setShowPhoneModal(false);
    } catch (err: any) {
      setPhoneError(err.message || 'Invalid OTP');
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
          {/* Animated Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#FF6B35', '#F7931E']}
                style={styles.logoGradient}
              >
                <Feather name="zap" size={36} color={Colors.white} />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>MarketingTool</Text>
            <Text style={styles.subtitle}>206+ AI Marketing Tools</Text>
          </Animated.View>

          {/* Login Methods Grid */}
          <Animated.View style={[styles.methodsSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.methodsTitle}>Choose how to sign in</Text>
            <View style={styles.methodsGrid}>
              {loginMethods.map((method, index) => {
                // Skip Apple on Android
                if (method.id === 'apple' && Platform.OS !== 'ios') return null;

                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodCard,
                      selectedMethod === method.id && styles.methodCardActive
                    ]}
                    onPress={() => handleLoginMethod(method.id)}
                    activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={method.gradient as [string, string]}
                      style={styles.methodGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isLoading && selectedMethod === method.id ? (
                        <ActivityIndicator color={Colors.white} size="small" />
                      ) : (
                        <Feather name={method.icon as any} size={28} color={Colors.white} />
                      )}
                    </LinearGradient>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDesc} numberOfLines={1}>{method.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Quick Email Login (collapsed by default) */}
          <Animated.View style={[styles.quickEmailSection, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.quickEmailToggle}
              onPress={() => setShowEmailModal(true)}
            >
              <View style={styles.quickEmailLeft}>
                <Feather name="mail" size={20} color={Colors.secondary} />
                <Text style={styles.quickEmailText}>Sign in with email & password</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </Animated.View>

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
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
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
  // Login Methods Grid
  methodsSection: {
    marginBottom: Spacing.xl,
  },
  methodsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  methodCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardActive: {
    borderColor: Colors.secondary,
  },
  methodGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Quick Email Section
  quickEmailSection: {
    marginBottom: Spacing.xl,
  },
  quickEmailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickEmailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickEmailText: {
    fontSize: 15,
    color: Colors.white,
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
});

export default LoginScreen;
