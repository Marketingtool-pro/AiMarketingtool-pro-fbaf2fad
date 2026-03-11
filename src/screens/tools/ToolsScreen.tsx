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
import { useToolsStore, Tool, TOOL_CATEGORIES, PLATFORMS } from '../../store/toolsStore';
import { Colors } from '../../constants/theme';
import { getToolIcon } from '../../constants/toolIcons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 3;

const ToolsScreen = () => {
  const navigation = useNavigation<any>();
  const { tools } = useToolsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlatform, setActivePlatform] = useState('All');
  const [activeSubcategory, setActiveSubcategory] = useState('All');

  const subcategories = useMemo(() => {
    if (activePlatform === 'All') return [];
    const platformId = activePlatform === 'Google Ads' ? 'google' : activePlatform === 'Meta' ? 'meta' : 'shopify';
    return TOOL_CATEGORIES.filter(c => c.platform === platformId);
  }, [activePlatform]);

  const filteredTools = useMemo(() => {
    let result = tools;
    if (activePlatform !== 'All') {
      const platformId = activePlatform === 'Google Ads' ? 'google' : activePlatform === 'Meta' ? 'meta' : 'shopify';
      const platformCats = TOOL_CATEGORIES.filter(c => c.platform === platformId).map(c => c.id);
      result = result.filter(t => platformCats.includes(t.category));
    }
    if (activeSubcategory !== 'All') {
      result = result.filter(t => t.category === activeSubcategory);
    }
    if (searchQuery) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [tools, activePlatform, activeSubcategory, searchQuery]);

  const platformTabs = [
    { name: 'All', icon: null },
    { name: 'Google Ads', icon: 'search' },
    { name: 'Meta', icon: 'facebook' },
    { name: 'Shopify', icon: 'shopping-bag' },
  ];

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[]}>
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
              key={tab.name}
              style={[styles.platformChip, activePlatform === tab.name && styles.platformChipActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActivePlatform(tab.name);
                setActiveSubcategory('All');
              }}
            >
              {tab.icon && <Feather name={tab.icon as any} size={14} color={activePlatform === tab.name ? '#FFF' : Colors.textSecondary} />}
              <Text style={[styles.platformText, activePlatform === tab.name && styles.platformTextActive]}>{tab.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subcategory Chips */}
        {subcategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subRow}
          >
            <TouchableOpacity
              style={[styles.subChip, activeSubcategory === 'All' && styles.subChipActive]}
              onPress={() => { Haptics.selectionAsync(); setActiveSubcategory('All'); }}
            >
              <Text style={[styles.subText, activeSubcategory === 'All' && styles.subTextActive]}>All</Text>
            </TouchableOpacity>
            {subcategories.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.subChip, activeSubcategory === s.id && styles.subChipActive]}
                onPress={() => { Haptics.selectionAsync(); setActiveSubcategory(s.id); }}
              >
                <Text style={[styles.subText, activeSubcategory === s.id && styles.subTextActive]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Spacer */}
        <View style={{ height: 8 }} />

        {/* 3-Column Grid */}
        <View style={styles.grid}>
          {filteredTools.map((tool) => (
            <TouchableOpacity
              key={tool.$id}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('ToolDetail', { toolSlug: tool.slug });
              }}
            >
              <View style={styles.badgeRow}>
                {tool.isPro && (
                  <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
                )}
                {tool.isNew && (
                  <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                )}
                {tool.isTrending && (
                  <View style={styles.trendingBadge}>
                    <Feather name="zap" size={8} color="#A78BFA" />
                  </View>
                )}
              </View>
              <View style={styles.iconLiquid}>
                <View style={styles.iconGlow} />
                <Image source={getToolIcon(tool.slug)} style={styles.cardIcon} resizeMode="contain" />
              </View>
              <Text style={styles.cardName} numberOfLines={2}>{tool.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    marginTop: 0,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: 'rgba(13, 15, 28, 0.4)',
  },
  heroContent: {},
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  aiBadgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
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
    height: 48,
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
    marginBottom: 8,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  platformChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  platformText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  platformTextActive: {
    color: '#FFFFFF',
  },
  subRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  subChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  subChipActive: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderColor: 'rgba(124,58,237,0.4)',
  },
  subText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  subTextActive: {
    color: Colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  card: {
    width: (width - 32 - 24) / 3,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  iconLiquid: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  iconGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  cardIcon: {
    width: 48,
    height: 48,
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    minHeight: 18,
  },
  proBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: { 
    fontSize: 9, 
    color: '#FFFFFF', 
    fontWeight: '800' 
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: { 
    fontSize: 9, 
    color: '#FFFFFF', 
    fontWeight: '800' 
  },
  trendingBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  cardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
});
});

export default ToolsScreen;
