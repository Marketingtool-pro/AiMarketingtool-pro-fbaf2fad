import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useToolsStore, Tool } from '../../store/toolsStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { getToolIcon } from '../../constants/toolIcons';
import { PLATFORMS_CONFIG } from '../../data/platforms';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 3;

const ToolsScreen = () => {
  const navigation = useNavigation<any>();
  const { tools } = useToolsStore();
  const { profile } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlatform, setActivePlatform] = useState('all');

  // Platform tabs including All
  const platformTabs = [
    { id: 'all', name: 'All', icon: 'grid', color: Colors.secondary },
    ...PLATFORMS_CONFIG.map(p => ({ id: p.id, name: p.title, icon: p.icon, color: p.color })),
  ];

  // Filter tools based on platform and search
  const filteredData = useMemo(() => {
    let result = tools;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }

    // Platform filter
    if (activePlatform === 'all') {
      // Show all tools, no sections
      return { sections: [], allTools: result };
    }

    const platform = PLATFORMS_CONFIG.find(p => p.id === activePlatform);
    if (!platform) return { sections: [], allTools: result };

    // Get all badges for this platform
    const allPlatformBadges = platform.sections.flatMap(s => s.badges);
    const platformTools = result.filter(t => allPlatformBadges.includes(t.category));

    // Build sections
    const sections = platform.sections
      .map(section => ({
        ...section,
        tools: platformTools.filter(t => section.badges.includes(t.category)),
      }))
      .filter(s => s.tools.length > 0);

    return { sections, allTools: [] };
  }, [tools, activePlatform, searchQuery]);

  const userSub = profile?.subscription || 'free';
  const userHasProAccess = ['pro', 'alltools', 'enterprise', 'agency'].includes(userSub);

  const renderToolCard = (tool: Tool) => {
    const hasAccess = !tool.isPro || userHasProAccess;

    return (
      <TouchableOpacity
        key={tool.$id}
        style={[styles.card, !hasAccess && styles.cardLocked]}
        activeOpacity={0.75}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (hasAccess) {
            navigation.navigate('ToolDetail', { toolSlug: tool.slug });
          } else {
            navigation.navigate('Subscription' as any);
          }
        }}
      >
        <View style={styles.iconLiquid}>
          <View style={styles.iconGlow} />
          <Image source={getToolIcon(tool.slug, tool.category)} style={styles.cardIcon} resizeMode="contain" />
          {tool.isPro && !hasAccess && (
            <View style={styles.proBadge}>
              <Feather name="lock" size={10} color="#FFB547" />
            </View>
          )}
          {tool.isPro && hasAccess && (
            <View style={[styles.proBadge, { backgroundColor: 'rgba(157, 78, 221, 0.9)' }]}>
              <Feather name="star" size={8} color="#FFFFFF" />
            </View>
          )}
        </View>
        <Text style={styles.cardName} numberOfLines={2}>{tool.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <ImageBackground
          source={require('../../assets/images/screens/tools-hero.jpg')}
          style={styles.heroBanner}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(13,15,28,0.3)', 'rgba(13,15,28,0.85)']}
            style={styles.heroOverlay}
          >
            <View style={styles.heroContent}>
              <View style={styles.aiBadge}>
                <Feather name="zap" size={12} color="#F59E0B" />
                <Text style={styles.aiBadgeText}>AI Tools</Text>
              </View>
              <Text style={styles.heroTitle}>Marketing AI Tools</Text>
              <Text style={styles.heroSubtitle}>Google  ·  Meta  ·  Shopify</Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color={Colors.textTertiary} />
            <TextInput
              placeholder="Search tools..."
              placeholderTextColor={Colors.textTertiary}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Platform Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.platformRow}
        >
          {platformTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.platformChip, activePlatform === tab.id && { backgroundColor: tab.color, borderColor: tab.color }]}
              onPress={() => {
                Haptics.selectionAsync();
                setActivePlatform(tab.id);
              }}
            >
              <Feather name={tab.icon as any} size={14} color={activePlatform === tab.id ? '#FFF' : Colors.textSecondary} />
              <Text style={[styles.platformText, activePlatform === tab.id && styles.platformTextActive]}>{tab.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {activePlatform === 'all' ? (
          // All tools - 3 column grid
          <View style={styles.grid}>
            {filteredData.allTools.map(renderToolCard)}
          </View>
        ) : (
          // Platform sections
          filteredData.sections.map((section) => (
            <View key={section.key} style={styles.sectionContainer}>
              {/* Section Header Glass Card */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: (PLATFORMS_CONFIG.find(p => p.id === activePlatform)?.color || Colors.secondary) + '20' }]}>
                  <Feather name={section.icon as any} size={18} color={PLATFORMS_CONFIG.find(p => p.id === activePlatform)?.color || Colors.secondary} />
                </View>
                <View style={styles.sectionTextWrap}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                </View>
              </View>

              {/* Tools Grid */}
              <View style={styles.grid}>
                {section.tools.map(renderToolCard)}
              </View>
            </View>
          ))
        )}

        {/* Empty state */}
        {activePlatform !== 'all' && filteredData.sections.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="search" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No tools found</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0D0F1C',
  },
  heroBanner: {
    width: '100%',
    height: 200,
    marginTop: Platform.OS === 'ios' ? 44 : 0,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroContent: {},
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  aiBadgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 15,
  },
  platformRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  platformText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  platformTextActive: {
    color: '#FFFFFF',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTextWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconLiquid: {
    width: 68,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(124,58,237,0.15)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  cardIcon: {
    width: 56,
    height: 56,
  },
  proBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 181, 71, 0.25)',
    borderWidth: 1,
    borderColor: '#FFB547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLocked: {
    opacity: 0.6,
  },
  cardName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textTertiary,
    marginTop: 12,
  },
});

export default ToolsScreen;
