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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const { width } = Dimensions.get('window');

// Profile hero image
const ProfileHeroImage = require('../../assets/images/screens/profile-hero.jpg');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, logout } = useAuthStore();

  const menuItems = [
    {
      title: 'Account',
      items: [
        { icon: 'user', label: 'Edit Profile', screen: 'Settings' },
        { icon: 'mail', label: 'Email Preferences', screen: 'Settings' },
        { icon: 'lock', label: 'Change Password', screen: 'Settings' },
        { icon: 'shield', label: 'Privacy & Security', screen: 'Settings' },
      ],
    },
    {
      title: 'Subscription',
      items: [
        { icon: 'star', label: 'Manage Plan', screen: 'Subscription', badge: profile?.subscription === 'free' ? 'Upgrade' : null },
        { icon: 'credit-card', label: 'Payment & Billing', screen: 'Settings' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', label: 'Help Center', screen: 'Settings' },
        { icon: 'message-circle', label: 'Contact Support', screen: 'Settings' },
        { icon: 'book-open', label: 'Tutorials', screen: 'Settings' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: 'settings', label: 'Settings', screen: 'Settings' },
        { icon: 'bell', label: 'Notifications', screen: 'Notifications' },
        { icon: 'moon', label: 'Appearance', screen: 'Settings' },
      ],
    },
  ];

  const stats = [
    { label: 'Generations', value: profile?.generationsCount || 0, icon: 'zap' },
    { label: 'Saved', value: profile?.savedCount || 0, icon: 'bookmark' },
    { label: 'Tools Used', value: profile?.toolsUsed || 0, icon: 'grid' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleMenuPress = (screen: string) => {
    navigation.navigate(screen as any);
  };

  return (
    <AnimatedBackground variant="profile" showParticles={true}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Background */}
        <View style={styles.heroSection}>
          <Image source={ProfileHeroImage} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(13, 15, 28, 0.6)', 'rgba(13, 15, 28, 1)']}
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

        {/* Profile Card */}
        <View style={styles.header}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[Colors.accent, Colors.accent]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
              )}
              <TouchableOpacity style={styles.editAvatarBtn}>
                <Feather name="camera" size={14} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>

            {/* Subscription Badge */}
            <View style={styles.subscriptionBadge}>
              <LinearGradient
                colors={profile?.subscription === 'pro' ? ['#3D2914', '#16132B'] : [Colors.surface, Colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subscriptionGradient}
              >
                <Feather
                  name={profile?.subscription === 'pro' ? 'star' : 'user'}
                  size={14}
                  color={profile?.subscription === 'pro' ? Colors.gold : Colors.textSecondary}
                />
                <Text style={[
                  styles.subscriptionText,
                  profile?.subscription === 'pro' && styles.subscriptionTextPro
                ]}>
                  {profile?.subscription === 'pro' ? 'Pro Member' : 'Free Plan'}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Feather name={stat.icon as any} size={18} color={Colors.accent} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upgrade Card (for free users) */}
        {profile?.subscription === 'free' && (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => navigation.navigate('Subscription')}
          >
            <LinearGradient
              colors={['#3D2914', '#16132B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeContent}>
                <View style={styles.upgradeIcon}>
                  <Feather name="star" size={20} color={Colors.gold} />
                </View>
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                  <Text style={styles.upgradeSubtitle}>
                    Unlimited generations & premium features
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={24} color={Colors.gold} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Menu Sections */}
        <View style={styles.menuContainer}>
          {menuItems.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{section.title}</Text>
              <View style={styles.menuItems}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.menuItem,
                      itemIndex === section.items.length - 1 && styles.menuItemLast
                    ]}
                    onPress={() => handleMenuPress(item.screen)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={styles.menuItemIcon}>
                        <Feather name={item.icon as any} size={18} color={Colors.accent} />
                      </View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.menuItemRight}>
                      {item.badge && (
                        <View style={styles.menuBadge}>
                          <Text style={styles.menuBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                      <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>MarketingTool v1.3.2</Text>
          <View style={styles.appLinks}>
            <TouchableOpacity>
              <Text style={styles.appLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.appLinkDivider}>•</Text>
            <TouchableOpacity>
              <Text style={styles.appLink}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    height: 160,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    marginTop: -40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.white,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  subscriptionBadge: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  subscriptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: 6,
  },
  subscriptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  subscriptionTextPro: {
    color: Colors.gold,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(248,248,248,0.06)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  upgradeCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(253, 151, 7, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gold,
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  menuSection: {
    marginBottom: Spacing.lg,
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItems: {
    backgroundColor: 'rgba(248,248,248,0.06)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuItemLabel: {
    fontSize: 15,
    color: Colors.white,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error + '15',
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  appVersion: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  appLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appLink: {
    fontSize: 13,
    color: Colors.accent,
  },
  appLinkDivider: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.sm,
  },
});

export default ProfileScreen;
