import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Gradients, Spacing, BorderRadius, HEADER_TOP_PADDING } from '../../constants/theme';
import { WEB_SECTIONS } from '../../navigation/linking';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const SITE = 'https://marketingtool.pro';

// Shows a marketingtool.pro page (blog, resources, solutions, about, ...) that
// the app has no native screen for, so a deep link to it lands on that page
// instead of an unrelated screen. Only sections listed in WEB_SECTIONS load;
// anything else falls back to the site root.
export function webPageUrl(section?: string, slug?: string): string {
  if (!section || !(WEB_SECTIONS as readonly string[]).includes(section)) return `${SITE}/`;
  const safeSlug = slug && /^[a-z0-9-]+$/i.test(slug) ? `${slug}/` : '';
  return `${SITE}/${section}/${safeSlug}`;
}

const WebPageScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'WebPage'>>();
  const [title, setTitle] = useState('MarketingTool');
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.screenContainer}>
      <LinearGradient colors={Gradients.dark} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Back">
            <Feather name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <WebView
        source={{ uri: webPageUrl(params?.section, params?.slug) }}
        style={styles.web}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(s) => s.title && setTitle(s.title.split(' | ')[0])}
        // mailto:, tel:, intent: etc. cannot render in a WebView; hand them to the OS.
        onShouldStartLoadWithRequest={(req) => {
          if (/^https?:/i.test(req.url)) return true;
          Linking.openURL(req.url).catch(() => {});
          return false;
        }}
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color={Colors.white} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#0D0F1C' },
  header: { paddingTop: HEADER_TOP_PADDING, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, marginHorizontal: Spacing.md, fontSize: 20, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },
  placeholder: { width: 44 },
  web: { flex: 1, backgroundColor: '#0D0F1C' },
  loader: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 120, justifyContent: 'center', alignItems: 'center' },
});

export default WebPageScreen;
