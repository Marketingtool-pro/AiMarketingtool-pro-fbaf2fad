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
  StatusBar,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const { width, height } = Dimensions.get('window');

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

  return (
    <AnimatedBackground variant="profile">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Top Hero Section with "Ad Campaign" Banner Image */}
        <View style={styles.heroContainer}>
          <ImageBackground 
            source={require('../../assets/images/banners/banner-1.jpg')} // Fallback if ad-campaign banner is missing
            style={styles.heroImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(10, 10, 10, 0.1)', 'rgba(10, 10, 10, 1)']}
              style={styles.heroGradient}
            >
              <View style={styles.headerTop}>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
                  <Feather name="settings" size={22} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Profile Card (Glass Bento Overlapping Hero) */}
        <View style={styles.profileCardWrapper}>
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
              style={StyleSheet.absoluteFillObject}
            />
            
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </Text>
              </View>
              <TouchableOpacity style={styles.editAvatarBtn}>
                <Feather name="camera" size={14} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Info */}
            <Text style={styles.userName}>{user?.name || 'Admin User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'help@marketingtool.pro'}</Text>
            
            <View style={styles.planBadge}>
              <Text style={styles.planText}>Free Plan</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Feather name="zap" size={20} color="#A855F7" />
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Generations</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Feather name="bookmark" size={20} color="#A855F7" />
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Feather name="credit-card" size={20} color="#A855F7" />
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Credits</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upgrade Banner */}
        <TouchableOpacity 
          style={styles.upgradeBanner}
          onPress={() => navigation.navigate('Subscription')}
        >
          <LinearGradient
            colors={['#FF9900', '#D35400']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeGradient}
          >
            <View style={styles.upgradeTextContainer}>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSubtitle}>Get unlimited generations & 3D tools</Text>
            </View>
            <View style={styles.upgradeArrowCircle}>
              <Feather name="chevron-right" size={20} color="#D35400" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUBSCRIPTION</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Subscription')}>
              <View style={styles.menuItemLeft}>
                <Feather name="star" size={20} color="#9D4EDD" />
                <Text style={styles.menuText}>Manage Plan</Text>
              </View>
              <View style={styles.menuItemRight}>
                <View style={styles.upgradeMiniBadge}>
                  <Text style={styles.upgradeMiniText}>Upgrade</Text>
                </View>
                <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Subscription')}>
              <View style={styles.menuItemLeft}>
                <Feather name="credit-card" size={20} color="#9D4EDD" />
                <Text style={styles.menuText}>Payment & Billing</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('https://marketingtool.pro/help')}>
              <View style={styles.menuItemLeft}>
                <Feather name="help-circle" size={20} color="#9D4EDD" />
                <Text style={styles.menuText}>Help Center</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL('mailto:help@marketingtool.pro')}>
              <View style={styles.menuItemLeft}>
                <Feather name="message-square" size={20} color="#9D4EDD" />
                <Text style={styles.menuText}>Contact Support</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
              <View style={styles.menuItemLeft}>
                <Feather name="user" size={20} color="#9D4EDD" />
                <Text style={styles.menuText}>Edit Profile</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0}]} onPress={handleLogout}>
              <View style={styles.menuItemLeft}>
                <Feather name="log-out" size={20} color="#EF4444" />
                <Text style={[styles.menuText, {color: '#EF4444'}]}>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{height: 100}} />
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    height: 300,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCardWrapper: {
    paddingHorizontal: Spacing.lg,
    marginTop: -100, // Overlap the hero image
    zIndex: 10,
  },
  profileCard: {
    backgroundColor: 'rgba(26, 29, 46, 0.85)',
    borderRadius: 30,
    alignItems: 'center',
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#161824',
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
    backgroundColor: '#9D4EDD',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#161824',
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
    marginBottom: 16,
  },
  planBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  planText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  upgradeBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  upgradeArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 30,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 8,
  },
  menuContainer: {
    backgroundColor: '#161824',
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.white,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeMiniBadge: {
    backgroundColor: '#9D4EDD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upgradeMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default ProfileScreen;
