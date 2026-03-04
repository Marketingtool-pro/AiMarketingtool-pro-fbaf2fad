import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const { width } = Dimensions.get('window');

// Pricing hero image
const PricingHeroImage = require('../../assets/images/screens/pricing-hero.jpg');

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
  isLifetime?: boolean;
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
      description: '7-day free trial',
      trialDays: 7,
      features: [
        { text: '7-day full access trial', included: true },
        { text: '10 AI generations', included: true },
        { text: 'Basic tools preview', included: true },
        { text: 'Full platform access', included: false },
        { text: 'Priority support', included: false },
        { text: 'All 3 platforms', included: false },
      ],
    },
    {
      id: 'starter',
      name: 'Single Tool',
      monthlyPrice: 3,
      yearlyPrice: 49,
      description: '1 Platform • 1 Tool Type',
      features: [
        { text: '1 tool category (20+ tools)', included: true },
        { text: 'Google OR Meta OR Shopify', included: true },
        { text: 'Unlimited generations', included: true },
        { text: 'Email support', included: true },
        { text: 'Full platform access', included: false },
        { text: 'All 3 platforms', included: false },
      ],
    },
    {
      id: 'pro',
      name: 'Full Platform',
      monthlyPrice: 9,
      yearlyPrice: 99,
      description: '1 Platform • All Tools',
      popular: true,
      features: [
        { text: 'Full 1 platform (70+ tools)', included: true },
        { text: 'Google OR Meta OR Shopify', included: true },
        { text: 'Unlimited generations', included: true },
        { text: 'Priority support', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'All 3 platforms', included: false },
      ],
    },
    {
      id: 'enterprise',
      name: 'All Platforms',
      monthlyPrice: 16,
      yearlyPrice: 499,
      description: 'All 3 Platforms • 206+ Tools',
      isLifetime: true,
      features: [
        { text: 'All 206+ AI marketing tools', included: true },
        { text: 'Google + Meta + Shopify', included: true },
        { text: 'Unlimited generations', included: true },
        { text: 'Dedicated support', included: true },
        { text: 'AI Marketing Agents', included: true },
        { text: 'White-label option', included: true },
      ],
    },
  ];

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      navigation.goBack();
      return;
    }

    setIsLoading(true);

    try {
      // TODO: PRODUCTION PAYMENT INTEGRATION REQUIRED
      // This is a placeholder - real payment processing must be implemented before production release
      // Recommended: Use Stripe or RevenueCat for in-app purchases
      // 
      // For Stripe: npm install @stripe/stripe-react-native
      // For RevenueCat: npm install react-native-purchases
      //
      // Implementation steps:
      // 1. Initialize payment SDK (Stripe/RevenueCat)
      // 2. Create payment intent on backend
      // 3. Present payment sheet to user
      // 4. Confirm payment
      // 5. Update subscription in Appwrite database
      // 6. Grant user access to features
      
      // TEMPORARY SIMULATION - REMOVE IN PRODUCTION
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        '⚠️ Demo Mode',
        'Payment integration not yet implemented. In production, this would process a real payment via Stripe or RevenueCat.',
        [
          {
            text: 'OK',
            onPress: () => {
              // For demo purposes only - DO NOT USE IN PRODUCTION
              updateProfile({ subscription: selectedPlan as 'free' | 'starter' | 'pro' | 'enterprise' });
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPrice = (plan: Plan) => {
    if (billingPeriod === 'yearly') {
      return plan.yearlyPrice;
    }
    return plan.monthlyPrice;
  };

  const getSavings = (plan: Plan) => {
    if (plan.isLifetime) {
      return 0;
    }
    if (billingPeriod === 'yearly' && plan.monthlyPrice > 0) {
      const yearlySavings = (plan.monthlyPrice * 12) - plan.yearlyPrice;
      return yearlySavings > 0 ? yearlySavings : 0;
    }
    return 0;
  };

  return (
    <AnimatedBackground variant="profile" showParticles={true}>
      {/* Hero Header with Image */}
      <View style={styles.heroContainer}>
        <Image source={PricingHeroImage} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(13, 15, 28, 0.3)', 'rgba(13, 15, 28, 0.8)', 'rgba(13, 15, 28, 1)']}
          style={styles.heroGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="x" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <View style={styles.pricingBadge}>
              <Feather name="star" size={14} color={Colors.gold} />
              <Text style={styles.pricingBadgeText}>7-Day Free Trial</Text>
            </View>
            <Text style={styles.headerTitle}>Choose Your Plan</Text>
            <Text style={styles.headerSubtitle}>
              Unlock all 206+ AI marketing tools. Cancel anytime.
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Header Billing Toggle */}
      <View style={styles.header}>

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingOption, billingPeriod === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text style={[styles.billingText, billingPeriod === 'monthly' && styles.billingTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingOption, billingPeriod === 'yearly' && styles.billingOptionActive]}
            onPress={() => setBillingPeriod('yearly')}
          >
            <Text style={[styles.billingText, billingPeriod === 'yearly' && styles.billingTextActive]}>
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 40%</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Plans */}
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan === plan.id && styles.planCardSelected,
              plan.popular && styles.planCardPopular,
            ]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}
            {plan.isLifetime && billingPeriod === 'yearly' && (
              <View style={[styles.popularBadge, styles.lifetimeBadge]}>
                <Text style={styles.popularBadgeText}>LIFETIME ACCESS</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>
                  ${getPrice(plan)}
                </Text>
                <Text style={styles.planPeriod}>
                  /{billingPeriod === 'yearly'
                    ? (plan.isLifetime ? 'lifetime' : 'year')
                    : 'month'}
                </Text>
              </View>
            </View>

            {getSavings(plan) > 0 && (
              <View style={styles.savingsTag}>
                <Feather name="tag" size={14} color={Colors.success} />
                <Text style={styles.savingsText}>Save ${getSavings(plan)}/year</Text>
              </View>
            )}

            <View style={styles.planFeatures}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Feather
                    name={feature.included ? 'check-circle' : 'x-circle'}
                    size={18}
                    color={feature.included ? Colors.success : Colors.textTertiary}
                  />
                  <Text style={[
                    styles.featureText,
                    !feature.included && styles.featureTextDisabled
                  ]}>
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Selection indicator */}
            <View style={styles.selectionIndicator}>
              <View style={[
                styles.radioOuter,
                selectedPlan === plan.id && styles.radioOuterSelected
              ]}>
                {selectedPlan === plan.id && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Guarantee */}
        <View style={styles.guarantee}>
          <Feather name="shield" size={24} color={Colors.success} />
          <View style={styles.guaranteeText}>
            <Text style={styles.guaranteeTitle}>30-Day Money Back Guarantee</Text>
            <Text style={styles.guaranteeSubtitle}>
              Not satisfied? Get a full refund within 30 days.
            </Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Subscribe Button */}
      <View style={styles.subscribeContainer}>
        <TouchableOpacity
          onPress={handleSubscribe}
          disabled={isLoading}
          style={styles.subscribeButton}
        >
          <LinearGradient colors={Gradients.primary} style={styles.subscribeGradient}>
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.subscribeText}>
                {selectedPlan === 'free'
                  ? 'Continue with Free'
                  : `Start 7-Day Free Trial`}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.subscribeNote}>
          No credit card required for trial
        </Text>
      </View>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroContainer: {
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  pricingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 151, 7, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  pricingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gold,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: Colors.primary,
  },
  billingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  billingTextActive: {
    color: Colors.white,
  },
  saveBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planCardPopular: {
    borderColor: Colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -60,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  lifetimeBadge: {
    backgroundColor: Colors.secondary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  planDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  planPeriod: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  savingsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: 6,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  planFeatures: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: Colors.white,
  },
  featureTextDisabled: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  selectionIndicator: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  guaranteeText: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  guaranteeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subscribeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: 34,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  subscribeButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  subscribeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  subscribeNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default SubscriptionScreen;
