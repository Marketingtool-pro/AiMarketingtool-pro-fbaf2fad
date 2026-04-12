import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';

interface LiquidButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'gold' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const GRADIENTS = {
  primary: ['#7C3AED', '#9D4EDD', '#7C3AED'] as const,
  secondary: ['#06B6D4', '#0891B2', '#06B6D4'] as const,
  gold: ['#F59E0B', '#D97706', '#F59E0B'] as const,
  glass: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)'] as const,
};

const SIZE_STYLES = {
  sm: { paddingVertical: 10, paddingHorizontal: 16 },
  md: { paddingVertical: 14, paddingHorizontal: 24 },
  lg: { paddingVertical: 18, paddingHorizontal: 32 },
} as const;

const TEXT_SIZES = { sm: 13, md: 15, lg: 17 } as const;

const LiquidButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  style,
  textStyle,
}: LiquidButtonProps) => {
  const shimmer = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedShimmer = useAnimatedStyle(() => ({
    opacity: 0.15 + shimmer.value * 0.15,
    transform: [{ translateX: -60 + shimmer.value * 120 }],
  }));

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
    onPress();
  };

  const gradientColors = GRADIENTS[variant];

  return (
    <Animated.View style={[animatedScale, style]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={disabled}
      >
        <LinearGradient
          colors={[...gradientColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            SIZE_STYLES[size],
            variant === 'glass' && styles.glassButton,
            disabled && styles.disabled,
          ]}
        >
          {/* Liquid shimmer overlay */}
          <Animated.View style={[styles.shimmer, animatedShimmer]} />

          {/* Glass border glow */}
          {variant === 'glass' && <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassGlow}
          />}

          {icon && icon}
          <Text style={[
            styles.text,
            { fontSize: TEXT_SIZES[size] },
            variant === 'glass' && styles.glassText,
            textStyle,
          ]}>
            {title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  glassButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  glassGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  shimmer: {
    position: 'absolute',
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 30,
  },
  text: {
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  glassText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default LiquidButton;
