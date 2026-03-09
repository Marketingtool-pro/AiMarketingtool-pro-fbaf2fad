import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useToolsStore, Tool } from '../../store/toolsStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { getToolIcon } from '../../constants/toolIcons';
import { Canvas, RoundedRect, Blur, LinearGradient as SkiaGradient, vec } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// 2026 Refractive Glass Card Component
const GlassBentoCard = ({ children, height = 120, color = 'rgba(6, 11, 40, 0.7)' }: { children: React.ReactNode, height?: number, color?: string }) => (
  <View style={[styles.glassBentoContainer, { height }]}>
    <Canvas style={styles.skiaCanvas}>
      <RoundedRect
        x={0}
        y={0}
        width={(width - 52) / 2}
        height={height}
        r={24}
        color={color}
      >
        <SkiaGradient
          start={vec(0, 0)}
          end={vec(width / 2, height)}
          colors={['rgba(255,255,255,0.05)', 'transparent']}
        />
        <Blur blur={20} />
      </RoundedRect>
    </Canvas>
    <View style={styles.glassBentoContent}>
      {children}
    </View>
  </View>
);

const ToolsScreen = () => {
  const navigation = useNavigation<any>();
  const { tools, categories } = useToolsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTools = useMemo(() => {
    let result = tools;
    if (activeCategory !== 'All') {
      result = result.filter(t => t.category === activeCategory);
    }
    if (searchQuery) {
      result = result.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [tools, activeCategory, searchQuery]);

  return (
    <AnimatedBackground variant="main" showParticles={true}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketing AI</Text>
        <Text style={styles.headerSubtitle}>75+ Pro AI Tools</Text>
      </View>

      {/* Search Bar Bento */}
      <View style={styles.searchContainer}>
        <View style={styles.glassSearch}>
          <Feather name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            placeholder="Search 75+ tools..."
            placeholderTextColor={Colors.textTertiary}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContainer}
      >
        <TouchableOpacity 
          style={[styles.categoryChip, activeCategory === 'All' && styles.categoryChipActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveCategory('All');
          }}
        >
          <Text style={[styles.categoryText, activeCategory === 'All' && styles.categoryTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity 
            key={cat.id}
            style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveCategory(cat.id);
            }}
          >
            <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolsGrid}>
          {filteredTools.map((tool) => (
            <TouchableOpacity 
              key={tool.$id}
              style={styles.toolItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('ToolDetail', { toolSlug: tool.slug });
              }}
            >
              <GlassBentoCard height={180}>
                <View style={styles.toolIconContainer}>
                  <Image source={getToolIcon(tool.slug)} style={styles.toolIcon} resizeMode="contain" />
                </View>
                <View style={styles.toolInfo}>
                  <Text style={styles.toolName} numberOfLines={1}>{tool.name}</Text>
                  <View style={styles.toolFooter}>
                    {tool.isPro && (
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    )}
                    <Text style={styles.usageText}>{tool.usageCount} uses</Text>
                  </View>
                </View>
              </GlassBentoCard>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  glassSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    marginLeft: 12,
    fontSize: 16,
  },
  categoriesScroll: {
    maxHeight: 50,
    marginBottom: 20,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  toolItem: {
    width: (width - 48) / 2,
    marginBottom: 16,
  },
  glassBentoContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skiaCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  glassBentoContent: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolIconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolIcon: {
    width: '100%',
    height: '100%',
  },
  toolInfo: {
    width: '100%',
    alignItems: 'flex-start',
  },
  toolName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  toolFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  proBadge: {
    backgroundColor: 'rgba(253, 151, 7, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    color: Colors.gold,
    fontWeight: 'bold',
  },
  usageText: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
});

export default ToolsScreen;
