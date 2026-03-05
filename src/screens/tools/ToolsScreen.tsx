import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  FlatList,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useToolsStore, TOOL_CATEGORIES, PLATFORMS, Tool } from '../../store/toolsStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { getToolIcon } from '../../constants/toolIcons';

// Category images for tool card backgrounds (matches real app 3D icon style)
const CategoryImageAssets: Record<string, any> = {
  'google-ads': require('../../assets/images/categories/google-ads.jpg'),
  'google-seo': require('../../assets/images/categories/google-seo.jpg'),
  'google-analytics': require('../../assets/images/categories/google-analytics.jpg'),
  'google-content': require('../../assets/images/categories/google-content.jpg'),
  'facebook-ads': require('../../assets/images/categories/facebook-ads.jpg'),
  'instagram': require('../../assets/images/categories/instagram.jpg'),
  'social-media': require('../../assets/images/categories/social-media.jpg'),
  'meta-content': require('../../assets/images/categories/meta-content.jpg'),
  'shopify-products': require('../../assets/images/categories/shopify-products.jpg'),
  'shopify-ads': require('../../assets/images/categories/shopify-ads.jpg'),
  'email-marketing': require('../../assets/images/categories/email-marketing.jpg'),
  'ecommerce-seo': require('../../assets/images/categories/ecommerce-seo.jpg'),
  'ai-agents': require('../../assets/images/categories/ai-agents.jpg'),
  'content-creation': require('../../assets/images/categories/content-creation.jpg'),
};

// Platform color map for tool icons
const PLATFORM_COLORS: Record<string, string> = {};
PLATFORMS.forEach(p => { PLATFORM_COLORS[p.id] = p.color; });

// Category gradient colors
const CATEGORY_GRADIENTS: Record<string, string[]> = {
  'google-ads': ['#4285F4', '#1A73E8'],
  'google-seo': ['#34A853', '#1E8E3E'],
  'google-analytics': ['#F9AB00', '#E37400'],
  'google-content': ['#EA4335', '#C5221F'],
  'facebook-ads': ['#1877F2', '#0C5DC7'],
  'instagram': ['#E4405F', '#C13584'],
  'social-media': ['#833AB4', '#5851DB'],
  'meta-content': ['#0088FF', '#00C6FF'],
  'shopify-products': ['#96BF48', '#5E8E3E'],
  'shopify-ads': ['#5C6BC0', '#3949AB'],
  'email-marketing': ['#FF6B6B', '#EE5A5A'],
  'ecommerce-seo': ['#00BFA5', '#00897B'],
  'ai-agents': ['#FF6B35', '#F7931E'],
  'content-creation': ['#7C4DFF', '#651FFF'],
};

// Get color for a tool based on its category's platform
const getToolColor = (tool: Tool): string => {
  const category = TOOL_CATEGORIES.find(c => c.id === tool.category);
  if (category?.platform) return PLATFORM_COLORS[category.platform] || Colors.secondary;
  return Colors.secondary;
};

// Get category image for a tool
const getToolCategoryImage = (tool: Tool): any => {
  return CategoryImageAssets[tool.category] || null;
};

// Get category gradient for a tool
const getToolGradient = (tool: Tool): string[] => {
  return CATEGORY_GRADIENTS[tool.category] || [Colors.secondary, Colors.accent];
};

// Smarter icon selection based on tool name keywords
const getSmartIcon = (tool: Tool): string => {
  const n = tool.name.toLowerCase();
  if (n.includes('caption') || n.includes('post')) return 'type';
  if (n.includes('hashtag') || n.includes('tag')) return 'hash';
  if (n.includes('reel') || n.includes('video') || n.includes('script')) return 'film';
  if (n.includes('story') || n.includes('stories')) return 'camera';
  if (n.includes('audit') || n.includes('grader') || n.includes('checker')) return 'check-circle';
  if (n.includes('keyword') || n.includes('research')) return 'key';
  if (n.includes('content') || n.includes('blog') || n.includes('article') || n.includes('writer')) return 'file-text';
  if (n.includes('email') || n.includes('subject') || n.includes('newsletter')) return 'mail';
  if (n.includes('ad copy') || n.includes('headline') || n.includes('copy')) return 'edit-3';
  if (n.includes('budget') || n.includes('calculator') || n.includes('roi')) return 'dollar-sign';
  if (n.includes('manager') || n.includes('suite') || n.includes('dashboard')) return 'layout';
  if (n.includes('schedule') || n.includes('planner') || n.includes('calendar')) return 'calendar';
  if (n.includes('analytic') || n.includes('report') || n.includes('metric')) return 'bar-chart-2';
  if (n.includes('performance') || n.includes('optimization')) return 'trending-up';
  if (n.includes('automation') || n.includes('ai ') || n.includes('bot')) return 'cpu';
  if (n.includes('product') || n.includes('shopify') || n.includes('ecommerce')) return 'shopping-bag';
  if (n.includes('campaign')) return 'target';
  if (n.includes('landing') || n.includes('page')) return 'monitor';
  if (n.includes('description') || n.includes('listing')) return 'align-left';
  if (n.includes('social') || n.includes('share')) return 'share-2';
  if (n.includes('brand') || n.includes('logo')) return 'award';
  if (n.includes('strategy') || n.includes('plan')) return 'compass';
  if (n.includes('template')) return 'copy';
  if (n.includes('generator') || n.includes('create')) return 'zap';
  if (n.includes('meme')) return 'smile';
  if (n.includes('display')) return 'monitor';
  if (n.includes('responsive') || n.includes('search ad')) return 'search';
  if (n.includes('shopping') || n.includes('feed')) return 'shopping-cart';
  if (n.includes('review') || n.includes('testimonial')) return 'message-square';
  if (n.includes('title')) return 'bold';
  if (n.includes('seo')) return 'globe';
  return tool.icon; // fallback to original
};

const { width } = Dimensions.get('window');

// Screen images
const ScreenImages = {
  toolsHero: require('../../assets/images/screens/tools-hero.jpg'),
  marketingTools: require('../../assets/images/screens/marketing-tools.jpg'),
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ToolsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { tools, searchTools, getToolsByCategory } = useToolsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!selectedPlatform) return TOOL_CATEGORIES;
    return TOOL_CATEGORIES.filter(cat => cat.platform === selectedPlatform || cat.platform === 'all');
  }, [selectedPlatform]);

  const filteredTools = useMemo(() => {
    let result = tools;

    if (searchQuery) {
      return searchTools(searchQuery);
    }

    if (selectedCategory) {
      result = getToolsByCategory(selectedCategory);
    } else if (selectedPlatform) {
      const platformCategories = TOOL_CATEGORIES.filter(c => c.platform === selectedPlatform).map(c => c.id);
      result = tools.filter(t => platformCategories.includes(t.category));
    }

    return result;
  }, [searchQuery, selectedPlatform, selectedCategory, tools]);

  const handleToolPress = (tool: Tool) => {
    if (tool.slug === 'meme-generator') {
      navigation.navigate('MemeGenerator');
    } else {
      navigation.navigate('ToolDetail', { toolSlug: tool.slug });
    }
  };

  const renderToolCard = ({ item }: { item: Tool }) => {
    const toolColor = getToolColor(item);
    const categoryImage = getToolCategoryImage(item);
    const gradient = getToolGradient(item);

    return (
      <TouchableOpacity
        style={styles.toolCard}
        onPress={() => handleToolPress(item)}
        activeOpacity={0.7}
      >
        {/* Icon area with category image background */}
        <View style={styles.toolIconArea}>
          {categoryImage && (
            <Image source={categoryImage} style={styles.toolIconImage} resizeMode="cover" />
          )}
          <LinearGradient
            colors={[`${gradient[0]}40`, `${gradient[1]}90`]}
            style={styles.toolIconOverlay}
          />
          <View style={styles.toolIconCenter}>
            <Image
              source={getToolIcon(item.slug, item.category)}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Badges row */}
        <View style={styles.toolBadges}>
          {item.isPro && (
            <View style={[styles.badge, { backgroundColor: Colors.gold }]}>
              <Text style={styles.badgeText}>PRO</Text>
            </View>
          )}
          {item.isNew && (
            <View style={[styles.badge, { backgroundColor: Colors.success }]}>
              <Text style={styles.badgeText}>NEW</Text>
            </View>
          )}
          {item.isTrending && (
            <View style={[styles.badge, { backgroundColor: toolColor }]}>
              <Feather name="trending-up" size={10} color={Colors.white} />
            </View>
          )}
        </View>

        {/* Tool name */}
        <Text style={styles.toolName} numberOfLines={2}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedBackground variant="tools" showParticles={true}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <Image source={ScreenImages.toolsHero} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(6, 11, 40, 0.7)', 'rgba(6, 11, 40, 0.95)']}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Feather name="zap" size={12} color={Colors.gold} />
              <Text style={styles.heroBadgeText}>AI Tools</Text>
            </View>
            <Text style={styles.heroTitle}>AI Marketing Tools</Text>
            <Text style={styles.heroSubtitle}>Google • Meta • Shopify</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Header */}
      <View style={styles.header}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tools..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Platform Tabs */}
      <View style={styles.platformTabs}>
        <TouchableOpacity
          style={[styles.platformTab, !selectedPlatform && styles.platformTabActive]}
          onPress={() => { setSelectedPlatform(null); setSelectedCategory(null); }}
        >
          <Text style={[styles.platformTabText, !selectedPlatform && styles.platformTabTextActive]}>All</Text>
        </TouchableOpacity>
        {PLATFORMS.map((platform) => (
          <TouchableOpacity
            key={platform.id}
            style={[styles.platformTab, selectedPlatform === platform.id && styles.platformTabActive]}
            onPress={() => { setSelectedPlatform(platform.id); setSelectedCategory(null); }}
          >
            <Feather
              name={platform.icon as any}
              size={16}
              color={selectedPlatform === platform.id ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.platformTabText, selectedPlatform === platform.id && styles.platformTabTextActive]}>
              {platform.name.split('/')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        {filteredCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === category.id && styles.categoryChipTextActive]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tools Grid */}
      <FlatList
        data={filteredTools}
        renderItem={renderToolCard}
        keyExtractor={(item) => item.$id}
        numColumns={3}
        columnWrapperStyle={styles.toolsRow}
        contentContainerStyle={styles.toolsContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No tools found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        }
      />
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBanner: {
    height: 180,
    marginTop: 50,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 151, 7, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gold,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    fontSize: 15,
    color: Colors.white,
  },
  platformTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  platformTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  platformTabActive: {
    backgroundColor: Colors.secondary,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  platformTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  platformTabTextActive: {
    color: Colors.white,
  },
  categoriesScroll: {
    maxHeight: 44,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.secondary,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.white,
    fontWeight: '500',
  },
  toolsContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  toolsRow: {
    justifyContent: 'space-between',
  },
  toolCard: {
    width: (width - Spacing.md * 4) / 3,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  toolIconArea: {
    width: '100%',
    height: 90,
    position: 'relative',
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  toolIconImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  toolIconOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  toolIconCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolBadges: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingTop: 6,
    flexWrap: 'wrap',
    minHeight: 20,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.white,
  },
  toolName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    paddingHorizontal: 6,
    paddingBottom: 8,
    paddingTop: 4,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

export default ToolsScreen;
