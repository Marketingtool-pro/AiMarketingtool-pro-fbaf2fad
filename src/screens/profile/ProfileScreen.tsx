import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Star, 
  CreditCard, 
  HelpCircle, 
  MessageCircle, 
  Book, 
  Settings, 
  Camera, 
  LogOut, 
  ChevronRight, 
  Zap,
  Bookmark
} from 'lucide-react-native';
import { Canvas, RoundedRect, Blur, LinearGradient as SkiaGradient, vec, BoxShadow, Fill } from "@shopify/react-native-skia";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// 2026 Pro Glass Card using Shopify Skia
const ProGlassCard = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.proGlassContainer}>
    <Canvas style={styles.skiaCanvas}>
      {/* 1. The Pro Shadow (Colored Glow) */}
      <RoundedRect x={10} y={10} width={width - 50} height={220} r={30} color="white">
        <BoxShadow blur={30} color="rgba(126, 34, 206, 0.4)" />
      </RoundedRect>

      {/* 2. The Glass Body with Mesh Gradient */}
      <RoundedRect x={10} y={10} width={width - 50} height={220} r={30}>
        <SkiaGradient
          start={vec(0, 0)}
          end={vec(width - 50, 220)}
          colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]}
        />
        <Blur blur={25} />
      </RoundedRect>

      {/* 3. The 'Light Source' Edge Border */}
      <RoundedRect 
        x={10} y={10} width={width - 50} height={220} r={30} 
        style="stroke" strokeWidth={1.5}
      >
        <SkiaGradient
          start={vec(0, 0)}
          end={vec(width - 50, 220)}
          colors={["rgba(255,255,255,0.6)", "transparent", "rgba(126, 34, 206, 0.4)"]}
        />
      </RoundedRect>
    </Canvas>
    <View style={styles.proGlassContent}>
      {children}
    </View>
  </View>
);

// Moving Mesh Background
const MeshBackground = () => (
  <View style={StyleSheet.absoluteFill}>
    <Canvas style={{ flex: 1 }}>
      <Fill>
        <SkiaGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={["#1e1b4b", "#581c87", "#7e22ce"]} // Deep 2026 Purple Tones
        />
      </Fill>
    </Canvas>
  </View>
);

const ProfileHeroImage = require('../../assets/images/screens/profile-hero.jpg');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const StatItem = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) => (
  <View style={styles.statBox}>
    <Icon size={18} color={Colors.white} style={{ marginBottom: 4 }} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => logout(), style: 'destructive' },
      ]
    );
  };

  type MenuItem = {
    icon: any;
    label: string;
    screen?: keyof RootStackParamList;
    url?: string;
    action?: () => void;
    badge?: string | null;
    color?: string;
  };

  type MenuSection = {
    title: string;
    items: MenuItem[];
  };

  const menuItems: MenuSection[] = [
    {
      title: 'Subscription',
      items: [
        { icon: Star, label: 'Manage Plan', screen: 'Subscription', badge: profile?.subscription === 'free' ? 'Upgrade' : null },
        { icon: CreditCard, label: 'Payment & Billing', url: 'https://billing.stripe.com/p/login/4gw5oe3PY0hW0qk000' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', url: 'https://marketingtool.pro/help/' },
        { icon: MessageCircle, label: 'Contact Support', url: 'mailto:support@marketingtool.pro' },
        { icon: Book, label: 'Tutorials', url: 'https://marketingtool.pro/blog/' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: Settings, label: 'Settings', screen: 'Settings' },
        { icon: LogOut, label: 'Logout', action: handleLogout, color: Colors.error },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <MeshBackground />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Background */}
        <View style={styles.heroSection}>
          <Image source={ProfileHeroImage} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(6, 11, 40, 0.6)', 'rgba(6, 11, 40, 1)']}
            style={styles.heroGradient}
          />
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButton}
            >
              <Settings size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pro Glass Profile Card */}
        <View style={styles.header}>
          <ProGlassCard>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarContainer}>
                  {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  )}
                </View>
                <View style={styles.editAvatarBtn}>
                  <Camera size={12} color={Colors.white} />
                </View>
              </View>
              
              <Text style={styles.userName}>{user?.name || 'Admin User'}</Text>
              <Text style={styles.email}>{user?.email || 'help@marketingtool.pro'}</Text>
              
              <View style={[
                styles.planBadge, 
                { backgroundColor: profile?.subscription === 'pro' ? '#f59e0b' : 'rgba(255,255,255,0.1)' }
              ]}>
                <Text style={styles.planText}>
                  {profile?.subscription === 'pro' ? 'Pro Member' : 'Free Plan'}
                </Text>
              </View>
            </View>

            {/* Stats Section */}
            <View style={styles.statsRow}>
              <StatItem label="Generations" value={profile?.generationsUsed || 0} icon={Zap} />
              <StatItem label="Saved" value={profile?.savedCount || 0} icon={Bookmark} />
              <StatItem label="Credits" value={profile?.credits || 0} icon={CreditCard} />
            </View>
          </ProGlassCard>
        </View>

        {/* Upgrade Banner */}
        {profile?.subscription === 'free' && (
          <TouchableOpacity 
            style={styles.upgradeBanner}
            onPress={() => navigation.navigate('Subscription')}
          >
            <LinearGradient
              colors={['#f59e0b', '#78350f']} // Amber to Dark Brown gradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                <Text style={styles.upgradeSubtitle}>Get unlimited generations & 3D tools</Text>
              </View>
              <View style={styles.upgradeBtnIcon}>
                <ChevronRight size={20} color={Colors.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Menu Sections */}
        <View style={styles.menuContainer}>
          {menuItems.map((section, idx) => (
            <View key={idx} style={styles.menuSection}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.menuCard}>
                {section.items.map((item, itemIdx) => (
                  <TouchableOpacity
                    key={itemIdx}
                    style={[
                      styles.menuItem,
                      itemIdx === section.items.length - 1 && styles.noBorder
                    ]}
                    onPress={() => {
                      if (item.action) item.action();
                      else if (item.screen) navigation.navigate(item.screen as any);
                      else if (item.url) Linking.openURL(item.url);
                    }}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIcon, { backgroundColor: (item.color || Colors.secondary) + '15' }]}>
                        <item.icon size={20} color={item.color || Colors.secondary} />
                      </View>
                      <Text style={[styles.menuLabel, item.color && { color: item.color }]}>{item.label}</Text>
                    </View>
                    <View style={styles.menuItemRight}>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                      <ChevronRight size={18} color={Colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Marketing AI v1.3.3</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Terms' as any)}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>•</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy' as any)}>
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  skiaCanvas: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  proGlassContainer: { width: width - 20, height: 240, alignSelf: 'center', position: 'relative' },
  proGlassContent: { padding: 25, paddingTop: 30 },
  heroSection: { height: 240, width: '100%' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.white },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { paddingHorizontal: Spacing.lg, marginTop: -80, marginBottom: Spacing.lg },
  profileHeader: { alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatarContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#7e22ce', 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  userName: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 10 },
  email: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 8 },
  planBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  planText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  upgradeBanner: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  upgradeGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  upgradeInfo: { flex: 1 },
  upgradeTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  upgradeSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' },
  upgradeBtnIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { paddingHorizontal: Spacing.lg },
  menuSection: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  menuCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  noBorder: { borderBottomWidth: 0 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  menuLabel: { fontSize: 16, color: Colors.white },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: Spacing.sm },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: Colors.white },
  footer: { alignItems: 'center', paddingVertical: Spacing.xl },
  versionText: { fontSize: 13, color: Colors.textTertiary, marginBottom: Spacing.sm },
  footerLinks: { flexDirection: 'row', alignItems: 'center' },
  footerLink: { fontSize: 13, color: Colors.secondary },
  footerDivider: { fontSize: 13, color: Colors.textTertiary, marginHorizontal: Spacing.sm },
});

export default ProfileScreen;
