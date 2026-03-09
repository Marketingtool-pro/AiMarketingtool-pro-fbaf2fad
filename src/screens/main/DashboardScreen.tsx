import React, { useEffect } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { useToolsStore, TOOL_CATEGORIES } from '../../store/toolsStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { getToolIcon } from '../../constants/toolIcons';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const { width } = Dimensions.get('window');

const DashboardImages = {
  googleAds: require('../../assets/images/categories/google-ads.jpg'),
  googleSeo: require('../../assets/images/categories/google-seo.jpg'),
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { tools, fetchTools, isLoading } = useToolsStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchTools();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTools();
    setRefreshing(false);
  };

  const popularTools = [
    { name: 'Instagram Caption', slug: 'instagram-captions', category: 'Social', color: '#E4405F' },
    { name: 'Facebook Ad Copy', slug: 'facebook-ad-copy', category: 'Ads', color: '#1877F2' },
    { name: 'Product Description', slug: 'product-descriptions', category: 'E-commerce', color: '#96BF48' },
    { name: 'Instagram Reels Script', slug: 'instagram-reels', category: 'Video', color: '#C13584' },
    { name: 'Shopify Product Title', slug: 'shopify-titles', category: 'E-commerce', color: '#96BF48' },
    { name: 'Email Subject Lines', slug: 'email-subjects', category: 'Email', color: '#EF4444' },
    { name: 'Google Ads Headline', slug: 'google-ads-headline', category: 'Ads', color: '#4285F4' },
    { name: 'Meme Generator', slug: 'meme-generator', category: 'Creative', color: '#EC4899' },
  ];

  return (
    <AnimatedBackground variant="dashboard">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9D4EDD" />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'User'}</Text>
            <Text style={styles.subGreeting}>AI-Powered Marketing Platform</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Profile' } as any)}
          >
            <LinearGradient
              colors={['#9D4EDD', '#7C3AED']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Featured Categories Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.featuredCategories}
        >
          <TouchableOpacity style={styles.featureCard} activeOpacity={0.9}>
            <Image source={DashboardImages.googleAds} style={styles.featureImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.featureGradient}>
              <Text style={styles.featureTitle}>Google Ads</Text>
              <Text style={styles.featureSubtitle}>24 tools</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} activeOpacity={0.9}>
            <Image source={DashboardImages.googleSeo} style={styles.featureImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.featureGradient}>
              <Text style={styles.featureTitle}>Google SEO</Text>
              <Text style={styles.featureSubtitle}>22 tools</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Tools</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Tools' } as any)}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.popularContainer}>
          {popularTools.map((tool, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.toolItem, index === popularTools.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => {
                if (tool.slug === 'meme-generator') {
                  navigation.navigate('MemeGenerator');
                } else {
                  navigation.navigate('ToolDetail', { toolSlug: tool.slug });
                }
              }}
            >
              <View style={styles.toolInfo}>
                <View style={[styles.toolIcon, { backgroundColor: '#1C1C2E' }]}>
                   <Image 
                    source={getToolIcon(tool.slug, tool.category)} 
                    style={{ width: 24, height: 24 }} 
                    resizeMode="contain" 
                  />
                </View>
                <View>
                  <View style={styles.toolNameRow}>
                    <Text style={styles.toolName}>{tool.name}</Text>
                    <Feather name="trending-up" size={12} color="#22C55E" style={{ marginLeft: 6 }} />
                  </View>
                  <Text style={styles.toolCategory}>{tool.category}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#4A5568" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  subGreeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  featuredCategories: {
    paddingLeft: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  featureCard: {
    width: width * 0.44,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#161824',
  },
  featureImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featureGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  featureSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  seeAll: {
    fontSize: 14,
    color: '#9D4EDD',
  },
  popularContainer: {
    marginHorizontal: Spacing.lg,
    backgroundColor: '#161824',
    borderRadius: 24,
    padding: 8,
  },
  toolItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  toolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  toolCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default DashboardScreen;

