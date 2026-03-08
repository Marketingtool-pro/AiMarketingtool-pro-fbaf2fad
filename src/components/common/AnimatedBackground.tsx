import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated as RNAnimated, Easing as RNEasing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Floating Particle Component
const FloatingParticle = ({ delay, size, startX, startY, color }: {
  delay: number;
  size: number;
  startX: number;
  startY: number;
  color: string;
}) => {
  const translateY = React.useRef(new RNAnimated.Value(0)).current;
  const translateX = React.useRef(new RNAnimated.Value(0)).current;
  const opacity = React.useRef(new RNAnimated.Value(0)).current;
  const scale = React.useRef(new RNAnimated.Value(0.5)).current;

  React.useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.parallel([
          RNAnimated.timing(translateY, {
            toValue: -height * 0.4,
            duration: 8000 + Math.random() * 4000,
            easing: RNEasing.out(RNEasing.ease),
            useNativeDriver: true,
          }),
          RNAnimated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 100,
            duration: 8000 + Math.random() * 4000,
            easing: RNEasing.inOut(RNEasing.ease),
            useNativeDriver: true,
          }),
          RNAnimated.sequence([
            RNAnimated.timing(opacity, {
              toValue: 0.6,
              duration: 2000,
              useNativeDriver: true,
            }),
            RNAnimated.timing(opacity, {
              toValue: 0,
              duration: 6000,
              useNativeDriver: true,
            }),
          ]),
          RNAnimated.sequence([
            RNAnimated.timing(scale, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            RNAnimated.timing(scale, {
              toValue: 0.3,
              duration: 5000,
              useNativeDriver: true,
            }),
          ]),
        ]),
        RNAnimated.parallel([
          RNAnimated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
          RNAnimated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
          RNAnimated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
          RNAnimated.timing(scale, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <RNAnimated.View
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

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'chat' | 'tools' | 'profile' | 'dashboard';
  showParticles?: boolean;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  variant = 'default',
  showParticles = true,
}) => {
  const particles = useMemo(() => [
    { delay: 0, size: 6, startX: width * 0.1, startY: height * 0.8, color: Colors.secondary + '60' },
    { delay: 1000, size: 8, startX: width * 0.3, startY: height * 0.9, color: Colors.purple + '60' },
    { delay: 2000, size: 5, startX: width * 0.5, startY: height * 0.85, color: Colors.gold + '60' },
    { delay: 3000, size: 7, startX: width * 0.7, startY: height * 0.95, color: Colors.cyan + '60' },
    { delay: 4000, size: 6, startX: width * 0.9, startY: height * 0.88, color: Colors.secondary + '60' },
    { delay: 500, size: 4, startX: width * 0.2, startY: height * 0.92, color: Colors.success + '60' },
    { delay: 1500, size: 5, startX: width * 0.6, startY: height * 0.87, color: Colors.purple + '60' },
    { delay: 2500, size: 8, startX: width * 0.8, startY: height * 0.93, color: Colors.gold + '60' },
  ], []);

  return (
    <View style={styles.container}>
      {/* Liquid Mesh Gradient Background */}
      <LinearGradient
        colors={['#0F0B33', '#2d1b69', '#1885E4', '#060B28']}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Glass Overlay */}
      <View style={styles.overlay} />

      {/* Floating Particles */}
      {showParticles && (
        <View style={styles.particlesContainer}>
          {particles.map((p, i) => (
            <FloatingParticle key={i} {...p} />
          ))}
        </View>
      )}

      {/* Content Container */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060B28',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 11, 40, 0.15)',
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
