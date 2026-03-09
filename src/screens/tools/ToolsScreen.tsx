import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useToolsStore, TOOL_CATEGORIES, PLATFORMS, Tool } from '../../store/toolsStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { getToolIcon } from '../../constants/toolIcons';

const { width } = Dimensions.get('window');

// Screen images
const ScreenImages = {
  toolsHero: require('../../assets/images/screens/tools-hero.jpg'),
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
    return (
      <TouchableOpacity
        style={styles.toolCard}
        onPress={() => handleToolPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.toolIconContainer}>
          <Image
            source={getToolIcon(item.slug, item.category)}
            style={styles.toolIconImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.badgeContainer}>
          {item.isPro && (
            <View style={[styles.proBadge, { backgroundColor: '#FF8A00' }]}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
          <View style={styles.platformMiniBadge}>
            <Feather name="trending-up" size={10} color={Colors.white} />
          </View>
        </View>

        <Text style={styles.toolName} numberOfLines={2} textAlign="center">
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <AnimatedBackground variant="tools" showParticles={true}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Image source={ScreenImages.toolsHero} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(10, 11, 24, 0.2)', 'rgba(10, 11, 24, 0.9)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Feather name="zap" size={12} color={Colors.gold} />
                <Text style={styles.heroBadgeText}>75+ AI Tools</Text>
              </View>
              <Text style={styles.heroTitle}>AI Marketing Tools</Text>
              <Text style={styles.heroSubtitle}>Google Meta Shopify</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Search */}
        <View style={styles.searchContainerWrapper}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search 75+ tools..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Platform Tabs */}
        <View style={styles.platformTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformTabs}>
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
          </ScrollView>
        </View>

        {/* Categories */}
        <View style={styles.categoriesWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
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
        </View>

        {/* Tools Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{filteredTools.length} tools</Text>
        </View>

        {/* Tools Grid */}
        <FlatList
          data={filteredTools}
          renderItem={renderToolCard}
          keyExtractor={(item) => item.$id}
          numColumns={3}
          columnWrapperStyle={styles.toolsRow}
          contentContainerStyle={styles.toolsContainer}
          scrollEnabled={false} // Disable inner scroll since we are in a ScrollView
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="search" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No tools found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
        />
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  heroBanner: {
    height: 180,
    marginTop: 60,
    marginHorizontal: Spacing.lg,
    borderRadius: 24,
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
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB800',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  searchContainerWrapper: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161824',
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.white,
  },
  platformTabsWrapper: {
    marginBottom: Spacing.sm,
  },
  platformTabs: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  platformTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161824',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  platformTabActive: {
    backgroundColor: '#9D4EDD', // The vibrant purple from the image
    borderColor: '#9D4EDD',
  },
  platformTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  platformTabTextActive: {
    color: Colors.white,
  },
  categoriesWrapper: {
    marginBottom: Spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryChip: {
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#9D4EDD', // Purple pill for sub categories
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  countContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  countText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  toolsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  toolsRow: {
    justifyContent: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  toolCard: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3, // 3 columns with gaps
    backgroundColor: '#161824',
    borderRadius: 16,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  toolIconContainer: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolIconImage: {
    width: 48,
    height: 48,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    height: 16,
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.white,
  },
  platformMiniBadge: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#9D4EDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
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

