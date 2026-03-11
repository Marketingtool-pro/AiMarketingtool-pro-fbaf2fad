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
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';

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
    sendPhoneOTP, verifyPhoneOTP, isLoading, clearError,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[1]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpUserId, setOtpUserId] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Restore pending OTP state on mount (survives app restart from reCAPTCHA redirect)
  useEffect(() => {
    (async () => {
      try {
        const pending = await SecureStore.getItemAsync('pendingOTP');
        if (pending) {
          const { phone, countryCode, userId } = JSON.parse(pending);
          setPhoneNumber(phone);
          setOtpUserId(userId || 'pending_firebase_verification');
          setOtpSent(true);
          setShowOtpModal(true);
          const country = COUNTRIES.find(c => c.code === countryCode);
          if (country) setSelectedCountry(country);
        }
      } catch {}
    })();
  }, []);

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
    try {
      const formattedPhone = `${selectedCountry.code}${phoneNumber}`;
      // Save OTP state BEFORE calling Firebase (survives reCAPTCHA app restart)
      await SecureStore.setItemAsync('pendingOTP', JSON.stringify({
        phone: phoneNumber,
        countryCode: selectedCountry.code,
        userId: 'pending_firebase_verification',
      }));
      const userId = await sendPhoneOTP(formattedPhone);
      setOtpUserId(userId);
      setOtpSent(true);
      setShowOtpModal(true);
    } catch (err: any) {
      // Clear pending state on failure
      await SecureStore.deleteItemAsync('pendingOTP');
      Alert.alert('OTP Failed', err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      await verifyPhoneOTP(otpUserId, otpCode);
      // Clear pending OTP state on successful verification
      await SecureStore.deleteItemAsync('pendingOTP');
      setShowOtpModal(false);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP');
    }
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
                  source={require('../../assets/images/logo-icon.png')}
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
              <Feather name="phone" size={16} color="#9D4EDD" />
              <Text style={styles.quickLoginText}>Quick Login</Text>
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
              />

              <TouchableOpacity 
                style={styles.arrowBtn}
                onPress={handleSendOTP}
              >
                <LinearGradient
                  colors={['#3D2914', '#16132B']} // Subtle dark gradient for the button background
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.arrowCircle}>
                   <Feather name="arrow-right" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.orContainer}>
            <Text style={styles.orText}>OR CONTINUE WITH</Text>
          </View>

          <View style={styles.socialRow}>
             <TouchableOpacity style={styles.socialBtn} onPress={loginWithGoogle}>
                <Text style={styles.googleG}>G</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.socialBtn} onPress={loginWithFacebook}>
                <Feather name="facebook" size={22} color="#1877F2" />
             </TouchableOpacity>
             <TouchableOpacity style={styles.socialBtn} onPress={() => setShowEmailModal(true)}>
                <Feather name="mail" size={22} color="#FFFFFF" />
             </TouchableOpacity>
             {Platform.OS === 'ios' && (
               <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#000000' }]} onPress={loginWithApple}>
                  <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
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

      {/* OTP Entry Modal */}
      <Modal
        visible={showOtpModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify OTP</Text>
              <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Enter the 6-digit code sent to {selectedCountry.code} {phoneNumber}
            </Text>

            <View style={styles.otpContainer}>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor="#4A5568"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                letterSpacing={10}
              />
            </View>

            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={handleVerifyOTP}
              disabled={isLoading}
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

            <TouchableOpacity 
              style={styles.resendBtn}
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              <Text style={styles.resendText}>Didn't receive code? Resend</Text>
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
});

export default LoginScreen;

