import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
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
  popular?: boolean;
}

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const { profile, refreshProfile } = useAuthStore();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      billingService.initialize().catch(err => console.error('[Billing] Init failed:', err));
    }
    return () => {
      if (Platform.OS !== 'web') billingService.end().catch(() => {});
    };
  }, []);

  const plans: Plan[] = [
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
    setIsLoading(true);
    const userId = profile?.userId || profile?.$id;
    try {
      if (Platform.OS !== 'web') {
        const serverPlanId = selectedPlan === 'pro' ? 'professional' : 'alltools';
        const sku = `pro_${serverPlanId}_${billingPeriod}`;
        const result = await billingService.requestPurchase(sku, userId!);
        if (result.success) {
          Alert.alert('Success', 'Subscription activated!', [{ text: 'OK', onPress: () => { refreshProfile(); navigation.goBack(); } }]);
        } else {
          Alert.alert('Purchase Failed', result.error || 'Could not complete purchase.');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open checkout.');
    } finally { setIsLoading(false); }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <View style={styles.closeBtnBg}>
          <Feather name="x" size={22} color="#FFF" />
        </View>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Rich Hero Header (NO JPEG) */}
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
              <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save 44%</Text></View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plans */}
        <View style={styles.plansWrap}>
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selected && styles.planCardSelected]}
                onPress={() => { Haptics.selectionAsync(); setSelectedPlan(plan.id); }}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>BEST VALUE</Text>
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
                  <Text style={styles.planPrice}>${price}<Text style={{fontSize: 14}}>/mo</Text></Text>
                </View>
                <View style={styles.featList}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featRow}>
                      <Feather name="check" size={14} color="#22C55E" />
                      <Text style={styles.featText}>{f.text}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.subBtn} onPress={handleSubscribe} disabled={isLoading}>
          <LinearGradient colors={['#F59E0B', '#B45309']} style={styles.subBtnGrad}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.subBtnText}>Start My 7-Day Free Trial</Text>}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.secureText}>Cancel anytime. Secure payment via Store.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0F1C' },
  closeBtn: { position: 'absolute', top: 56, right: 20, zIndex: 10 },
  closeBtnBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  heroSection: { height: 240, backgroundColor: '#0D0F1C' },
  heroGradient: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingTop: 40 },
  heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { flex: 1 },
  heroRight: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  heroIcon: { width: 120, height: 120 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, lineHeight: 32 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
  trustStatsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22, 24, 36, 0.7)', marginHorizontal: 20, marginTop: -24, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  trustStat: { flex: 1, alignItems: 'center' },
  trustStatValue: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  trustStatLabel: { fontSize: 10, fontWeight: '600', color: '#A1A1AA', textTransform: 'uppercase', marginTop: 2 },
  trustDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  trialBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  trialBadgeText: { fontSize: 11, fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase' },
  billingWrap: { alignItems: 'center', paddingTop: 40, paddingBottom: 16 },
  billingToggle: { flexDirection: 'row', backgroundColor: 'rgba(22, 24, 36, 0.55)', padding: 3, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  billingOpt: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  billingOptActive: { backgroundColor: '#7C3AED' },
  billingText: { color: '#A1A1AA', fontWeight: '600', fontSize: 14 },
  billingTextActive: { color: '#FFF' },
  saveBadge: { backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  saveBadgeText: { fontSize: 10, color: '#22C55E', fontWeight: 'bold' },
  plansWrap: { paddingHorizontal: 20, gap: 12 },
  planCard: { backgroundColor: '#161824', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  planCardSelected: { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.05)' },
  popularBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 12 },
  popularText: { fontSize: 10, fontWeight: '900', color: '#000' },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: '#7C3AED' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#7C3AED' },
  planName: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  planDesc: { fontSize: 12, color: '#A1A1AA', marginTop: 2 },
  planPrice: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  featList: { marginTop: 20, gap: 10 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featText: { fontSize: 14, color: '#D4D4D8' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20, backgroundColor: 'rgba(13,15,28,0.95)', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  subBtn: { borderRadius: 16, overflow: 'hidden', height: 56 },
  subBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subBtnText: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  secureText: { textAlign: 'center', marginTop: 12, fontSize: 12, color: '#71717A' },
});

export default SubscriptionScreen;