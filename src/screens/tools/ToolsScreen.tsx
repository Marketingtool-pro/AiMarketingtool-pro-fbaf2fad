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

  const renderToolCard = ({ item }: { item: Tool }) => (
    <TouchableOpacity
      style={styles.toolCard}
      onPress={() => handleToolPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.toolIcon, { backgroundColor: Colors.accent + '15' }]}>
        <Image source={getToolIcon(item.slug, item.category)} style={styles.toolIconImage} />
      </View>
      <View style={styles.toolBadges}>
        {item.isNew && (
          <View style={[styles.badge, { backgroundColor: Colors.success }]}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        )}
        {item.isPro && (
          <View style={[styles.badge, { backgroundColor: Colors.gold }]}>
            <Text style={styles.badgeText}>PRO</Text>
          </View>
        )}
        {item.isTrending && (
          <View style={[styles.badge, { backgroundColor: Colors.accent }]}>
            <Feather name="trending-up" size={10} color={Colors.white} />
          </View>
        )}
      </View>
      <Text style={styles.toolName} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <AnimatedBackground variant="tools" showParticles={true}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <Image source={ScreenImages.toolsHero} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(13, 15, 28, 0.7)', 'rgba(13, 15, 28, 0.95)']}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Feather name="zap" size={12} color={Colors.gold} />
              <Text style={styles.heroBadgeText}>75+ AI Tools</Text>
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
            placeholder="Search 75+ tools..."
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

      {/* Spacer */}
      <View style={{ height: 4 }} />

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
    borderColor: Colors.border,
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
  },
  platformTabActive: {
    backgroundColor: Colors.accent,
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
    backgroundColor: Colors.accent,
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
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toolIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  toolIconImage: {
    width: 52,
    height: 52,
  },
  toolBadges: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.white,
  },
  toolName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  toolCountRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  toolCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
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
