import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

interface FAQ {
  q: string;
  a: string;
  category: string;
}

const FAQS: FAQ[] = [
  { category: 'Getting Started', q: 'How do I use a tool?', a: 'Tap any tool on the Tools tab, fill in the inputs, and tap Run. The AI will generate content using Claude Haiku 4.5 or Opus 4.6 depending on tool complexity. Results are saved to your History.' },
  { category: 'Getting Started', q: 'How many tools are available?', a: 'The app has 314 AI marketing tools across Google Ads, Meta/Facebook, Instagram, Email, SEO, E-commerce, Analytics, Content Writing, and more. All 314 tools work the same on mobile and web.' },
  { category: 'Getting Started', q: 'Can I use this offline?', a: 'No, the tools require a connection to our AI backend. Make sure you have WiFi or cellular data.' },
  { category: 'Account', q: 'How do I login?', a: 'Use your phone number with OTP, or email, Google, Apple, or Facebook login. Once logged in, you can enable Face ID / Touch ID for quick access.' },
  { category: 'Account', q: 'I am not receiving OTP', a: 'Check your phone number format. For India, start with +91. OTP is delivered via Bird SMS. If still not received within 60 seconds, tap Resend.' },
  { category: 'Account', q: 'How do I change my phone number?', a: 'Go to Profile > Edit Profile. Your phone number is tied to your account identity — contact help@marketingtool.pro for changes.' },
  { category: 'Subscription', q: 'What is the difference between Free and Pro?', a: 'Free users get 3 generations/day on non-PRO tools. Pro users get unlimited generations on all 314 tools including premium ones marked with a lock icon.' },
  { category: 'Subscription', q: 'How do I upgrade?', a: 'Go to Profile > Manage Plan or tap any PRO tool. Payment is processed securely through Apple IAP on iOS.' },
  { category: 'Subscription', q: 'Can I cancel anytime?', a: 'Yes. Cancel your subscription through your Apple ID settings. You keep access until the end of your billing period.' },
  { category: 'Subscription', q: 'Do you offer refunds?', a: 'Refunds are handled by Apple per their policies. Contact help@marketingtool.pro if you need assistance.' },
  { category: 'Tools & AI', q: 'Which AI models do the tools use?', a: 'Simple tools use Claude Haiku 4.5 for speed. Complex tools (AI Campaign Optimizer, AI Content Planner, SEO Blog Writer, Google PMax) use Claude Opus 4.6 for higher quality.' },
  { category: 'Tools & AI', q: 'How long does generation take?', a: 'Typically 5-15 seconds. Longer content like blog posts may take up to 30 seconds.' },
  { category: 'Tools & AI', q: 'Why are mobile results shorter?', a: 'Mobile screens have limited space. For very long tool outputs, we show a preview with a "View Full on Desktop" option. Your entire result is saved to History.' },
  { category: 'Tools & AI', q: 'Can I edit the generated content?', a: 'Yes. Copy the result from History and edit it in any app. You can also regenerate with different inputs.' },
  { category: 'Privacy & Security', q: 'Is my data secure?', a: 'All data is encrypted in transit and at rest. We use Appwrite with TLS, and authenticate every request with your session token.' },
  { category: 'Privacy & Security', q: 'Do you share my data?', a: 'No. Your generations are private to your account. We do not sell or share data with third parties. AI providers (Anthropic) process prompts per their privacy policy.' },
  { category: 'Privacy & Security', q: 'Can I delete my account?', a: 'Yes. Go to Profile > Privacy & Security > Delete Account. All your data will be permanently removed within 30 days.' },
];

const CATEGORIES = ['All', ...Array.from(new Set(FAQS.map(f => f.category)))];

const HelpCenterScreen = () => {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = FAQS.filter(f => {
    const matchesCategory = category === 'All' || f.category === category;
    const matchesSearch = !search ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
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

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="search" size={36} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No results for "{search}"</Text>
          </View>
        ) : (
          filtered.map((faq, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.faqCard}
              onPress={() => setExpanded(expanded === idx ? null : idx)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Feather
                  name={expanded === idx ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </View>
              {expanded === idx && <Text style={styles.faqAnswer}>{faq.a}</Text>}
            </TouchableOpacity>
          ))
        )}

        <View style={styles.contactCta}>
          <Feather name="message-circle" size={24} color={Colors.secondary} />
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactDesc}>Our support team replies within 24 hours</Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('mailto:help@marketingtool.pro')}
          >
            <Text style={styles.contactBtnText}>Email Support</Text>
          </TouchableOpacity>
        </View>
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, color: Colors.white, fontSize: 15 },
  categoryScroll: { marginBottom: Spacing.md, maxHeight: 40 },
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  catChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  catChipTextActive: { color: Colors.white, fontWeight: '600' },
  faqCard: {
    backgroundColor: 'rgba(22, 24, 36, 0.55)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQuestion: { flex: 1, color: Colors.white, fontWeight: '600', fontSize: 15, paddingRight: Spacing.sm },
  faqAnswer: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: 14 },
  contactCta: {
    backgroundColor: 'rgba(157, 78, 221, 0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(157, 78, 221, 0.2)',
  },
  contactTitle: { color: Colors.white, fontWeight: 'bold', fontSize: 18, marginTop: Spacing.md },
  contactDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 4, marginBottom: Spacing.md },
  contactBtn: { backgroundColor: Colors.secondary, paddingHorizontal: Spacing.xl, paddingVertical: 12, borderRadius: BorderRadius.full },
  contactBtnText: { color: Colors.white, fontWeight: '600' },
});

export default HelpCenterScreen;
