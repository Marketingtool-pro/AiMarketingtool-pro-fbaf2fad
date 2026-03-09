import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import Glass3DLogo from '../../components/common/Glass3DLogo';
import { Canvas, RoundedRect, Blur, LinearGradient as SkiaGradient, vec } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  logoType: 'ai' | 'ads' | 'seo' | 'social';
}

const ONBOARDING_DATA: OnboardingItem[] = [
  {
    id: '1',
    title: 'AI Marketing Tools',
    description: 'Access the most comprehensive suite of AI-powered marketing tools. From ad copy to blog posts, we\'ve got you covered.',
    logoType: 'ai',
  },
  {
    id: '2',
    title: 'Smart Ads Generator',
    description: 'Create high-converting headlines and descriptions for Google, Meta, and LinkedIn in seconds.',
    logoType: 'ads',
  },
  {
    id: '3',
    title: 'Advanced SEO AI',
    description: 'Optimize your content for search engines with keyword research and E-commerce SEO tools.',
    logoType: 'seo',
  },
  {
    id: '4',
    title: 'Social Growth',
    description: 'Grow your social presence with engaging captions, hashtags, and viral content ideas.',
    logoType: 'social',
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.navigate('Auth');
    }
  };

  const renderItem = ({ item }: { item: OnboardingItem }) => (
    <View style={styles.slide}>
      <View style={styles.glassContainer}>
        <Canvas style={styles.skiaCanvas}>
          <RoundedRect
            x={0}
            y={0}
            width={width * 0.8}
            height={width * 0.8}
            r={48}
            color="rgba(255, 255, 255, 0.05)"
          >
            <Blur blur={20} />
            <SkiaGradient
              start={vec(0, 0)}
              end={vec(width * 0.8, width * 0.8)}
              colors={['rgba(255,255,255,0.1)', 'transparent']}
            />
          </RoundedRect>
        </Canvas>
        <Glass3DLogo type={item.logoType} size={width * 0.5} />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <AnimatedBackground variant="auth" showParticles={true}>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.skipBtn} 
          onPress={() => navigation.navigate('Auth')}
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
                  currentIndex === i ? styles.activeDot : null
                ]} 
              />
            ))}
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <LinearGradient colors={Gradients.button} style={styles.nextGradient}>
              <Text style={styles.nextText}>
                {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  glassContainer: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    overflow: 'hidden',
  },
  skiaCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
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
  activeDot: {
    width: 24,
    backgroundColor: Colors.secondary,
  },
  nextBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;
