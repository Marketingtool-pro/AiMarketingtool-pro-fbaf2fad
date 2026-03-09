import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { functions } from '../../services/appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import Glass3DLogo from '../../components/common/Glass3DLogo';
import { Canvas, RoundedRect, Blur, LinearGradient as SkiaGradient, vec } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// 2026 Refractive Glass Card Component
const GlassBentoCard = ({ children, color, isSelected }: { children: React.ReactNode, color: string, isSelected?: boolean }) => (
  <View style={[styles.glassBentoContainer, isSelected && { borderColor: Colors.secondary, borderWidth: 2 }]}>
    <Canvas style={styles.skiaCanvas}>
      <RoundedRect
        x={0}
        y={0}
        width={width - 40}
        height={isSelected ? 320 : 300}
        r={24}
        color="rgba(6, 11, 40, 0.7)"
      >
        <SkiaGradient
          start={vec(0, 0)}
          end={vec(width, 300)}
          colors={isSelected ? [Colors.secondary + '20', 'transparent'] : ['rgba(255,255,255,0.05)', 'transparent']}
        />
        <Blur blur={20} />
      </RoundedRect>
    </Canvas>
    <View style={styles.glassBentoContent}>
      {children}
    </View>
  </View>
);

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
  trialDays?: number;
  logoType: 'seo' | 'ads' | 'ai' | 'social';
}

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const { profile, updateProfile } = useAuthStore();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [isLoading, setIsLoading] = useState(false);

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free Trial',
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: '7 days • Full platform visible',
      trialDays: 7,
      logoType: 'seo',
      features: [
        { text: '7-day full access trial', included: true },
        { text: '3 generations per day', included: true },
        { text: 'Simulation mode', included: true },
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 29,
      yearlyPrice: 199,
      description: '200 generations/month',
      logoType: 'social',
      features: [
        { text: 'Full web platform access', included: true },
        { text: 'All 7 platforms', included: true },
        { text: '200 generations/month', included: true },
      ],
    },
    {
      id: 'pro',
      name: 'Professional',
      monthlyPrice: 49,
      yearlyPrice: 399,
      description: '500 generations/month',
      logoType: 'ai',
      features: [
        { text: '500 generations/month', included: true },
        { text: 'Advanced automation engine', included: true },
        { text: 'Priority support', included: true },
      ],
    },
    {
      id: 'growth',
      name: 'Agency',
      monthlyPrice: 99,
      yearlyPrice: 899,
      description: '1,500+ generations/month',
      popular: true,
      logoType: 'ads',
      features: [
        { text: '1,500+ generations/month', included: true },
        { text: 'Full automation', included: true },
        { text: 'Executive dashboards', included: true },
      ],
    },
  ];

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (selectedPlan === 'free') {
      navigation.goBack();
      return;
    }

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    setIsLoading(true);
    try {
      const execution = await functions.createExecution(
        'stripe-checkout',
        JSON.stringify({
          planId: selectedPlan,
          billingPeriod: billingPeriod,
          price: billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
        }),
        false,
        '/',
        ExecutionMethod.POST
      );
      const result = JSON.parse(execution.responseBody);
      if (result.url) {
        await Linking.openURL(result.url);
      } else {
        Alert.alert('Error', 'Could not create checkout session.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open checkout.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedBackground variant="profile" showParticles={true}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Plans</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Billing Toggle */}
        <View style={styles.billingContainer}>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingOption, billingPeriod === 'monthly' && styles.billingOptionActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setBillingPeriod('monthly');
              }}
            >
              <Text style={[styles.billingText, billingPeriod === 'monthly' && styles.billingTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingOption, billingPeriod === 'yearly' && styles.billingOptionActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setBillingPeriod('yearly');
              }}
            >
              <Text style={[styles.billingText, billingPeriod === 'yearly' && styles.billingTextActive]}>Yearly</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>-44%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Cards Bento Grid */}
        <View style={styles.plansGrid}>
          {plans.map((plan) => (
            <TouchableOpacity 
              key={plan.id} 
              activeOpacity={0.9} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedPlan(plan.id);
              }}
            >
              <GlassBentoCard color={Colors.secondary} isSelected={selectedPlan === plan.id}>
                {plan.popular && (
                  <LinearGradient colors={Gradients.accent} style={styles.popularTag}>
                    <Text style={styles.popularTagText}>MOST POPULAR</Text>
                  </LinearGradient>
                )}
                
                <View style={styles.planHeader}>
                  <Glass3DLogo type={plan.logoType} size={80} />
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>
                      ${billingPeriod === 'yearly' ? (plan.yearlyPrice / 12).toFixed(0) : plan.monthlyPrice}
                      <Text style={styles.planPeriod}>/mo</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.featuresList}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featureItem}>
                      <Feather name="check-circle" size={16} color={Colors.secondary} />
                      <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                  ))}
                </View>
              </GlassBentoCard>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.bottomAction}>
        <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe} disabled={isLoading}>
          <LinearGradient colors={Gradients.secondary} style={styles.subscribeGradient}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.subscribeButtonText}>Activate {selectedPlan.toUpperCase()}</Text>}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.secureText}>
          <Feather name="lock" size={12} color={Colors.textTertiary} /> Secure payment via Stripe
        </Text>
      </View>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  billingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6, 11, 40, 0.8)',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 240,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  billingOptionActive: {
    backgroundColor: Colors.secondary,
  },
  billingText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  billingTextActive: {
    color: Colors.white,
  },
  saveBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: 'bold',
  },
  plansGrid: {
    paddingHorizontal: 20,
    gap: 20,
  },
  glassBentoContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  skiaCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  glassBentoContent: {
    padding: 24,
  },
  popularTag: {
    position: 'absolute',
    top: 0,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  popularTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
  },
  planPeriod: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: 'normal',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(13, 15, 28, 0.95)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  subscribeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 56,
  },
  subscribeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 1,
  },
  secureText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    color: Colors.textTertiary,
  },
});

export default SubscriptionScreen;
