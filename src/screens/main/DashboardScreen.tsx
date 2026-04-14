import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AnimatedRN, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing as EasingRN
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { useToolsStore, Tool } from '../../store/toolsStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { getToolIcon } from '../../constants/toolIcons';

const { width } = Dimensions.get('window');
const BENTO_SPACING = 12;
const CARD_WIDTH = (width - 40 - BENTO_SPACING) / 2;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Master Bento Card Component (SimpleSocial & Bento v4 logic)
const BentoCard = ({ children, style, height = 120, colSpan = 1 }: { children: React.ReactNode, style?: any, height?: number, colSpan?: number }) => (
  <View style={[
    styles.bentoCard, 
    { height, width: colSpan === 2 ? width - 40 : CARD_WIDTH },
    style
  ]}>
    <LinearGradient
      colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.bentoCardContent}>
      {children}
    </View>
  </View>
);

const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile } = useAuthStore();
  const { tools, fetchTools, generations, fetchGenerations } = useToolsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({ generated: 0, campaigns: 0 });

  useEffect(() => {
    fetchTools();
    if (user?.$id) fetchGenerations(user.$id);
  }, [user?.$id]);

  useEffect(() => {
    if (user?.$id && generations.length > 0) {
      const userGens = generations.filter(g => g.userId === user.$id);
      const uniqueTools = new Set(userGens.map(g => g.toolId));
      setCounts({ generated: userGens.length, campaigns: uniqueTools.size });
    }
  }, [generations, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTools();
    if (user?.$id) await fetchGenerations(user.$id);
    setRefreshing(false);
  };

  const topPlatforms = [
    { id: 'google', icon: require('../../assets/images/tool-icons-v2/google-3d.png'), name: 'Google' },
    { id: 'meta', icon: require('../../assets/images/tool-icons-v2/meta-3d.png'), name: 'Meta' },
    { id: 'insta', icon: require('../../assets/images/social-icons/02_Instagram.png'), name: 'Insta' },
    { id: 'tiktok', icon: require('../../assets/images/social-icons/11_TikTok.png'), name: 'TikTok' },
    { id: 'snap', icon: require('../../assets/images/social-icons/09_Snapchat.png'), name: 'Snap' },
  ];

  return (
    <View style={styles.screenContainer}>
      <View style={styles.bgGlow} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        {/* Header - SimpleSocial Style */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0].toUpperCase() || 'LOKENDRA'}</Text>
            <Text style={styles.subGreeting}>Welcome to Pro Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Live</Text>
            </View>
            <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.profileText}>{user?.name?.charAt(0).toUpperCase() || 'L'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Master Bento Grid */}
        <View style={styles.bentoGrid}>
          
          {/* Main AI Bento (2x1) */}
          <TouchableOpacity style={styles.col2} activeOpacity={0.9} onPress={() => navigation.navigate('Main', { screen: 'Chat' } as any)}>
            <BentoCard height={180} colSpan={2} style={styles.heroCard}>
              <LinearGradient colors={['rgba(124, 58, 237, 0.3)', 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={styles.heroContent}>
                <View style={styles.heroText}>
                  <View style={styles.aiLabel}><Text style={styles.aiLabelText}>SPECIALIZED AI</Text></View>
                  <Text style={styles.heroTitle}>Marketing{"\n"}Assistant</Text>
                  <TouchableOpacity style={styles.heroBtn}>
                    <Text style={styles.heroBtnText}>Start Creating</Text>
                    <Feather name="arrow-right" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <Image source={require('../../assets/images/tool-icons-v2/ai-3d.png')} style={styles.heroIcon} />
              </View>
            </BentoCard>
          </TouchableOpacity>

          {/* Stats Bento (1x1 each) */}
          <BentoCard height={140} style={styles.statCard}>
            <View style={[styles.statIcon, {backgroundColor: 'rgba(52, 211, 153, 0.1)'}]}>
              <Feather name="layers" size={20} color="#34D399" />
            </View>
            <Text style={styles.statValue}>{counts.generated}</Text>
            <Text style={styles.statLabel}>Generated</Text>
          </BentoCard>

          <BentoCard height={140} style={styles.statCard}>
            <View style={[styles.statIcon, {backgroundColor: 'rgba(167, 139, 250, 0.1)'}]}>
              <Feather name="target" size={20} color="#A78BFA" />
            </View>
            <Text style={styles.statValue}>{counts.campaigns}</Text>
            <Text style={styles.statLabel}>Tools Used</Text>
          </BentoCard>

          {/* Platform Bento (2x1) */}
          <View style={styles.col2}>
            <BentoCard height={100} colSpan={2}>
              <Text style={styles.bentoSectionTitle}>AD PLATFORMS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformRow}>
                {topPlatforms.map(p => (
                  <TouchableOpacity key={p.id} style={styles.platformItem}>
                    <Image source={p.icon} style={styles.platformIcon} resizeMode="contain" />
                    <View style={styles.lockBadge}><Feather name="lock" size={8} color="#F59E0B" /></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </BentoCard>
          </View>

          {/* Featured Bento (1x1 each) */}
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Main', { screen: 'Tools', params: { platform: 'google-ads' } } as any)}>
            <BentoCard height={140}>
              <Image source={require('../../assets/images/tool-icons-v2/google-3d.png')} style={styles.bentoIconSmall} />
              <Text style={styles.bentoCardTitle}>Google Ads</Text>
              <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.3)" style={styles.bentoArrow} />
            </BentoCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Main', { screen: 'Tools', params: { platform: 'meta' } } as any)}>
            <BentoCard height={140}>
              <Image source={require('../../assets/images/tool-icons-v2/meta-3d.png')} style={styles.bentoIconSmall} />
              <Text style={styles.bentoCardTitle}>Meta Ads</Text>
              <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.3)" style={styles.bentoArrow} />
            </BentoCard>
          </TouchableOpacity>

        </View>

        {/* Pro High-Conversion Gold Nudge */}
        {(!profile?.subscription || profile.subscription === 'free') && (
          <TouchableOpacity 
            style={styles.proNudge}
            onPress={() => navigation.navigate('Subscription')}
          >
            <LinearGradient colors={['#F59E0B', '#B45309']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.proNudgeGradient}>
              <Image source={require('../../assets/images/tool-icons-v2/trophy.png')} style={styles.nudgeIcon} />
              <View style={{flex: 1}}>
                <Text style={styles.nudgeTitle}>Unlock Pro Results</Text>
                <Text style={styles.nudgeSub}>Access Real-Time Google & Meta Data</Text>
              </View>
              <Feather name="arrow-right" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Popular List - Rich Style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Tools</Text>
          <View style={styles.popularList}>
            {tools.slice(0, 3).map((tool, idx) => (
              <TouchableOpacity key={tool.slug} style={[styles.popularItem, idx === 2 && {borderBottomWidth: 0}]} onPress={() => navigation.navigate('ToolDetail', { toolSlug: tool.slug })}>
                <View style={styles.popularIconWrap}>
                  <Image source={getToolIcon(tool.slug)} style={styles.popularIcon} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.popularName}>{tool.name}</Text>
                  <Text style={styles.popularCat}>{tool.category}</Text>
                </View>
                <View style={styles.runBtn}>
                  <Text style={styles.runBtnText}>Run</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#121212' },
  bgGlow: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(124, 58, 237, 0.1)' },
  scrollContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 24 },
  greeting: { fontSize: 24, fontWeight: '800', color: 'rgba(248, 248, 248, 0.95)' },
  subGreeting: { fontSize: 14, color: 'rgba(248, 248, 248, 0.5)', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#121212' },
  profileText: { color: '#FFF', fontWeight: '800', fontSize: 18 },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: BENTO_SPACING },
  col2: { width: '100%', marginBottom: BENTO_SPACING },
  bentoCard: { backgroundColor: 'rgba(40, 40, 40, 0.7)', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  bentoCardContent: { flex: 1, padding: 20 },
  heroCard: { borderLeftWidth: 4, borderLeftColor: '#7C3AED' },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroText: { flex: 1 },
  aiLabel: { backgroundColor: 'rgba(124, 58, 237, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 12 },
  aiLabelText: { color: '#A78BFA', fontSize: 10, fontWeight: '800' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', lineHeight: 32 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start', marginTop: 16, gap: 6 },
  heroBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  heroIcon: { width: 110, height: 110 },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  statLabel: { fontSize: 12, color: 'rgba(248, 248, 248, 0.5)', marginTop: 4, fontWeight: '600' },
  bentoSectionTitle: { fontSize: 11, fontWeight: '800', color: 'rgba(248, 248, 248, 0.4)', letterSpacing: 1, marginBottom: 16 },
  platformRow: { gap: 12 },
  platformItem: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  platformIcon: { width: 30, height: 30 },
  lockBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  bentoIconSmall: { width: 44, height: 44, marginBottom: 12 },
  bentoCardTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  bentoArrow: { position: 'absolute', bottom: 20, right: 20 },
  proNudge: { marginHorizontal: 20, marginTop: 24, borderRadius: 20, overflow: 'hidden' },
  proNudgeGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  nudgeIcon: { width: 44, height: 44 },
  nudgeTitle: { fontSize: 17, fontWeight: '900', color: '#FFF' },
  nudgeSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  section: { marginTop: 32, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 16 },
  popularList: { backgroundColor: 'rgba(40, 40, 40, 0.7)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  popularItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 16 },
  popularIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  popularIcon: { width: 30, height: 30 },
  popularName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  popularCat: { color: 'rgba(248, 248, 248, 0.5)', fontSize: 12, marginTop: 2 },
  runBtn: { backgroundColor: 'rgba(124, 58, 237, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.3)' },
  runBtnText: { color: '#A78BFA', fontWeight: '800', fontSize: 13 },
});

export default DashboardScreen;