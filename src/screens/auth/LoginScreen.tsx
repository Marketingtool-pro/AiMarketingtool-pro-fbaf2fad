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
    login, loginWithGoogle, loginWithApple,
    sendPhoneOTP, verifyPhoneOTP, isLoading, clearError,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[1]); // Default to India as per image
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpUserId, setOtpUserId] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

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
      const userId = await sendPhoneOTP(formattedPhone);
      setOtpUserId(userId);
      setOtpSent(true);
      setShowOtpModal(true);
    } catch (err: any) {
      Alert.alert('OTP Failed', err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
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
                <Feather name="search" size={22} color="#FFFFFF" />
             </TouchableOpacity>
             <TouchableOpacity style={styles.socialBtn} onPress={() => setShowEmailModal(true)}>
                <Feather name="mail" size={22} color="#FFFFFF" />
             </TouchableOpacity>
             {Platform.OS === 'ios' && (
               <TouchableOpacity style={styles.socialBtn} onPress={loginWithApple}>
                  <Feather name="apple" size={22} color="#FFFFFF" />
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
    backgroundColor: '#161824',
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
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
});

export default LoginScreen;

