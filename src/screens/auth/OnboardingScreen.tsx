import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Platform,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import LiquidButton from '../../components/common/LiquidButton';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_SIZE = width * 0.65;
const ICON_SIZE = CARD_SIZE * 0.7;

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  icon: ImageSourcePropType;
  gradient: string[];
}

const ONBOARDING_DATA: OnboardingItem[] = [
  {
    id: '1',
    title: 'Professional AI Tools',
    description: 'Unlock 314+ premium AI tools designed for Meta, Google, and Shopify marketers.',
    icon: require('../../assets/images/tool-icons-v2/onboarding-1.png'),
    gradient: ['#7C3AED', '#9D4EDD'],
  },
  {
    id: '2',
    title: 'Connect Real Data',
    description: 'Skip the demo. Connect real Google Ads & Meta accounts for live performance analysis.',
    icon: require('../../assets/images/tool-icons-v2/onboarding-2.png'),
    gradient: ['#10B981', '#34D399'],
  },
  {
    id: '3',
    title: 'Scale Your Growth',
    description: 'Our specialized Windmill AI engine helps you generate high-ROAS marketing content.',
    icon: require('../../assets/images/tool-icons-v2/onboarding-3.png'),
    gradient: ['#F59E0B', '#FCD34D'],
  },
  {
    id: '4',
    title: 'Start 7-Day Trial',
    description: 'Get full access to all Pro features for 7 days. No credit card required.',
    icon: require('../../assets/images/tool-icons-v2/onboarding-4.png'),
    gradient: ['#EC4899', '#F472B6'],
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation<any>();
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Initial Auth Check (Firebase/Appwrite Data Check)
    const init = async () => {
      await checkAuth();
      const hasSeen = await SecureStore.getItemAsync('hasSeenOnboarding');
      
      if (isAuthenticated) {
        navigation.replace('Main');
      } else if (hasSeen === 'true') {
        navigation.navigate('Auth');
      }
      setChecking(false);
    };
    init();
  }, [isAuthenticated]);

  const completeOnboarding = async () => {
    await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
    navigation.navigate('Auth');
  };

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: '#0D0F1C', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const renderItem = ({ item }: { item: OnboardingItem }) => (
    <View style={styles.slide}>
      <View style={styles.cardShadow}>
        <View style={styles.glassCard}>
          <LinearGradient
            colors={[item.gradient[0] + '20', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={[styles.iconGlow, { backgroundColor: item.gradient[0] + '15', shadowColor: item.gradient[0] }]} />
          <Image source={item.icon} style={styles.icon3d} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <AnimatedBackground variant="default" showParticles={false}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={completeOnboarding}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <FlatList
          ref={flatListRef}
          data={ONBOARDING_DATA}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          keyExtractor={(item) => item.id}
        />

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {ONBOARDING_DATA.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  currentIndex === i ? styles.activeDot : null,
                ]}
              />
            ))}
          </View>

          <LiquidButton
            title={currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started  \u2192' : 'Next  \u2192'}
            onPress={handleNext}
            variant="primary"
            size="lg"
          />
        </View>
      </View>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  skipText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '500' },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  cardShadow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 12,
    marginBottom: 40,
  },
  glassCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(22,24,36,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconGlow: {
    position: 'absolute',
    width: ICON_SIZE + 20,
    height: ICON_SIZE + 20,
    borderRadius: (ICON_SIZE + 20) / 2,
    backgroundColor: 'rgba(124,58,237,0.15)',
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  icon3d: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  textContainer: { alignItems: 'center' },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activeDot: { width: 24, backgroundColor: Colors.secondary },
  nextBtn: { width: '100%', height: 56, borderRadius: 28, overflow: 'hidden' },
  nextGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  nextText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
});

export default OnboardingScreen;
