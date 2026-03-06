import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated as RNAnimated, Easing as RNEasing } from 'react-native';
import { 
  Canvas, 
  Fill, 
  Skia, 
  RuntimeShader,
  vec,
  useClock
} from '@shopify/react-native-skia';
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

// 2026 "Liquid Mesh" Shader
const liquidShader = Skia.RuntimeEffect.Make(`
  uniform float time;
  uniform vec2 resolution;
  
  half4 main(vec2 pos) {
    vec2 uv = pos / resolution.xy;
    
    // Create liquid motion using sine waves
    float color1 = sin(uv.x * 2.0 + time * 0.0005) * 0.5 + 0.5;
    float color2 = sin(uv.y * 3.0 - time * 0.0003) * 0.5 + 0.5;
    float color3 = sin((uv.x + uv.y) * 1.5 + time * 0.0002) * 0.5 + 0.5;
    
    // Deep 2026 Marketing Tones (Purples, Navys, Golds)
    vec3 c1 = vec3(0.06, 0.04, 0.20); // Deep Navy (#0F0B33)
    vec3 c2 = vec3(0.49, 0.23, 0.92); // Vivid Purple (#7C3AED)
    vec3 c3 = vec3(0.09, 0.52, 0.89); // Deep Cyan (#1885E4)
    
    vec3 finalColor = mix(c1, c2, color1);
    finalColor = mix(finalColor, c3, color2 * 0.5);
    finalColor += color3 * 0.05; // Subtle highlights
    
    return half4(finalColor, 1.0);
  }
`)!;

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
  const clock = useClock();

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
      {/* 1. The Liquid Shader Canvas */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill>
          <RuntimeShader 
            source={liquidShader} 
            uniforms={{ 
              time: clock as any, 
              resolution: vec(width, height) 
            }} 
          />
        </Fill>
      </Canvas>

      {/* 2. Glass Overlay (Subtle grain for realistic texture) */}
      <View style={styles.overlay} />

      {/* Floating Particles */}
      {showParticles && (
        <View style={styles.particlesContainer}>
          {particles.map((p, i) => (
            <FloatingParticle key={i} {...p} />
          ))}
        </View>
      )}

      {/* 3. Content Container */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060B28', // Fallback color
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 11, 40, 0.15)', // Darken slightly for readability
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
