import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

interface Tutorial {
  category: string;
  title: string;
  steps: string[];
  icon: string;
}

const TUTORIALS: Tutorial[] = [
  {
    category: 'Getting Started',
    icon: 'zap',
    title: 'Generate your first AI content in 30 seconds',
    steps: [
      'Tap the Tools tab at the bottom',
      'Pick any tool (e.g., Blog Intro Writer, Facebook Ad Copy)',
      'Fill in the inputs (topic, tone, length)',
      'Tap Run — AI generates content in 5-15 seconds',
      'Output appears with Copy, Share, and View Full options',
      'Saved automatically to your History tab',
    ],
  },
  {
    category: 'Getting Started',
    icon: 'search',
    title: 'Find the right tool for your task',
    steps: [
      'Tools tab has 314 AI marketing tools across 28 categories',
      'Use the search bar at the top to find by name',
      'Filter by platform: Google Ads, Meta, Instagram, Shopify, SEO',
      'Popular tools: Blog Writer, Ad Copy Analyzer, SEO Blog Writer, Email Subject Lines',
      'PRO tools (lock icon) require subscription',
    ],
  },
  {
    category: 'Tools',
    icon: 'edit-3',
    title: 'Write better ad copy with AI',
    steps: [
      'Use "Facebook Ad Copy" or "Google Ads Headline" for platform-specific copy',
      'Give specific inputs — product benefit, target audience, tone',
      'Generate 3 variations, pick the best one',
      'A/B test winners using the AB Testing tool',
      'Always review AI output before publishing (platform guidelines apply)',
    ],
  },
  {
    category: 'Tools',
    icon: 'trending-up',
    title: 'Optimize SEO for your blog',
    steps: [
      'Start with "Keyword Research" to find search terms',
      'Use "SEO Blog Writer" to draft content around your keyword',
      'Run "Meta Tags Generator" for page title and description',
      'Check "Content Gap Finder" to see what competitors are missing',
      'Add internal/external links with "Link Building Strategy"',
    ],
  },
  {
    category: 'Chat',
    icon: 'message-circle',
    title: 'Use AI Chat for quick marketing advice',
    steps: [
      'Tap AI Chat tab at the bottom',
      'Chat tab: ask any marketing question',
      'Quick platform chips: tap Facebook/Instagram/etc. for a starter prompt',
      'Tools tab: launch any of 314 tools directly from chat',
      'History tab: see past conversations',
    ],
  },
  {
    category: 'Account',
    icon: 'user',
    title: 'Manage your subscription',
    steps: [
      'Profile → Manage Plan to see your current tier',
      'Free plan: 3 generations/day on non-PRO tools',
      'Pro plan: unlimited generations + all PRO tools',
      'Upgrade via Apple IAP (secure, cancel anytime)',
      'Restore purchases if you reinstall the app',
    ],
  },
  {
    category: 'Account',
    icon: 'shield',
    title: 'Enable Face ID / Touch ID for fast login',
    steps: [
      'Login once with phone OTP, email, or social',
      'Profile → Privacy & Security → enable Biometric Login',
      'Next time you open the app, use Face ID / Touch ID',
      'If biometric fails, you can still use phone/email/social as backup',
    ],
  },
  {
    category: 'Tips',
    icon: 'star',
    title: 'Get better AI outputs — 5 rules',
    steps: [
      'Be specific: "Fitness app for women 30-50" beats "fitness app"',
      'Include brand voice: casual, professional, funny, luxury',
      'Specify length: short hook, medium paragraph, long-form blog',
      'Give examples if possible — the AI mirrors good inputs',
      'Generate 3 variations, pick the best, then refine',
    ],
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(TUTORIALS.map(t => t.category)))];

const TutorialsScreen = () => {
  const navigation = useNavigation<any>();
  const [category, setCategory] = React.useState('All');
  const [expanded, setExpanded] = React.useState<number | null>(0);

  const filtered = TUTORIALS.filter(t => category === 'All' || t.category === category);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tutorials</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }} style={{ maxHeight: 44, marginBottom: Spacing.md }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, category === c && styles.catChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.map((tut, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.card}
            onPress={() => setExpanded(expanded === idx ? null : idx)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Feather name={tut.icon as any} size={18} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cat}>{tut.category}</Text>
                <Text style={styles.title}>{tut.title}</Text>
              </View>
              <Feather
                name={expanded === idx ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </View>
            {expanded === idx && (
              <View style={styles.steps}>
                {tut.steps.map((step, i) => (
                  <View key={i} style={styles.step}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0F1C' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  content: { padding: Spacing.lg },
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  catChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  catChipTextActive: { color: Colors.white, fontWeight: '600' },
  card: {
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(157, 78, 221, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  cat: { fontSize: 11, color: Colors.secondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 14, color: Colors.white, fontWeight: '600', marginTop: 2 },
  steps: { marginTop: Spacing.md, gap: Spacing.sm },
  step: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  stepText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});

export default TutorialsScreen;
