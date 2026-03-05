import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  gradient: string[];
}

const onboardingData: OnboardingItem[] = [
  {
    id: '1',
    title: 'AI Marketing Tools',
    description: 'Access the most comprehensive suite of AI-powered marketing tools. From ad copy to blog posts, we\'ve got you covered.',
    icon: 'zap',
    gradient: ['#6C5CE7', '#A29BFE'],
  },
  {
    id: '2',
    title: 'Create Content Instantly',
    description: 'Generate high-converting ads, engaging social posts, and SEO-optimized content in seconds with Claude AI.',
    icon: 'edit-3',
    gradient: ['#00D9FF', '#6C5CE7'],
  },
  {
    id: '3',
    title: 'Boost Your ROI',
    description: 'Our AI analyzes top-performing content to help you create marketing materials that convert.',
    icon: 'trending-up',
    gradient: ['#FF6B9D', '#6C5CE7'],
  },
  {
    id: '4',
    title: '7-Day Free Trial',
    description: 'Start creating amazing marketing content today. No credit card required to get started.',
    icon: 'gift',
    gradient: ['#00D68F', '#00B894'],
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.navigate('Auth');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Auth');
  };

  const renderItem = ({ item, index }: { item: OnboardingItem; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale }], opacity }]}>
          <LinearGradient
            colors={item.gradient as [string, string]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name={item.icon} size={80} color={Colors.white} />
          </LinearGradient>
        </Animated.View>
        <Animated.Text style={[styles.title, { opacity }]}>{item.title}</Animated.Text>
        <Animated.Text style={[styles.description, { opacity }]}>{item.description}</Animated.Text>
      </View>
    );
  };

  const renderPagination = () => (
    <View style={styles.pagination}>
      {onboardingData.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[styles.dot, { width: dotWidth, opacity }]}
          />
        );
      })}
    </View>
  );

  return (
    <LinearGradient colors={Gradients.dark} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {renderPagination()}

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <LinearGradient
            colors={Gradients.button}
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Feather name="arrow-right" size={20} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    alignItems: 'flex-end',
  },
  skipButton: {
    padding: Spacing.sm,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  slide: {
    width,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.xxl,
  },
  iconGradient: {
    width: 180,
    height: 180,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 50,
  },
  nextButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    gap: 8,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
