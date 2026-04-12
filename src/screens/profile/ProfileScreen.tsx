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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { ALL_PLATFORMS } from '../../constants/socialIcons';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Glass Card matching Play Store style
const GlassCard = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.glassCardOuter}>
    <LinearGradient
      colors={['rgba(126, 34, 206, 0.25)', 'rgba(22, 24, 36, 0.55)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.glassCardGradient}
    >
      <View style={styles.glassCardBorder}>
        <View style={styles.glassCardContent}>
          {children}
        </View>
      </View>
    </LinearGradient>
  </View>
);

const ProfileHeroImage = require('../../assets/images/screens/profile-hero.jpg');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const StatItem = ({ label, value, iconName }: { label: string; value: string | number; iconName: string }) => (
  <View style={styles.statBox}>
    <Feather name={iconName as any} size={18} color={Colors.secondary} style={{ marginBottom: 4 }} />
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
    iconName: string;
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
      title: 'Account',
      items: [
        { iconName: 'user', label: 'Edit Profile', screen: 'Settings' },
        { iconName: 'mail', label: 'Email Preferences', screen: 'Settings' },
        { iconName: 'lock', label: 'Change Password', screen: 'Settings' },
        { iconName: 'shield', label: 'Privacy & Security', screen: 'Settings' },
      ],
    },
    {
      title: 'Subscription',
      items: [
        { iconName: 'star', label: 'Manage Plan', screen: 'Subscription', badge: profile?.subscription === 'free' ? 'Upgrade' : null },
        { iconName: 'credit-card', label: 'Payment & Billing', screen: 'Subscription' as keyof RootStackParamList },
      ],
    },
    {
      title: 'Support',
      items: [
        { iconName: 'help-circle', label: 'Help Center', url: 'https://www.marketingtool.pro/help/' },
        { iconName: 'message-circle', label: 'Contact Support', url: 'https://www.marketingtool.pro/contact/' },
        { iconName: 'book', label: 'Tutorials', url: 'https://www.marketingtool.pro/blog/' },
      ],
    },
    {
      title: 'App',
      items: [
        { iconName: 'settings', label: 'Settings', screen: 'Settings' },
        { iconName: 'bell', label: 'Notifications', screen: 'Notifications' },
        { iconName: 'moon', label: 'Appearance', action: () => Alert.alert('Appearance', 'Dark mode is always on.') },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D0F1C', '#0D0F1C', '#0D0F1C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Background */}
        <View style={styles.heroSection}>
          <Image source={ProfileHeroImage} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(13, 15, 28, 0.7)', 'rgba(13, 15, 28, 1)']}
            style={styles.heroGradient}
          />
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButton}
            >
              <Feather name="settings" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Glass Profile Card */}
        <View style={styles.header}>
          <GlassCard>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarContainer}>
                  {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.name && !/^\+?\d+$/.test(user.name) ? user.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  )}
                </View>
                <View style={styles.editAvatarBtn}>
                  <Feather name="camera" size={12} color={Colors.white} />
                </View>
              </View>

              <Text style={styles.userName}>
                {user?.name && !/^\+?\d+$/.test(user.name) ? user.name : 'User'}
              </Text>
              <Text style={styles.email}>{user?.email || 'help@marketingtool.pro'}</Text>

              <View style={[
                styles.planBadge,
                { backgroundColor: profile?.subscription && profile.subscription !== 'free' ? '#f59e0b' : 'rgba(255,255,255,0.1)' }
              ]}>
                <Feather name={profile?.subscription && profile.subscription !== 'free' ? 'star' : 'user'} size={12} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.planText}>
                  {(() => {
                    switch (profile?.subscription) {
                      case 'starter': return 'Starter Plan';
                      case 'pro': return 'Professional';
                      case 'alltools': return 'Growth Plan';
                      case 'enterprise': return 'Enterprise';
                      case 'agency': return 'Agency';
                      default: return 'Free Plan';
                    }
                  })()}
                </Text>
              </View>
            </View>

            {/* Stats Section */}
            <View style={styles.statsRow}>
              <StatItem label="Generations" value={profile?.generationsUsed || 0} iconName="zap" />
              <StatItem label="Saved" value={profile?.savedCount || 0} iconName="bookmark" />
              <StatItem label="Tools Used" value={profile?.toolsUsed || 0} iconName="grid" />
            </View>
          </GlassCard>
        </View>

        {/* Connected Platforms — Glassify Icons */}
        <View style={styles.socialSection}>
          <Text style={styles.socialSectionTitle}>Social Platforms</Text>
          <View style={styles.socialIconsGrid}>
            {ALL_PLATFORMS.slice(0, 12).map((platform) => (
              <View key={platform.id} style={styles.socialIconCard}>
                <Image
                  source={platform.icon}
                  style={styles.socialIconImg}
                  resizeMode="contain"
                />
                <Text style={styles.socialIconLabel} numberOfLines={1}>{platform.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upgrade Banner */}
        {profile?.subscription === 'free' && (
          <TouchableOpacity
            style={styles.upgradeBanner}
            onPress={() => navigation.navigate('Subscription')}
          >
            <LinearGradient
              colors={['#f59e0b', '#78350f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeIconWrap}>
                <Feather name="star" size={20} color="#FFF" />
              </View>
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                <Text style={styles.upgradeSubtitle}>Unlimited generations & premium features</Text>
              </View>
              <View style={styles.upgradeBtnIcon}>
                <Feather name="chevron-right" size={20} color={Colors.white} />
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
                        <Feather name={item.iconName as any} size={20} color={item.color || Colors.secondary} />
                      </View>
                      <Text style={[styles.menuLabel, item.color && { color: item.color }]}>{item.label}</Text>
                    </View>
                    <View style={styles.menuItemRight}>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                      <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Logout Button - Separate red button like Play Store */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>MarketingTool v1.4.1</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Terms' as any)}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>·</Text>
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
  glassCardOuter: {
    width: width - 48,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#7e22ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glassCardGradient: {
    borderRadius: 20,
    padding: 1.5,
  },
  glassCardBorder: {
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(13, 15, 28, 0.85)',
  },
  glassCardContent: {
    padding: 16,
    paddingTop: 20,
  },
  heroSection: { height: 180, width: '100%' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.6 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
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
  header: { paddingHorizontal: 0, marginTop: -50, marginBottom: Spacing.md },
  profileHeader: { alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7e22ce',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(126, 34, 206, 0.6)',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
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
    borderColor: 'rgba(13, 15, 28, 0.55)',
  },
  userName: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 6 },
  email: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4 },
  planBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  planText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
  socialSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  socialSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  socialIconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: Spacing.sm,
    gap: 4,
  },
  socialIconCard: {
    width: (width - Spacing.lg * 2 - Spacing.sm * 2 - 4 * 5) / 6,
    alignItems: 'center',
    paddingVertical: 8,
  },
  socialIconImg: {
    width: 36,
    height: 36,
    marginBottom: 4,
  },
  socialIconLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  upgradeBanner: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  upgradeGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
  upgradeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  upgradeInfo: { flex: 1 },
  upgradeTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  upgradeSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' },
  upgradeBtnIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { paddingHorizontal: Spacing.lg },
  menuSection: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  menuCard: {
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  noBorder: { borderBottomWidth: 0 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  menuLabel: { fontSize: 16, color: Colors.white },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: Spacing.sm },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: Colors.white },
  logoutContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(227, 26, 26, 0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(227, 26, 26, 0.2)',
    gap: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.error },
  footer: { alignItems: 'center', paddingVertical: Spacing.xl },
  versionText: { fontSize: 13, color: Colors.textTertiary, marginBottom: Spacing.sm },
  footerLinks: { flexDirection: 'row', alignItems: 'center' },
  footerLink: { fontSize: 13, color: Colors.secondary },
  footerDivider: { fontSize: 13, color: Colors.textTertiary, marginHorizontal: Spacing.sm },
});

export default ProfileScreen;
