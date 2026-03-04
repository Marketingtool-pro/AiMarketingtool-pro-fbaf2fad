import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'chat' | 'tools' | 'profile' | 'dashboard';
  showParticles?: boolean;
  showGradient?: boolean;
  imageSource?: any;
}

// Floating Particle Component
const FloatingParticle = ({ delay, size, startX, startY, color }: {
  delay: number;
  size: number;
  startX: number;
  startY: number;
  color: string;
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: -height * 0.4,
              duration: 8000 + Math.random() * 4000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: (Math.random() - 0.5) * 100,
              duration: 8000 + Math.random() * 4000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(opacity, {
                toValue: 0.6,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 6000,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(scale, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(scale, {
                toValue: 0.3,
                duration: 5000,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: startX,
          top: startY,
          transform: [{ translateY }, { translateX }, { scale }],
          opacity,
        },
      ]}
    />
  );
};

// Animated Glow Ring
const GlowRing = ({ delay, maxSize, color }: { delay: number; maxSize: number; color: string }) => {
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 4000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.2, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.glowRing,
        {
          width: maxSize,
          height: maxSize,
          borderRadius: maxSize / 2,
          borderColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  variant = 'default',
  showParticles = true,
  showGradient = true,
  imageSource,
}) => {
  const particles = [
    { delay: 0, size: 6, startX: width * 0.1, startY: height * 0.8, color: Colors.accent + '60' },
    { delay: 1000, size: 8, startX: width * 0.3, startY: height * 0.9, color: Colors.purple + '60' },
    { delay: 2000, size: 5, startX: width * 0.5, startY: height * 0.85, color: Colors.gold + '60' },
    { delay: 3000, size: 7, startX: width * 0.7, startY: height * 0.95, color: Colors.cyan + '60' },
    { delay: 4000, size: 6, startX: width * 0.9, startY: height * 0.88, color: Colors.accent + '60' },
    { delay: 500, size: 4, startX: width * 0.2, startY: height * 0.92, color: Colors.success + '60' },
    { delay: 1500, size: 5, startX: width * 0.6, startY: height * 0.87, color: Colors.purple + '60' },
    { delay: 2500, size: 8, startX: width * 0.8, startY: height * 0.93, color: Colors.gold + '60' },
  ];

  const getGradientColors = () => {
    switch (variant) {
      case 'chat':
        return ['rgba(175, 21, 195, 0.1)', 'rgba(12, 11, 24, 0.95)', Colors.background];
      case 'tools':
        return ['rgba(100, 65, 165, 0.1)', 'rgba(12, 11, 24, 0.95)', Colors.background];
      case 'profile':
        return ['rgba(253, 151, 7, 0.1)', 'rgba(12, 11, 24, 0.95)', Colors.background];
      case 'dashboard':
        return ['rgba(100, 65, 165, 0.15)', 'rgba(12, 11, 24, 0.95)', Colors.background];
      default:
        return ['rgba(22, 19, 43, 1)', 'rgba(12, 11, 24, 1)', Colors.background];
    }
  };

  const getGlowColor = () => {
    switch (variant) {
      case 'chat': return Colors.purple;
      case 'tools': return Colors.accent;
      case 'profile': return Colors.gold;
      case 'dashboard': return Colors.accent;
      default: return Colors.accent;
    }
  };

  return (
    <View style={styles.container}>
      {imageSource ? (
        <ImageBackground
          source={imageSource}
          style={styles.imageBackground}
          imageStyle={{ opacity: 0.15 }}
        >
          {showGradient && (
            <LinearGradient
              colors={getGradientColors() as any}
              style={styles.gradientOverlay}
              locations={[0, 0.5, 1]}
            />
          )}
        </ImageBackground>
      ) : (
        showGradient && (
          <LinearGradient
            colors={getGradientColors() as any}
            style={styles.gradientOverlay}
            locations={[0, 0.5, 1]}
          />
        )
      )}

      {/* Glow Rings */}
      <View style={styles.glowContainer}>
        <GlowRing delay={0} maxSize={300} color={getGlowColor() + '20'} />
        <GlowRing delay={1500} maxSize={400} color={getGlowColor() + '15'} />
        <GlowRing delay={3000} maxSize={500} color={getGlowColor() + '10'} />
      </View>

      {/* Floating Particles */}
      {showParticles && (
        <View style={styles.particlesContainer}>
          {particles.map((p, i) => (
            <FloatingParticle key={i} {...p} />
          ))}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  imageBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
  },
  content: {
    flex: 1,
  },
});

export default AnimatedBackground;
