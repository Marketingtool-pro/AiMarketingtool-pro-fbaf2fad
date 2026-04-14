import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Image,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients } from '../../constants/theme';
import { functions } from '../../services/appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import * as Haptics from 'expo-haptics';
import { billingService } from '../../services/billingService';

const { width } = Dimensions.get('window');

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyTotal: number;
  description: string;
  features: { text: string; included: boolean }[];
  savingsPerYear?: number;
  popular?: boolean;
}

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const { profile, refreshProfile } = useAuthStore();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize Billing Service on mount
    if (Platform.OS !== 'web') {
      billingService.initialize().catch(err => {
        console.error('[Billing] Init failed:', err);
      });
    }
    return () => {
      if (Platform.OS !== 'web') {
        billingService.end().catch(() => {});
      }
    };
  }, []);

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free Trial',
      monthlyPrice: 0, yearlyPrice: 0, yearlyTotal: 0,
      description: '7-day trial, 3 generations/day',
      features: [
        { text: '7-day full access trial', included: true },
        { text: '3 generations per day', included: true },
        { text: 'Explore all 7 platforms', included: true },
        { text: 'Simulation mode enabled', included: true },
        { text: 'Priority support', included: false },
        { text: 'Real account connect', included: false },
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 29, yearlyPrice: 17, yearlyTotal: 199,
      description: '200 generations/month',
      savingsPerYear: 149,
      features: [
        { text: '200 generations/month', included: true },
        { text: 'All AI marketing tools', included: true },
        { text: 'All 7 platforms included', included: true },
        { text: 'Standard reports', included: true },
        { text: 'Real account connect', included: true },
      ],
    },
    {
      id: 'pro',
      name: 'Professional',
      monthlyPrice: 59, yearlyPrice: 42, yearlyTotal: 499,
      description: 'Connect Real Google & Meta Ads Data',
      popular: true,
      features: [
        { text: '500 generations/month', included: true },
        { text: 'Real Google/Meta Connection', included: true },
        { text: 'Performance Forecasting', included: true },
        { text: 'Advanced Automation', included: true },
        { text: 'Priority support', included: true },
      ],
    },
    {
      id: 'growth',
      name: 'Growth',
      monthlyPrice: 99, yearlyPrice: 83, yearlyTotal: 999,
      description: 'For Agencies & Large Advertisers',
      features: [
        { text: '1,500+ generations/month', included: true },
        { text: 'Real-time scaling AI', included: true },
        { text: 'Full Agency Dashboard', included: true },
        { text: 'Executive Reporting', included: true },
        { text: '24/7 Priority Support', included: true },
      ],
    },
  ];

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (selectedPlan === 'free') { navigation.goBack(); return; }
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    setIsLoading(true);
    const userId = profile?.userId || profile?.$id;

    try {
      if (Platform.OS !== 'web') {
        // Use Native IAP — check if billing is available first
        const serverPlanId = selectedPlan === 'pro' ? 'professional' : selectedPlan === 'growth' ? 'alltools' : selectedPlan;
        const sku = selectedPlan === 'tokens-100' ? 'tokens-100' : `pro_${serverPlanId}_${billingPeriod}`;

        let result: { success: boolean; error?: string };
        try {
          result = await billingService.requestPurchase(sku, userId!);
        } catch (iapError: any) {
          // IAP not available (dev build, Expo Go, or store not configured)
          // Fallback to Stripe Checkout via Appwrite function
          try {
            const execution = await functions.createExecution(
              'stripe-checkout',
              JSON.stringify({
                planId: serverPlanId,
                billingPeriod,
                userId,
                userEmail: profile?.email,
              }),
              false, '/', ExecutionMethod.POST
            );
            const stripeResult = JSON.parse(execution.responseBody);
            if (stripeResult.url) {
              await Linking.openURL(stripeResult.url);
              setIsLoading(false);
              return;
            }
          } catch (_stripeErr) {
            // Stripe fallback also failed
          }
          Alert.alert('Purchase Unavailable', 'In-app purchases are not available in this build. Please subscribe at marketingtool.pro/pricing');
          setIsLoading(false);
          return;
        }

        if (result.success) {
          Alert.alert('Success', 'Subscription activated successfully!', [
            { text: 'OK', onPress: () => { refreshProfile(); navigation.goBack(); } }
          ]);
        } else {
          Alert.alert('Purchase Failed', result.error || 'Could not complete purchase.');
        }
      } else {
        // Fallback to Stripe Checkout for Web
        const serverPlanId = selectedPlan === 'pro' ? 'professional' : selectedPlan === 'growth' ? 'alltools' : selectedPlan;
        const execution = await functions.createExecution(
          'stripe-checkout',
          JSON.stringify({
            planId: serverPlanId,
            billingPeriod,
            userId,
            userEmail: profile?.email,
          }),
          false, '/', ExecutionMethod.POST
        );
        const result = JSON.parse(execution.responseBody);
        if (result.url) { await Linking.openURL(result.url); }
        else { Alert.alert('Error', 'Could not create checkout session.'); }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open checkout.');
    } finally { setIsLoading(false); }
  };

  const handleRestore = async () => {
    if (Platform.OS === 'web') return;
    setIsLoading(true);
    const userId = profile?.userId || profile?.$id;
    try {
      const result = await billingService.restorePurchases(userId!);
      if (result.success) {
        Alert.alert('Success', `Restored ${result.count} purchases successfully!`, [
          { text: 'OK', onPress: () => { refreshProfile(); navigation.goBack(); } }
        ]);
      } else {
        Alert.alert('Restore Failed', result.error || 'No active subscriptions found.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not restore purchases.');
    } finally { setIsLoading(false); }
  };

  return (
    <View style={styles.container}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <View style={styles.closeBtnBg}>
          <Feather name="x" size={22} color="#FFF" />
        </View>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero header with background image */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.2)', 'rgba(13, 15, 28, 0)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <View style={styles.trialBadge}>
                  <Feather name="zap" size={12} color="#F59E0B" />
                  <Text style={styles.trialBadgeText}>7-Day Free Trial Available</Text>
                </View>
                <Text style={styles.heroTitle}>Scale Your Marketing with AI</Text>
                <Text style={styles.heroSub}>Join 12,000+ marketers using real-time data to drive ROAS.</Text>
              </View>
              <View style={styles.heroRight}>
                <Image 
                  source={require('../../assets/images/tool-icons-v2/trophy.png')} 
                  style={styles.heroIcon} 
                  resizeMode="contain" 
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Trust Stats Bar */}
        <View style={styles.trustStatsBar}>
          <View style={styles.trustStat}>
            <Text style={styles.trustStatValue}>314+</Text>
            <Text style={styles.trustStatLabel}>AI Tools</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustStat}>
            <Text style={styles.trustStatValue}>$2.4M+</Text>
            <Text style={styles.trustStatLabel}>Ad Spend</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustStat}>
            <Text style={styles.trustStatValue}>4.9/5</Text>
            <Text style={styles.trustStatLabel}>Rating</Text>
          </View>
        </View>

        {/* Billing Toggle - Glass Card */}
        <View style={styles.billingWrap}>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingOpt, billingPeriod === 'monthly' && styles.billingOptActive]}
              onPress={() => { Haptics.selectionAsync(); setBillingPeriod('monthly'); }}
            >
              <Text style={[styles.billingText, billingPeriod === 'monthly' && styles.billingTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingOpt, billingPeriod === 'yearly' && styles.billingOptActive]}
              onPress={() => { Haptics.selectionAsync(); setBillingPeriod('yearly'); }}
            >
              <Text style={[styles.billingText, billingPeriod === 'yearly' && styles.billingTextActive]}>Yearly</Text>
              <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save up to 44%</Text></View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Cards - Glass Style */}
        <View style={styles.plansWrap}>
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selected && styles.planCardSelected]}
                activeOpacity={0.85}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSelectedPlan(plan.id); }}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Feather name="award" size={10} color="#FFF" />
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}
                <View style={styles.planTop}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDesc}>{plan.description}</Text>
                  </View>
                  <View>
                    <Text style={styles.planPrice}>${price}{plan.id === 'free' ? '' : '/mo'}</Text>
                    {plan.id === 'free' && <Text style={styles.planPriceSub}>/free</Text>}
                    {billingPeriod === 'yearly' && plan.yearlyTotal > 0 && (
                      <Text style={styles.planPriceSub}>${plan.yearlyTotal}/year</Text>
                    )}
                  </View>
                </View>
                {billingPeriod === 'yearly' && plan.savingsPerYear && (
                  <View style={styles.savingsRow}>
                    <Feather name="tag" size={12} color="#22C55E" />
                    <Text style={styles.savingsText}>Save ${plan.savingsPerYear}/year</Text>
                  </View>
                )}
                <View style={styles.featList}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featRow}>
                      <View style={[styles.featIcon, { backgroundColor: f.included ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }]}>
                        <Feather
                          name={f.included ? 'check' : 'x'}
                          size={12}
                          color={f.included ? '#22C55E' : Colors.textTertiary}
                        />
                      </View>
                      <Text style={[styles.featText, !f.included && styles.featDisabled]}>{f.text}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Extra Tokens Section */}
        <View style={styles.tokensSection}>
          <Text style={styles.tokensTitle}>Need More Generations?</Text>
          <Text style={styles.tokensSub}>Buy extra tokens anytime when you reach your monthly limit.</Text>
          
          <TouchableOpacity 
            style={[styles.tokenCard, selectedPlan === 'tokens-100' && styles.planCardSelected]}
            onPress={() => {
              setSelectedPlan('tokens-100');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <View style={styles.tokenCardInner}>
              <View style={[styles.radio, selectedPlan === 'tokens-100' && styles.radioSelected]}>
                {selectedPlan === 'tokens-100' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tokenName}>100 Extra Generations</Text>
                <Text style={styles.tokenDesc}>Added instantly to your account</Text>
              </View>
              <Text style={styles.tokenPrice}>$3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Subscribe - Glass Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.subBtn} onPress={handleSubscribe} disabled={isLoading}>
          <LinearGradient colors={Gradients.secondary} style={styles.subBtnGrad}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : (
              <View style={styles.subBtnContent}>
                <Feather name="zap" size={18} color="#FFF" />
                <Text style={styles.subBtnText}>Subscribe Now</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://marketingtool.pro/pricing/')}>
          <Text style={styles.secureText}>
            {Platform.OS === 'web' ? 'Secure payment via Stripe' : 'Secure payment via Store'}  ·  View Plans Online
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F1C',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: 20,
    zIndex: 10,
  },
  closeBtnBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    height: 240,
    backgroundColor: '#0D0F1C',
  },
  heroGradient: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 40,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIcon: {
    width: 120,
    height: 120,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 32,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  trustStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 24, 36, 0.7)',
    marginHorizontal: 20,
    marginTop: -24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  trustStat: {
    flex: 1,
    alignItems: 'center',
  },
  trustStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trustStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  trustDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  trialBadgeText: { fontSize: 11, fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase' },
  billingWrap: { alignItems: 'center', paddingTop: 40, paddingBottom: 16 },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  billingOpt: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billingOptActive: { backgroundColor: Colors.secondary },
  billingText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  billingTextActive: { color: '#FFF' },
  saveBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveBadgeText: { fontSize: 10, color: '#22C55E', fontWeight: 'bold' },
  plansWrap: { paddingHorizontal: 20, gap: 12 },
  planCard: {
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planCardSelected: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(124,58,237,0.08)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  popularText: { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: Colors.secondary,
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.secondary },
  planName: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  planDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  planPrice: { fontSize: 22, fontWeight: 'bold', color: '#FFF', textAlign: 'right' },
  planPriceSub: { fontSize: 11, color: Colors.textTertiary, textAlign: 'right' },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 34, marginTop: 6 },
  savingsText: { fontSize: 12, fontWeight: '600', color: '#22C55E' },
  featList: { marginTop: 14, gap: 8 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featText: { fontSize: 13, color: '#FFF' },
  featDisabled: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  restoreBtn: { marginTop: 20, alignItems: 'center' },
  restoreText: { color: Colors.textSecondary, fontSize: 13, textDecorationLine: 'underline' },
  tokensSection: { paddingHorizontal: 20, marginTop: 32 },
  tokensTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  tokensSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  tokenCard: {
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tokenCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tokenName: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  tokenDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  tokenPrice: { fontSize: 20, fontWeight: 'bold', color: Colors.secondary },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 20,
    paddingTop: 14,
    backgroundColor: 'rgba(13,15,28,0.97)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  subBtn: { borderRadius: 16, overflow: 'hidden', height: 52 },
  subBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subBtnText: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  secureText: { textAlign: 'center', marginTop: 10, fontSize: 12, color: Colors.textTertiary },
});

export default SubscriptionScreen;
