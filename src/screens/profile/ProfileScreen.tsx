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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  User, 
  Settings, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  FileText, 
  LogOut, 
  ChevronRight,
  Star,
  Zap,
  Bookmark,
  Grid
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const statItems = [
    { label: 'Generations', value: '0', icon: Zap, color: '#A855F7' },
    { label: 'Saved', value: '0', icon: Bookmark, color: '#EC4899' },
    { label: 'Tools Used', value: '0', icon: Grid, color: '#3B82F6' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Top Hero Section */}
        <View style={styles.heroContainer}>
          <Image 
            source={require('../../assets/images/logo.jpeg')} 
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(13, 15, 28, 0.3)', 'rgba(13, 15, 28, 0.8)']}
            style={styles.heroGradient}
          >
            <View style={styles.headerActions}>
              <Text style={styles.headerTitle}>Profile</Text>
              <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
                <Settings size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[Colors.secondary, Colors.accent]}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </Text>
                </LinearGradient>
                <TouchableOpacity style={styles.editAvatarBtn}>
                  <Feather name="camera" size={14} color={Colors.white} />
                </TouchableOpacity>
              </View>
              <Text style={styles.userName}>{user?.name || 'Admin User'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'help@marketingtool.pro'}</Text>
              
              <TouchableOpacity style={styles.planBadge}>
                <User size={14} color={Colors.textSecondary} />
                <Text style={styles.planText}>Free Plan</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Grid - Bento Style */}
        <View style={styles.statsGrid}>
          {statItems.map((item, index) => (
            <View key={index} style={styles.statCard}>
              <item.icon size={22} color={item.color} style={{marginBottom: 8}} />
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Upgrade Banner */}
        <TouchableOpacity 
          style={styles.upgradeBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <LinearGradient
            colors={['#3D2914', '#16132B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeGradient}
          >
            <View style={styles.upgradeIconContainer}>
              <Star size={20} color={Colors.gold} fill={Colors.gold} />
            </View>
            <View style={styles.upgradeTextContainer}>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSubtitle}>Unlimited generations & premium features</Text>
            </View>
            <ChevronRight size={20} color={Colors.gold} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, {backgroundColor: '#7C3AED20'}]}>
                  <User size={20} color="#7C3AED" />
                </View>
                <Text style={styles.menuText}>Edit Profile</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Subscription')}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, {backgroundColor: '#EC489920'}]}>
                  <CreditCard size={20} color="#EC4899" />
                </View>
                <Text style={styles.menuText}>Subscription</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, {backgroundColor: '#3B82F620'}]}>
                  <Bell size={20} color="#3B82F6" />
                </View>
                <Text style={styles.menuText}>Notifications</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT & LEGAL</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Privacy')}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, {backgroundColor: '#10B98120'}]}>
                  <ShieldCheck size={20} color="#10B981" />
                </View>
                <Text style={styles.menuText}>Privacy Policy</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Terms')}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, {backgroundColor: '#F59E0B20'}]}>
                  <FileText size={20} color="#F59E0B" />
                </View>
                <Text style={styles.menuText}>Terms of Service</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0}]} onPress={handleLogout}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, {backgroundColor: '#EF444420'}]}>
                  <LogOut size={20} color="#EF4444" />
                </View>
                <Text style={[styles.menuText, {color: '#EF4444'}]}>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.3.3 (143)</Text>
        </View>
        
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F1C',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    height: 420,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: 50,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: -20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.white,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.secondary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0D0F1C',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  planText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    marginTop: -30,
    zIndex: 10,
  },
  statCard: {
    width: (width - Spacing.lg * 2 - 20) / 3,
    backgroundColor: '#1A1D2E',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upgradeBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.2)', // Gold border
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  upgradeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(253, 151, 7, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gold,
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuContainer: {
    backgroundColor: '#1A1D2E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});

export default ProfileScreen;
