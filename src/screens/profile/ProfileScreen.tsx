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
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const StatItem = ({ label, value, iconName }: { label: string; value: string | number; iconName: string }) => (
  <View style={styles.statBox}>
    <Feather name={iconName as any} size={20} color="#8B5CF6" style={{ marginBottom: 8 }} />
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
  };

  type MenuSection = {
    title: string;
    items: MenuItem[];
  };

  const menuItems: MenuSection[] = [
    {
      title: 'ACCOUNT',
      items: [
        { iconName: 'user', label: 'Edit Profile', screen: 'Settings' },
        { iconName: 'mail', label: 'Email Preferences', screen: 'Settings' },
        { iconName: 'lock', label: 'Change Password', screen: 'Settings' },
        { iconName: 'shield', label: 'Privacy & Security', screen: 'Settings' },
      ],
    },
    {
      title: 'SUBSCRIPTION',
      items: [
        { iconName: 'star', label: 'Manage Plan', screen: 'Subscription', badge: profile?.subscription === 'free' ? 'Upgrade' : null },
        { iconName: 'credit-card', label: 'Payment & Billing', screen: 'Subscription' as keyof RootStackParamList },
      ],
    },
    {
      title: 'SUPPORT',
      items: [
        { iconName: 'help-circle', label: 'Help Center', screen: 'HelpCenter' },
        { iconName: 'message-circle', label: 'Contact Support', screen: 'Contact' },
        { iconName: 'book', label: 'Tutorials', screen: 'Tutorials' },
      ],
    },
    {
      title: 'APP',
      items: [
        { iconName: 'settings', label: 'Settings', screen: 'Settings' },
        { iconName: 'bell', label: 'Notifications', screen: 'Notifications' },
        { iconName: 'moon', label: 'Appearance', action: () => Alert.alert('Appearance', 'Dark mode is always on.') },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Background elements to match the "Ad Campaign" glow */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Feather name="settings" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Main Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name && !/^\+?\d+$/.test(user.name) ? user.name.charAt(0).toUpperCase() : 'L'}
                </Text>
              )}
            </View>
            <View style={styles.cameraIconWrap}>
              <Feather name="camera" size={12} color="#FFF" />
            </View>
          </View>

          <Text style={styles.userName}>
            {user?.name && !/^\+?\d+$/.test(user.name) ? user.name.toUpperCase() : 'LOKENDRA SINGH SAINGAR'}
          </Text>
          <Text style={styles.userEmail}>{user?.email || 'madav6310@gmail.com'}</Text>
          
          <View style={styles.planBadge}>
            <Feather name="user" size={12} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.planText}>
              {profile?.subscription !== 'free' ? 'Pro Plan' : 'Free Plan'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <StatItem label="Generations" value={profile?.generationsUsed || 0} iconName="zap" />
            <StatItem label="Saved" value={profile?.savedCount || 0} iconName="bookmark" />
            <StatItem label="Tools Used" value={profile?.toolsUsed || 0} iconName="grid" />
          </View>
        </View>

        {/* Upgrade Banner */}
        {profile?.subscription === 'free' && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={() => navigation.navigate('Subscription')} activeOpacity={0.9}>
            <LinearGradient colors={['#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.upgradeGradient}>
              <View style={styles.upgradeIconWrap}>
                <Feather name="star" size={20} color="#FFF" />
              </View>
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                <Text style={styles.upgradeSubtitle}>Unlimited generations & premium features</Text>
              </View>
              <View style={styles.upgradeArrowWrap}>
                <Feather name="chevron-right" size={20} color="#FFF" />
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
                    style={[styles.menuItem, itemIdx === section.items.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => {
                      if (item.action) item.action();
                      else if (item.screen) navigation.navigate(item.screen as any);
                      else if (item.url) Linking.openURL(item.url);
                    }}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={styles.menuIconWrap}>
                        <Feather name={item.iconName as any} size={18} color="#8B5CF6" />
                      </View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.menuItemRight}>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                      <Feather name="chevron-right" size={20} color="#605E5C" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

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
  container: {
    flex: 1,
    backgroundColor: '#0D0F1C',
  },
  bgGlow1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    filter: 'blur(40px)' as any,
  },
  bgGlow2: {
    position: 'absolute',
    top: 50,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    filter: 'blur(40px)' as any,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  profileCard: {
    marginHorizontal: 16,
    backgroundColor: '#161824',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cameraIconWrap: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#161824',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#A1A1AA',
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  planText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 4,
  },
  upgradeBanner: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  upgradeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  upgradeArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    paddingHorizontal: 16,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: 12,
    marginLeft: 8,
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: '#161824',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 32,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    color: '#A1A1AA',
    marginBottom: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 13,
    color: '#8B5CF6',
  },
  footerDivider: {
    fontSize: 13,
    color: '#A1A1AA',
    marginHorizontal: 8,
  },
});

export default ProfileScreen;