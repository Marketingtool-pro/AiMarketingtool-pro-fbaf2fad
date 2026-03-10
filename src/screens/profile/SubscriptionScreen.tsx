import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { functions } from '../../services/appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import * as Haptics from 'expo-haptics';

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
}

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const { profile } = useAuthStore();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(false);

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free Trial',
      monthlyPrice: 0, yearlyPrice: 0, yearlyTotal: 0,
      description: '7 days \u2022 Full platform visible',
      features: [
        { text: '7-day full access trial', included: true },
        { text: '3 generations per day', included: true },
        { text: 'Simulation mode', included: true },
        { text: 'No credit card required', included: true },
        { text: 'Priority support', included: false },
        { text: 'Full analytics', included: false },
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 29, yearlyPrice: 17, yearlyTotal: 199,
      description: '200 generations/month',
      savingsPerYear: 149,
      features: [
        { text: 'Full web platform access', included: true },
        { text: 'All 7 platforms', included: true },
        { text: '200 generations/month', included: true },
        { text: 'Standard support', included: true },
        { text: 'Basic analytics', included: true },
      ],
    },
    {
      id: 'pro',
      name: 'Professional',
      monthlyPrice: 49, yearlyPrice: 33, yearlyTotal: 399,
      description: '500 generations/month',
      savingsPerYear: 189,
      features: [
        { text: '500 generations/month', included: true },
        { text: 'Advanced automation engine', included: true },
        { text: 'Priority support', included: true },
        { text: 'Full analytics', included: true },
        { text: 'Custom templates', included: true },
      ],
    },
    {
      id: 'growth',
      name: 'Agency',
      monthlyPrice: 99, yearlyPrice: 75, yearlyTotal: 899,
      description: '1,500+ generations/month',
      savingsPerYear: 289,
      features: [
        { text: '1,500+ generations/month', included: true },
        { text: 'Full automation', included: true },
        { text: 'Executive dashboards', included: true },
        { text: 'Team collaboration', included: true },
        { text: 'White-label reports', included: true },
      ],
    },
  ];

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (selectedPlan === 'free') { navigation.goBack(); return; }
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;
    setIsLoading(true);
    try {
      const execution = await functions.createExecution(
        'stripe-checkout',
        JSON.stringify({ planId: selectedPlan, billingPeriod, price: billingPeriod === 'yearly' ? plan.yearlyTotal : plan.monthlyPrice }),
        false, '/', ExecutionMethod.POST
      );
      const result = JSON.parse(execution.responseBody);
      if (result.url) { await Linking.openURL(result.url); }
      else { Alert.alert('Error', 'Could not create checkout session.'); }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open checkout.');
    } finally { setIsLoading(false); }
  };

  return (
    <AnimatedBackground variant="profile" showParticles={false}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Feather name="x" size={24} color="#FFF" />
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero header with background */}
        <ImageBackground
          source={require('../../assets/images/screens/pricing-hero.jpg')}
          style={styles.heroSection}
          resizeMode="cover"
        >
          <LinearGradient colors={['rgba(13,15,28,0.2)', 'rgba(13,15,28,0.9)']} style={styles.heroOverlay}>
            <View style={styles.trialBadge}>
              <Feather name="star" size={12} color="#F59E0B" />
              <Text style={styles.trialBadgeText}>7-Day Free Trial</Text>
            </View>
            <Text style={styles.heroTitle}>Choose Your Plan</Text>
            <Text style={styles.heroSub}>Unlock all AI marketing tools. Cancel anytime.</Text>
          </LinearGradient>
        </ImageBackground>

        {/* Billing Toggle */}
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

        {/* Plan Cards */}
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
                <View style={styles.planTop}>
                  <View style={styles.radio}>
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
                      <Feather
                        name={f.included ? 'check-circle' : 'x-circle'}
                        size={14}
                        color={f.included ? '#22C55E' : Colors.textTertiary}
                      />
                      <Text style={[styles.featText, !f.included && styles.featDisabled]}>{f.text}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Subscribe */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.subBtn} onPress={handleSubscribe} disabled={isLoading}>
          <LinearGradient colors={Gradients.secondary} style={styles.subBtnGrad}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.subBtnText}>Subscribe Now</Text>}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://marketingtool.pro/pricing/')}>
          <Text style={styles.secureText}>Secure payment via Stripe  ·  View Plans Online</Text>
        </TouchableOpacity>
      </View>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroSection: { width: '100%', height: 220 },
  heroOverlay: {
    flex: 1, justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 20,
    alignItems: 'center',
  },
  trialBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 12,
  },
  trialBadgeText: { fontSize: 13, fontWeight: '600', color: '#F59E0B' },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 6 },
  heroSub: { fontSize: 14, color: Colors.textSecondary },
  billingWrap: { alignItems: 'center', paddingVertical: 16 },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22,24,36,0.95)',
    padding: 3, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  billingOpt: {
    paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 11, flexDirection: 'row',
    alignItems: 'center', gap: 6,
  },
  billingOptActive: { backgroundColor: Colors.secondary },
  billingText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  billingTextActive: { color: '#FFF' },
  saveBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  saveBadgeText: { fontSize: 10, color: '#22C55E', fontWeight: 'bold' },
  plansWrap: { paddingHorizontal: 20, gap: 12 },
  planCard: {
    backgroundColor: 'rgba(22,24,36,0.9)',
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  planCardSelected: { borderColor: Colors.secondary, backgroundColor: 'rgba(124,58,237,0.06)' },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.secondary },
  planName: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  planDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  planPrice: { fontSize: 22, fontWeight: 'bold', color: '#FFF', textAlign: 'right' },
  planPriceSub: { fontSize: 11, color: Colors.textTertiary, textAlign: 'right' },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 34, marginTop: 6 },
  savingsText: { fontSize: 12, fontWeight: '600', color: '#22C55E' },
  featList: { marginTop: 14, gap: 7 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featText: { fontSize: 13, color: '#FFF' },
  featDisabled: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 20,
    paddingTop: 14,
    backgroundColor: 'rgba(13,15,28,0.97)',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  subBtn: { borderRadius: 16, overflow: 'hidden', height: 52 },
  subBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subBtnText: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  secureText: { textAlign: 'center', marginTop: 10, fontSize: 12, color: Colors.textTertiary },
});

export default SubscriptionScreen;
